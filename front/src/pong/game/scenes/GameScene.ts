import { Ball, Player } from '@pong/game/objects';
import { PhysicsManager } from '@pong/game/physics';
import { GraphicalElement, GameContext, GameState, PlayerPosition, PlayerType } from '@pong/types';
import { GAME_CONFIG, calculateGameSizes, KEYS, DEBUG } from '@pong/constants';
import { PauseManager, ResizeManager } from '@pong/game/engine';
import { UIManager, ControlsManager } from '@pong/game/scenes';

// Define a simple AABB interface for dirty rectangles
interface AABB {
	x: number;
	y: number;
	width: number;
	height: number;
}

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
	private dirtyRects: AABB[] = []; // Store dirty regions for current frame

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
		const updateState = this.isBackgroundDemo() ? GameState.PLAYING : this.getCurrentGameState();
		this.player1.update(this.context, deltaTime, updateState);
		this.player2.update(this.context, deltaTime, updateState);

		// Physics updates (which moves the ball)
		this.updateGameState(deltaTime); // Calls physicsManager.update()

		// --- Collect Dirty Rects --- 
		// Clear previous frame's list (moved from draw to ensure rects are collected *before* drawing)
		this.dirtyRects = [];
		
		// Add dirty rects from moving objects
		// Need to check if getDirtyRects exists as it's newly added
		if (typeof (this.ball as any).getDirtyRects === 'function') {
			(this.ball as any).getDirtyRects().forEach((rect: AABB) => this.addDirtyRect(rect));
		}
		if (typeof (this.player1 as any).getDirtyRects === 'function') {
			(this.player1 as any).getDirtyRects().forEach((rect: AABB) => this.addDirtyRect(rect));
		}
		if (typeof (this.player2 as any).getDirtyRects === 'function') {
			(this.player2 as any).getDirtyRects().forEach((rect: AABB) => this.addDirtyRect(rect));
		}
		// --- End Collect Dirty Rects ---
		
		// Win condition check (delegated to GameEngine)
		if (this.gameEngine && typeof this.gameEngine.checkWinCondition === 'function') {
			this.gameEngine.checkWinCondition();
		}
	}

	/**
	 * Renders the game scene
	 * @param alpha Interpolation factor (0 to 1)
	 */
	public draw(alpha: number): void {
		// 1. Clear dirty regions
		// For now, let's keep it simple and not merge overlapping rects
		// In a more advanced version, we could merge them to reduce clearRect calls
		this.dirtyRects.forEach(rect => {
			if (rect.width > 0 && rect.height > 0) { // Ensure valid rect
				this.context.clearRect(rect.x, rect.y, rect.width, rect.height);
			}
		});

		// --- TODO: Redraw static background elements if they intersect dirtyRects ---
		// For now, assuming background is redrawn by UIManager or is simple enough.

		if (!this.isBackgroundDemo()) {
			this.uiManager.drawBackground(this.player1, this.player2); // Redraws names/scores (will be optimized later)
		}

		// Determine if interpolation should be applied based on game state
		const isPlaying = this.pauseManager.hasState(GameState.PLAYING);
		const interpolationAlpha = isPlaying ? alpha : 0; // Use 0 if not playing

		if (!this.isFrozen) {
			this.objectsInScene.forEach(obj => {
				if (typeof (obj as any).draw === 'function') {
					// Pass conditional alpha to object's draw method if it accepts it
					if ((obj as any).draw.length >= 1) {
						(obj as any).draw(this.context, interpolationAlpha); // Pass conditional alpha
					} else {
						(obj as any).draw(); // Draw without alpha if the method doesn't take it
					}
				}
				// --- TODO: Replace above block with intersection logic --- 
				// Get object's bounding box
				// if (typeof (obj as any).getBoundingBox === 'function') {
				//   const objBox = (obj as any).getBoundingBox();
				//   // Check if objBox intersects with ANY of the clearedDirtyRectsForFrame
				//   if (clearedDirtyRectsForFrame.some(dirtyRect => this.rectIntersectsRect(objBox, dirtyRect))) {
				//     // Draw the object (with interpolation logic as before)
				//   }
				// }
			});
		}

		this.uiManager.drawUI(
			this.pauseManager.hasState(GameState.PAUSED),
			this.isBackgroundDemo()
		);
		// --- TODO: Also apply intersection logic to UI elements --- 
		// For UI like scores, names, pause, countdown: get their bounding boxes
		// and only call their respective draw functions in UIManager if their
		// bounding box intersects with a clearedDirtyRectForFrame.

		// 5. Clear the dirty rectangles list for the next frame - MOVED to update()
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

	public getUIManager(): UIManager {
		return this.uiManager;
	}

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

	// =========================================
	// Dirty Rectangle Management (NEW)
	// =========================================

	/**
	 * Adds a rectangle to the list of dirty regions for the current frame.
	 * @param rect The rectangle to add (object with x, y, width, height).
	 */
	public addDirtyRect(rect: AABB): void {
		// Basic validation: Ensure width and height are positive
		if (rect.width > 0 && rect.height > 0) {
			// --- TODO Optional: Implement merging logic here --- 
			// For now, just add directly
			this.dirtyRects.push(rect);
		}
	}

	/** 
	 * Checks if two rectangles intersect.
	 */
	private rectIntersectsRect(rectA: AABB, rectB: AABB): boolean {
		return (
			rectA.x < rectB.x + rectB.width &&
			rectA.x + rectA.width > rectB.x &&
			rectA.y < rectB.y + rectB.height &&
			rectA.y + rectA.height > rectB.y
		);
	}
}
