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
			phase: 'not_started',
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
		
		const screenRenderers = {
			'schedule': this.renderTournamentSchedule,
			'winner': this.renderTournamentWinner
		};
		
		const content = screenRenderers[state.currentScreen]?.call(this) || this.renderTournamentSchedule();
		render(content, this.container);
		this.setupEventListeners();
		
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
		
		let buttonText = 'Start Tournament';
		if (phase === 'pool' && nextGame?.isNewMatch) {
			buttonText = (nextGame.matchIndex === 0) ? 'Start First Match' : 'Next Match';
		} else if (phase === 'finals') {
			buttonText = 'Start Finals';
		}
		
		const matchesList = schedule.map((match, index) => {
			let statusClass = '';
			
			if (match.isComplete) {
				statusClass = 'match-complete';
			} else if (match.isCurrent) {
				statusClass = 'match-current';
			} else if (match.isFinals && (phase === 'pool' || phase === 'not_started')) {
				statusClass = 'match-pending-finals';
			}
			
			return html`
				<div class="tournament-match ${statusClass} ${match.isFinals ? 'finals-match' : ''}">
					<div class="match-number">${match.isFinals ? 'FINALS' : `Match ${index + 1}`}</div>
					<div class="match-players">
						<div class="match-player match-player-left">
							${match.player1Name}
							<span class="player-score ${match.isComplete ? 'visible' : ''}">
								${match.isComplete ? match.player1Score : ''}
							</span>
						</div>
						<div class="vs">VS</div>
						<div class="match-player match-player-right">
							<span class="player-score ${match.isComplete ? 'visible' : ''}">
								${match.isComplete ? match.player2Score : ''}
							</span>
							${match.player2Name}
						</div>
					</div>
					<div class="match-status">${!match.isComplete && match.isCurrent ? 'NEXT' : ''}</div>
				</div>
			`;
		});
		
		return html`
			<button class="back-button nav-item" onclick="${() => this.onBackToMenu()}">
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
				<button class="menu-button continue-button">${buttonText}</button>
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
				
				<div class="winner-name" style="color: ${winner.color};">
					${winner.name}
				</div>
				
				<div class="winner-description">
					Congratulations! You are the Pong Tournament Champion!
				</div>
				
				<div class="tournament-controls">
					<button class="menu-button back-button">Back to Menu</button>
				</div>
			</div>
		`;
	}
	
	private setupEventListeners(): void {
		const continueButton = this.container.querySelector('.continue-button');
		
		if (continueButton) {
			const newButton = continueButton.cloneNode(true);
			continueButton.parentNode?.replaceChild(newButton, continueButton);
			
			newButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					this.onContinue();
					setTimeout(() => this.inTransition = false, 100);
				}
			});
		}
		
		// Set up back button
		const backButton = this.container.querySelector('.back-button');
		if (backButton) {
			const newButton = backButton.cloneNode(true);
			backButton.parentNode?.replaceChild(newButton, backButton);
			
			newButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					this.onBackToMenu();
					setTimeout(() => this.inTransition = false, 100);
				}
			});
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
		this.updateInternalState({
			visible: true,
			phase: TournamentCache.getTournamentPhase(),
			currentScreen: 'schedule'
		});
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
		
		// If tournament hasn't started yet, mark it as started
		if (phase === 'not_started') {
			TournamentCache.setTournamentPhase('pool');
			this.onContinue(); // Start the first match
			return;
		}
		
		// Mark current match as complete if valid
		if (currentIndex >= 0 && currentIndex < matches.length) {
			TournamentCache.completeCurrentMatch();
		}
		
		// Find next match
		const nextIndex = TournamentCache.findNextMatchIndex();
		
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
		
		// Get player info for the next match
		return {
			playerIds: [
				TournamentCache.getTournamentPlayers()[nextMatch.matchInfo.player1Id].id,
				TournamentCache.getTournamentPlayers()[nextMatch.matchInfo.player2Id].id
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
