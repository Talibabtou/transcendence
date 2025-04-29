/**
 * Goal Duration Histogram Chart Component
 * Displays a histogram of goal durations
 */
import Plotly from 'plotly.js-dist';

/**
 * Renders a histogram of goal durations
 * @param container - The HTML element to render the chart into
 * @param goalDurations - Array of goal durations in seconds
 * @returns A cleanup function to purge the chart
 */
export function renderGoalDurationChart(container: HTMLElement, goalDurations: number[]): () => void {
	// Create the trace for the histogram
	const trace = {
		x: goalDurations,
		type: 'histogram',
		name: 'Goal Duration',
		marker: {
			color: '#4CAF50',
			line: {
				color: '#388E3C',
				width: 1
			}
		},
		opacity: 0.8,
		xbins: {
			// Set appropriate bin sizes based on the data range
			size: 2
		}
	};
	
	// Layout configuration
	const layout = {
		xaxis: {
			title: {
				text: 'Duration (seconds)',
				font: {
					color: '#eee',
					size: 14
				}
			},
			showgrid: false,
			color: '#eee'
		},
		yaxis: {
			title: {
				text: 'Frequency',
				font: {
					color: '#eee',
					size: 14
				}
			},
			showgrid: true,
			gridcolor: '#333',
			color: '#eee'
		},
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		font: {
			color: '#eee'
		},
		margin: {
			l: 50,
			r: 30,
			b: 50,
			t: 80,
			pad: 0
		},
		bargap: 0.05
	};
	
	// Config options
	const config = {
		responsive: true,
		displayModeBar: false
	};
	
	// Create the plot
	Plotly.newPlot(
		container,
		[trace as Plotly.Data],
		layout,
		config
	);
	
	// Return a cleanup function
	return () => {
		Plotly.purge(container);
	};
}