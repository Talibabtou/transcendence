import Plotly, { ScatterData } from 'plotly.js-dist';

/**
 * Renders an ELO history chart
 * @param container - The HTML element to render the chart into
 * @param eloHistory - Array of ELO ratings over time
 * @returns A cleanup function to purge the chart
 */
export function renderEloChart(container: HTMLElement, eloHistory: number[]): () => void {
	// Create sequential x-axis values (1, 2, 3, ...) for each ELO data point
	const xValues = Array.from({ length: eloHistory.length }, (_, i) => i);
	
	// Create arrays for colors based on ELO values
	const colors = eloHistory.map(elo => elo < 1000 ? '#ff7a7a' : '#98FB98');
	
	// Create the trace for the line plot with proper typing
	const trace: Partial<ScatterData> = {
		x: xValues,
		y: eloHistory,
		type: 'scatter',
		mode: 'lines+markers',
		name: 'ELO Rating',
		line: {
			color: 'rgb(255, 255, 255)',
			width: 2,
			shape: 'spline',
			smoothing: 1.3
		},
		marker: {
			color: colors,
			size: 8
		},
		hoverinfo: 'none'
	};
	
	// Layout configuration
	const layout = {
		xaxis: {
			title: {
				text: 'Match Number',
				font: {
					color: '#eee',
					size: 14
				}
			},
			showgrid: false,
			color: '#eee',
			range: [0, null],
			tickformat: 'd',
			dtick: 1
		},
		yaxis: {
			title: {
				text: 'ELO Rating',
				font: {
					color: '#eee',
					size: 14
				}
			},
			showgrid: true,
			gridcolor: '#333',
			color: '#eee',
			rangemode: 'nonnegative',
			tickformat: 'd'
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
		}
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