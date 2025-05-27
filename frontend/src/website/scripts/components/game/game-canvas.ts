import { Component, GameManager } from '@website/scripts/components';
import { GameEngine } from '@pong/game/engine';
import { GameMode, GameCanvasState } from '@website/types';
import { NotificationManager } from '@website/scripts/services';

export class GameCanvasComponent extends Component<GameCanvasState> {
	private canvas: HTMLCanvasElement | null = null;
	private gameManager: GameManager;
	private gameEngine: GameEngine | null = null;
	
	/**
	 * Creates a new game canvas component
	 * @param container The HTML element to render the component into
	 */
	constructor(container: HTMLElement) {
		super(container, {
			visible: false,
			isPlaying: false,
			isPaused: false
		});

		this.gameManager = GameManager.getInstance();
	}

	/**
	 * Prepares the component before rendering
	 */
	beforeRender(): void {
	}

	/**
	 * Renders the component
	 */
	render(): void {
		this.container.innerHTML = '';
	}
	
	/**
	 * Cleans up resources used by the component
	 */
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
			playerColors?: string[],
			tournamentId?: string,
			isFinal?: boolean
		}
	): void {
		this.updateInternalState({
			visible: true,
			isPlaying: true
		});

		this.gameManager.startMainGame(mode, this.container, playerInfo);

		if (this.gameEngine) {
			if (playerInfo?.playerNames && playerInfo.playerNames.length > 0) {
				const player1Name = playerInfo.playerNames[0] || 'Player 1';
				const player2Name = playerInfo.playerNames.length > 1 ? playerInfo.playerNames[1] : 'Player 2';
				this.gameEngine.setPlayerNames(player1Name, player2Name);
			}
			
			if (playerInfo?.playerColors && playerInfo.playerColors.length > 0) {
				const player1Color = playerInfo.playerColors[0] || '#ffffff';
				const player2Color = playerInfo.playerColors.length > 1 ? playerInfo.playerColors[1] : '#ffffff';
				this.gameEngine.updatePlayerColors(player1Color, player2Color);
			}
			
			if (playerInfo?.playerIds && playerInfo.playerIds.length > 0) {
				if (playerInfo.tournamentId) {
					this.gameEngine.setPlayerIds(playerInfo.playerIds, playerInfo.tournamentId, playerInfo.isFinal || false);
				} else {
					this.gameEngine.setPlayerIds(playerInfo.playerIds);
				}
			}
		}
	}

	/**
	 * Stops and hides the game
	 */
	stopGame(): void {
		try {
			this.updateInternalState({
				visible: false,
				isPlaying: false,
				isPaused: false
			});
			
			this.gameManager.cleanupMainGame();
		} catch (error) {
			this.gameManager.cleanupMainGame();
		}
	}

	/**
	 * Checks if the game is over with proper safeguards
	 * @returns True if the game is over, false otherwise
	 */
	isGameOver(): boolean {
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
			NotificationManager.showError('Error checking game over state');
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
