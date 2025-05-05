import { Ball, Player } from '@pong/game/objects';
import { PhysicsManager } from '@pong/game/physics';
import { GraphicalElement, GameContext, GameState, PlayerPosition, PlayerType } from '@pong/types';
import { GAME_CONFIG, calculateGameSizes, KEYS, DEBUG } from '@pong/constants';
import { PauseManager, ResizeManager } from '@pong/game/engine';
import { UIManager, ControlsManager } from '@pong/game/scenes';

// Define the game mode type here since GameScene is the authority
export type GameModeType = 'single' | 'multi' | 'tournament' | 'background_demo';

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
	private physicsManager!: PhysicsManager;

	// =========================================
	// Game State
	// =========================================
	private readonly winningScore = GAME_CONFIG.WINNING_SCORE;
	private gameMode: GameModeType = 'single';
	private isFrozen: boolean = false;

	// =========================================
	// Game Engine
	// =========================================
	private gameEngine: any;

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
		window.addEventListener('keydown', this.onDebugToggle);
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
		window.removeEventListener('keydown', this.onDebugToggle);
	}

	// =========================================
	// Game Loop Methods
	// =========================================

	/**
	 * Updates game logic
	 * @param deltaTime Time elapsed since the last update in seconds
	 */
	public update(deltaTime: number): void {
		if (this.shouldSkipUpdate()) return;
		
		// Player updates (input handling, AI)
		// TODO: Move player updates potentially into PhysicsManager or keep here?
		const updateState = this.isBackgroundDemo() ? GameState.PLAYING : this.getCurrentGameState();
		this.player1.update(this.context, deltaTime, updateState);
		this.player2.update(this.context, deltaTime, updateState);

		// Physics and UI updates
		this.updateGameState(deltaTime);
		
		// Win condition check (delegated to GameEngine)
		if (this.gameEngine && typeof this.gameEngine.checkWinCondition === 'function') {
			this.gameEngine.checkWinCondition();
		}
	}

	/**
	 * Renders the game scene
	 */
	public draw(): void {
		// Removed optimization check that might cause flickering in background mode
		// if (this.isBackgroundDemo() && this.lastDrawTime && !this.hasStateChanged) {
		// 	return;
		// }
		
		if (!this.isBackgroundDemo()) {
			this.uiManager.drawBackground(this.player1, this.player2);
		}
		
		if (!this.isFrozen) {
			this.uiManager.drawGameElements(this.objectsInScene);
		}
		
		this.uiManager.drawUI(
			this.pauseManager.hasState(GameState.PAUSED),
			this.isBackgroundDemo()
		);
	}

	// =========================================
	// Game State Management
	// =========================================

	/**
	 * Sets the game mode and updates all relevant components
	 */
	public setGameMode(mode: GameModeType): void {
		this.gameMode = mode;
		this.controlsManager.setupControls(mode);
	}

	/**
	 * Gets the current game mode
	 */
	public getGameMode(): GameModeType {
		return this.gameMode;
	}

	/**
	 * Checks if current game mode is background demo
	 */
	public isBackgroundDemo(): boolean {
		return this.gameMode === 'background_demo';
	}

	/**
	 * Checks if current game mode is single player
	 */
	public isSinglePlayer(): boolean {
		return this.gameMode === 'single';
	}

	/**
	 * Checks if current game mode is multiplayer
	 */
	public isMultiPlayer(): boolean {
		return this.gameMode === 'multi';
	}

	/**
	 * Checks if current game mode is tournament
	 */
	public isTournament(): boolean {
		return this.gameMode === 'tournament';
	}

	/**
	 * Checks if current game mode is competitive (multi or tournament)
	 */
	public isCompetitive(): boolean {
		return this.isMultiPlayer() || this.isTournament();
	}

	/**
	 * Checks if current game mode requires database recording
	 */
	public requiresDbRecording(): boolean {
		return !this.isBackgroundDemo();
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
		this.physicsManager = new PhysicsManager(this.ball, this.player1, this.player2, this.gameEngine, this);
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
		
		// Set the GameScene reference to enable background mode detection
		if (typeof this.pauseManager.setGameScene === 'function')
			this.pauseManager.setGameScene(this);
		
		// Set game engine reference if available
		if (this.gameEngine && typeof this.pauseManager.setGameEngine === 'function')
			this.pauseManager.setGameEngine(this.gameEngine);
		
		this.pauseManager.setCountdownCallback((text) => {
			if (!this.isBackgroundDemo())
				this.uiManager.setCountdownText(text);
		});
		
		// Set point started callback
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
	 * @param deltaTime The time delta since the last update in seconds.
	 */
	private updateGameState(deltaTime: number): void {
		const gameState = this.getCurrentGameState();
		
		// Update Physics (Ball movement, Collisions, Scoring)
		if (gameState !== GameState.PAUSED && this.physicsManager) {
			this.physicsManager.update(deltaTime, gameState);
		}
	}

	// =========================================
	// Helper Methods
	// =========================================

	/** Reset positions of players and ball */
	public resetPositions(): void {
		this.player1.resetPosition();
		this.player2.resetPosition();
		this.ball.restart();
	}

	private getCurrentGameState(): GameState {
		if (this.pauseManager.hasState(GameState.PLAYING)) return GameState.PLAYING;
		if (this.pauseManager.hasState(GameState.PAUSED)) return GameState.PAUSED;
		return GameState.COUNTDOWN;
	}

	private shouldSkipUpdate(): boolean {
		return !this.isBackgroundDemo() && this.pauseManager.hasState(GameState.PAUSED);
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

	public getGameEngine(): any {
		return this.gameEngine;
	}
	// Game Engine
	// =========================================

	public setGameEngine(engine: any): void {
		this.gameEngine = engine;
		// Pass engine to PhysicsManager if it's already initialized
		if (this.physicsManager && typeof (this.physicsManager as any).setGameEngine === 'function') {
			(this.physicsManager as any).setGameEngine(engine);
		}
	}

	private onDebugToggle = (evt: KeyboardEvent) => {
		if (evt.code === KEYS.DEBUG_TOGGLE) {
			DEBUG.enabled = !DEBUG.enabled;
		}
	}
}
