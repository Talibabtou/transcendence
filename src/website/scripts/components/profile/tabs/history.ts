/**
 * Profile History Component
 * Displays user match history in a paginated table
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService, ApiError } from '@website/scripts/utils';
import { UserProfile } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	matches: any[];
	isLoading: boolean;
	hasMoreMatches: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}
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
			matches: [],
			isLoading: false,
			hasMoreMatches: true,
			handlers: {
				onPlayerClick: () => {}
			}
		});
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ 
			profile,
			historyPage: 0,
			matches: [],
			hasMoreMatches: true
		});
		this.loadMatchHistory(profile.id);
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}
	
	private async loadMatchHistory(userId: string, isLoadingMore: boolean = false): Promise<void> {
		try {
			const state = this.getInternalState();
			
			// Exit early if already loading
			if (state.isLoading) return;
			
			// Update loading state
			if (!isLoadingMore) {
				this.updateInternalState({ 
					isLoading: true,
					matches: [],
					historyPage: 0
				});
			} else {
				this.updateInternalState({ isLoading: true });
			}
			
			// Get user matches from DB service for current page
			const numericId = parseInt(userId);
			const pageToLoad = isLoadingMore ? state.historyPage + 1 : 0;
			console.log(`History component loading matches for user ID: ${numericId}, page: ${pageToLoad}`);
			
			// Request more matches than needed to account for filtering out incomplete matches
			const newMatches = await DbService.getUserMatches(numericId, pageToLoad, state.historyPageSize * 2);
			console.log(`Found ${newMatches.length} matches for history`);
			
			// Process matches
			const processedMatches = await Promise.all(newMatches.map(async (match) => {
				const isPlayer1 = match.player_1 === numericId;
				const opponentId = isPlayer1 ? match.player_2 : match.player_1;
				
				// Get opponent details
				let opponentName = `Player ${opponentId}`;
				try {
					const opponent = await DbService.getUser(opponentId);
					if (opponent) {
						opponentName = opponent.pseudo;
					}
				} catch (error) {
					if (error instanceof ApiError && error.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
						console.log(`Player ID ${opponentId} not found`);
					} else {
						console.log(`Could not fetch opponent data for ID ${opponentId}`);
					}
				}
				
				// Get goals for this match
				const goals = await DbService.getMatchGoals(match.id);
				
				// Calculate scores
				let playerScore = 0;
				let opponentScore = 0;
				
				for (const goal of goals) {
					if (goal.player === numericId) {
						playerScore++;
					} else if (goal.player === opponentId) {
						opponentScore++;
					}
				}
				
				// Skip incomplete matches (neither player has reached 3 points)
				if (playerScore < 3 && opponentScore < 3) {
					return null;
				}
				
				// Determine result
				const result = playerScore > opponentScore ? 'win' : 'loss';
				
				return {
					id: match.id,
					date: match.created_at,
					opponent: opponentName,
					opponentId: opponentId,
					playerScore,
					opponentScore,
					result
				};
			}));
			
			// Filter out null matches (incomplete matches) and sort by most recent first
			const validMatches = processedMatches.filter(match => match !== null);
			const sortedMatches = validMatches.sort((a, b) => 
				b.date.getTime() - a.date.getTime()
			);
			
			// Take only the first historyPageSize matches
			const trimmedMatches = sortedMatches.slice(0, state.historyPageSize);
			
			// If we received fewer matches than requested, we've reached the end
			const hasMoreMatches = newMatches.length === state.historyPageSize * 2;
			
			// Combine with existing matches if loading more
			const combinedMatches = isLoadingMore 
				? [...state.matches, ...trimmedMatches]
				: trimmedMatches;
			
			// Update state with new matches
			this.updateInternalState({ 
				matches: combinedMatches,
				isLoading: false,
				hasMoreMatches,
				historyPage: pageToLoad
			});
			
			// Render the updated UI
			this.render();
			
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
					console.error(`Player ID ${parseInt(userId)} not found when loading match history`);
				} else {
					console.error(`Error loading match history: ${error.message}`);
				}
			} else {
				console.error('Error loading match history:', error);
			}
			this.updateInternalState({ isLoading: false });
		}
	}
	
	private loadMoreMatches = (): void => {
		const state = this.getInternalState();
		if (state.isLoading || !state.hasMoreMatches || !state.profile) {
			return;
		}
		
		console.log(`Loading more matches, current page: ${state.historyPage}`);
		this.loadMatchHistory(state.profile.id, true);
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		// Filter for matches with at least 1 point total
		const filteredMatches = state.matches.filter(match => 
			match.playerScore + match.opponentScore > 0
		);
		
		const template = html`
			<div class="history-content" ref=${(el: HTMLElement) => this.contentElement = el}>
				${state.isLoading && filteredMatches.length === 0 ? 
					html`<p class="loading">Loading match history...</p>` :
					filteredMatches.length === 0 ? 
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
								${filteredMatches.map(game => html`
									<tr class="game-${game.result}">
										<td>${game.date.toLocaleDateString()}</td>
										<td 
											class="player-cell" 
											data-player-id=${game.opponentId}
											onClick=${() => state.handlers.onPlayerClick(game.opponent)}
										>
											${game.opponent}
										</td>
										<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
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
						` : html`
							<div class="history-end" style="margin: 2rem 0; text-align: center; color: #666;">
								End of match history (${filteredMatches.length} total matches)
							</div>
						`}
					`
				}
			</div>
		`;
		
		render(template, this.container);
	}
}
