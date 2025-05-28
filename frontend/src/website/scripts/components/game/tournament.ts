import { Component } from '@website/scripts/components';
import { TournamentTransitionsState } from '@website/types/components'
import { ASCII_ART, TournamentCache, appState } from '@website/scripts/utils';
import { html, render, DbService, NotificationManager } from '@website/scripts/services';

export class TournamentComponent extends Component<TournamentTransitionsState> {
	private onContinue: () => void;
	private onBackToMenu: () => void;
	private inTransition: boolean = false;
	
	constructor(
		container: HTMLElement,
		onContinue: () => void,
		onBackToMenu: () => void
	) {
		super(container, {
			visible: false,
			phase: 'pool',
			currentScreen: 'schedule'
		});
		
		this.onContinue = onContinue;
		this.onBackToMenu = onBackToMenu;
		
		// Listen for tournament cancellation events
		document.addEventListener('tournament-cancelled', () => {
			this.handleCancelTournament();
		});
	}
	
	// =========================================
	// RENDERING
	// =========================================
	
	/**
	 * Renders the tournament component into its container
	 */
	render(): void {
		const state = this.getInternalState();
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		this.container.className = 'players-register-container';
		const phase = TournamentCache.getTournamentPhase();
		if (phase === 'complete' && state.currentScreen !== 'winner') {
			this.updateInternalState({
				currentScreen: 'winner'
			});
			setTimeout(() => this.render(), 0);
			return;
		}
		const screenRenderers = {
			'schedule': this.renderTournamentSchedule,
			'winner': this.renderTournamentWinner
		};
		const content = screenRenderers[state.currentScreen]?.call(this) || this.renderTournamentSchedule();
		render(content, this.container);
	}
	
	/**
	 * Renders the tournament schedule screen
	 * @returns HTML template for the tournament schedule
	 */
	private renderTournamentSchedule(): any {
		// Normal synchronous render without awaits
		const schedule = TournamentCache.getTournamentSchedule();
		const phase = TournamentCache.getTournamentPhase();
		const nextGame = TournamentCache.getNextGameInfo();
		let buttonText = 'Start First Match';
		if (phase === 'pool' && nextGame?.matchIndex !== undefined && nextGame.matchIndex > 0) buttonText = 'Next Match';
		else if (phase === 'finals') buttonText = 'Start Finals';
		const matchesList = schedule.map((match, index) => {
			let statusClass = '';
			if (match.isComplete) statusClass = 'match-complete';
			else if (match.isCurrent) statusClass = 'match-current';
			else if (match.isFinals && (phase === 'pool')) statusClass = 'match-pending-finals';
			let player1Class = '';
			let player2Class = '';
			let player1Score = 0;
			let player2Score = 0;
			if (match.isComplete) {
				player1Score = match.player1Score || 0;
				player2Score = match.player2Score || 0;
				if (player1Score > player2Score) {
					player1Class = 'winner-name';
					player2Class = 'loser-name';
				} else {
					player1Class = 'loser-name';
					player2Class = 'winner-name';
				}
			}
			return html`
				<div class="tournament-match ${statusClass} ${match.isFinals ? 'finale-match' : ''}">
					<div class="match-number">${match.isFinals ? 'FINALE' : `Match ${index + 1}`}</div>
					<div class="match-players">
						<div class="match-player match-player-left ${player1Class}">
							${match.player1Name}
						</div>
						<div class="vs">
							${match.isComplete ? `${player1Score} - ${player2Score}` : 'VS'}
						</div>
						<div class="match-player match-player-right ${player2Class}">
							${match.player2Name}
						</div>
					</div>
					<div class="match-status">${!match.isComplete && match.isCurrent ? 'NEXT' : ''}</div>
				</div>
			`;
		});
		return html`
			<button class="back-button nav-item" onclick="${() => this.handleBackToMenu()}">
				← Back
			</button>
			
			<button class="cancel-button" onclick="${() => this.handleCancelTournament()}">
				Cancel
			</button>
			
			<div class="ascii-title-container ascii-title-tournament">
				<div class="ascii-title">${phase === 'finals' ? ASCII_ART.FINALE : ASCII_ART.POOL}</div>
			</div>
			
			<div class="tournament-matches-list">
				${matchesList}
			</div>
			
			<div class="tournament-controls">
				<button class="menu-button continue-button" onclick="${() => this.handleContinueButton()}">
					${buttonText}
				</button>
			</div>
		`;
	}
	
	/**
	 * Renders the tournament winner screen
	 * @returns HTML template for the tournament winner screen
	 */
	private renderTournamentWinner(): any {
		const winner = TournamentCache.getTournamentWinner();
		if (!winner) return this.renderTournamentSchedule();
		return html`
			<div class="tournament-screen">
				<div class="ascii-title">
					<pre class="champion-ascii">${ASCII_ART.CHAMPION || 'CHAMPION'}</pre>
				</div>
				
				<div class="winner-container">
					<div class="winner-name champion-name" style="color: ${winner.color}; text-shadow: 0 0 20px ${winner.color};">
						${winner.name}
					</div>
					
					<div class="winner-description">
						Congratulations!
					</div>
					<div class="winner-description">
						You are the Pong Tournament Champion!
					</div>
				</div>
				
				<div class="tournament-footer">
					<button class="menu-button" onclick="${() => this.handleCancelTournament()}">
						Back to Menu
					</button>
				</div>
			</div>
		`;
	}
	
	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Handles returning to the main menu
	 */
	private handleBackToMenu(): void {
		if (!this.inTransition) {
			this.inTransition = true;
			this.onBackToMenu();
			setTimeout(() => this.inTransition = false, 100);
		}
	}
	
	/**
	 * Handles the continue button press
	 */
	private handleContinueButton(): void {
		if (!this.inTransition) {
			this.inTransition = true;
			this.onContinue();
			setTimeout(() => this.inTransition = false, 100);
		}
	}
	
	/**
	 * Handles canceling the tournament
	 */
	public handleCancelTournament(): void {
		if (this.inTransition) return;
		this.inTransition = true;
		try {
			TournamentCache.clearTournament();
			this.hide();
			this.onBackToMenu();
		} catch (error) {
			window.location.hash = '#menu';
		} finally {
			setTimeout(() => {
				this.inTransition = false;
			}, 100);
		}
	}
	
	// =========================================
	// PUBLIC METHODS
	// =========================================
	
	/**
	 * Shows the tournament schedule screen
	 */
	public async showTournamentSchedule(): Promise<void> {
		const phase = TournamentCache.getTournamentPhase();
		if (phase === 'complete') {
			this.showTournamentWinner();
			return;
		}
		this.updateInternalState({
			visible: true,
			phase: phase,
			currentScreen: 'schedule'
		});
		const tournamentId = TournamentCache.getTournamentId();
		if (tournamentId) {
			try {
				const serverMatches = await DbService.getTournament(tournamentId);
				if (!serverMatches || !Array.isArray(serverMatches) || serverMatches.length === 0) console.log("No tournament matches found on server");
				else TournamentCache.updateMatchFromServer(serverMatches);
				if (TournamentCache.areAllPoolMatchesCompleted() && phase === 'pool') await this.determineTournamentFinalists();
			} catch (error) {
				NotificationManager.showError("Failed to load tournament data");
				this.handleCancelTournament();
				return;
			}
		}
		this.renderComponent();
	}
	
	/**
	 * Determine tournament finalists after all pool matches are completed
	 */
	private async determineTournamentFinalists(): Promise<void> {
		const tournamentId = TournamentCache.getTournamentId();
		if (!tournamentId) {
			NotificationManager.showError("Tournament has no ID");
			return;
		}
		try {
			const finalists = await DbService.getTournamentFinalists(tournamentId);
			if (!finalists || !finalists.player_1 || !finalists.player_2) {
				NotificationManager.showError("Could not determine finalists");
				return;
			}
			const tournamentPlayers = TournamentCache.getTournamentPlayers();
			const player1Index = tournamentPlayers.findIndex(p => p.id === finalists.player_1);
			const player2Index = tournamentPlayers.findIndex(p => p.id === finalists.player_2);
			if (player1Index === -1 || player2Index === -1) {
				NotificationManager.showError("Finalist players not found in tournament");
				return;
			}
			const tournamentMatches = TournamentCache.getTournamentMatches();
			const finalsMatchIndex = tournamentMatches.length - 1;
			tournamentMatches[finalsMatchIndex].player1Index = player1Index;
			tournamentMatches[finalsMatchIndex].player2Index = player2Index;
			TournamentCache.setTournamentPhase('finals');
			TournamentCache.setCurrentMatchIndex(finalsMatchIndex);
			this.renderComponent();
		} catch (error) {
			NotificationManager.showError("Failed to determine tournament finalists");
		}
	}
	
	/**
	 * Shows the tournament winner screen
	 */
	public showTournamentWinner(): void {
		this.updateInternalState({
			visible: true,
			phase: 'complete',
			currentScreen: 'winner'
		});
	}
	
	/**
	 * Hides the tournament component
	 */
	public hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	/**
	 * Proceeds to the next match in the tournament
	 */
	public async proceedToNextMatch(): Promise<void> {
		const currentIndex = TournamentCache.getCurrentMatchIndex();
		const phase = TournamentCache.getTournamentPhase();
		if (phase === 'complete') {
			this.showTournamentWinner();
			return;
		}
		const currentMatch = TournamentCache.getCurrentMatch();
		if (phase === 'pool' && (!currentMatch || currentMatch.gamesPlayed === 0) && currentIndex === 0) {
			this.onContinue();
			return;
		}
		const nextIndex = TournamentCache.findNextMatchIndex();
		if (nextIndex >= 0) {
			const isMovingToFinals = TournamentCache.getTournamentPhase() === 'pool' && 
				TournamentCache.getTournamentMatches()[nextIndex].isFinals;
			if (isMovingToFinals) {
				this.showTournamentSchedule();
				return;
			}
			TournamentCache.setCurrentMatchIndex(nextIndex);
			this.showTournamentSchedule();
		} else {
			TournamentCache.setTournamentPhase('complete');
			this.showTournamentWinner();
		}
	}
	
	/**
	 * Handle continuing to the next match in tournament
	 * @returns Object with playerInfo if match found, null if tournament complete
	 */
	public handleContinue(): {
		playerIds: string[];
		playerNames: string[];
		playerColors: string[];
		tournamentId: string;
		isFinal: boolean;
	} | null {
		const nextMatch = TournamentCache.getNextGameInfo();
		const tournamentId = TournamentCache.getTournamentId();
		const phase = TournamentCache.getTournamentPhase();
		if (!nextMatch || !tournamentId) return null;
		this.hide();
		const isFinal = phase === 'finals';
		return {
			playerIds: [
				nextMatch.matchInfo.player1Id,
				nextMatch.matchInfo.player2Id
			],
			playerNames: [
				nextMatch.matchInfo.player1Name,
				nextMatch.matchInfo.player2Name
			],
			playerColors: [
				nextMatch.matchInfo.player1Color,
				nextMatch.matchInfo.player2Color
			],
			tournamentId: tournamentId,
			isFinal: isFinal
		};
	}
	
	/**
	 * Process game result and update tournament
	 * @param player1Score - Score of player 1
	 * @param player2Score - Score of player 2
	 * @param matchId - Optional match ID
	 */
	public processGameResult(player1Score: number, player2Score: number, matchId?: string): void {
		TournamentCache.recordGameResult(player1Score, player2Score, matchId);
		this.proceedToNextMatch();
	}
	
	/**
	 * Checks if the current user is a registered player in the tournament
	 * @returns boolean indicating if current user can access tournament
	 */
	public isCurrentUserInTournament(): boolean {
		const currentUser = appState.getCurrentUser();
		if (!currentUser) return false;
		const tournamentPlayers = TournamentCache.getTournamentPlayers();
		if (!tournamentPlayers || !tournamentPlayers.length) return false;
		return tournamentPlayers.some(player => player.id === currentUser.id);
	}
	
	/**
	 * Show tournament screen if user has access, otherwise redirect to player registration
	 * @param onRedirectToRegistration Callback to show registration screen
	 * @returns true if tournament shown, false if redirected
	 */
	public showTournamentIfAuthorized(onRedirectToRegistration: () => void): boolean {
		if (this.isCurrentUserInTournament()) {
			this.showTournamentSchedule();
			return true;
		} else {
			onRedirectToRegistration();
			return false;
		}
	}
	
	public destroy(): void {
		document.removeEventListener('tournament-cancelled', this.handleCancelTournament);
		super.destroy();
	}
}
