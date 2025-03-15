import { GameContext, GameState, GameStateInfo } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import { KEYS } from '@pong/constants';

/**
 * Main game engine that coordinates game scenes, handles input,
 * and manages the game loop.
 */
export class GameEngine {
	// =========================================
	// Properties
	// =========================================
	private scene!: GameScene; // Use definite assignment assertion
	private context: GameContext;
	private gameMode: 'single' | 'multi' | 'tournament' | 'background_demo' = 'single';
	private keyboardEventListener: ((evt: KeyboardEvent) => void) | null = null;

	// =========================================
	// Lifecycle
	// =========================================
	/**
	 * Creates a new GameEngine
	 * @param ctx Canvas rendering context
	 */
	constructor(ctx: GameContext) {
		this.context = ctx;
		this.initializeGame();
	}

	/**
	 * Initializes the game engine and scene
	 */
	private initializeGame(): void {
		this.scene = new GameScene(this.context);
		this.bindPauseControls();
	}

	// =========================================
	// Game Mode Initialization
	// =========================================
	/**
	 * Initializes a single player game
	 */
	public initializeSinglePlayer(): void {
		this.gameMode = 'single';
		this.loadMainScene();
	}

	/**
	 * Initializes a multiplayer game
	 */
	public initializeMultiPlayer(): void {
		this.gameMode = 'multi';
		this.loadMainScene();
	}

	/**
	 * Initializes a tournament game
	 */
	public initializeTournament(): void {
		this.gameMode = 'tournament';
		// For now, just start a multiplayer game
		// We'll implement tournament specifics later
		this.loadMainScene();
	}

	/**
	 * Initializes a background demo
	 */
	public initializeBackgroundDemo(): void {
		this.gameMode = 'background_demo';
		this.loadMainScene();
	}

	/**
	 * Loads the main game scene with appropriate settings
	 */
	private loadMainScene(): void {
		if (this.gameMode === 'single') {
			this.scene.setGameMode('single');
		} else if (this.gameMode === 'multi') {
			this.scene.setGameMode('multi');
		} else if (this.gameMode === 'tournament') {
			this.scene.setGameMode('tournament');
		} else if (this.gameMode === 'background_demo') {
			this.scene.setGameMode('background_demo');
		}

		// Reset positions of game objects
		if (this.scene.getBall()) {
			this.scene.getBall().restart();
		}
		if (this.scene.getPlayer1()) {
			this.scene.getPlayer1().resetPosition();
		}
		if (this.scene.getPlayer2()) {
			this.scene.getPlayer2().resetPosition();
		}

		// Load the scene
		this.scene.load();
	}

	// =========================================
	// Game Loop
	// =========================================
	/**
	 * Renders the current game scene
	 */
	public draw(): void {
		this.clearScreen();
		this.scene.draw();
	}

	/**
	 * Updates the game state for the current frame
	 */
	public update(): void {
		if (this.scene) {
			// Only update if the game is active
			if (this.gameMode === 'background_demo') {
				// Background demo has special update rules
				// For example, ignore certain input checks
			}
			
			try {
				this.scene.update();
			} catch (error) {
				console.error('Error updating game scene:', error);
			}
		}
	}

	// =========================================
	// Pause Management
	// =========================================
	/**
	 * Sets up keyboard event listeners for pause control
	 */
	private bindPauseControls(): void {
		this.keyboardEventListener = this.handleKeydown.bind(this);
		window.addEventListener('keydown', this.keyboardEventListener);
	}

	/**
	 * Toggles the game between paused and playing states
	 */
	public togglePause(): void {
		if (!(this.scene instanceof GameScene)) {
			return;
		}

		const gameScene = this.scene;
		const resizeManager = gameScene.getResizeManager();
		if (resizeManager?.isCurrentlyResizing()) {
			return;
		}
		
		const pauseManager = gameScene.getPauseManager();
		if (pauseManager.hasState(GameState.PLAYING)) {
			gameScene.handlePause();
		} else if (pauseManager.hasState(GameState.PAUSED)) {
			gameScene.handleResume();
		}
	}

	/**
	 * Returns whether the game is currently paused
	 */
	public isGamePaused(): boolean {
		if (!(this.scene instanceof GameScene)) {
			return false;
		}
		return this.scene.getPauseManager().hasState(GameState.PAUSED);
	}

	// =========================================
	// Resize Handling
	// =========================================
	/**
	 * Handles canvas resize operations
	 * @param width The new canvas width
	 * @param height The new canvas height
	 */
	public resize(width: number, height: number): void {
		// Update the canvas size first
		if (this.context && this.context.canvas) {
			this.context.canvas.width = width;
			this.context.canvas.height = height;
		}
		
		// Inform game objects about the resize
		if (this.scene instanceof GameScene) {
			// Let the scene handle updating its objects
			this.scene.getPlayer1()?.updateSizes();
			this.scene.getPlayer2()?.updateSizes();
		}
		
		// Redraw the scene
		this.draw();
	}

	// =========================================
	// Rendering Methods
	// =========================================
	/**
	 * Clears the canvas for a new frame
	 */
	private clearScreen(): void {
		const { width, height } = this.context.canvas;
		this.context.beginPath();
		this.context.clearRect(0, 0, width, height);
		this.context.closePath();
	}

	// =========================================
	// Cleanup and State Management
	// =========================================
	/**
	 * Cleans up resources
	 */
	public cleanup(): void {
		if (this.scene) {
			this.scene.unload();
			this.scene = null as any;
		}
		this.context = null as any;
	}

	/**
	 * Returns information about the current game state
	 */
	public getGameState(): GameStateInfo {
		return {
			player1Score: this.scene.getPlayer1().getScore(),
			player2Score: this.scene.getPlayer2().getScore(),
			isGameOver: this.scene.isGameOver(),
			winner: this.scene.getWinner()
		};
	}

	/**
	 * Sets display names for both players
	 * @param player1Name Name for player 1
	 * @param player2Name Name for player 2
	 */
	public setPlayerNames(player1Name: string, player2Name: string): void {
		this.scene.getPlayer1().setName(player1Name);
		this.scene.getPlayer2().setName(player2Name);
	}

	/**
	 * Enables or disables keyboard input
	 * @param enabled Whether keyboard control should be enabled
	 */
	public setKeyboardEnabled(enabled: boolean): void {
		// If there's an existing listener, remove it
		if (this.keyboardEventListener) {
			window.removeEventListener('keydown', this.keyboardEventListener);
			this.keyboardEventListener = null;
		}
		
		// Only add a new listener if enabled
		if (enabled) {
			this.keyboardEventListener = this.handleKeydown.bind(this);
			window.addEventListener('keydown', this.keyboardEventListener);
		}
	}

	/**
	 * Handles keyboard input events
	 * @param evt The keyboard event
	 */
	private handleKeydown(evt: KeyboardEvent): void {
		if (evt.code === KEYS.ENTER || evt.code === KEYS.ESC) {
			this.togglePause();
		}
	}

	/**
	 * Requests the game to pause, considering the current game state
	 */
	public requestPause(): void {
		if (!(this.scene instanceof GameScene)) {
			return;
		}
		
		const pauseManager = this.scene.getPauseManager();
		
		// If in countdown, set a flag for pending pause
		if (pauseManager.hasState(GameState.COUNTDOWN)) {
			pauseManager.setPendingPauseRequest(true);
		} 
		// Otherwise pause immediately if not already paused
		else if (!pauseManager.hasState(GameState.PAUSED)) {
			this.scene.handlePause();
		}
	}

	/**
	 * Updates the color of player paddles
	 * @param playerOneColor Color for player one (hex format)
	 * @param playerTwoColor Optional color for player two (hex format)
	 */
	public updatePlayerColors(playerOneColor: string, playerTwoColor?: string): void {
		if (this.scene) {
			// Update Player 1's color
			const player1 = this.scene.getPlayer1();
			if (player1) {
				player1.setColor(playerOneColor);
			}
			
			// If player two color is provided, update it as well
			if (playerTwoColor) {
				const player2 = this.scene.getPlayer2();
				if (player2) {
					player2.setColor(playerTwoColor);
				}
			}
		}
	}
}
