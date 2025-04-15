import { Component } from '@website/scripts/components';
import { html, render, ASCII_ART, TournamentCache, TournamentPhase } from '@website/scripts/utils';

export interface TournamentTransitionsState {
	visible: boolean;
	phase: TournamentPhase;
	currentScreen: 'schedule' | 'match-results' | 'finals-intro' | 'winner';
}

export class TournamentTransitionsComponent extends Component<TournamentTransitionsState> {
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
		
		console.log('Tournament transition render called, visible:', state.visible);
		
		if (!state.visible) {
			this.container.innerHTML = '';
			console.log('Tournament transition hidden');
			return;
		}
		
		const screenRenderers = {
			'schedule': this.renderTournamentSchedule,
			'match-results': this.renderMatchResults,
			'finals-intro': this.renderFinalsIntro,
			'winner': this.renderTournamentWinner
		};
		
		console.log('Rendering screen:', state.currentScreen);
		
		const content = screenRenderers[state.currentScreen]?.call(this) || this.renderTournamentSchedule();
		render(content, this.container);
		console.log('Content rendered, setting up event listeners');
		this.setupEventListeners();
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
			let statusText = '';
			let nextMatchStyles = '';
			
			if (match.isComplete) {
				statusClass = 'match-complete';
				statusText = `${match.player1Score}-${match.player2Score}`;
			} else if (match.isCurrent) {
				statusClass = 'match-current';
				statusText = 'NEXT';
				nextMatchStyles = `
					border: 0.25rem solid white;
					box-shadow: 0 0 1.5rem rgba(255, 255, 255, 0.7);
					transform: scale(1.05);
					z-index: 2;
				`;
			} else if (match.isFinals && (phase === 'pool' || phase === 'not_started')) {
				statusClass = 'match-pending-finals';
			}
			
			return html`
				<div class="tournament-match ${statusClass} ${match.isFinals ? 'finals-match' : ''}" 
					 style="${nextMatchStyles}">
					<div class="match-number">${match.isFinals ? 'FINALS' : `Match ${index + 1}`}</div>
					<div class="match-players">
						<div class="match-player">${match.player1Name}</div>
						<div class="vs">VS</div>
						<div class="match-player">${match.player2Name}</div>
					</div>
					<div class="match-status">${statusText}</div>
				</div>
			`;
		});
		
		const content = html`
			<div class="tournament-screen">
				<div class="ascii-title-container">
					<div class="ascii-title">${phase === 'finals' ? ASCII_ART.FINALE : ASCII_ART.POOL}</div>
				</div>
				
				<div class="tournament-matches-list">
					${matchesList}
				</div>
				
				<div class="tournament-controls">
					<button class="menu-button continue-button">${buttonText}</button>
					${phase !== 'not_started' && phase !== 'complete' ? `<button class="menu-button back-button">Back to Menu</button>` : ''}
				</div>
			</div>
		`;
		
		console.log('Tournament schedule render complete, button text:', buttonText);
		return content;
	}
	
	private renderMatchResults(): any {
		const currentMatch = TournamentCache.getCurrentMatch();
		if (!currentMatch) return this.renderTournamentSchedule();
		
		const player1 = TournamentCache.getTournamentPlayers()[currentMatch.player1Index];
		const player2 = TournamentCache.getTournamentPlayers()[currentMatch.player2Index];
		
		const player1Wins = currentMatch.games.filter(g => g.winner === currentMatch.player1Index).length;
		const player2Wins = currentMatch.games.filter(g => g.winner === currentMatch.player2Index).length;
		
		const winnerName = player1Wins > player2Wins ? player1.name : player2.name;
		
		// Determine button text based on match completion
		let buttonText = 'Continue';
		if (currentMatch.completed) {
			buttonText = 'Next Match';
			const isLastPoolMatch = TournamentCache.getTournamentPhase() === 'pool' && 
				TournamentCache.getCurrentMatchIndex() === TournamentCache.getTournamentMatches().length - 2;
			
			if (isLastPoolMatch) {
				buttonText = 'To Finals';
			}
		}
		
		// Generate list of game results
		const gamesList = currentMatch.games.map((game, index) => {
			const winner = game.winner === currentMatch.player1Index ? player1.name : player2.name;
			return html`
				<div class="game-result">
					<div class="game-number">Game ${index + 1}</div>
					<div class="game-scores">
						<span class="player1-score ${game.winner === currentMatch.player1Index ? 'winner' : ''}">${game.player1Score}</span>
						<span class="score-separator">-</span>
						<span class="player2-score ${game.winner === currentMatch.player2Index ? 'winner' : ''}">${game.player2Score}</span>
					</div>
					<div class="game-winner">${winner} won</div>
				</div>
			`;
		}).join('');
		
		return html`
			<div class="tournament-screen">
				<div class="ascii-title">
					<pre class="match-header">MATCH RESULTS</pre>
					<div class="match-title">${player1.name} vs ${player2.name}</div>
				</div>
				
				<div class="match-summary">
					<div class="match-score">
						<span class="player1-score ${player1Wins > player2Wins ? 'winner' : ''}">${player1Wins}</span>
						<span class="score-separator">-</span>
						<span class="player2-score ${player2Wins > player1Wins ? 'winner' : ''}">${player2Wins}</span>
					</div>
					
					${currentMatch.completed ? `<div class="match-winner">${winnerName} wins the match!</div>` : ''}
				</div>
				
				<div class="games-list">
					${gamesList}
				</div>
				
				<div class="tournament-controls">
					<button class="menu-button continue-button">${buttonText}</button>
					<button class="menu-button back-button">Back to Menu</button>
				</div>
			</div>
		`;
	}
	
	private renderFinalsIntro(): any {
		const finalsMatch = TournamentCache.getTournamentSchedule()
			.find(match => match.isFinals);
		
		if (!finalsMatch) return this.renderTournamentSchedule();
		
		return html`
			<div class="tournament-screen">
				<div class="ascii-title">
					<pre class="finals-ascii">${ASCII_ART.FINALE || 'FINALS'}</pre>
				</div>
				
				<div class="finalists">
					<div class="finalist">${finalsMatch.player1Name}</div>
					<div class="vs">VS</div>
					<div class="finalist">${finalsMatch.player2Name}</div>
				</div>
				
				<div class="finals-description">
					Best of 3 games will determine the tournament champion!
				</div>
				
				<div class="tournament-controls">
					<button class="menu-button continue-button">Start Finals</button>
					<button class="menu-button back-button">Back to Menu</button>
				</div>
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
		console.log('Setting up tournament transition event listeners');
		
		const continueButton = this.container.querySelector('.continue-button');
		console.log('Continue button found:', continueButton !== null);
		
		if (continueButton) {
			console.log('Adding click listener to continue button');
			const newButton = continueButton.cloneNode(true);
			continueButton.parentNode?.replaceChild(newButton, continueButton);
			
			newButton.addEventListener('click', () => {
				console.log('Continue button clicked!');
				if (!this.inTransition) {
					console.log('Not in transition, proceeding');
					this.inTransition = true;
					this.onContinue();
					setTimeout(() => this.inTransition = false, 100);
				}
			});
		} else {
			console.error('Continue button not found!');
		}
		
		// Set up back button
		const backButton = this.container.querySelector('.back-button');
		if (backButton) {
			console.log('Adding click listener to back button');
			const newButton = backButton.cloneNode(true);
			backButton.parentNode?.replaceChild(newButton, backButton);
			
			newButton.addEventListener('click', () => {
				console.log('Back button clicked!');
				if (!this.inTransition) {
					this.inTransition = true;
					this.onBackToMenu(); // Call the provided callback
					setTimeout(() => this.inTransition = false, 100);
				}
			});
		} else {
			console.log('Back button not found or not applicable for current phase');
		}
	}
	
	// Public methods to control screen visibility
	
	public showTournamentSchedule(): void {
		this.updateInternalState({
			visible: true,
			phase: TournamentCache.getTournamentPhase(),
			currentScreen: 'schedule'
		});
	}
	
	public showMatchResults(matchIndex: number): void {
		const matches = TournamentCache.getTournamentMatches();
		if (matchIndex < 0 || matchIndex >= matches.length) {
			console.error('Invalid match index:', matchIndex);
			return;
		}
		
		TournamentCache.setCurrentMatchIndex(matchIndex);
		
		this.updateInternalState({
			visible: true,
			phase: TournamentCache.getTournamentPhase(),
			currentScreen: 'match-results'
		});
	}
	
	public showFinalsIntro(): void {
		this.updateInternalState({
			visible: true,
			phase: 'finals',
			currentScreen: 'finals-intro'
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
		
		console.log('proceedToNextMatch: phase=', phase, 'currentIndex=', currentIndex);
		
		// If tournament hasn't started yet, mark it as started
		if (phase === 'not_started') {
			console.log('Setting tournament phase to pool');
			TournamentCache.setTournamentPhase('pool');
			console.log('Calling onContinue to start first match');
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
			// Set as current match and show schedule
			TournamentCache.setCurrentMatchIndex(nextIndex);
			this.showTournamentSchedule();
		} else if (TournamentCache.getTournamentPhase() === 'pool') {
			// If no more pool matches, proceed to finals
			TournamentCache.setTournamentPhase('finals');
			this.showFinalsIntro();
		} else {
			// Tournament complete
			TournamentCache.setTournamentPhase('complete');
			this.showTournamentWinner();
		}
	}
}
