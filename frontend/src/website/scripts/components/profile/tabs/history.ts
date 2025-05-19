/**
 * Profile History Component
 * Displays user match history in a paginated table
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService, ApiError } from '@website/scripts/utils';
import { UserProfile } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import { MatchHistory } from '@shared/types/match.type';

interface ProcessedMatch {
	id: string;
	date: Date;
	opponent: string;
	opponentId: string;
	playerScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
}

interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	allMatches: ProcessedMatch[];
	matches: ProcessedMatch[];
	isLoading: boolean;
	hasMoreMatches: boolean;
	dataLoadInProgress: boolean;
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
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ profile });
		if (!this.getInternalState().dataLoadInProgress) {
			this.updateInternalState({ 
				historyPage: 0,
				allMatches: [],
				matches: [],
				hasMoreMatches: true,
				isLoading: true
			});
			this.fetchAndProcessMatchHistory(profile.id);
		}
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}

	private async fetchAndProcessMatchHistory(userId: string): Promise<void> {
		const state = this.getInternalState();
		if (state.dataLoadInProgress) return;
		
		try {
			this.updateInternalState({ isLoading: true, dataLoadInProgress: true });

			const rawHistory = await DbService.getUserHistory(userId);
			console.log(rawHistory);

			const processedHistory = rawHistory.map((entry: MatchHistory) => {
				return {
					id: entry.matchId,
					date: new Date(entry.created_at),
					opponent: entry.username2,
					opponentId: entry.id2,
					playerScore: typeof entry.goals1 === 'string' ? parseInt(entry.goals1) : entry.goals1,
					opponentScore: typeof entry.goals2 === 'string' ? parseInt(entry.goals2) : entry.goals2,
					result: parseInt(String(entry.goals1)) > parseInt(String(entry.goals2)) ? 'win' : 'loss'
				};
			}).sort((a: ProcessedMatch, b: ProcessedMatch) => b.date.getTime() - a.date.getTime());

			this.updateInternalState({
				allMatches: processedHistory,
				isLoading: false,
				dataLoadInProgress: false
			});

			this.updateDisplayedMatches();
			this.render();

		} catch (error) {
			console.error('Error loading match history:', error);
			if (error instanceof ApiError && error.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
				console.error(`Player ID ${userId} not found when fetching match history.`);
			}
			this.updateInternalState({ 
				isLoading: false, 
				allMatches: [], 
				matches: [],
				dataLoadInProgress: false 
			});
			this.render();
		}
	}
	
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

	private loadMoreMatches = (): void => {
		const state = this.getInternalState();
		if (state.isLoading || !state.hasMoreMatches) {
			return;
		}
		
		this.updateInternalState({ historyPage: state.historyPage + 1 });
		this.updateDisplayedMatches();
		this.render();
	}
	
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
						` : state.allMatches.length > 0 ? html` <!-- Show only if there was data -->
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
