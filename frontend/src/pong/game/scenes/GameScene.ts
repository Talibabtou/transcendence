import { Ball, Player } from '@pong/game/objects';
import { PhysicsManager } from '@pong/game/physics';
import { GraphicalElement, GameContext, GameState, PlayerPosition, PlayerType } from '@pong/types';
import { GAME_CONFIG, calculateGameSizes } from '@pong/constants';
import { GameEngine, PauseManager, ResizeManager } from '@pong/game/engine';
import { UIManager, ControlsManager } from '@pong/game/scenes';
import { GameMode } from '@website/types';

export class GameScene {

	private ball!: Ball;
	private player1!: Player;
	private player2!: Player;
	private objectsInScene: Array<GraphicalElement> = [];
	private readonly uiManager: UIManager;
	private readonly controlsManager: ControlsManager;
	private pauseManager!: PauseManager;
	private resizeManager: ResizeManager | null = null;
	private physicsManager!: PhysicsManager;
	private readonly winningScore = GAME_CONFIG.WINNING_SCORE;
	private gameMode: GameMode = GameMode.SINGLE;
	private isFrozen: boolean = false;
	private gameEngine: GameEngine | null = null;

	constructor(private readonly context: GameContext) {
		if (!context) {
			throw new Error('Context must be provided to GameScene');
		}
		this.uiManager = new UIManager(this.context);
		this.setupScene();
		this.controlsManager = new ControlsManager(this.player1, this.player2);
	}

	
	/**
	 * Initializes and starts the game scene
	 */
	public load(): void {
		this.controlsManager.setupControls(this.gameMode);
		this.pauseManager.startGame();
	}

	/**
	 * Cleans up and unloads the game scene
	 */
	public unload(): void {
		this.controlsManager.cleanup();
		this.cleanupManagers();
		this.cleanupGameObjects();
	}

	/**
	 * Updates game logic
	 * @param deltaTime Time elapsed since the last update in seconds
	 */
	public update(deltaTime: number): void {
		if (this.shouldSkipUpdate()) return;
		const updateState = this.isBackgroundDemo() ? GameState.PLAYING : this.CurrentGameState;
		this.player1.update(this.context, deltaTime, updateState);
		this.player2.update(this.context, deltaTime, updateState);
		this.updateGameState(deltaTime);
		if (this.gameEngine && typeof this.gameEngine.checkWinCondition === 'function') {
			this.gameEngine.checkWinCondition();
		}
	}

	/**
	 * Renders the game scene
	 * @param alpha Interpolation factor (0 to 1)
	 */
	public draw(alpha: number): void {
		if (!this.isBackgroundDemo()) {
			this.uiManager.drawBackground(this.player1, this.player2);
		}
		const isPlaying = this.pauseManager.hasState(GameState.PLAYING);
		const interpolationAlpha = isPlaying ? alpha : 0;
		if (!this.isFrozen) {
			this.objectsInScene.forEach(obj => {
				if (typeof (obj as any).draw === 'function') {
					if ((obj as any).draw.length >= 1) {
						(obj as any).draw(this.context, interpolationAlpha);
					} else {
						(obj as any).draw();
					}
				}
			});
		}
		this.uiManager.drawUI(
			this.pauseManager.hasState(GameState.PAUSED),
			this.isBackgroundDemo()
		);
	}

	/**
	 * Sets up the initial game scene
	 */
	private setupScene(): void {
		const { width, height } = this.context.canvas;
		this.createGameObjects(width, height);
		this.objectsInScene = [this.player1, this.player2, this.ball];
		this.initializeManagers();
		if (!this.gameEngine) {
			throw new Error('GameEngine must be provided to GameScene');
		}
		this.physicsManager = new PhysicsManager(this.ball, this.player1, this.player2, this.gameEngine, this);
		this.physicsManager.setOnScoreUpdateCallback(() => {
			if (this.uiManager && typeof this.uiManager.invalidateBackgroundCache === 'function') {
				this.uiManager.invalidateBackgroundCache();
			}
		});
	}

	/**
	 * Initializes the pause manager
	 */
	private initializePauseManager(): void {
		this.pauseManager = new PauseManager(this.ball, this.player1, this.player2, this);
		if (this.gameEngine && typeof this.pauseManager.setGameEngine === 'function')
			this.pauseManager.setGameEngine(this.gameEngine);
		this.pauseManager.setCountdownCallback((text) => {
			if (!this.isBackgroundDemo())
				this.uiManager.setCountdownText(text);
		});
		this.pauseManager.setPointStartedCallback(() => {
			if (this.gameEngine && typeof this.gameEngine.resetGoalTimer === 'function')
				this.gameEngine.resetGoalTimer();
		});
	}

	/**
	 * Initializes the resize manager
	 */
	private initializeResizeManager(): void {
		this.resizeManager = new ResizeManager(
			this.context,
			this,
			this.ball,
			this.player1,
			this.player2,
			this.pauseManager
		);
	}

	/**
	 * Creates game objects with initial positions
	 */
	private createGameObjects(width: number, height: number): void {
		try {
			const centerH = width * 0.5;
			this.ball = new Ball(centerH, height * 0.5, this.context);
			if (!this.ball) {
				throw new Error('Failed to create ball');
			}
			this.createPlayers(width);
			if (!this.player1 || !this.player2) {
				throw new Error('Failed to create players');
			}
			this.objectsInScene = [this.player1, this.player2, this.ball];
		} catch (error) {
			console.error('Error in createGameObjects:', error);
			throw error;
		}
	}

	/**
	 * Creates and positions players
	 */
	private createPlayers(width: number): void {
		if (!this.ball) {
			throw new Error('Ball must be created before players');
		}
		try {
			const sizes = calculateGameSizes(width, this.context.canvas.height);
			const centerPaddleY = this.context.canvas.height * 0.5 - sizes.PADDLE_HEIGHT * 0.5;
			
			this.player1 = new Player(
				sizes.PLAYER_PADDING,
				centerPaddleY, 
				this.ball,
				this.context,
				PlayerPosition.LEFT,
				PlayerType.AI
			);
			this.player2 = new Player(
				width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH),
				centerPaddleY,
				this.ball,
				this.context,
				PlayerPosition.RIGHT,
				PlayerType.AI
			);
		} catch (error) {
			console.error('Error in createPlayers:', error);
			throw error;
		}
	}

	/**
	 * Updates the game state
	 * @param deltaTime The time delta since the last update in seconds.
	 */
	private updateGameState(deltaTime: number): void {
		const gameState = this.CurrentGameState;
		if (gameState !== GameState.PAUSED && this.physicsManager) {
			this.physicsManager.update(deltaTime, gameState);
		}
	}

	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////

	public isBackgroundDemo(): boolean { return this.gameMode === GameMode.BACKGROUND_DEMO; }
	public isSinglePlayer(): boolean { return this.gameMode === GameMode.SINGLE; }
	public isMultiPlayer(): boolean { return this.gameMode === GameMode.MULTI; }
	public isTournament(): boolean { return this.gameMode === GameMode.TOURNAMENT; }
	public isCompetitive(): boolean { return this.isMultiPlayer() || this.isTournament(); }
	public requiresDbRecording(): boolean { return !this.isBackgroundDemo(); }
	public handlePause(): void { this.pauseManager.pause(); }
	public handleResume(): void { this.pauseManager.resume(); }
	private shouldSkipUpdate(): boolean { return !this.isBackgroundDemo() && this.pauseManager.hasState(GameState.PAUSED); }

	private initializeManagers(): void {
		this.initializePauseManager();
		this.initializeResizeManager();
	}
	
	public resetPositions(): void {
		this.player1.resetPosition();
		this.player2.resetPosition();
		this.ball.restart();
	}
	
	public isGameOver(): boolean {
		return this.player1.Score >= this.winningScore || 
		this.player2.Score >= this.winningScore;
	}

	private cleanupManagers(): void {
		this.pauseManager?.cleanup();
		this.resizeManager?.cleanup();
		this.pauseManager = null as unknown as PauseManager;
		this.resizeManager = null;
	}

	private cleanupGameObjects(): void {
		this.objectsInScene = [];
		this.ball = null as unknown as Ball;
		this.player1 = null as unknown as Player;
		this.player2 = null as unknown as Player;
	}

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////

	public get PauseManager(): PauseManager { return this.pauseManager; }
	public get ResizeManager(): ResizeManager | null { return this.resizeManager; }
	public get Player1(): Player { return this.player1; }
	public get Player2(): Player { return this.player2; }
	public get Ball(): Ball { return this.ball; }
	public get GameMode(): GameMode {return this.gameMode;}
	public get GameEngine(): GameEngine | null { return this.gameEngine; }
	
	public get Winner(): Player | null {
		if (!this.isGameOver()) return null;
		return this.player1.Score >= this.winningScore ? this.player1 : this.player2;
	}

	private get CurrentGameState(): GameState {
		if (this.pauseManager.hasState(GameState.PLAYING)) return GameState.PLAYING;
		if (this.pauseManager.hasState(GameState.PAUSED)) return GameState.PAUSED;
		return GameState.COUNTDOWN;
	}

	public setFrozenState(frozen: boolean): void {
		if (this.isBackgroundDemo()) return;
		this.isFrozen = frozen;
	}

	public setGameMode(mode: GameMode): void {
			this.gameMode = mode;
			this.controlsManager.setupControls(mode);
	}

	public setGameEngine(engine: GameEngine): void {
		this.gameEngine = engine;
		if (this.physicsManager && typeof this.physicsManager.setGameEngine === 'function') {
			this.physicsManager.setGameEngine(engine);
		}
	}
}
