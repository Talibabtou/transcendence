import { Component } from './component';
import { DbService, html, render, navigate, ASCII_ART } from '../utils';

interface LeaderboardEntry {
	rank: number;
	username: string;
	elo: number;
	wins: number;
	losses: number;
}

export class LeaderboardComponent extends Component {
	private leaderboardData: LeaderboardEntry[] = [];
	private isLoading: boolean = false;

	constructor(container: HTMLElement) {
		super(container);
	}

	async render(): Promise<void> {
		try {
			// Show loading state
			this.isLoading = true;
			this.renderView();
			// Fetch leaderboard data
			await this.fetchLeaderboardData();
			// Update UI with data
			this.isLoading = false;
			this.renderView();
		} catch (error: unknown) {
			console.error('Error rendering leaderboard:', error);
			this.isLoading = false;
			// Handle the error with proper type checking
			const errorMessage = error instanceof Error ? error.message : 'Failed to load leaderboard data';
			this.renderView(errorMessage);
		}
	}

	private async fetchLeaderboardData(): Promise<void> {
		try {
			DbService.getLeaderboard();
			// Simulate API call delay
			await new Promise(resolve => setTimeout(resolve, 750));
			// ===== BEGIN MOCK DATA SECTION =====
			// This section will be replaced with actual API calls later
			// DELETE EVERYTHING BETWEEN THESE COMMENTS WHEN CONNECTING TO REAL DATABASE
			// Generate mock player data with realistic values
			const mockPlayers = [
				{ username: 'GrandMaster42', wins: 42, losses: 7 },
				{ username: 'NeonStriker', wins: 38, losses: 10 },
				{ username: 'QuantumPaddler', wins: 35, losses: 12 },
				{ username: 'VortexChamp', wins: 29, losses: 15 },
				{ username: 'PixelPro', wins: 26, losses: 15 },
				{ username: 'RetroKing', wins: 22, losses: 16 },
				{ username: 'WarpSpeed', wins: 18, losses: 20 },
				{ username: 'BallBlitzer', wins: 15, losses: 22 },
				{ username: 'PongLegend', wins: 12, losses: 25 },
				{ username: 'PaddleMaster', wins: 8, losses: 30 },
			];
			// Calculate ELO ratings based on wins and losses
			// Using a simple formula: base_elo + (wins * 25) - (losses * 15)
			const BASE_ELO = 1000;
			this.leaderboardData = mockPlayers.map((player) => {
				const elo = BASE_ELO + (player.wins * 25) - (player.losses * 15);
				return {
					rank: 0, // We'll set this after sorting
					username: player.username,
					elo: elo,
					wins: player.wins,
					losses: player.losses
				};
			});
			// Sort by ELO (highest first)
			this.leaderboardData.sort((a, b) => b.elo - a.elo);
			// Set ranks after sorting (only do this once)
			this.leaderboardData.forEach((entry, index) => {
				entry.rank = index + 1;
			});
			// ===== END MOCK DATA SECTION =====

			// When connecting to real database, use this code instead:
			/*
			const db = DbService.getInstance();
			const leaderboardData = await db.getLeaderboard();
			this.leaderboardData = leaderboardData.map((entry, index) => ({
				rank: index + 1,
				username: entry.username,
				elo: entry.elo,
				wins: entry.wins,
				losses: entry.losses
			}));
			*/
		} catch (error) {
			console.error('Error fetching leaderboard data:', error);
			throw new Error('Failed to fetch leaderboard data.');
		}
	}

	private handlePlayerClick(playerId: number): void {
		navigate(`/profile?id=${playerId}`);
	}

	private renderView(errorMessage?: string): void {
		const template = html`
			<div class="leaderboard-container">
				<div class="ascii-title-container">
					<pre class="ascii-title">${ASCII_ART.LEADERBOARD}</pre>
				</div>
				
				<div class="leaderboard-content">
					${this.isLoading ? 
						html`<p class="loading-text">Loading leaderboard data...</p>` : 
						errorMessage ? 
							html`
								<div class="error-message">${errorMessage}</div>
								<button class="retry-button" onClick=${() => this.render()}>Retry</button>
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
										${this.leaderboardData.length ? 
											this.leaderboardData.map((entry, index) => html`
												<tr class="${index < 3 ? `top-${index+1}` : ''}">
													<td class="rank-cell">${(entry.rank).toString()}</td>
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
		// Render the template to the container
		render(template, this.container);
	}

	destroy(): void {
		// No need for cleanup in this component but keeping the method for consistency
	}
}
