import { Component } from '@website/scripts/components';
import { html, render, ASCII_ART, TournamentCache, TournamentPhase } from '@website/scripts/utils';

export interface TournamentTransitionsState {
	visible: boolean;
	phase: TournamentPhase;
	currentScreen: 'schedule' | 'winner';
}

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
	}
	
	render(): void {
		const state = this.getInternalState();
		
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		this.container.className = 'players-register-container';
		
		// Force winner screen if tournament is complete
		const phase = TournamentCache.getTournamentPhase();
		if (phase === 'complete' && state.currentScreen !== 'winner') {
			this.updateInternalState({
				currentScreen: 'winner'
			});
			// Call render again after state update
			setTimeout(() => this.render(), 0);
			return;
		}
		
		const screenRenderers = {
			'schedule': this.renderTournamentSchedule,
			'winner': this.renderTournamentWinner
		};
		
		const content = screenRenderers[state.currentScreen]?.call(this) || this.renderTournamentSchedule();
		render(content, this.container);
		
		// Display tournament state and expiration info (for debugging)
		const tournament = TournamentCache.getTournamentData();
		const expirationTime = TournamentCache.getExpirationTime();
		const currentTime = new Date().getTime();
		const timeRemaining = expirationTime - currentTime;
		const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
		
		console.log('Tournament State:', {
			phase: tournament.phase,
			players: tournament.players.map(p => p.name),
			matches: tournament.matches.length,
			currentMatchIndex: tournament.currentMatchIndex
		});
		console.log(`Tournament data will expire in ${minutesRemaining} minutes`);
	}
	
	private renderTournamentSchedule(): any {
		const schedule = TournamentCache.getTournamentSchedule();
		const phase = TournamentCache.getTournamentPhase();
		const nextGame = TournamentCache.getNextGameInfo();
		
		let buttonText = 'Start First Match';
		if (phase === 'pool' && nextGame?.matchIndex !== undefined && nextGame.matchIndex > 0) {
			buttonText = 'Next Match';
		} else if (phase === 'finals') {
			buttonText = 'Start Finals';
		}
		
		const matchesList = schedule.map((match, index) => {
			let statusClass = '';
			
			if (match.isComplete) {
				statusClass = 'match-complete';
			} else if (match.isCurrent) {
				statusClass = 'match-current';
			} else if (match.isFinals && (phase === 'pool')) {
				statusClass = 'match-pending-finals';
			}
			
			// Determine winner and loser for styling
			let player1Class = '';
			let player2Class = '';
			
			// Get actual game scores instead of match wins
			let player1Score = 0;
			let player2Score = 0;
			
			if (match.isComplete) {
				// Just use the player1Score and player2Score directly
				// Player1Score and player2Score are now the actual game scores
				player1Score = match.player1Score || 0;
				player2Score = match.player2Score || 0;
				
				// Set winner/loser classes
				if (player1Score > player2Score) {
					player1Class = 'winner-name';
					player2Class = 'loser-name';
				} else {
					player1Class = 'loser-name';
					player2Class = 'winner-name';
				}
			}
			
			return html`
				<div class="tournament-match ${statusClass} ${match.isFinals ? 'finals-match' : ''}">
					<div class="match-number">${match.isFinals ? 'FINALS' : `Match ${index + 1}`}</div>
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
			
			<div class="ascii-title-container">
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
	
	private handleBackToMenu(): void {
		if (!this.inTransition) {
			this.inTransition = true;
			this.onBackToMenu();
			setTimeout(() => this.inTransition = false, 100);
		}
	}
	
	private handleContinueButton(): void {
		if (!this.inTransition) {
			this.inTransition = true;
			this.onContinue();
			setTimeout(() => this.inTransition = false, 100);
		}
	}
	
	private handleCancelTournament(): void {
		if (this.inTransition) return;
		
		this.inTransition = true;
		
		// Clear the tournament cache
		TournamentCache.clearTournament();
		this.hide();
		this.onBackToMenu();
		
		setTimeout(() => {
			this.inTransition = false;
		}, 100);
	}
	
	// Public methods to control screen visibility
	
	public showTournamentSchedule(): void {
		// First check if tournament is complete - if so, force winner screen
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
		
		// Force a render to update the view
		this.renderComponent();
	}
	
	public showTournamentWinner(): void {
		this.updateInternalState({
			visible: true,
			phase: 'complete',
			currentScreen: 'winner'
		});
	}
	
	public hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	public proceedToNextMatch(): void {
		const currentIndex = TournamentCache.getCurrentMatchIndex();
		const matches = TournamentCache.getTournamentMatches();
		const phase = TournamentCache.getTournamentPhase();
		
		console.log("proceedToNextMatch called", { currentIndex, phase });
		
		// If tournament is already complete, show winner screen directly
		if (phase === 'complete') {
			this.showTournamentWinner();
			return;
		}
		
		// If it's the first match of the pool phase, start it directly
		const currentMatch = TournamentCache.getCurrentMatch();
		if (phase === 'pool' && (!currentMatch || currentMatch.gamesPlayed === 0) && currentIndex === 0) {
			this.onContinue(); // Start the first match
			return;
		}
		
		// Find next match
		const nextIndex = TournamentCache.findNextMatchIndex();
		console.log("Next match index:", nextIndex);
		
		if (nextIndex >= 0) {
			// Check if moving to finals
			const isMovingToFinals = TournamentCache.getTournamentPhase() === 'pool' && 
				matches[nextIndex].isFinals;
			
			if (isMovingToFinals) {
				TournamentCache.setTournamentPhase('finals');
			}
			
			// Set as current match and show schedule
			TournamentCache.setCurrentMatchIndex(nextIndex);
			this.showTournamentSchedule();
		} else {
			// Tournament complete
			TournamentCache.setTournamentPhase('complete');
			this.showTournamentWinner();
		}
	}
	
	/**
	 * Handle continuing to the next match in tournament
	 * @returns Object with playerInfo if match found, null if tournament complete
	 */
	public handleContinue(): {
		playerIds: number[];
		playerNames: string[];
		playerColors: string[];
	} | null {
		const nextMatch = TournamentCache.getNextGameInfo();
		
		if (!nextMatch) {
			// No more matches
			return null;
		}
		
		// Hide tournament screen
		this.hide();
		
		// Get player info for the next match - don't use player IDs as array indices
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
			]
		};
	}
	
	/**
	 * Process game result and update tournament
	 * @param player1Score - Score of player 1
	 * @param player2Score - Score of player 2
	 * @param matchId - Optional match ID
	 */
	public processGameResult(player1Score: number, player2Score: number, matchId?: number): void {
		// Record the result in tournament cache
		TournamentCache.recordGameResult(player1Score, player2Score, matchId);
		
		// Proceed to next match
		this.proceedToNextMatch();
	}
}
