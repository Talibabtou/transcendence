import { Component } from '@website/scripts/components';
import { DbService, html, NotificationManager, render } from '@website/scripts/services';
import { UserProfile, ProfileHistoryState } from '@website/types';
import { MatchHistory } from '@shared/types/match.type';

export class ProfileHistoryComponent extends Component<ProfileHistoryState> {
	// @ts-ignore - Used for DOM references
	private contentElement: HTMLElement | null = null;
	// @ts-ignore - Used for DOM references
	private loadMoreButton: HTMLElement | null = null;

	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			historyPage: 0,
			historyPageSize: 20,
			allMatches: [],
			matches: [],
			isLoading: false,
			hasMoreMatches: true,
			dataLoadInProgress: false,
			handlers: {
				onPlayerClick: () => {}
			}
		});
	}
	
	// =========================================
	// PUBLIC METHODS
	// =========================================
	
	/**
	 * Sets the profile to display match history for
	 * @param profile - The user profile to display
	 */
	public setProfile(profile: UserProfile): void {
		const state = this.getInternalState();
		if (state.profile?.id !== profile.id) {
			this.updateInternalState({ 
				profile,
				allMatches: [],
				matches: [],
				historyPage: 0
			});
			
			if (!state.dataLoadInProgress) {
				this.fetchAndProcessMatchHistory(profile.id);
			}
		}
	}
	
	/**
	 * Sets handlers for component interactions
	 * @param handlers - Object containing event handlers
	 */
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}

	// =========================================
	// DATA MANAGEMENT
	// =========================================

	/**
	 * Fetches and processes match history for a user
	 * @param userId - The ID of the user to fetch history for
	 */
	private async fetchAndProcessMatchHistory(userId: string): Promise<void> {
		const state = this.getInternalState();
		if (state.dataLoadInProgress) return;
		
		try {
			this.updateInternalState({ dataLoadInProgress: true });

			const rawHistory = await DbService.getUserHistory(userId);
			
			if (!rawHistory || !Array.isArray(rawHistory)) {
				this.updateInternalState({ 
					allMatches: [], 
					matches: [],
					hasMoreMatches: false,
					dataLoadInProgress: false 
				});
				return;
			}

			const processedHistory = rawHistory
				.map((entry: MatchHistory) => {
					const playerScore = typeof entry.goals1 === 'string' ? parseInt(entry.goals1) : entry.goals1;
					const opponentScore = typeof entry.goals2 === 'string' ? parseInt(entry.goals2) : entry.goals2;
					const result = (playerScore > opponentScore ? 'win' : 'loss') as 'win' | 'loss';
					
					return {
						id: entry.matchId,
						date: new Date(entry.created_at),
						opponent: entry.username2,
						opponentId: entry.id2,
						playerScore,
						opponentScore,
						result,
						finals: entry.finals
					};
				})
				.sort((a, b) => b.date.getTime() - a.date.getTime());

			const { historyPageSize } = state;
			const initialMatches = processedHistory.slice(0, historyPageSize);
			
			this.updateInternalState({
				allMatches: processedHistory,
				matches: initialMatches,
				hasMoreMatches: processedHistory.length > historyPageSize,
				dataLoadInProgress: false
			});

		} catch (error) {
			NotificationManager.showError('Failed to load match history');
			this.updateInternalState({ 
				allMatches: [], 
				matches: [],
				hasMoreMatches: false,
				dataLoadInProgress: false 
			});
		}
	}
	
	/**
	 * Updates the displayed matches based on current page and page size
	 */
	private updateDisplayedMatches(): void {
		const state = this.getInternalState();
		const { allMatches, historyPage, historyPageSize } = state;
		
		const startIndex = 0;
		const endIndex = (historyPage + 1) * historyPageSize;
		const displayedMatches = allMatches.slice(startIndex, endIndex);
		
		this.updateInternalState({
			matches: displayedMatches,
			hasMoreMatches: endIndex < allMatches.length
		});
	}

		/**
	 * Refreshes the history data
	 */
		public refreshData(): void {
			const state = this.getInternalState();
			if (state.dataLoadInProgress || !state.profile?.id) return;
			this.fetchAndProcessMatchHistory(state.profile.id);
		}

	// =========================================
	// EVENT HANDLERS
	// =========================================

	/**
	 * Handles loading more matches when the "Load More" button is clicked
	 */
	private loadMoreMatches = (): void => {
		const state = this.getInternalState();
		if (state.isLoading || !state.hasMoreMatches) {
			return;
		}
		
		this.updateInternalState({ historyPage: state.historyPage + 1 });
		this.updateDisplayedMatches();
		this.render();
	}
	
	// =========================================
	// RENDERING
	// =========================================
	
	/**
	 * Renders the match history component into its container
	 */
	render(): void {
		const state = this.getInternalState();
		const displayedMatchesToRender = state.matches;

		const template = html`
			<div class="history-content" ref=${(el: HTMLElement) => this.contentElement = el}>
				${state.isLoading && displayedMatchesToRender.length === 0 ? 
					html`<p class="loading">Loading match history...</p>` :
					!state.isLoading && state.allMatches.length === 0 && displayedMatchesToRender.length === 0 ?
					html`<p class="no-data">No match history available</p>` :
					html`
						<table class="game-history-table">
							<thead>
								<tr>
									<th>DATE</th>
									<th>OPPONENT</th>
									<th>RESULT</th>
									<th>SCORE</th>
								</tr>
							</thead>
							<tbody>
								${displayedMatchesToRender.map(game => html`
									<tr class="game-${game.result}">
										<td>${game.date.toLocaleDateString()}</td>
										<td 
											class="player-cell" 
											data-player-id=${game.opponentId}
											onClick=${() => state.handlers.onPlayerClick(game.opponent)}
										>
											${game.opponent}
										</td>
										<td class="result-cell-${game.result}">
											${game.result.toUpperCase()}
											${game.finals && game.result === 'win' ? ' 👑' : ''}
										</td>
										<td>${game.playerScore} - ${game.opponentScore}</td>
									</tr>
								`)}
							</tbody>
						</table>
						
						${state.hasMoreMatches ? html`
							<div class="profile-tabs" style="margin-top: 2rem; display: flex; justify-content: center;">
								<ul class="tabs-list" style="list-style: none; padding: 0;">
									<li class="tab-item">
										${state.isLoading ?
											html`<button class="tab-button" disabled>Loading matches...</button>` : 
											html`<button 
												class="tab-button" 
												onClick=${this.loadMoreMatches}
												ref=${(el: HTMLElement) => this.loadMoreButton = el}
											>
												Load More Matches (Page ${state.historyPage + 2})
											</button>`
										}
									</li>
								</ul>
							</div>
						` : state.allMatches.length > 0 ? html`
							<div class="history-end" style="margin: 2rem 0; text-align: center; color: #666;">
								End of match history (${state.allMatches.length} total matches)
							</div>
						` : ''}
					`
				}
			</div>
		`;
		
		render(template, this.container);
	}
}
