import { Component, renderDailyActivityChart, renderEloChart, renderGoalDurationChart, renderMatchDurationChart } from '@website/scripts/components';
import { UserProfile, ProfileStatsState } from '@website/types';
import { DbService, html, render } from '@website/scripts/services';

export class ProfileStatsComponent extends Component<ProfileStatsState> {
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
	
	// =========================================
	// PUBLIC METHODS
	// =========================================
	
	/**
	 * Sets the profile data for the stats component
	 * @param profile - The user profile to display stats for
	 */
	public async setProfile(profile: UserProfile): Promise<void> {
		const state = this.getInternalState();
		if (state.profile?.id !== profile?.id) {
			this.updateInternalState({ 
				profile,
				isLoading: true,
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
	 * Refreshes the stats data
	 */
	public refreshData(): void {
		if (this.getInternalState().dataLoadInProgress) return;
		this.loadData();
	}
	
	// =========================================
	// DATA MANAGEMENT
	// =========================================
	
	/**
	 * Loads the statistics data from the database
	 */
	private async loadData(): Promise<void> {
		const state = this.getInternalState();
		if (state.dataLoadInProgress || !state.profile?.id) return;
		
		this.updateInternalState({ 
			dataLoadInProgress: true,
			isLoading: true
		});
		
		try {
			const playerStats = await DbService.getUserStats(state.profile.id);
			
			this.updateInternalState({ 
				dataLoadInProgress: false,
				isLoading: false,
				playerStats,
				eloChartRendered: false,
				matchDurationChartRendered: false,
				dailyActivityChartRendered: false,
				goalDurationChartRendered: false
			});
			
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
	
	// =========================================
	// RENDERING
	// =========================================
	
	/**
	 * Renders all the statistics charts
	 */
	private renderCharts(): void {
		const state = this.getInternalState();
		if (!state.playerStats) return;
		
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
		
		if (Object.keys(updates).length > 1) {
			this.updateInternalState(updates);
		}
	}
	
	/**
	 * Renders the stats component into its container
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
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
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
}
