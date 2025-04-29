/**
 * Match Duration Chart Component
 * Displays a histogram of match durations
 */
import Plotly from 'plotly.js-dist';

/**
 * Renders a histogram of match durations
 * @param container - The HTML element to render the chart into
 * @param matchDurations - Array of match durations in minutes
 * @returns A cleanup function to purge the chart
 */
export function renderMatchDurationChart(container: HTMLElement, matchDurations: number[]): () => void {
	// Create the trace for the histogram
	const trace = {
		x: matchDurations,
		type: 'histogram',
		name: 'Match Duration',
		marker: {
			color: 'rgb(255, 255, 255)',
			line: {
				color: 'rgb(255, 255, 255)',
				width: 1
			}
		},
		opacity: 0.9,
		xbins: {
			size: 1
		},
		hovertemplate: '%{x} second(s), %{y} match(es)<extra></extra>',
		hoverlabel: {
			bgcolor: 'black',
			font: {
				color: 'white'
			}
		}
	};
	
	// Layout configuration
	const layout = {
		xaxis: {
			title: {
				text: 'Duration (secondes)',
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