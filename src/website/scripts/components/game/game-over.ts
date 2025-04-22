/**
 * Game Over Component Module
 * Displays the game over screen with results and options to play again or return to menu.
 * Handles user interactions after a game has completed.
 */
import { Component, GameManager } from '@website/scripts/components';
import { html, render, ASCII_ART, calculateUIPositions, MatchCache } from '@website/scripts/utils';
import { GameMode, GameOverState } from '@shared/types';

export class GameOverComponent extends Component<GameOverState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private onPlayAgain: (mode: GameMode) => void;
	private onBackToMenu: () => void;
	private onShowTournamentSchedule: () => void;
	private inTransition: boolean = false;
	private boundGameOverHandler: EventListener;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(
		container: HTMLElement,
		onPlayAgain: (mode: GameMode) => void,
		onBackToMenu: () => void,
		onShowTournamentSchedule: () => void
	) {
		super(container, {
			visible: false,
			winner: '',
			gameMode: GameMode.SINGLE,
			matchId: null,
			player1Name: 'Player 1',
			player2Name: 'Player 2',
			player1Score: 0,
			player2Score: 0
		});
		
		this.onPlayAgain = onPlayAgain;
		this.onBackToMenu = onBackToMenu;
		this.onShowTournamentSchedule = onShowTournamentSchedule;
		
		// Store the bound handler reference for proper cleanup
		this.boundGameOverHandler = this.handleGameOver.bind(this) as EventListener;
		
		// Listen for game end events
		window.addEventListener('gameOver', this.boundGameOverHandler);
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
		
		// Get dimensions for positioning
		const gameCanvas = document.querySelector('canvas');
		let canvasWidth = this.container.clientWidth;
		let canvasHeight = this.container.clientHeight;
		
		if (gameCanvas) {
			canvasWidth = gameCanvas.width;
			canvasHeight = gameCanvas.height;
		}
		
		const ui = calculateUIPositions(canvasWidth, canvasHeight);
		
		// Game over screen with player names and scores
		const content = html`
			<div class="game-container">
				<div class="game-over-screen">
					<div class="go-player-names">
						<div class="go-player-name" style="
							position: absolute; 
							left: ${ui.playerNames.player1.left}; 
							top: ${ui.playerNames.player1.top}; 
							font-size: ${ui.playerNames.player1.fontSize};">
							${state.player1Name}
						</div>
						<div class="go-player-name" style="
							position: absolute; 
							right: ${ui.playerNames.player2.right}; 
							top: ${ui.playerNames.player2.top}; 
							font-size: ${ui.playerNames.player2.fontSize};">
							${state.player2Name}
						</div>
					</div>
					
					<div class="go-scores">
						<div class="go-score" style="
							left: ${ui.scores.player1.left}; 
							top: ${ui.scores.player1.top}; 
							font-size: ${ui.scores.player1.fontSize};">
							${String(state.player1Score)}
						</div>
						<div class="go-score" style="
							left: ${ui.scores.player2.left}; 
							top: ${ui.scores.player2.top}; 
							font-size: ${ui.scores.player2.fontSize};">
							${String(state.player2Score)}
						</div>
					</div>
					
					<div class="go-content">
						<div class="go-ascii-container">
							<pre class="ascii-title">${ASCII_ART.GAME_OVER}</pre>
						</div>
						<div class="go-winner">${state.winner} Wins!</div>
						<div class="go-buttons">
							${state.gameMode === GameMode.TOURNAMENT 
								? html`
									<button class="menu-button show-pool-button">Show Pool</button>
									<button class="menu-button back-menu-button">Back to Menu</button>
								`
								: html`
									<button class="menu-button play-again-button">Play Again</button>
									<button class="menu-button back-menu-button">Back to Menu</button>
								`}
						</div>
					</div>
				</div>
			</div>
		`;
		
		render(content, this.container);
		this.setupEventListeners();
	}
	
	destroy(): void {
		// Use the stored reference for proper removal
		window.removeEventListener('gameOver', this.boundGameOverHandler);
		
		// Also clean up button event listeners if any are still attached
		const playAgainButton = this.container.querySelector('.play-again-button');
		if (playAgainButton) {
			playAgainButton.replaceWith(playAgainButton.cloneNode(true));
		}
		
		const backMenuButton = this.container.querySelector('.back-menu-button');
		if (backMenuButton) {
			backMenuButton.replaceWith(backMenuButton.cloneNode(true));
		}
		
		super.destroy();
	}
	
	// =========================================
	// EVENT HANDLING
	// =========================================
	
	/**
	 * Sets up event listeners for game over buttons
	 */
	private setupEventListeners(): void {
		// Handle Play Again button (for regular games)
		const playAgainButton = this.container.querySelector('.play-again-button');
		if (playAgainButton) {
			const newButton = playAgainButton.cloneNode(true);
			playAgainButton.parentNode?.replaceChild(newButton, playAgainButton);
			
			newButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					const gameInfo = MatchCache.getCurrentGameInfo();
					this.onPlayAgain(gameInfo.gameMode);
					setTimeout(() => {
						this.inTransition = false;
					}, 100);
				}
			});
		}
		
		// Handle Show Pool button (for tournament matches)
		const showPoolButton = this.container.querySelector('.show-pool-button');
		if (showPoolButton) {
			const newButton = showPoolButton.cloneNode(true);
			showPoolButton.parentNode?.replaceChild(newButton, showPoolButton);
			
			newButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					if (this.onShowTournamentSchedule) {
						this.onShowTournamentSchedule();
					}
					setTimeout(() => {
						this.inTransition = false;
					}, 100);
				}
			});
		}
		
		// Handle Back to Menu button (for all modes)
		const backMenuButton = this.container.querySelector('.back-menu-button');
		if (backMenuButton) {
			const newButton = backMenuButton.cloneNode(true);
			backMenuButton.parentNode?.replaceChild(newButton, backMenuButton);
			
			newButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					this.onBackToMenu();
					setTimeout(() => {
						this.inTransition = false;
					}, 100);
				}
			});
		}
	}
	
	// =========================================
	// STATE MANAGEMENT
	// =========================================
	
	/**
	 * Shows the game over screen with results
	 */
	showGameResult(result: {
		winner: string;
		gameMode: GameMode;
		player1Name: string;
		player2Name: string;
		player1Score: number;
		player2Score: number;
		matchId?: number;
	}): void {
		if (this.inTransition) return;
		
		this.inTransition = true;
		
		// Update state with all the information
		this.updateInternalState({
			...result,
			visible: true
		});
		
		// Just render the component - handle tournament mode in the main render
		this.renderComponent();

		// Show background game except in tournament mode
		if (result.gameMode !== GameMode.TOURNAMENT) {
			const gameManager = GameManager.getInstance();
			gameManager.showBackgroundGame();
		}
		
		this.inTransition = false;
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
		if (!customEvent.detail) return;
		
		// Improved check for background games
		if ((customEvent.detail.matchId === null || customEvent.detail.isBackgroundGame === true) && 
			this.getInternalState().visible) {
			return;
		}
		
		// Prevent processing if already in transition
		if (this.inTransition) return;

		// Get all data from cache
		const cachedResult = MatchCache.getLastMatchResult();
		const gameInfo = MatchCache.getCurrentGameInfo();

		if (cachedResult && !cachedResult.isBackgroundGame) {
			// Show game over screen with cached data
			this.showGameResult({
				winner: cachedResult.winner,
				gameMode: gameInfo.gameMode,
				player1Name: cachedResult.player1Name,
				player2Name: cachedResult.player2Name,
				player1Score: cachedResult.player1Score,
				player2Score: cachedResult.player2Score,
				matchId: cachedResult.matchId
			});
		}
	}
}
