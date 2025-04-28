/**
 * Profile Stats Component
 * Displays various statistics about the user's game performance
 * Uses plotly.js for data visualization
 */
import { Component, renderDailyActivityChart, renderEloChart, renderGoalDurationChart, renderMatchDurationChart } from '@website/scripts/components';
import { html, render } from '@website/scripts/utils';
import playerStatsData from '../player_stats.json';
import { UserProfile } from '@shared/types';

// Define the stats component state interface
interface ProfileStatsState {
	isLoading: boolean;
	eloChartRendered: boolean;
	matchDurationChartRendered: boolean;
	dailyActivityChartRendered: boolean;
	goalDurationChartRendered: boolean;
	errorMessage?: string;
	profile?: any; // Add profile to the state
	cleanup?: {
		eloChart?: () => void;
		matchDurationChart?: () => void;
		dailyActivityChart?: () => void;
		goalDurationChart?: () => void;
	};
}

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
			cleanup: {}
		});
	}
	
	/**
	 * Sets the profile data for the stats component
	 */
	public setProfile(profile: UserProfile): void {
		// Only update state if profile actually changed
		if (this.getInternalState().profile?.id !== profile?.id) {
			this.updateInternalState({ profile });
			this.loadData();
			this.render();
		}
	}
	
	/**
	 * Loads the statistics data
	 */
	private async loadData(): Promise<void> {
		try {
			this.updateInternalState({ 
				isLoading: true, 
				errorMessage: undefined
			});
			
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 500));
			
			this.updateInternalState({ 
				isLoading: false 
			});
			
			// Render charts after the component is rendered
			this.renderCharts();
			
			console.log('Player stats summary:', playerStatsData.summary);
		} catch (error) {
			console.error('Error loading stats data:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to load statistics data';
			this.updateInternalState({ 
				isLoading: false, 
				errorMessage
			});
		}
	}
	
	/**
	 * Renders all the statistics charts
	 */
	private renderCharts(): void {
		this.renderEloChart();
		this.renderMatchDurationChart();
		this.renderDailyActivityChart();
		this.renderGoalDurationChart();
	}
	
	/**
	 * Renders the ELO history chart
	 */
	private renderEloChart(): void {
		const state = this.getInternalState();
		if (state.eloChartRendered) return;
		
		// Get the container for the ELO chart
		const eloChartContainer = this.container.querySelector('#elo-chart');
		if (!eloChartContainer) return;
		
		// Extract data from the player stats
		const elos = playerStatsData.elo_history;
		
		// Render the ELO chart and get the cleanup function
		const cleanupEloChart = renderEloChart(eloChartContainer as HTMLElement, elos);
		
		// Update state to indicate chart is rendered and store cleanup function
		this.updateInternalState({ 
			eloChartRendered: true,
			cleanup: {
				...state.cleanup,
				eloChart: cleanupEloChart
			}
		});
	}
	
	/**
	 * Renders the match duration histogram chart
	 */
	private renderMatchDurationChart(): void {
		const state = this.getInternalState();
		if (state.matchDurationChartRendered) return;
		
		// Get the container for the match duration chart
		const matchDurationChartContainer = this.container.querySelector('#match-duration-chart');
		if (!matchDurationChartContainer) return;
		
		// Extract data from the player stats
		const matchDurations = playerStatsData.match_durations;
		
		// Render the match duration chart and get the cleanup function
		const cleanupMatchDurationChart = renderMatchDurationChart(
			matchDurationChartContainer as HTMLElement, 
			matchDurations
		);
		
		// Update state to indicate chart is rendered and store cleanup function
		this.updateInternalState({ 
			matchDurationChartRendered: true,
			cleanup: {
				...state.cleanup,
				matchDurationChart: cleanupMatchDurationChart
			}
		});
	}
	
	/**
	 * Renders the daily activity heatmap chart
	 */
	private renderDailyActivityChart(): void {
		const state = this.getInternalState();
		if (state.dailyActivityChartRendered) return;
		
		// Get the container for the daily activity chart
		const dailyActivityChartContainer = this.container.querySelector('#daily-activity-chart');
		if (!dailyActivityChartContainer) return;
		
		// Extract data from the player stats
		const dailyPerformance = playerStatsData.daily_performance;
		
		// Render the daily activity chart and get the cleanup function
		const cleanupDailyActivityChart = renderDailyActivityChart(
			dailyActivityChartContainer as HTMLElement, 
			dailyPerformance
		);
		
		// Update state to indicate chart is rendered and store cleanup function
		this.updateInternalState({ 
			dailyActivityChartRendered: true,
			cleanup: {
				...state.cleanup,
				dailyActivityChart: cleanupDailyActivityChart
			}
		});
	}
	
	/**
	 * Renders the goal duration histogram chart
	 */
	private renderGoalDurationChart(): void {
		const state = this.getInternalState();
		if (state.goalDurationChartRendered) return;
		
		// Get the container for the goal duration chart
		const goalDurationChartContainer = this.container.querySelector('#goal-duration-chart');
		if (!goalDurationChartContainer) return;
		
		// Extract data from the player stats
		const goalDurations = playerStatsData.goal_durations;
		
		// Render the goal duration chart and get the cleanup function
		const cleanupGoalDurationChart = renderGoalDurationChart(
			goalDurationChartContainer as HTMLElement, 
			goalDurations
		);
		
		// Update state to indicate chart is rendered and store cleanup function
		this.updateInternalState({ 
			goalDurationChartRendered: true,
			cleanup: {
				...state.cleanup,
				goalDurationChart: cleanupGoalDurationChart
			}
		});
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
					state.errorMessage ?
						html`<div class="error-message">${state.errorMessage}</div>` :
						html`
							<div class="chart-container">
								<h3 class="chart-title">ELO Rating History</h3>
								<div id="elo-chart" class="chart"></div>
								
								<h3 class="chart-title">Match Duration Distribution</h3>
								<div id="match-duration-chart" class="chart"></div>
								
								<h3 class="chart-title">Daily Activity</h3>
								<div id="daily-activity-chart" class="chart"></div>
								
								<h3 class="chart-title">Goal Time Distribution</h3>
								<div id="goal-duration-chart" class="chart"></div>
							</div>
						`
				}
			</div>
		`;
		
		render(template, this.container);
		
		// Only attempt to render charts if container exists and data is loaded
		if (!state.isLoading && !state.errorMessage) {
			// Use requestAnimationFrame to ensure DOM is ready
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
		
		// Run all cleanup functions
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
