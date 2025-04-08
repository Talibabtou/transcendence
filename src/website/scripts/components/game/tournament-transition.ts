import { Component } from '@website/scripts/components';
import { html, render, ASCII_ART } from '@website/scripts/utils';
import { TournamentCache, TournamentPhase } from '@website/scripts/utils';

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
		
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		let content;
		
		switch (state.currentScreen) {
			case 'schedule':
				content = this.renderTournamentSchedule();
				break;
			case 'match-results':
				content = this.renderMatchResults();
				break;
			case 'finals-intro':
				content = this.renderFinalsIntro();
				break;
			case 'winner':
				content = this.renderTournamentWinner();
				break;
			default:
				content = this.renderTournamentSchedule();
		}
		
		render(content, this.container);
		
		this.setupEventListeners();
	}
	
	private renderTournamentSchedule(): any {
		const schedule = TournamentCache.getTournamentSchedule();
		const phase = TournamentCache.getTournamentPhase();
		const nextGame = TournamentCache.getNextGameInfo();
		
		let buttonText = 'Start Tournament';
		if (nextGame?.isNewMatch && phase === 'pool' && nextGame.matchIndex > 0) {
			buttonText = 'Next Match';
		} else if (phase === 'finals') {
			buttonText = 'Start Finals';
		}
		
		// Filter out finals match until all pool matches are completed
		const displayedMatches = schedule.filter(match => 
			!match.isFinals || phase === 'finals'
		);
		
		// Generate list of matches using html template tags
		const matchesList = displayedMatches.map((match, index) => {
			let statusClass = '';
			let statusText = '';
			
			if (match.isComplete) {
				statusClass = 'match-complete';
				statusText = `${match.player1Score}-${match.player2Score}`;
			} else if (match.isCurrent) {
				statusClass = 'match-current';
				statusText = 'NEXT';
			}
			
			return html`
				<div class="tournament-match ${statusClass} ${match.isFinals ? 'finals-match' : ''}">
					<div class="match-number">${match.isFinals ? 'FINALS' : `Match ${index + 1}`}</div>
					<div class="match-players">
						<div class="match-player">${match.player1Name}</div>
						<div class="match-vs">vs</div>
						<div class="match-player">${match.player2Name}</div>
					</div>
					<div class="match-status">${statusText}</div>
				</div>
			`;
		});
		
		return html`
			<div class="tournament-screen tournament-schedule">
				<div class="ascii-title-container">
					<div class="ascii-title">${phase === 'finals' ? ASCII_ART.FINALE : ASCII_ART.POOL}</div>
				</div>
				
				<div class="tournament-matches-list">
					${matchesList}
				</div>
				
				<div class="tournament-controls">
					<button class="menu-button continue-button">${buttonText}</button>
					<button class="menu-button back-button">Back to Menu</button>
				</div>
			</div>
		`;
	}
	
	private renderMatchResults(): any {
		const currentMatch = TournamentCache.getCurrentMatch();
		if (!currentMatch) return this.renderTournamentSchedule();
		
		const player1 = TournamentCache.getTournamentPlayers()[currentMatch.player1Index];
		const player2 = TournamentCache.getTournamentPlayers()[currentMatch.player2Index];
		
		const player1Wins = currentMatch.games.filter(g => g.winner === currentMatch.player1Index).length;
		const player2Wins = currentMatch.games.filter(g => g.winner === currentMatch.player2Index).length;
		
		const winnerName = player1Wins > player2Wins ? player1.name : player2.name;
		
		// Generate list of game results
		const gamesList = currentMatch.games.map((game, index) => {
			const winner = game.winner === currentMatch.player1Index ? player1.name : player2.name;
			return `
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
		
		// Determine button text based on match completion
		let buttonText = 'Continue';
		if (currentMatch.completed) {
			buttonText = 'Next Match';
			if (TournamentCache.getTournamentPhase() === 'pool' && 
					TournamentCache.getCurrentMatchIndex() === TournamentCache.getTournamentMatches().length - 2) {
				buttonText = 'To Finals';
			}
		}
		
		return html`
			<div class="tournament-screen match-results">
				<div class="match-header">
					<h1>MATCH RESULTS</h1>
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
		const finalists = TournamentCache.getTournamentSchedule()
			.filter(match => match.isFinals)
			.map(match => ({ player1: match.player1Name, player2: match.player2Name }))[0];
		
		if (!finalists) return this.renderTournamentSchedule();
		
		return html`
			<div class="tournament-screen finals-intro">
				<div class="finals-header">
					<h1>TOURNAMENT FINALS</h1>
				</div>
				
				<div class="ascii-title">
					<pre class="finals-ascii">${ASCII_ART.FINALE || 'FINALS'}</pre>
				</div>
				
				<div class="finalists">
					<div class="finalist">${finalists.player1}</div>
					<div class="vs">VS</div>
					<div class="finalist">${finalists.player2}</div>
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
			<div class="tournament-screen winner-screen">
				<div class="winner-header">
					<h1>TOURNAMENT CHAMPION</h1>
				</div>
				
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
		// Remove any existing event listeners first by cloning elements
		const continueButton = this.container.querySelector('.continue-button');
		if (continueButton) {
			const newButton = continueButton.cloneNode(true);
			continueButton.parentNode?.replaceChild(newButton, continueButton);
			
			// Add the event listener to the new button
			newButton.addEventListener('click', () => {
				if (!this.inTransition) {
					this.inTransition = true;
					this.onContinue();
					setTimeout(() => {
						this.inTransition = false;
					}, 100);
				}
			});
		}
		
		// Same approach for back to menu button
		const backButton = this.container.querySelector('.back-button');
		if (backButton) {
			const newButton = backButton.cloneNode(true);
			backButton.parentNode?.replaceChild(newButton, backButton);
			
			// Add the event listener to the new button
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
	
	/**
	 * Show tournament schedule screen
	 */
	public showTournamentSchedule(): void {
		this.updateInternalState({
			visible: true,
			phase: TournamentCache.getTournamentPhase(),
			currentScreen: 'schedule'
		});
	}
	
	/**
	 * Show match results screen
	 */
	public showMatchResults(matchIndex: number): void {
		// Get match information from cache
		const matches = TournamentCache.getTournamentMatches();
		if (matchIndex < 0 || matchIndex >= matches.length) {
			console.error('Invalid match index:', matchIndex);
			return;
		}
		
		// Update current match to be the one we're showing results for
		TournamentCache.setCurrentMatchIndex(matchIndex);
		
		this.updateInternalState({
			visible: true,
			phase: TournamentCache.getTournamentPhase(),
			currentScreen: 'match-results'
		});
	}
	
	/**
	 * Show finals introduction screen
	 */
	public showFinalsIntro(): void {
		this.updateInternalState({
			visible: true,
			phase: 'finals',
			currentScreen: 'finals-intro'
		});
	}
	
	/**
	 * Show tournament winner screen
	 */
	public showTournamentWinner(): void {
		this.updateInternalState({
			visible: true,
			phase: 'complete',
			currentScreen: 'winner'
		});
	}
	
	/**
	 * Hide the transitions component
	 */
	public hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	/**
	 * Update match status and proceed to next match
	 */
	public proceedToNextMatch(): void {
		const currentIndex = TournamentCache.getCurrentMatchIndex();
		const matches = TournamentCache.getTournamentMatches();
		
		// Mark current match as complete
		if (currentIndex >= 0 && currentIndex < matches.length) {
			TournamentCache.completeCurrentMatch();
		}
		
		// Find next match
		const nextIndex = TournamentCache.findNextMatchIndex();
		
		if (nextIndex >= 0) {
			// Set as current match
			TournamentCache.setCurrentMatchIndex(nextIndex);
			
			// Show schedule with updated status
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
