/**
 * Profile History Component
 * Displays user match history in a paginated table
 */
import { Component } from '@website/scripts/components';
import { html, render } from '@website/scripts/utils';
import { UserProfile } from '@shared/types';

interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}

export class ProfileHistoryComponent extends Component<ProfileHistoryState> {
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			historyPage: 0,
			historyPageSize: 20,
			handlers: {
				onPlayerClick: () => {}
			}
		});
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ profile });
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		// Calculate the page boundaries
		const start = state.historyPage * state.historyPageSize;
		const end = start + state.historyPageSize;
		
		// Get current page of data
		const currentPageData = state.profile.gameHistory.slice(start, end);
		const totalPages = Math.ceil(state.profile.gameHistory.length / state.historyPageSize);
		
		const template = html`
			<div class="history-content">
				${currentPageData.length === 0 ? 
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
								${currentPageData.map(game => html`
									<tr class="game-${game.result}">
										<td>${game.date.toLocaleDateString()}</td>
										<td class="opponent-cell" onClick=${() => state.handlers.onPlayerClick(game.opponent)}>
											${game.opponent}
										</td>
										<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
										<td>${game.playerScore} - ${game.opponentScore}</td>
									</tr>
								`)}
							</tbody>
						</table>
						
						${totalPages > 1 ? 
							html`
								<div class="pagination-controls">
									<button class="pagination-button" 
										disabled=${state.historyPage === 0} 
										onClick=${() => this.changePage(state.historyPage - 1)}>
										Previous
									</button>
									<span class="page-info">Page ${state.historyPage + 1} of ${totalPages}</span>
									<button class="pagination-button" 
										onClick=${() => this.changePage(state.historyPage + 1)} 
										disabled=${state.historyPage >= totalPages - 1}>
										Next
									</button>
								</div>
							` : 
							html``
						}
					`
				}
			</div>
		`;
		
		render(template, this.container);
	}
	
	private changePage(newPage: number): void {
		if (newPage < 0) return;
		
		const state = this.getInternalState();
		const totalPages = Math.ceil(state.profile?.gameHistory.length || 0 / state.historyPageSize);
		
		if (newPage >= totalPages) return;
		
		this.updateInternalState({ historyPage: newPage });
		this.render();
	}
} 