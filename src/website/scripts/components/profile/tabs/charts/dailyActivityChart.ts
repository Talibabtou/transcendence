/**
 * Daily Activity Chart Component
 * Displays a GitHub-style heatmap of match frequency by day
 * Using a fixed 4-week grid
 */
import Plotly from 'plotly.js-dist';

interface DailyPerformance {
	match_date: string;
	matches_played: number;
	wins: number;
	losses: number;
	daily_win_ratio: number;
}

/**
 * Renders a GitHub-style activity heatmap with a fixed 4-week grid
 * @param container - The HTML element to render the chart into
 * @param dailyPerformance - Array of daily performance data
 * @returns A cleanup function to purge the chart
 */
export function renderDailyActivityChart(container: HTMLElement, dailyPerformance: DailyPerformance[]): () => void {
	// Create a full 4-week dataset with proper week/day structure
	const currentDate = new Date();
	const calendar = generateFixedCalendarGrid(dailyPerformance, currentDate);

	// Create the trace for the heatmap
	const trace = {
		z: calendar.values,
		x: calendar.daysOfWeek,
		y: calendar.weeks,
		type: 'heatmap',
		colorscale: [
			[0, 'rgba(0,0,0,0)'],
			[0.25, 'rgba(255,255,255,0.25)'],
			[0.5, 'rgba(255,255,255,0.5)'],
			[0.75, 'rgba(255,255,255,0.75)'],
			[1, 'rgba(255,255,255,1)']
		],
		showscale: false,
		hoverinfo: 'text',
		text: calendar.hoverText,
		xgap: 3,
		ygap: 3,
		zmin: 0.01,
		hoverlabel: {
			bgcolor: 'black',
			font: {
				color: 'white'
			}
		}
	};
	
	// Layout configuration
	const layout: Partial<Plotly.Layout> = {
		xaxis: {
			showgrid: false,
			tickvals: [0, 1, 2, 3, 4, 5, 6],
			ticktext: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			tickfont: {
				color: '#eee',
				size: 12
			},
			showline: false,
			zeroline: false,
			fixedrange: true
		},
		yaxis: {
			showgrid: false,
			tickvals: calendar.weeks,
			ticktext: calendar.weekLabels,
			tickfont: {
				color: '#eee',
				size: 10
			},
			autorange: 'reversed' as 'reversed',
			showline: false,
			zeroline: false,
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
			b: 30,
			t: 10,
			pad: 0
		},
		dragmode: false
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
	
	setTimeout(() => {
		const cells = container.querySelectorAll('.hm') as NodeListOf<HTMLElement>;
		cells.forEach(cell => {
			cell.style.borderRadius = '3px';
		});
	}, 100);
	
	// Return a cleanup function
	return () => {
		Plotly.purge(container);
	};
}

/**
 * Generates a fixed 4-week calendar data structure
 * @param dailyPerformance - Raw daily performance data
 * @param endDate - The current date
 * @returns Calendar data structure for the heatmap
 */
function generateFixedCalendarGrid(dailyPerformance: DailyPerformance[], endDate: Date) {
	// Create a map of dates to match counts for quick lookup
	const matchMap = new Map<string, number>();
	dailyPerformance.forEach(day => {
		matchMap.set(day.match_date, day.matches_played);
	});
	
	// Calculate end of current week (Sunday)
	const endOfWeek = new Date(endDate);
	const daysToSunday = 7 - (endDate.getDay() === 0 ? 7 : endDate.getDay());
	endOfWeek.setDate(endOfWeek.getDate() + daysToSunday);
	
	// Calculate start of current week (Monday)
	const startOfCurrentWeek = new Date(endOfWeek);
	startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - 6);
	
	// Calculate the start date (4 weeks ago from Monday of current week)
	const startDate = new Date(startOfCurrentWeek);
	startDate.setDate(startDate.getDate() - (3 * 7)); // 3 weeks earlier
	
	// Fixed number of weeks: 4
	const numWeeks = 4;
	
	// Generate week labels
	const weeks = Array.from({ length: numWeeks }, (_, i) => i);
	const weekLabels = weeks.map(week => {
		const weekStartDate = new Date(startDate);
		weekStartDate.setDate(weekStartDate.getDate() + (week * 7));
		return weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	});
	
	// Initialize the values and hover text arrays
	const values: number[][] = [];
	const hoverText: string[][] = [];
	for (let i = 0; i < numWeeks; i++) {
		values[i] = Array(7).fill(0);
		hoverText[i] = Array(7).fill('');
	}
	
	// Fill in the activity data for the 4-week grid
	let currentDate = new Date(startDate);
	let dayCount = 0;
	
	while (dayCount < 28) { // 4 weeks × 7 days
		const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
		
		// Convert to Monday=0, Sunday=6 format
		let adjustedDayOfWeek = currentDate.getDay();
		adjustedDayOfWeek = adjustedDayOfWeek === 0 ? 6 : adjustedDayOfWeek - 1;
		
		const weekIndex = Math.floor(dayCount / 7);
		
		// Format date for hover text
		const formattedDate = currentDate.toLocaleDateString('en-US', { 
			weekday: 'long', 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric' 
		});
		
		// Get match count for this date
		const matches = matchMap.get(dateString) || 0;
		values[weekIndex][adjustedDayOfWeek] = matches;
		
		// Set hover text
		hoverText[weekIndex][adjustedDayOfWeek] = matches === 0 
			? `${formattedDate}: No matches` 
			: `${formattedDate}: ${matches} match${matches === 1 ? '' : 'es'}`;
		
		// Move to the next day
		currentDate.setDate(currentDate.getDate() + 1);
		dayCount++;
	}
	
	return {
		values,
		weeks,
		weekLabels,
		daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		hoverText
	};
}