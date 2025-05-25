import { Component } from '@website/scripts/components';
import { ASCII_ART, appState } from '@website/scripts/utils';
import { DbService, html, render, navigate } from '@website/scripts/services';
import { LeaderboardState } from '@website/types';

export class LeaderboardComponent extends Component<LeaderboardState> {
	constructor(container: HTMLElement) {
		super(container, {
			leaderboardData: [],
			isLoading: false
		});
		this.initialize();
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Initializes the component by fetching leaderboard data
	 * Handles loading states and error conditions
	 */
	private async initialize(): Promise<void> {
		this.updateInternalState({ 
			isLoading: true
		});
		
		try {
			await this.fetchLeaderboardData();
		} catch (error) {
		} finally {
			this.updateInternalState({ 
				isLoading: false 
			});
		}
	}
	
	/**
	 * Renders the component based on current state
	 */
	render(): void {
		this.renderView();
	}
	
	/**
	 * Cleans up the component when it's destroyed
	 */
	destroy(): void {
		super.destroy();
	}

	// =========================================
	// DATA MANAGEMENT
	// =========================================
	
	/**
	 * Fetches leaderboard data from the database
	 */
	private async fetchLeaderboardData(): Promise<void> {
		const apiResponse = await DbService.getLeaderboard();
		const sortedData = [...apiResponse].sort((a, b) => b.elo - a.elo);
		
		const formattedLeaderboard = sortedData.map((entry, index) => ({
			rank: index + 1,
			player: entry.player,
			username: entry.username,
			elo: entry.elo,
			victories: entry.victories,
			defeats: entry.defeats
		}));
		
		this.updateInternalState({ leaderboardData: formattedLeaderboard });
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================

	/**
	 * Handles clicks on player names in the leaderboard
	 * @param playerId - The ID of the clicked player
	 */
	private handlePlayerClick(playerId: string): void {
		if (appState.isAuthenticated()) {
			navigate(`/profile?id=${playerId}`);
		}
	}

	// =========================================
	// RENDERING
	// =========================================

	/**
	 * Renders the leaderboard view based on current state
	 */
	private renderView(): void {
		const state = this.getInternalState();
		
		const template = html`
			<div class="component-container leaderboard-container">
				<div class="ascii-title-container">
					<pre class="ascii-title">${ASCII_ART.LEADERBOARD}</pre>
				</div>
				
				<div class="leaderboard-content">
					${state.isLoading ? 
						html`<p class="loading-text">Loading leaderboard data...</p>` : 
						html`
							<table class="leaderboard-table">
								<thead>
									<tr>
										<th>RANK</th>
										<th>PLAYER</th>
										<th>ELO</th>
										<th>WINS</th>
										<th>LOSSES</th>
									</tr>
								</thead>
								<tbody>
									${state.leaderboardData.length ? 
										state.leaderboardData.map((entry, index) => html`
											<tr class="${index < 3 ? `top-${index+1}` : ''}">
												<td class="rank-cell">${entry.rank.toString()}</td>
												<td 
													class="player-cell ${appState.isAuthenticated() ? 'clickable' : ''}" 
													onClick=${() => this.handlePlayerClick(entry.player)}
													title=${appState.isAuthenticated() ? 'View profile' : 'Log in to view profiles'}
												>
													${entry.username}
												</td>
												<td class="elo-cell">${entry.elo.toString()}</td>
												<td class="wins-cell">${entry.victories.toString()}</td>
												<td class="losses-cell">${entry.defeats.toString()}</td>
											</tr>
										`) : 
										html`<tr><td colspan="5" class="no-data">No leaderboard data available</td></tr>`
									}
								</tbody>
							</table>
						`
					}
				</div>
			</div>
		`;
		render(template, this.container);
	}
}
