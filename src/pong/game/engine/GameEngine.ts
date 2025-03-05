import { GameContext, GameState, Player } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import { KEYS } from '@pong/constants';

// Add this interface for game state
interface GameStateInfo {
	player1Score: number;
	player2Score: number;
	isGameOver: boolean;
	winner: Player | null;
}

export class GameEngine {
	// =========================================
	// Properties
	// =========================================
	private scene!: GameScene; // Use definite assignment assertion
	private context: GameContext;
	private gameMode: 'single' | 'multi' | 'tournament' | 'background' = 'single';

	// =========================================
	// Lifecycle
	// =========================================
	constructor(ctx: GameContext) {
		this.context = ctx;
		this.initializeGame();
	}

	private initializeGame(): void {
		this.scene = new GameScene(this.context);
		this.scene.setGameContext(this);
		this.bindPauseControls();
	}

	// =========================================
	// Game Mode Initialization
	// =========================================
	public initializeSinglePlayer(): void {
		this.gameMode = 'single';
		this.loadMainScene();
	}

	public initializeMultiPlayer(): void {
		this.gameMode = 'multi';
		this.loadMainScene();
	}

	public initializeTournament(): void {
		this.gameMode = 'tournament';
		// For now, just start a multiplayer game
		// We'll implement tournament specifics later
		this.loadMainScene();
	}

	public initializeBackgroundMode(): void {
		this.gameMode = 'background';
		this.loadMainScene();
	}

	private loadMainScene(): void {
		// First, ensure background mode is disabled for regular gameplay
		this.scene.setBackgroundMode(false);
		
		// Configure player controls based on mode
		if (this.gameMode === 'single') {
				this.scene.setGameMode('single');
		} else if (this.gameMode === 'multi') {
				this.scene.setGameMode('multi');
		} else if (this.gameMode === 'background') {
				this.scene.setBackgroundMode(true);
				const pauseManager = this.scene.getPauseManager();
				if (pauseManager) {
						pauseManager.setBackgroundDemoMode(true);
				}
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
	public draw(): void {
		this.clearScreen();
		this.scene.draw();
	}

	public update(): void {
		const isBackground = this.gameMode === 'background';
		
		// In background mode, always update regardless of pause state
		if (isBackground || !this.isGamePaused()) {
			this.scene.update?.();
		}
	}

	// =========================================
	// Pause Management
	// =========================================
	private bindPauseControls(): void {
		window.addEventListener('keydown', (evt: KeyboardEvent) => {
			if (evt.code === KEYS.ENTER || evt.code === KEYS.ESC) {
				this.togglePause();
			}
		});
	}

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

	public isGamePaused(): boolean {
		if (!(this.scene instanceof GameScene)) {
			return false;
		}
		return this.scene.getPauseManager().hasState(GameState.PAUSED);
	}

	// =========================================
	// Resize handling
	// =========================================
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
	// Private Rendering Methods
	// =========================================
	private clearScreen(): void {
		const { width, height } = this.context.canvas;
		this.context.beginPath();
		this.context.clearRect(0, 0, width, height);
		this.context.closePath();
	}

	public cleanup(): void {
		if (this.scene) {
			this.scene.unload();
			this.scene = null as any;
		}
		this.context = null as any;
	}

	// Update getGameState return type
	public getGameState(): GameStateInfo {
		return {
			player1Score: this.scene.getPlayer1().getScore(),
			player2Score: this.scene.getPlayer2().getScore(),
			isGameOver: this.scene.isGameOver(),
			winner: this.scene.getWinner()
		};
	}

	// Add method to set player names
	public setPlayerNames(player1Name: string, player2Name: string): void {
		this.scene.getPlayer1().setName(player1Name);
		this.scene.getPlayer2().setName(player2Name);
	}
}
