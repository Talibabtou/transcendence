/**
 * Leaderboard Component Module
 * Displays global player rankings and statistics in a tabular format.
 * Handles data fetching, sorting, and user interaction with the leaderboard.
 */
import { Component } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART, ApiError } from '@website/scripts/utils';
import { LeaderboardState } from '@website/types';

/**
 * Component that displays the global leaderboard
 * Shows player rankings based on ELO, wins, and losses
 */
export class LeaderboardComponent extends Component<LeaderboardState> {
	// =========================================
	// INITIALIZATION
	// =========================================
	
	/**
	 * Creates a new LeaderboardComponent
	 * @param container - The HTML element to render the leaderboard into
	 */
	constructor(container: HTMLElement) {
		super(container, {
			leaderboardData: [],
			isLoading: false
		});
		this.initialize();
	}
	
	/**
	 * Initializes the component by fetching leaderboard data
	 * Handles loading states and error conditions
	 */
	private async initialize(): Promise<void> {
		try {
			this.updateInternalState({ 
				isLoading: true,
				errorMessage: undefined
			});
			
			// Now fetch the leaderboard data
			await this.fetchLeaderboardData();
			
			this.updateInternalState({ 
				isLoading: false 
			});
		} catch (error) {
			console.error('Error initializing leaderboard:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to load leaderboard data';
			this.updateInternalState({ 
				isLoading: false,
				errorMessage 
			});
		}
	}

	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Renders the component based on current state
	 */
	render(): void {
		const state = this.getInternalState();
		this.renderView(state.errorMessage);
		
		// Always set up event listeners after rendering
		setTimeout(() => {
			this.setupEventListeners();
		}, 0);
	}
	
	/**
	 * Cleans up the component when it's destroyed
	 * Calls parent's destroy method to handle state cleanup
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
		try {
			const leaderboardData = await DbService.getLeaderboard();
			this.updateInternalState({ leaderboardData });
		} catch (error) {
			if (error instanceof ApiError) {
				console.error(`Error fetching leaderboard data: ${error.message}`);
			} else {
				console.error('Error fetching leaderboard data:', error);
			}
			throw new Error('Failed to fetch leaderboard data.');
		}
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================

	/**
	 * Handles clicks on player names in the leaderboard
	 * Navigates to the clicked player's profile
	 * @param playerId - The ID of the clicked player
	 */
	private handlePlayerClick(playerId: number): void {
		navigate(`/profile?id=${playerId}`);
	}
	
	/**
	 * Handles retry button clicks when loading fails
	 * Reinitializes the component to fetch data again
	 */
	private handleRetry(): void {
		this.initialize();
	}

	// =========================================
	// RENDERING
	// =========================================

	/**
	 * Renders the leaderboard view based on current state
	 * @param errorMessage - Optional error message to display
	 */
	private renderView(errorMessage?: string): void {
		const state = this.getInternalState();
		
		const template = html`
			<div class="component-container leaderboard-container">
				<div class="ascii-title-container">
					<pre class="ascii-title">${ASCII_ART.LEADERBOARD}</pre>
				</div>
				
				<div class="leaderboard-content">
					${state.isLoading ? 
						html`<p class="loading-text">Loading leaderboard data...</p>` : 
						errorMessage ? 
							html`
								<div class="error-message">${errorMessage}</div>
								<button class="retry-button" onClick=${() => this.handleRetry()}>Retry</button>
							` : 
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
														class="player-cell" 
														data-player-id=${entry.id}
														onClick=${() => this.handlePlayerClick(entry.id)}
													>
														${entry.username}
													</td>
													<td class="elo-cell">${entry.elo.toString()}</td>
													<td class="wins-cell">${entry.wins.toString()}</td>
													<td class="losses-cell">${entry.losses.toString()}</td>
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

	/**
	 * Sets up event listeners after rendering
	 */
	public setupEventListeners(): void {
		// Set up player name click handlers
		this.container.querySelectorAll('.player-cell').forEach(cell => {
			cell.addEventListener('click', () => {
				const playerId = parseInt((cell as HTMLElement).getAttribute('data-player-id') || '0', 10);
				if (playerId) {
					this.handlePlayerClick(playerId);
				}
			});
		});
	}
}
