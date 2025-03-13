import { Ball, Player } from '@pong/game/objects';
import { GraphicalElement, GameContext, GameState, PlayerPosition, PlayerType } from '@pong/types';
import { GAME_CONFIG, calculateGameSizes } from '@pong/constants';
import { PauseManager, ResizeManager } from '@pong/game/engine';
import { UIManager, ControlsManager } from '@pong/game/scenes';

/**
 * Main game scene that coordinates game objects, managers, and game flow.
 * Acts as the central coordinator between different game components.
 */
export class GameScene {
	// =========================================
	// Game Objects
	// =========================================
	private ball!: Ball;
	private player1!: Player;
	private player2!: Player;
	private objectsInScene: Array<GraphicalElement> = [];

	// =========================================
	// Managers
	// =========================================
	private readonly uiManager: UIManager;
	private readonly controlsManager: ControlsManager;
	private pauseManager!: PauseManager;
	private resizeManager: ResizeManager | null = null;

	// =========================================
	// Game State
	// =========================================
	private readonly winningScore = GAME_CONFIG.WINNING_SCORE;
	private gameMode: 'single' | 'multi' | 'tournament' | 'background_demo' = 'single';
	private lastTime: number = 0;
	private isFrozen: boolean = false;
	private lastDrawTime: number | null = null;
	private hasStateChanged: boolean = true;

	/**
	 * Creates a new GameScene instance
	 * @param context The canvas rendering context
	 */
	constructor(private readonly context: GameContext) {
		if (!context) {
			throw new Error('Context must be provided to GameScene');
		}
		this.uiManager = new UIManager(this.context);
		this.setupScene();
		this.controlsManager = new ControlsManager(this.player1, this.player2);
		this.lastTime = performance.now();
	}

	// =========================================
	// Lifecycle Methods
	// =========================================
	
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

	// =========================================
	// Game Loop Methods
	// =========================================

	/**
	 * Updates game logic
	 */
	public update(): void {
		if (this.shouldSkipUpdate()) return;
		
		const deltaTime = this.calculateDeltaTime();
		this.updateGameState(deltaTime);
		this.checkWinCondition();
	}

	/**
	 * Renders the game scene
	 */
	public draw(): void {
		// For background demo, ALWAYS render every frame without exception
		if (this.isBackgroundDemo()) {
			// Just draw game objects, nothing else for background mode
			this.uiManager.drawGameElements(this.objectsInScene);
			return;
		}
		
		// Check if we need to render this frame
		const isPaused = this.pauseManager.hasState(GameState.PAUSED);
		const isCountdown = this.pauseManager.hasState(GameState.COUNTDOWN);
		
		// Always render during special states (pause, countdown)
		// Only skip rendering during active gameplay when nothing changed
		if (!isPaused && !isCountdown && !this.hasStateChanged && this.lastDrawTime) {
			return;
		}
		
		// Render the frame
		this.uiManager.drawBackground(this.player1, this.player2);
		
		if (!this.isFrozen) {
			this.uiManager.drawGameElements(this.objectsInScene);
		}
		
		this.uiManager.drawUI(
			isPaused,
			false
		);
		
		this.lastDrawTime = performance.now();
		this.hasStateChanged = false;
	}

	// =========================================
	// Game State Management
	// =========================================

	/**
	 * Sets the game mode and updates all relevant components
	 */
	public setGameMode(mode: 'single' | 'multi' | 'tournament' | 'background_demo'): void {
		this.gameMode = mode;
		this.pauseManager?.setGameMode(mode);
		this.resizeManager?.setGameMode(mode);
		this.controlsManager.setupControls(mode);
	}

	/**
	 * Handles game pause state
	 */
	public handlePause(): void {
		this.pauseManager.pause();
	}

	/**
	 * Handles game resume state
	 */
	public handleResume(): void {
		this.pauseManager.resume();
	}

	/**
	 * Sets the frozen state of the game
	 */
	public setFrozenState(frozen: boolean): void {
		if (this.isBackgroundDemo()) return;
		this.isFrozen = frozen;
	}

	// =========================================
	// Setup Methods
	// =========================================

	/**
	 * Sets up the initial game scene
	 */
	private setupScene(): void {
		const { width, height } = this.context.canvas;
		this.createGameObjects(width, height);
		this.objectsInScene = [this.player1, this.player2, this.ball];
		this.initializeManagers();
	}

	/**
	 * Initializes all game managers
	 */
	private initializeManagers(): void {
		this.initializePauseManager();
		this.initializeResizeManager();
	}

	/**
	 * Initializes the pause manager
	 */
	private initializePauseManager(): void {
		this.pauseManager = new PauseManager(this.ball, this.player1, this.player2);
		this.pauseManager.setGameMode(this.gameMode);
		this.pauseManager.setCountdownCallback((text) => {
			if (!this.isBackgroundDemo()) {
				this.uiManager.setCountdownText(text);
			}
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

	// =========================================
	// Game Object Management
	// =========================================

	/**
	 * Creates game objects with initial positions
	 */
	private createGameObjects(width: number, height: number): void {
		try {
			// Create ball first
			const centerH = width * 0.5;
			this.ball = new Ball(centerH, height * 0.5, this.context);
			
			if (!this.ball) {
				throw new Error('Failed to create ball');
			}

			// Then create players with the ball reference
			this.createPlayers(width);

			if (!this.player1 || !this.player2) {
				throw new Error('Failed to create players');
			}

			// Initialize scene objects array
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

	// =========================================
	// Update Logic
	// =========================================

	/**
	 * Updates the game state
	 */
	private updateGameState(deltaTime: number): void {
		if (!this.isBackgroundDemo()) {
			this.pauseManager.update();
		}
		this.handleBallDestruction();
		this.updateGameObjects(deltaTime);
		this.hasStateChanged = true;
	}

	/**
	 * Updates all game objects
	 */
	private updateGameObjects(deltaTime: number): void {
		const updateState = this.isBackgroundDemo() 
			? GameState.PLAYING 
			: this.getCurrentGameState();

		this.objectsInScene.forEach(object => 
			object.update(this.context, deltaTime, updateState)
		);
	}

	/**
	 * Handles ball destruction and point scoring
	 */
	private handleBallDestruction(): void {
		if (!this.ball.isDestroyed()) return;

		if (this.ball.isHitLeftBorder()) {
			this.player2.givePoint();
		} else {
			this.player1.givePoint();
		}

		this.resetPositions();
		this.pauseManager.handlePointScored();
	}

	// =========================================
	// Helper Methods
	// =========================================

	private resetPositions(): void {
		this.ball.restart();
		this.player1.resetPosition();
		this.player2.resetPosition();
	}

	private getCurrentGameState(): GameState {
		if (this.pauseManager.hasState(GameState.PLAYING)) return GameState.PLAYING;
		if (this.pauseManager.hasState(GameState.PAUSED)) return GameState.PAUSED;
		return GameState.COUNTDOWN;
	}

	private calculateDeltaTime(): number {
		const currentTime = performance.now();
		const deltaTime = (currentTime - this.lastTime) / 1000;
		this.lastTime = currentTime;
		return deltaTime;
	}

	private shouldSkipUpdate(): boolean {
		return !this.isBackgroundDemo() && this.pauseManager.hasState(GameState.PAUSED);
	}

	private isBackgroundDemo(): boolean {
		return this.gameMode === 'background_demo';
	}

	private cleanupManagers(): void {
		this.pauseManager?.cleanup();
		this.resizeManager?.cleanup();
		this.pauseManager = null as any;
		this.resizeManager = null;
	}

	private cleanupGameObjects(): void {
		this.objectsInScene = [];
		this.ball = null as any;
		this.player1 = null as any;
		this.player2 = null as any;
	}

	// =========================================
	// Getters
	// =========================================

	public getPauseManager(): PauseManager {
		return this.pauseManager;
	}

	public getResizeManager(): ResizeManager | null {
		return this.resizeManager;
	}

	public getPlayer1(): Player {
		return this.player1;
	}

	public getPlayer2(): Player {
		return this.player2;
	}

	public getBall(): Ball {
		return this.ball;
	}

	public isGameOver(): boolean {
		return this.player1.getScore() >= this.winningScore || 
			   this.player2.getScore() >= this.winningScore;
	}

	public getWinner(): Player | null {
		if (!this.isGameOver()) return null;
		return this.player1.getScore() >= this.winningScore ? this.player1 : this.player2;
	}

	private checkWinCondition(): void {
		if (this.isGameOver()) {
			const gameResult = {
				winner: this.getWinner(),
				player1Score: this.player1.getScore(),
				player2Score: this.player2.getScore(),
				player1Name: this.player1.name,
				player2Name: this.player2.name
			};
			const event = new CustomEvent('gameOver', { 
				detail: gameResult
			});
			window.dispatchEvent(event);
		}
	}
}
