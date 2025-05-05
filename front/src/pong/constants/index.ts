import { GameSizes } from '@pong/types';

// =========================================
// GAME CONFIGURATION
// =========================================
export const GAME_CONFIG = {
	WINNING_SCORE: 3,
	MAX_STEPS_PER_FRAME: 8,
	FRAME_TIME: 0.01,
	MAX_DELTA_TIME: 10, // Maximum delta time to prevent spiral of death
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
	BALL: '#FFFFFF',
	PADDLE: '#FFFFFF',
	
	// UI elements
	TITLE: '#FDF3E7',
	SCORE: 'rgba(255, 255, 255, 0.4)',
	NAMES: 'rgba(255, 255, 255, 0.4)',
	OVERLAY: 'rgba(0, 0, 0, 0.4)'
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
		SPEED: 1.2,     // control speed (fraction of screen height per second)
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
			TIME_TO_CROSS: 2.2,
			INITIAL_ANGLE: {
				MIN: 30,     // Minimum angle from horizontal
				MAX: 40      // Maximum angle from horizontal
			}
		}
	},
	ACCELERATION: {
		MAX_MULTIPLIER: 4.0,    // Maximum speed (4x initial speed)
		RATE: 0.05,             // 5% speed increase per hit
		INITIAL: 1.0           // Initial speed multiplier
	},
	EDGES: {
		ZONE_SIZE: 0.3,  // 5% edge detection zone
		MAX_DEFLECTION: 0.03  // 1% max deflection
	}
} as const;

// =========================================
// FONT CONFIGURATION
// =========================================
export const FONTS = {
	FAMILIES: {
		TITLE: 'monospace',
		SUBTITLE: 'monospace',
		SCORE: 'Arial',
		COUNTDOWN: 'Arial',
		PAUSE: 'monospace'
	},
	SIZE_RATIOS: {
		TITLE: 0.05,
		SUBTITLE: 0.03,
		SCORE: 0.35,
		COUNTDOWN: 0.1,
		PAUSE: 0.05,
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
	DEBUG_TOGGLE: 'KeyD',
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
	const baseSize = (minDimension + maxDimension) * 0.5;
	
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
	const paddleWidth = Math.floor(width * GAME_RATIOS.PADDLE.WIDTH);
	
	return {
		PADDLE_WIDTH: paddleWidth,
		PADDLE_HEIGHT: Math.floor(height * GAME_RATIOS.PADDLE.HEIGHT),
		PADDLE_SPEED: Math.floor(height * GAME_RATIOS.PADDLE.SPEED),
		PLAYER_PADDING: Math.floor(width * GAME_RATIOS.PADDLE.PADDING),
		BALL_SIZE: Math.max(paddleWidth * 0.5, GAME_CONFIG.MIN_SIZES.BALL_SIZE)
	}
};

/** Toggles debug overlays like paddle zones and prediction dots */
export const DEBUG = { enabled: false };
