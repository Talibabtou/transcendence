import { calculateFontSizes } from '@pong/constants';

/**
 * Calculates UI element positions and styles to ensure
 * consistency between canvas and HTML rendering
 * Matches UIManager.ts positioning for seamless transition between game and game-over screens
 */
export function calculateUIPositions(width: number, height: number) {
	const sizes = calculateFontSizes(width, height);
	return {
		sizes,
		playerNames: {
			player1: {
				left: (width * 0.06) + "px",
				top: (height * 0.017) + "px",
				fontSize: sizes.SUBTITLE_SIZE,
				textAlign: 'left'
			},
			player2: {
				right: (width * 0.06) + "px", 
				top: (height * 0.017) + "px",
				fontSize: sizes.SUBTITLE_SIZE,
				textAlign: 'right'
			}
		},
		scores: {
			player1: {
				left: (width * 0.25) + "px",
				top: (height * 0.5) + "px",
				fontSize: sizes.SCORE_SIZE
			},
			player2: {
				left: (width * 0.75) + "px",
				top: (height * 0.5) + "px",
				fontSize: sizes.SCORE_SIZE
			}
		},
		getTextPosition: (lineIndex = 0, totalLines = 1) => {
			const spacing = height * 0.1;
			const totalHeight = spacing * (totalLines - 1);
			const startY = height * 0.5;
			const offsetY = ((lineIndex * spacing) - (totalHeight * 0.5));
			return {
				x: width * 0.5 + "px",
				y: (startY + offsetY) + "px"
			};
		}
	};
}
