/**
 * Game Over Component Module
 * Displays the game over screen with results and options to play again or return to menu.
 * Handles user interactions after a game has completed.
 */
import { Component, GameMode } from '@website/scripts/components';
import { html, render, ASCII_ART } from '@website/scripts/utils';

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
			gameMode: GameMode.SINGLE
		});
		
		this.onPlayAgain = onPlayAgain;
		this.onBackToMenu = onBackToMenu;
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
					<div class="ascii-title">
						<pre class="game-over-title">${ASCII_ART.GAME_OVER}</pre>
					</div>
					<div class="game-result">
						<div class="winner">${state.winner} Wins!</div>
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
		super.destroy();
		// Remove event listeners if needed
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
				this.onPlayAgain(this.getInternalState().gameMode);
			});
		}
		
		const backMenuButton = this.container.querySelector('.back-menu-button');
		if (backMenuButton) {
			backMenuButton.addEventListener('click', () => {
				this.onBackToMenu();
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
	}): void {
		this.updateInternalState({
			...result,
			visible: true
		});
	}
	
	/**
	 * Hides the game over screen
	 */
	hide(): void {
		this.updateInternalState({ visible: false });
	}
}
