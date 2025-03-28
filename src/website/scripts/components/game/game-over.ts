/**
 * Game Over Component Module
 * Displays the game over screen with results and options to play again or return to menu.
 * Handles user interactions after a game has completed.
 */
import { Component } from '@website/scripts/components';
import { html, render, ASCII_ART } from '@website/scripts/utils';
import { GameMode } from '@shared/types';
import { GameManager } from '@website/scripts/components/game/game-manager';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Game over component state interface
 */
interface GameOverState {
	visible: boolean;
	winner: string;
	gameMode: GameMode;
	player1Name: string;
	player2Name: string;
	player1Score: number;
	player2Score: number;
	playerIds?: number[];
}

// =========================================
// GAME OVER COMPONENT
// =========================================

export class GameOverComponent extends Component<GameOverState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private onPlayAgain: (mode: GameMode) => void;
	private onBackToMenu: () => void;
	private inTransition: boolean = false;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(
		container: HTMLElement, 
		onPlayAgain: (mode: GameMode) => void,
		onBackToMenu: () => void
	) {
		super(container, {
			visible: false,
			winner: '',
			gameMode: GameMode.SINGLE,
			player1Name: 'Player 1',
			player2Name: 'Player 2',
			player1Score: 0,
			player2Score: 0
		});
		
		this.onPlayAgain = onPlayAgain;
		this.onBackToMenu = onBackToMenu;
		
		// Listen for game end events
		window.addEventListener('gameOver', this.handleGameOver.bind(this) as EventListener);
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	render(): void {
		const state = this.getInternalState();
		
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		const gameOverContent = html`
			<div class="game-container">
				<div class="game-menu">
					<div class="ascii-title-container">
						<pre class="ascii-title">${ASCII_ART.GAME_OVER}</pre>
					</div>
					<div class="game-result">
						<div class="winner">${state.winner} Wins!</div>
						<div class="score-display">
							<div class="player-score">
								<span class="player-name">${state.player1Name}</span>
								<span class="score">${String(state.player1Score)}</span>
							</div>
							<div class="score-separator">vs</div>
							<div class="player-score">
								<span class="player-name">${state.player2Name}</span>
								<span class="score">${String(state.player2Score)}</span>
							</div>
						</div>
					</div>
					<div class="menu-buttons">
						<button class="menu-button play-again-button">
							Play Again
						</button>
						<button class="menu-button back-menu-button">
							Back to Menu
						</button>
					</div>
				</div>
			</div>
		`;
		
		render(gameOverContent, this.container);
		this.setupEventListeners();
	}
	
	destroy(): void {
		window.removeEventListener('gameOver', this.handleGameOver.bind(this) as EventListener);
		super.destroy();
	}
	
	// =========================================
	// EVENT HANDLING
	// =========================================
	
	/**
	 * Sets up event listeners for game over buttons
	 */
	private setupEventListeners(): void {
		const playAgainButton = this.container.querySelector('.play-again-button');
		if (playAgainButton) {
			playAgainButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					
					// Show the background game if it was hidden
					const gameManager = GameManager.getInstance();
					gameManager.showBackgroundGame();
					
					// Call the play again callback with the current game mode
					console.log('Play Again clicked, restarting game with mode:', this.getInternalState().gameMode);
					this.onPlayAgain(this.getInternalState().gameMode);
					
					// Reset transition flag after a delay
					setTimeout(() => {
						this.inTransition = false;
					}, 500);
				} else {
					console.log('Ignoring play again request - transition already in progress');
				}
			});
		}
		
		const backMenuButton = this.container.querySelector('.back-menu-button');
		if (backMenuButton) {
			backMenuButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					
					// Ensure background game is shown when returning to menu
					const gameManager = GameManager.getInstance();
					gameManager.showBackgroundGame();
					
					this.onBackToMenu();
					
					setTimeout(() => {
						this.inTransition = false;
					}, 500);
				} else {
					console.log('Ignoring back to menu request - transition already in progress');
				}
			});
		}
	}
	
	// =========================================
	// STATE MANAGEMENT
	// =========================================
	
	/**
	 * Shows the game over screen with results
	 * @param result - Object containing game result information
	 */
	showGameResult(result: {
		winner: string;
		gameMode: GameMode;
		player1Name?: string;
		player2Name?: string;
		player1Score?: number;
		player2Score?: number;
		playerIds?: number[];
	}): void {
		if (this.inTransition) {
			console.log('Ignoring game result display - transition already in progress');
			return;
		}
		
		this.inTransition = true;
		console.log('Showing game result:', result);
		
		this.updateInternalState({
			...result,
			player1Name: result.player1Name || 'Player 1',
			player2Name: result.player2Name || 'Player 2',
			player1Score: result.player1Score || 0,
			player2Score: result.player2Score || 0,
			visible: true
		});
		
		// Show the background game again - it may have been hidden
		const gameManager = GameManager.getInstance();
		gameManager.showBackgroundGame();
		
		// Reset transition flag after a short delay
		setTimeout(() => {
			this.inTransition = false;
		}, 500);
	}
	
	/**
	 * Hides the game over screen
	 */
	hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	// Add this method to handle game over events
	private handleGameOver(event: Event): void {
		const customEvent = event as CustomEvent;
		if (customEvent.detail) {
			const result = customEvent.detail;
			
			// Use the GameManager to get the current game mode
			const gameManager = (window as any).gameManager || GameManager.getInstance();
			const gameMode = gameManager.getGameMode ? gameManager.getGameMode() : GameMode.SINGLE;
			
			this.showGameResult({
				winner: result.winner ? result.winner.name : 'Unknown',
				gameMode: gameMode,
				player1Name: result.player1Name,
				player2Name: result.player2Name,
				player1Score: result.player1Score,
				player2Score: result.player2Score
			});
		}
	}
}
