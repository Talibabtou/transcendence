import { Component, renderDailyActivityChart, renderEloChart, renderGoalDurationChart, renderMatchDurationChart } from '@website/scripts/components';
import { UserProfile, ProfileStatsState } from '@website/types';
import { DbService, html, render } from '@website/scripts/services';

/**
 * Component that displays player statistics with charts
 */
export class ProfileStatsComponent extends Component<ProfileStatsState> {
	
	/**
	 * Creates a new ProfileStatsComponent
	 * @param container - The HTML element to render the stats into
	 */
	constructor(container: HTMLElement) {
		super(container, {
			isLoading: true,
			eloChartRendered: false,
			matchDurationChartRendered: false,
			dailyActivityChartRendered: false,
			goalDurationChartRendered: false,
			profile: null,
			playerStats: null,
			cleanup: {},
			dataLoadInProgress: false
		});
	}
	
	/**
	 * Sets the profile data for the stats component
	 */
	public async setProfile(profile: UserProfile): Promise<void> {
		const state = this.getInternalState();
		// Only reload data if profile has changed
		if (state.profile?.id !== profile?.id) {
			// Update both profile and loading state
			this.updateInternalState({ 
				profile,
				isLoading: true, // Make sure to set this
				eloChartRendered: false,
				matchDurationChartRendered: false,
				dailyActivityChartRendered: false,
				goalDurationChartRendered: false
			});
			
			if (!state.dataLoadInProgress) {
				await this.loadData();
			}
		}
	}
	
	/**
	 * Loads the statistics data
	 */
	private async loadData(): Promise<void> {
		const state = this.getInternalState();
		if (state.dataLoadInProgress || !state.profile?.id) return;
		
		this.updateInternalState({ 
			dataLoadInProgress: true,
			isLoading: true // Make sure we update the loading flag
		});
		
		try {
			// Fetch stats data
			const playerStats = await DbService.getUserStats(state.profile.id);
			
			// Update both dataLoadInProgress AND isLoading
			this.updateInternalState({ 
				dataLoadInProgress: false,
				isLoading: false, // CRITICAL: This was missing
				playerStats,
				eloChartRendered: false,
				matchDurationChartRendered: false,
				dailyActivityChartRendered: false,
				goalDurationChartRendered: false
			});
			
			// Use setTimeout instead of rAF for more reliable execution
			setTimeout(() => {
				this.renderCharts();
			}, 0);
		} catch (error) {
			console.error('Error loading stats data:', error);
			this.updateInternalState({ 
				dataLoadInProgress: false,
				isLoading: false
			});
		}
	}
	
	/**
	 * Renders all the statistics charts
	 */
	private renderCharts(): void {
		const state = this.getInternalState();
		if (!state.playerStats) return;
		
		// Only render each chart once
		const charts = [
			{
				id: 'elo-chart',
				rendered: state.eloChartRendered,
				render: (el: HTMLElement) => renderEloChart(el, state.playerStats.elo_history),
				flag: 'eloChartRendered'
			},
			{
				id: 'match-duration-chart',
				rendered: state.matchDurationChartRendered,
				render: (el: HTMLElement) => renderMatchDurationChart(el, state.playerStats.match_durations || []),
				flag: 'matchDurationChartRendered'
			},
			{
				id: 'daily-activity-chart',
				rendered: state.dailyActivityChartRendered,
				render: (el: HTMLElement) => renderDailyActivityChart(el, state.playerStats.daily_performance || []),
				flag: 'dailyActivityChartRendered'
			},
			{
				id: 'goal-duration-chart',
				rendered: state.goalDurationChartRendered,
				render: (el: HTMLElement) => renderGoalDurationChart(el, state.playerStats.goal_durations || []),
				flag: 'goalDurationChartRendered'
			}
		];
		
		// Process all charts in one go
		const updates: any = { cleanup: { ...state.cleanup } };
		
		for (const chart of charts) {
			if (!chart.rendered) {
				const element = this.container.querySelector(`#${chart.id}`);
				if (element) {
					const cleanup = chart.render(element as HTMLElement);
					updates[chart.flag] = true;
					updates.cleanup[chart.id] = cleanup;
				}
			}
		}
		
		// Only update state if anything changed
		if (Object.keys(updates).length > 1) { // More than just cleanup
			this.updateInternalState(updates);
		}
	}
	
	/**
	 * Renders the stats component
	 */
	render(): void {
		const state = this.getInternalState();
		
		const template = html`
			<div class="stats-content">
				${state.isLoading ? 
					html`<p class="loading-text">Loading statistics...</p>` :
					html`
						<div class="chart-container">
							<div class="chart-section">
								<h3 class="chart-title first-chart-title">ELO Rating History</h3>
								<div id="elo-chart" class="chart"></div>
							</div>
							
							<div class="chart-section">
								<h3 class="chart-title">Match Duration Distribution</h3>
								<div id="match-duration-chart" class="chart"></div>
							</div>
							
							<div class="chart-section">
								<h3 class="chart-title activity-title">Daily Activity</h3>
								<div id="daily-activity-chart" class="chart"></div>
							</div>
							
							<div class="chart-section">
								<h3 class="chart-title">Goal Time Distribution</h3>
								<div id="goal-duration-chart" class="chart"></div>
							</div>
						</div>
					`
				}
			</div>
		`;
		
		render(template, this.container);
		
		if (!state.isLoading) {
			requestAnimationFrame(() => {
				this.renderCharts();
			});
		}
	}
	
	/**
	 * Cleans up the component when it's destroyed
	 */
	destroy(): void {
		super.destroy();
		
		const state = this.getInternalState();
		if (state.cleanup?.eloChart) {
			state.cleanup.eloChart();
		}
		if (state.cleanup?.matchDurationChart) {
			state.cleanup.matchDurationChart();
		}
		if (state.cleanup?.dailyActivityChart) {
			state.cleanup.dailyActivityChart();
		}
		if (state.cleanup?.goalDurationChart) {
			state.cleanup.goalDurationChart();
		}
	}
	
	public refreshData(): void {
		// Skip if already loading
		if (this.getInternalState().dataLoadInProgress) return;
		
		// Load fresh data
		this.loadData();
	}
}
