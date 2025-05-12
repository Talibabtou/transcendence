import { GameContext, Player } from '@pong/types';
import { COLORS, FONTS, MESSAGES, UI_CONFIG, calculateFontSizes } from '@pong/constants';

/**
 * Manages all UI rendering in the game, including scores, player names,
 * countdown, pause overlay, and other UI elements.
 */
export class UIManager {
	// =========================================
	// Properties
	// =========================================
	private countdownText: string | number | string[] | null = null;
	private readonly context: GameContext;
	private cachedFontSizes: ReturnType<typeof calculateFontSizes>;
	private lastSetFont: string | null = null;
	private lastSetFillStyle: string | null = null;
	private lastSetTextAlign: CanvasTextAlign | null = null;
	private lastSetTextBaseline: CanvasTextBaseline | null = null;

	// Offscreen canvases for performance
	private digitCanvases: (HTMLCanvasElement | null)[] = Array(10).fill(null);
	private digitCanvasWidth: number = 0;
	private digitCanvasHeight: number = 0;

	/**
	 * Creates a new UIManager instance
	 * @param context The canvas rendering context
	 */
	constructor(context: GameContext) {
		this.context = context;
		// Initialize cachedFontSizes directly
		this.cachedFontSizes = calculateFontSizes(this.context.canvas.width, this.context.canvas.height);
		// Pre-render digits after sizes are known
		this.preRenderDigits();
	}

	// =========================================
	// Public Methods
	// =========================================

	/**
	 * Updates the cached font sizes. Should be called on init and resize.
	 * @param width The current canvas width.
	 * @param height The current canvas height.
	 */
	public updateFontSizes(width: number, height: number): void {
		this.cachedFontSizes = calculateFontSizes(width, height);
		// Re-render digits when font size changes
		this.preRenderDigits();
	}

	/**
	 * Updates the countdown text to be displayed
	 * @param text The countdown text or null to hide
	 */
	public setCountdownText(text: string | number | string[] | null): void {
		this.countdownText = text;
	}

	/**
	 * Draws the game background elements (scores and player names)
	 * @param player1 The first player
	 * @param player2 The second player
	 */
	public drawBackground(player1: Player, player2: Player): void {
		this.resetTextStyles();
		this.drawPlayerNames(player1, player2);
		this.drawScores(player1, player2);
	}

	/**
	 * Draws all game objects
	 * @param objects Array of drawable game objects
	 */
	public drawGameElements(objects: Array<{ draw: (ctx: GameContext) => void }>): void {
		objects.forEach(object => object.draw(this.context));
	}

	/**
	 * Draws UI elements based on game state
	 * @param isPaused Whether the game is paused
	 * @param isBackgroundDemo Whether the game is in background demo mode
	 */
	public drawUI(isPaused: boolean, isBackgroundDemo: boolean): void {
		this.resetTextStyles();
		if (isPaused && !isBackgroundDemo) {
			this.drawPauseOverlay();
			this.drawPauseText();
		}

		if (this.shouldDrawCountdown(isBackgroundDemo)) {
			this.drawCountdown();
		}
	}

	// =========================================
	// Private Drawing Methods
	// =========================================

	/**
	 * Draws player scores
	 */
	private drawScores(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas;
		// const sizes = this.cachedFontSizes; // Font sizes already used in preRenderDigits
		
		// No need to setTextStyle here anymore for scores
		// this.resetTextStyles(); // Reset styles if needed before drawing images (usually not necessary for drawImage)

		const p1ScoreStr = player1.getScore().toString();
		const p2ScoreStr = player2.getScore().toString();

		const yPosition = height * 0.52 - (this.digitCanvasHeight / 2); // Adjust Y to center the digit canvas vertically

		// --- Draw Player 1 Score --- 
		let currentX_p1 = width * 0.25;
		// Calculate starting X to center the whole score number
		const totalWidthP1 = p1ScoreStr.length * this.digitCanvasWidth;
		currentX_p1 -= totalWidthP1 / 2;

		for (let i = 0; i < p1ScoreStr.length; i++) {
			const digit = parseInt(p1ScoreStr[i], 10);
			const digitCanvas = this.digitCanvases[digit];
			if (digitCanvas) {
				this.context.drawImage(digitCanvas, currentX_p1, yPosition);
				currentX_p1 += this.digitCanvasWidth; // Move to the next digit position
			}
		}

		// --- Draw Player 2 Score --- 
		let currentX_p2 = width * 0.75;
		// Calculate starting X to center the whole score number
		const totalWidthP2 = p2ScoreStr.length * this.digitCanvasWidth;
		currentX_p2 -= totalWidthP2 / 2;

		for (let i = 0; i < p2ScoreStr.length; i++) {
			const digit = parseInt(p2ScoreStr[i], 10);
			const digitCanvas = this.digitCanvases[digit];
			if (digitCanvas) {
				this.context.drawImage(digitCanvas, currentX_p2, yPosition);
				currentX_p2 += this.digitCanvasWidth; // Move to the next digit position
			}
		}
		
		// Remove old fillText calls
		// this.context.fillText(player1.getScore().toString(), width * 0.25, height * 0.52);
		// this.context.fillText(player2.getScore().toString(), width * 0.75, height * 0.52);
	}

	/**
	 * Draws player names
	 */
	private drawPlayerNames(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas;
		const sizes = this.cachedFontSizes;
		
		const paddingTop = height * 0.02;
		const paddingLeft = width * 0.06;
		const paddingRight = width * 0.06;
		
		this.setTextStyle(
			`${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`,
			COLORS.NAMES,
			'left',
			'top'
		);
		
		// Draw player 1 name
		this.context.fillText(player1.name, paddingLeft, paddingTop);
		
		// Draw player 2 name
		this.context.textAlign = 'right';
		this.context.fillText(player2.name, width - paddingRight, paddingTop);
	}

	/**
	 * Draws semi-transparent pause overlay
	 */
	private drawPauseOverlay(): void {
		const { width, height } = this.context.canvas;
		this.context.fillStyle = COLORS.OVERLAY;
		this.context.fillRect(0, 0, width, height);
	}

	/**
	 * Draws pause screen text
	 */
	private drawPauseText(): void {
		const sizes = this.cachedFontSizes;
		
		this.setTextStyle(
			`${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`,
			UI_CONFIG.TEXT.COLOR,
			UI_CONFIG.TEXT.ALIGN
		);
		
		// Draw "PAUSED" text
		const pausePos = this.getTextPosition(0, 2);
		this.context.fillText(MESSAGES.PAUSED, pausePos.x, pausePos.y);
		
		// Draw resume prompt
		this.context.font = `${sizes.RESUME_PROMPT_SIZE} ${FONTS.FAMILIES.PAUSE}`;
		const promptPos = this.getTextPosition(1, 2);
		this.context.fillText(MESSAGES.RESUME_PROMPT, promptPos.x, promptPos.y);
	}

	/**
	 * Draws countdown or message text
	 */
	private drawCountdown(): void {
		if (this.countdownText === null) return;
		
		const sizes = this.cachedFontSizes;
		
		this.setTextStyle(
			`${sizes.COUNTDOWN_SIZE} ${FONTS.FAMILIES.COUNTDOWN}`,
			UI_CONFIG.TEXT.COLOR,
			UI_CONFIG.TEXT.ALIGN
		);
		
		if (Array.isArray(this.countdownText)) {
			this.drawCountdownMessages(sizes);
		} else if (typeof this.countdownText === 'number') {
			this.drawCountdownNumber();
		}
	}

	// =========================================
	// Helper Methods
	// =========================================

	/**
	 * Draws countdown messages when in array format
	 */
	private drawCountdownMessages(sizes: ReturnType<typeof calculateFontSizes>): void {
		if (!Array.isArray(this.countdownText)) return;

		// Draw first message
		this.context.font = `${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`;
		const pausePos = this.getTextPosition(0, 2);
		this.context.fillText(this.countdownText[0], pausePos.x, pausePos.y);
		
		// Draw second message
		this.context.font = `${sizes.RESUME_PROMPT_SIZE} ${FONTS.FAMILIES.PAUSE}`;
		const promptPos = this.getTextPosition(1, 2);
		this.context.fillText(this.countdownText[1], promptPos.x, promptPos.y);
	}

	/**
	 * Draws countdown number with stroke effect
	 */
	private drawCountdownNumber(): void {
		const pos = this.getTextPosition(0, 1);
		const text = this.countdownText!.toString();
		
		this.context.strokeStyle = UI_CONFIG.TEXT.STROKE.COLOR;
		this.context.lineWidth = UI_CONFIG.TEXT.STROKE.WIDTH;
		this.context.strokeText(text, pos.x, pos.y);
		this.context.fillText(text, pos.x, pos.y);
	}

	/**
	 * Sets text rendering properties
	 */
	private setTextStyle(
		font: string,
		color: string,
		align: CanvasTextAlign = 'center',
		baseline: CanvasTextBaseline = 'middle'
	): void {
		if (this.lastSetFont !== font) {
			this.context.font = font;
			this.lastSetFont = font;
		}
		if (this.lastSetFillStyle !== color) {
			this.context.fillStyle = color;
			this.lastSetFillStyle = color;
		}
		if (this.lastSetTextAlign !== align) {
			this.context.textAlign = align;
			this.lastSetTextAlign = align;
		}
		if (this.lastSetTextBaseline !== baseline) {
			this.context.textBaseline = baseline;
			this.lastSetTextBaseline = baseline;
		}
	}

	/**
	 * Determines if countdown should be drawn
	 */
	private shouldDrawCountdown(isBackgroundDemo: boolean): boolean {
		return !isBackgroundDemo && this.countdownText !== null;
	}

	/**
	 * Calculates text position for centered multi-line text
	 */
	private getTextPosition(
		lineIndex: number = 0,
		totalLines: number = 1
	): { x: number; y: number } {
		const { width, height } = this.context.canvas;
		const spacing = height * UI_CONFIG.LAYOUT.VERTICAL_SPACING;
		const totalHeight = spacing * (totalLines - 1);
		const startY = height * 0.5 - totalHeight * 0.5;
		
		return {
			x: width * 0.5,
			y: startY + (lineIndex * spacing)
		};
	}

	// Reset cached styles when necessary (e.g., before drawing different types of elements)
	public resetTextStyles(): void {
		this.lastSetFont = null;
		this.lastSetFillStyle = null;
		this.lastSetTextAlign = null;
		this.lastSetTextBaseline = null;
	}

	// =========================================
	// Offscreen Canvas Rendering
	// =========================================

	/** Helper to create an offscreen canvas */
	private createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(width)); // Ensure positive integer width
		canvas.height = Math.max(1, Math.round(height)); // Ensure positive integer height
		return canvas;
	}

	/** Pre-renders digits 0-9 onto their own canvases */
	private preRenderDigits(): void {
		const scoreFontSizePx = parseInt(this.cachedFontSizes.SCORE_SIZE, 10);
		if (isNaN(scoreFontSizePx) || scoreFontSizePx <= 0) {
			console.error("Invalid score font size for pre-rendering digits");
			return;
		}

		// Estimate digit dimensions (adjust multipliers as needed)
		// Width can be tricky, might need measureText, but let's estimate宽
		this.digitCanvasHeight = scoreFontSizePx * 1.2; // A bit taller than font size
		// Estimate width (e.g., 60% of height for typical digits, but might need adjustment)
		this.digitCanvasWidth = this.digitCanvasHeight * 0.6;

		const font = `${this.cachedFontSizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`;
		const color = COLORS.SCORE;

		for (let i = 0; i < 10; i++) {
			const digit = i.toString();
			const canvas = this.createOffscreenCanvas(this.digitCanvasWidth, this.digitCanvasHeight);
			const ctx = canvas.getContext('2d');

			if (ctx) {
				// Clear potential previous content
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				// Set styles (no need to cache here, it's offscreen and temporary)
				ctx.font = font;
				ctx.fillStyle = color;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				// Draw the digit centered
				ctx.fillText(digit, canvas.width / 2, canvas.height / 2);
				
				this.digitCanvases[i] = canvas;
			} else {
				console.error(`Failed to get context for offscreen digit canvas ${i}`);
				this.digitCanvases[i] = null;
			}
		}
	}
}
