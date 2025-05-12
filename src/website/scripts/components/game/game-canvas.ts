/**
 * Game Canvas Component Module
 * Manages the game canvas and interfaces with the GameManager.
 * Handles game rendering, state tracking, and lifecycle management.
 */
import { Component, GameManager } from '@website/scripts/components';
import { GameEngine } from '@pong/game/engine';
import { GameMode } from '@website/types';

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
	private gameEngine: GameEngine | null = null;

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
	 * @param mode The game mode to start
	 * @param playerInfo Optional player information
	 */
	startGame(
		mode: GameMode,
		playerInfo?: { 
			playerIds?: string[],
			playerNames?: string[],
			playerColors?: string[]
		}
	): void {
		this.updateInternalState({
			visible: true,
			isPlaying: true
		});

		// Tell the game manager to start the game in our container with player info
		this.gameManager.startMainGame(mode, this.container, playerInfo);

		if (this.gameEngine) {
			// Set player names if available
			if (playerInfo?.playerNames && playerInfo.playerNames.length > 0) {
				const player1Name = playerInfo.playerNames[0] || 'Player 1';
				const player2Name = playerInfo.playerNames.length > 1 ? playerInfo.playerNames[1] : 'Player 2';
				this.gameEngine.setPlayerNames(player1Name, player2Name);
			}
			
			// Set player colors
			if (playerInfo?.playerColors && playerInfo.playerColors.length > 0) {
				const player1Color = playerInfo.playerColors[0] || '#ffffff';
				const player2Color = playerInfo.playerColors.length > 1 ? playerInfo.playerColors[1] : '#ffffff';
				
				// Pass both colors to the game engine
				this.gameEngine.updatePlayerColors(player1Color, player2Color);
			}
			
			// Set player IDs if available
			if (playerInfo?.playerIds && playerInfo.playerIds.length > 0) {
				this.gameEngine.setPlayerIds(playerInfo.playerIds);
			}
		}
	}

	/**
	 * Stops and hides the game
	 */
	stopGame(): void {
		try {
			// Update internal state first
			this.updateInternalState({
				visible: false,
				isPlaying: false,
				isPaused: false
			});
			
			// Then clean up the game
			this.gameManager.cleanupMainGame();
		} catch (error) {
			console.error('Error stopping game:', error);
			// Force cleanup on error
			try {
				this.gameManager.cleanupMainGame();
			} catch {}
		}
	}

	/**
	 * Checks if the game is over with proper safeguards
	 * @returns True if the game is over, false otherwise
	 */
	isGameOver(): boolean {
		// Only check if component is in a valid state
		if (!this.getInternalState().isPlaying) {
			return false;
		}
		
		try {
			const gameState = this.gameManager.getMainGameState();
			if (!gameState) {
				return false;
			}
			
			return Boolean(gameState.isGameOver);
		} catch (error) {
			console.error('Error checking game over state:', error);
			return false;
		}
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
