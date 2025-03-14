/**
 * Leaderboard Component Module
 * Displays global player rankings and statistics in a tabular format.
 * Handles data fetching, sorting, and user interaction with the leaderboard.
 */
import { Component } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART } from '@website/scripts/utils';
import { LeaderboardState } from '@shared/types';

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
	 * Currently uses mock data, but prepared for real DB integration
	 */
	private async fetchLeaderboardData(): Promise<void> {
		try {
			DbService.getLeaderboard();
			// Simulate API call delay
			await new Promise(resolve => setTimeout(resolve, 750));
			
			// ===== BEGIN MOCK DATA SECTION =====
			// This section will be replaced with actual API calls later
			const mockPlayers = [
				// Top tier players (high wins, low losses)
				{ username: 'GrandMaster42', wins: 42, losses: 7 },
				{ username: 'NeonStriker', wins: 38, losses: 10 },
				{ username: 'QuantumPaddler', wins: 35, losses: 12 },
				{ username: 'VortexChamp', wins: 29, losses: 15 },
				{ username: 'PixelPro', wins: 26, losses: 15 },
				
				// Mid-high tier players
				{ username: 'RetroKing', wins: 22, losses: 16 },
				{ username: 'PongLord', wins: 21, losses: 17 },
				{ username: 'ByteBouncer', wins: 20, losses: 18 },
				{ username: 'CyberSlice', wins: 19, losses: 19 },
				{ username: 'WarpSpeed', wins: 18, losses: 20 },
				
				// Mid tier players
				{ username: 'DigitalDrifter', wins: 17, losses: 20 },
				{ username: 'LaserPaddle', wins: 16, losses: 21 },
				{ username: 'BallBlitzer', wins: 15, losses: 22 },
				{ username: 'MatrixMaster', wins: 14, losses: 23 },
				{ username: 'VirtualVolley', wins: 13, losses: 24 },
				
				// Lower-mid tier players
				{ username: 'PongLegend', wins: 12, losses: 25 },
				{ username: 'SynthSlider', wins: 11, losses: 26 },
				{ username: 'PixelPuncher', wins: 10, losses: 27 },
				{ username: 'DataDasher', wins: 9, losses: 28 },
				{ username: 'PaddleMaster', wins: 8, losses: 30 },
				
				// Newer or casual players
				{ username: 'BinaryBouncer', wins: 7, losses: 31 },
				{ username: 'CircuitChaser', wins: 6, losses: 32 },
				{ username: 'TechnoTapper', wins: 5, losses: 33 },
				{ username: 'GridGlider', wins: 4, losses: 34 },
				{ username: 'WaveRider', wins: 3, losses: 35 }
			];
			
			// Calculate ELO ratings based on wins and losses
			// Using a simple formula: base_elo + (wins * 25) - (losses * 15)
			const BASE_ELO = 1000;
			const leaderboardData = mockPlayers.map((player) => {
				const elo = BASE_ELO + (player.wins * 25) - (player.losses * 15);
				return {
					rank: 0,
					username: player.username,
					elo: elo,
					wins: player.wins,
					losses: player.losses
				};
			});
			
			leaderboardData.sort((a, b) => b.elo - a.elo);
			leaderboardData.forEach((entry, index) => {
				entry.rank = index + 1;
			});
			// ===== END MOCK DATA SECTION =====

			/* Real DB implementation will be:
			const leaderboardData = await DbService.getLeaderboard();
			this.leaderboardData = leaderboardData.map((entry, index) => ({
				rank: index + 1,
				username: entry.username,
				elo: entry.elo,
				wins: entry.wins,
				losses: entry.losses
			}));
			*/
			
			this.updateInternalState({ leaderboardData });
		} catch (error) {
			console.error('Error fetching leaderboard data:', error);
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
			<div class="leaderboard-container">
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
														data-player-id=${entry.rank}
														onClick=${() => this.handlePlayerClick(entry.rank)}
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
}
