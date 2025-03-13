/**
 * Game Canvas Component Module
 * Manages the game canvas and interfaces with the GameManager.
 * Handles game rendering, state tracking, and lifecycle management.
 */
import { Component, GameMode } from '@website/scripts/components';
import { GameManager } from '@website/scripts/utils';
import { GameEngine } from '@pong/game/engine';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Game canvas component state interface
 */
interface GameCanvasState {
	visible: boolean;
	isPlaying: boolean;
	isPaused: boolean;
}

// =========================================
// GAME CANVAS COMPONENT
// =========================================

export class GameCanvasComponent extends Component<GameCanvasState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private canvas: HTMLCanvasElement | null = null;
	private gameManager: GameManager;

	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement) {
		super(container, {
			visible: false,
			isPlaying: false,
			isPaused: false
		});

		this.gameManager = GameManager.getInstance();
	}

	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	beforeRender(): void {
		// Preparation before rendering
	}

	render(): void {
		this.container.innerHTML = '';
	}
	
	destroy(): void {
		super.destroy();
	}

	// =========================================
	// GAME MANAGEMENT
	// =========================================
	
	/**
	 * Starts a game with the specified mode
	 * @param mode - The game mode to start
	 */
	startGame(mode: GameMode): void {
		this.updateInternalState({
			visible: true,
			isPlaying: true
		});

		// Tell the game manager to start the game in our container
		this.gameManager.startMainGame(mode, this.container);
	}

	/**
	 * Stops and hides the game
	 */
	stopGame(): void {
		this.updateInternalState({
			visible: false,
			isPlaying: false
		});
		this.gameManager.cleanupMainGame();
	}

	/**
	 * Checks if the game is over
	 * @returns True if the game is over, false otherwise
	 */
	isGameOver(): boolean {
		const gameState = this.gameManager.getMainGameState();
		return gameState?.isGameOver || false;
	}
	
	/**
	 * Gets the current game state
	 * @returns The current game state object
	 */
	getGameState(): any {
		return this.gameManager.getMainGameState();
	}
	
	// =========================================
	// VISIBILITY MANAGEMENT
	// =========================================
	
	/**
	 * Shows the game canvas
	 */
	public show(): void {
		if (this.canvas) {
			this.canvas.style.display = 'block';
		}
	}
	
	/**
	 * Hides the game canvas
	 */
	public hide(): void {
		if (this.canvas) {
			this.canvas.style.display = 'none';
		}
	}

	// =========================================
	// UTILITY METHODS
	// =========================================
	
	/**
	 * Gets the game engine instance
	 * @returns The current game engine or null
	 */
	public getEngine(): GameEngine | null {
		return this.gameManager.getMainGameEngine();
	}
}
