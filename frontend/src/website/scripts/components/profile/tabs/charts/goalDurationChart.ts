import Plotly from 'plotly.js-dist';

/**
 * Renders a histogram of goal durations
 * @param container - The HTML element to render the chart into
 * @param goalDurations - Array of goal durations in seconds
 * @returns A cleanup function to purge the chart
 */
export function renderGoalDurationChart(container: HTMLElement, goalDurations: number[]): () => void {
	// Check if we have data to display
	if (!goalDurations || goalDurations.length === 0) {
		container.innerHTML = '<div class="no-data-message">No goal data available</div>';
		return () => { container.innerHTML = ''; };
	}
	
	// Calculate appropriate bin size based on data range
	const maxDuration = Math.max(...goalDurations);
	const minDuration = Math.min(...goalDurations);
	const range = maxDuration - minDuration;
	
	const binSize = range <= 5 ? 0.5 : Math.max(1, Math.ceil(range / 10));
	
	// Create the trace for the histogram
	const trace = {
		x: goalDurations,
		type: 'histogram',
		name: 'Goal Duration',
		marker: {
			color: 'rgb(255, 255, 255)',
			line: {
				color: 'rgb(255, 255, 255)',
				width: 1
			}
		},
		opacity: 0.9,
		autobinx: false,
		xbins: {
			size: binSize,
			start: Math.floor(minDuration),
			end: Math.ceil(maxDuration) + binSize
		},
		hovertemplate: '%{x} second(s), %{y} goal(s)<extra></extra>',
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
				text: 'Duration (seconds)',
				font: {
					color: '#eee',
					size: 14
				}
			},
			showgrid: false,
			color: '#eee',
			fixedrange: true
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
			color: '#eee',
			fixedrange: true
		},
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		font: {
			color: '#eee'
		},
		margin: {
			l: 100,
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
		displayModeBar: false,
		scrollZoom: false
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