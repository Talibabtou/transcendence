import { Component, GameManager } from '@website/scripts/components';
import { ASCII_ART, calculateUIPositions, MatchCache } from '@website/scripts/utils';
import { html, render } from '@website/scripts/services';
import { GameMode, GameOverState } from '@website/types';

export class GameOverComponent extends Component<GameOverState> {
	private onPlayAgain: (mode: GameMode) => void;
	private onBackToMenu: () => void;
	private onShowTournamentSchedule: () => void;
	private inTransition: boolean = false;
	private boundGameOverHandler: EventListener;
	private boundResizeHandler: EventListener;
	
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
			player2Score: 0,
			isTimeout: false
		});
		
		this.onPlayAgain = onPlayAgain;
		this.onBackToMenu = onBackToMenu;
		this.onShowTournamentSchedule = onShowTournamentSchedule;
		
		this.boundGameOverHandler = this.handleGameOver.bind(this) as EventListener;
		this.boundResizeHandler = this.handleResize.bind(this) as EventListener;
		
		window.addEventListener('gameOver', this.boundGameOverHandler);
		window.addEventListener('resize', this.boundResizeHandler);
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Renders the game over screen with player names, scores, and buttons.
	 * If the component is not visible, it clears the container.
	 */
	render(): void {
		const state = this.getInternalState();
		
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		const { canvasWidth, canvasHeight } = this.getCanvasDimensions();
		const ui = calculateUIPositions(canvasWidth, canvasHeight);
		
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
							${state.player1Score}
						</div>
						<div class="go-score" style="
							left: ${ui.scores.player2.left}; 
							top: ${ui.scores.player2.top}; 
							font-size: ${ui.scores.player2.fontSize};">
							${state.player2Score}
						</div>
					</div>
					
					<div class="go-content">
						<div class="go-ascii-container">
							<pre class="ascii-title">${ASCII_ART.GAME_OVER}</pre>
						</div>
						<div class="go-winner">
							${state.isTimeout ? 'Match Timed Out' : `${state.winner} Wins!`}
						</div>
						<div class="go-buttons">
							${this.renderButtons(state.gameMode)}
						</div>
					</div>
				</div>
			</div>
		`;
		
		render(content, this.container);
	}
	
	/**
	 * Renders the appropriate buttons based on game mode
	 */
	private renderButtons(gameMode: GameMode) {
		return gameMode === GameMode.TOURNAMENT 
			? html`
				<button class="menu-button show-pool-button" 
						onclick="${() => this.handleShowTournamentSchedule()}">
					Show Pool
				</button>
				<button class="menu-button back-menu-button" 
						onclick="${() => this.handleBackToMenu()}">
					Back to Menu
				</button>
			`
			: html`
				<button class="menu-button play-again-button" 
						onclick="${() => this.handlePlayAgain()}">
					Play Again
				</button>
				<button class="menu-button back-menu-button" 
						onclick="${() => this.handleBackToMenu()}">
					Back to Menu
				</button>
			`;
	}
	
	/**
	 * Gets the appropriate canvas dimensions for UI positioning
	 */
	private getCanvasDimensions() {
		const backgroundCanvas = document.getElementById('background-game-canvas') as HTMLCanvasElement | null;
		
		if (backgroundCanvas && backgroundCanvas.width > 0 && backgroundCanvas.height > 0) {
			return { 
				canvasWidth: backgroundCanvas.width, 
				canvasHeight: backgroundCanvas.height 
			};
		}
		
		let canvasWidth = this.container.clientWidth;
		let canvasHeight = this.container.clientHeight;
		
		if (canvasWidth === 0 || canvasHeight === 0) {
			const genericCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
			
			if (genericCanvas?.width && genericCanvas?.height && genericCanvas.width > 0 && genericCanvas.height > 0) {
				canvasWidth = genericCanvas.width;
				canvasHeight = genericCanvas.height;
			} else {
				canvasWidth = window.innerWidth;
				canvasHeight = window.innerHeight;
			}
		}
		
		return { canvasWidth, canvasHeight };
	}
	
	/**
	 * Cleans up event listeners and button event handlers when the component is destroyed.
	 */
	destroy(): void {
		window.removeEventListener('gameOver', this.boundGameOverHandler);
		window.removeEventListener('resize', this.boundResizeHandler);
		
		['play-again-button', 'back-menu-button', 'show-pool-button'].forEach(selector => {
			const button = this.container.querySelector(`.${selector}`);
			if (button) button.replaceWith(button.cloneNode(true));
		});
		
		super.destroy();
	}
	
	// =========================================
	// EVENT HANDLING
	// =========================================
	
	/**
	 * Handles window resize events to re-render the component if visible.
	 */
	private handleResize(): void {
		if (this.getInternalState().visible && !this.inTransition) {
			this.renderComponent();
		}
	}
	
	/**
	 * Shows the game over screen with the provided game result.
	 * @param result - The game result containing winner, game mode, player names, scores, and optional match ID.
	 */
	showGameResult(result: {
		winner: string;
		gameMode: GameMode;
		player1Name: string;
		player2Name: string;
		player1Score: number;
		player2Score: number;
		matchId?: string;
		isTimeout?: boolean;
	}): void {
		if (this.inTransition) return;
		
		this.inTransition = true;
		this.updateInternalState({ ...result, visible: true });
		this.renderComponent();
		
		GameManager.getInstance().showBackgroundGame();
		this.inTransition = false;
	}
	
	/**
	 * Hides the game over screen.
	 */
	hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	/**
	 * Handles the game over event, showing the game over screen with cached match data.
	 * @param event - The game over event.
	 */
	private handleGameOver(event: Event): void {
		const customEvent = event as CustomEvent;
		if (!customEvent.detail) return;
		
		const isBackgroundGame = customEvent.detail.isBackgroundGame === true;
		const isCurrentlyVisible = this.getInternalState().visible;
		const noMatchId = customEvent.detail.matchId === null;
		
		if ((noMatchId || isBackgroundGame) && isCurrentlyVisible) return;
		if (this.inTransition) return;

		const cachedResult = MatchCache.getLastMatchResult();
		const gameInfo = MatchCache.getCurrentGameInfo();

		if (cachedResult && !cachedResult.isBackgroundGame) {
			this.showGameResult({
				winner: cachedResult.winner || '',
				gameMode: gameInfo.gameMode,
				player1Name: cachedResult.player1Name,
				player2Name: cachedResult.player2Name,
				player1Score: cachedResult.player1Score,
				player2Score: cachedResult.player2Score,
				matchId: cachedResult.matchId,
				isTimeout: cachedResult.isTimeout
			});
		}
	}
	
	/**
	 * Handles the show tournament schedule button click, transitioning to the tournament schedule.
	 */
	private handleShowTournamentSchedule(): void {
		if (this.inTransition) return;
		
		this.inTransition = true;
		this.hide();
		this.onBackToMenu();
		
		setTimeout(() => {
			this.onShowTournamentSchedule?.();
			this.inTransition = false;
		}, 50);
	}
	
	/**
	 * Handles the back to menu button click, transitioning back to the main menu.
	 */
	private handleBackToMenu(): void {
		if (this.inTransition) return;
		
		this.inTransition = true;
		this.onBackToMenu();
		setTimeout(() => this.inTransition = false, 100);
	}
	
	/**
	 * Handles the play again button click, restarting the game in the current game mode.
	 */
	private handlePlayAgain(): void {
		if (this.inTransition) return;
		
		this.inTransition = true;
		this.onPlayAgain(MatchCache.getCurrentGameInfo().gameMode);
		setTimeout(() => this.inTransition = false, 100);
	}
}
