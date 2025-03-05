import { GameSizes } from '@pong/types';

// =========================================
// GAME CONFIGURATION
// =========================================
export const GAME_CONFIG = {
	WINNING_SCORE: 3,
	FPS: 240,
	MIN_SIZES: {
		BALL_SIZE: 5
	}
} as const;

// =========================================
// COLORS
// =========================================
export const COLORS = {
	// Background
	GAME_BACKGROUND: 'transparent',
	
	// Game elements
	PITCH: '#FFFFFF',
	BALL: '#FF0000',
	PADDLE: '#0000FF',
	
	// UI elements
	TITLE: '#FDF3E7',
	SCORE: '#FFFFFF',
	OVERLAY: 'rgba(0, 0, 0, 0.5)'
} as const;

// =========================================
// UI CONFIGURATION
// =========================================
export const UI_CONFIG = {
	TEXT: {
		ALIGN: 'center' as CanvasTextAlign,
		COLOR: '#FFFFFF',
		STROKE: {
			COLOR: '#000000',
			WIDTH: 2
		}
	},
	LAYOUT: {
		SUBTITLE_OFFSET: 0.1,  // 10% of screen height
		VERTICAL_SPACING: 0.08 // 8% of screen height
	}
} as const;

// =========================================
// GAME SIZING RATIOS (% of screen)
// =========================================
export const GAME_RATIOS = {
	PADDLE: {
		WIDTH: 0.01,    // % of screen width
		HEIGHT: 0.15,   // % of screen height
		SPEED: 0.005,   // control speed
		PADDING: 0.03   // % from edges
	},
	BALL: {
		SIZE: 0.008    // % of base unit
	}
} as const;

// =========================================
// BALL CONFIGURATION
// =========================================
export const BALL_CONFIG = {
	SPEED: {
		RELATIVE: {
			TIME_TO_CROSS: 2.75,
			INITIAL_ANGLE: {
				BASE: 30,      // Base diagonal angle
				VARIATION: 10  // Random variation range
			}
		}
	},
	ACCELERATION: {
		MAX_MULTIPLIER: 4.0,    // Maximum speed (4x initial speed)
		RATE: 0.05,             // 10% speed increase per hit
		INITIAL: 1.0           // Initial speed multiplier
	},
	EDGES: {
		ZONE_SIZE: 0.05,  // 5% edge detection zone
		MAX_DEFLECTION: 0.1  // 10% max deflection
	}
} as const;

// =========================================
// FONT CONFIGURATION
// =========================================
export const FONTS = {
	FAMILIES: {
		TITLE: 'Arial',
		SUBTITLE: 'Arial',
		SCORE: 'Arial',
		COUNTDOWN: 'Arial',
		PAUSE: 'Arial'
	},
	SIZE_RATIOS: {
		TITLE: 0.06,
		SUBTITLE: 0.03,
		SCORE: 0.06,
		COUNTDOWN: 0.06,
		PAUSE: 0.06,
		RESUME_PROMPT: 0.03
	},
	MIN_SIZES: {
		TITLE: 24,
		SUBTITLE: 14,
		SCORE: 24,
		COUNTDOWN: 24,
		PAUSE: 24,
		RESUME_PROMPT: 14
	}
} as const;

// =========================================
// KEYBOARD CONTROLS
// =========================================
export const KEYS = {
	PLAYER_LEFT_UP: 'KeyW',
	PLAYER_LEFT_DOWN: 'KeyS',
	PLAYER_RIGHT_UP: 'ArrowUp',
	PLAYER_RIGHT_DOWN: 'ArrowDown',
	ENTER: 'Enter',
	ESC: 'Escape'
} as const;

// =========================================
// UI MESSAGES
// =========================================
export const MESSAGES = {
	GAME_TITLE: 'PONG',
	GAME_SUBTITLE: 'Click to start',
	GAME_OVER: (winnerName: string) => ['Game is over!', `The winner is ${winnerName}`],
	RETURN_TO_MENU: 'Click to go to main menu',
	PAUSED: 'PAUSED',
	RESUME_PROMPT: 'Press ENTER or ESC to resume',
	GO: 'GO!'
} as const;

// =========================================
// UTILITY FUNCTIONS
// =========================================
export const calculateFontSizes = (width: number, height: number) => {
	const minDimension = Math.min(width, height);
	const maxDimension = Math.max(width, height);
	const baseSize = (minDimension + maxDimension) / 2;
	
	return {
		TITLE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.TITLE), FONTS.MIN_SIZES.TITLE)}px`,
		SUBTITLE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.SUBTITLE), FONTS.MIN_SIZES.SUBTITLE)}px`,
		SCORE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.SCORE), FONTS.MIN_SIZES.SCORE)}px`,
		COUNTDOWN_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.COUNTDOWN), FONTS.MIN_SIZES.COUNTDOWN)}px`,
		PAUSE_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.PAUSE), FONTS.MIN_SIZES.PAUSE)}px`,
		RESUME_PROMPT_SIZE: `${Math.max(Math.floor(baseSize * FONTS.SIZE_RATIOS.RESUME_PROMPT), FONTS.MIN_SIZES.RESUME_PROMPT)}px`
	}
};

export const calculateGameSizes = (width: number, height: number): GameSizes => {
	const baseUnit = Math.min(width, height) / 100;
	return {
		PADDLE_WIDTH: Math.floor(width * GAME_RATIOS.PADDLE.WIDTH),
		PADDLE_HEIGHT: Math.floor(height * GAME_RATIOS.PADDLE.HEIGHT),
		PADDLE_SPEED: Math.floor(height * GAME_RATIOS.PADDLE.SPEED),
		PLAYER_PADDING: Math.floor(width * GAME_RATIOS.PADDLE.PADDING),
		BALL_SIZE: Math.max(Math.floor(baseUnit * GAME_RATIOS.BALL.SIZE * 100), GAME_CONFIG.MIN_SIZES.BALL_SIZE)
	}
};
