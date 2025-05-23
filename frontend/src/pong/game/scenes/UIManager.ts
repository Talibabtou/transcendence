import { GameContext, Player } from '@pong/types';
import { COLORS, FONTS, MESSAGES, UI_CONFIG, calculateFontSizes } from '@pong/constants';

/**
 * Manages all UI rendering in the game, including scores, player names,
 * countdown, pause overlay, and other UI elements.
 */
export class UIManager {

	private countdownText: string | number | string[] | null = null;
	private readonly context: GameContext;
	private cachedPlayer1NameForBg: string = '';
	private cachedPlayer2NameForBg: string = '';

	// Cached dimensions and font sizes
	private cachedCanvasWidth: number = 0;
	private cachedCanvasHeight: number = 0;
	private cachedFontSizes: ReturnType<typeof calculateFontSizes> | null = null;

	// Reusable object for getTextPosition
	private _reusableTextPosition = { x: 0, y: 0 };

	// Offscreen canvas for countdown numbers
	private countdownNumberCanvas: HTMLCanvasElement;
	private countdownNumberContext: CanvasRenderingContext2D | null;
	private cachedCountdownNumberString: string = "";
	private cachedCountdownNumberFont: string = "";

	// Offscreen canvas for the entire background (scores and names)
	private backgroundCacheCanvas: HTMLCanvasElement;
	private backgroundCacheContext: CanvasRenderingContext2D | null;
	private backgroundNeedsRedraw: boolean = true;
	private cachedPlayer1Score: number = -1;
	private cachedPlayer2Score: number = -1;

	/**
	 * Creates a new UIManager instance
	 * @param context The canvas rendering context
	 */
	constructor(context: GameContext) {
		this.context = context;

		// Initialize countdown number offscreen canvas
		this.countdownNumberCanvas = document.createElement('canvas');
		this.countdownNumberContext = this.countdownNumberCanvas.getContext('2d');
		if (this.countdownNumberContext) {
			// Fixed size, large enough for biggest number/style
			this.countdownNumberCanvas.width = 200; 
			this.countdownNumberCanvas.height = 300;
		}

		// Initialize background cache canvas
		this.backgroundCacheCanvas = document.createElement('canvas');
		this.backgroundCacheContext = this.backgroundCacheCanvas.getContext('2d');
		// Initial size will be set on first draw or resize
		this.backgroundCacheCanvas.width = 0;
		this.backgroundCacheCanvas.height = 0;
	}

	/**
	 * Draws UI elements based on game state
	 * @param isPaused Whether the game is paused
	 * @param isBackgroundDemo Whether the game is in background demo mode
	 */
	public drawUI(isPaused: boolean, isBackgroundDemo: boolean): void {
		if (isPaused && !isBackgroundDemo) {
			this.drawPauseOverlay();
			this.drawPauseText();
		}
		if (this.shouldDrawCountdown(isBackgroundDemo)) {
			this.drawCountdown();
		}
	}

	/**
	 * Draws player scores
	 */
	private drawScores(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas;
		const sizes = this.getFontSizes(width, height);

		this.setTextStyleHelper( // Use helper for cache context
			this.backgroundCacheContext!, // Draw to cache
			`${sizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`,
			COLORS.SCORE,
			'center',
			'middle'
		);
		this.backgroundCacheContext!.fillText(player1.Score.toString(), width * 0.25, height * 0.52);
		this.backgroundCacheContext!.fillText(player2.Score.toString(), width * 0.75, height * 0.52);
	}

	/**
	 * Draws player names
	 */
	private drawPlayerNames(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas; // Still use main canvas for layout
		const sizes = this.getFontSizes(width, height);
		const paddingTop = height * 0.02;
		const paddingLeft = width * 0.06;
		const paddingRight = width * 0.06;
		const nameFont = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;

		if (this.backgroundCacheContext) {
			// Draw Player 1's name (left-aligned)
			this.setTextStyleHelper(this.backgroundCacheContext, nameFont, COLORS.NAMES, 'left', 'top');
			this.backgroundCacheContext.fillText(player1.name, paddingLeft, paddingTop);

			// Draw Player 2's name (right-aligned)
			this.setTextStyleHelper(this.backgroundCacheContext, nameFont, COLORS.NAMES, 'right', 'top');
			this.backgroundCacheContext.fillText(player2.name, width - paddingRight, paddingTop);
		}
	}

	/**
	 * Draws pause screen text
	 */
	private drawPauseText(): void {
		const { width, height } = this.context.canvas;
		const sizes = this.getFontSizes(width, height);

		this.setTextStyle(
			`${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`,
			UI_CONFIG.TEXT.COLOR,
			UI_CONFIG.TEXT.ALIGN
		);
		const pausePos = this.getTextPosition(0, 2);
		this.context.fillText(MESSAGES.PAUSED, pausePos.x, pausePos.y);
		this.context.font = `${sizes.RESUME_PROMPT_SIZE} ${FONTS.FAMILIES.PAUSE}`;
		const promptPos = this.getTextPosition(1, 2);
		this.context.fillText(MESSAGES.RESUME_PROMPT, promptPos.x, promptPos.y);
	}

	/**
	 * Draws countdown or message text
	 */
	private drawCountdown(): void {
		if (this.countdownText === null) return;
		const sizes = this.getFontSizes(
			this.context.canvas.width,
			this.context.canvas.height
		);

		if (Array.isArray(this.countdownText)) {
			// Direct drawing for messages, ensure style is set on main context
			this.setTextStyle(
				`${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`, // Example, adjust as needed for messages
				UI_CONFIG.TEXT.COLOR,
				UI_CONFIG.TEXT.ALIGN
			);
			this.drawCountdownMessages(sizes);
		} else if (typeof this.countdownText === 'number') {
			this.drawCountdownNumber(sizes); // Pass sizes to get the font
		}
	}

	/**
	 * Draws countdown messages when in array format
	 */
	private drawCountdownMessages(sizes: ReturnType<typeof calculateFontSizes>): void {
		if (!Array.isArray(this.countdownText)) return;
		this.context.font = `${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`;
		const customCenterY = this.context.canvas.height * 0.25;
		const pausePos = this.getTextPosition(0, 2, customCenterY);
		this.context.fillText(this.countdownText[0], pausePos.x, pausePos.y);
		this.context.font = `${sizes.RESUME_PROMPT_SIZE} ${FONTS.FAMILIES.PAUSE}`;
		const promptPos = this.getTextPosition(1, 2, customCenterY);
		this.context.fillText(this.countdownText[1], promptPos.x, promptPos.y);
	}

	/**
	 * Draws countdown number with stroke effect using an offscreen canvas
	 */
	private drawCountdownNumber(sizes: ReturnType<typeof calculateFontSizes>): void {
		if (!this.countdownNumberContext || typeof this.countdownText !== 'number') return;

		const text = this.countdownText.toString();
		const font = `${sizes.COUNTDOWN_SIZE} ${FONTS.FAMILIES.COUNTDOWN}`;

		// Redraw to offscreen canvas only if text or font changes
		if (text !== this.cachedCountdownNumberString || font !== this.cachedCountdownNumberFont) {
			this.cachedCountdownNumberString = text;
			this.cachedCountdownNumberFont = font;

			this.countdownNumberContext.clearRect(0, 0, this.countdownNumberCanvas.width, this.countdownNumberCanvas.height);
			// Style for the offscreen canvas context, text centered
			this.setTextStyleHelper(
				this.countdownNumberContext,
				font,
				UI_CONFIG.TEXT.COLOR,
				'center',
				'middle'
			);
			// Draw centered in the offscreen canvas
			const offscreenCenterX = this.countdownNumberCanvas.width / 2;
			const offscreenCenterY = this.countdownNumberCanvas.height / 2;

			this.countdownNumberContext.strokeStyle = UI_CONFIG.TEXT.STROKE.COLOR;
			this.countdownNumberContext.lineWidth = UI_CONFIG.TEXT.STROKE.WIDTH;
			this.countdownNumberContext.strokeText(text, offscreenCenterX, offscreenCenterY);
			this.countdownNumberContext.fillText(text, offscreenCenterX, offscreenCenterY);
		}

		// Draw the offscreen canvas onto the main canvas
		const customCenterY = this.context.canvas.height * 0.25;
		const pos = this.getTextPosition(0, 1, customCenterY);

		this.context.drawImage(
			this.countdownNumberCanvas,
			pos.x - this.countdownNumberCanvas.width / 2,
			pos.y - this.countdownNumberCanvas.height / 2
		);
	}

		
	// =========================================
	// Helper Methods
	// =========================================

	private shouldDrawCountdown(isBackgroundDemo: boolean): boolean {return !isBackgroundDemo && this.countdownText !== null;}
	public drawGameElements(objects: Array<{ draw: (ctx: GameContext) => void }>): void { objects.forEach(object => object.draw(this.context)); }
	private drawPauseOverlay(): void {
		const { width, height } = this.context.canvas;
		this.context.fillStyle = COLORS.OVERLAY;
		this.context.fillRect(0, 0, width, height);
	}

	private redrawBackgroundToCache(player1: Player, player2: Player): void {
		if (!this.backgroundCacheContext) return;
		const { width, height } = this.context.canvas;

		// Ensure cache canvas matches main canvas size
		if (this.backgroundCacheCanvas.width !== width || this.backgroundCacheCanvas.height !== height) {
			this.backgroundCacheCanvas.width = width;
			this.backgroundCacheCanvas.height = height;
			// Font sizes might change with canvas size, so force font size recalculation
			this.cachedFontSizes = null; 
		}
		this.backgroundCacheContext.clearRect(0, 0, width, height);
		this.drawPlayerNames(player1, player2); // Draws to backgroundCacheContext
		this.drawScores(player1, player2);    // Draws to backgroundCacheContext
		this.cachedPlayer1Score = player1.Score;
		this.cachedPlayer2Score = player2.Score;
		this.cachedPlayer1NameForBg = player1.name; // Update cached names
		this.cachedPlayer2NameForBg = player2.name; // Update cached names
		this.backgroundNeedsRedraw = false;
	}
	
	public drawBackground(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas;
		if (this.backgroundCacheCanvas.width !== width || this.backgroundCacheCanvas.height !== height) {
			this.backgroundNeedsRedraw = true; // Force redraw if canvas size changed
		}
		if (player1.Score !== this.cachedPlayer1Score || player2.Score !== this.cachedPlayer2Score) {
			this.backgroundNeedsRedraw = true;
		}
		// Check if player names have changed
		if (player1.name !== this.cachedPlayer1NameForBg || player2.name !== this.cachedPlayer2NameForBg) {
			this.backgroundNeedsRedraw = true;
		}

		if (this.backgroundNeedsRedraw) {
			this.redrawBackgroundToCache(player1, player2);
		}
		if (this.backgroundCacheCanvas.width > 0 && this.backgroundCacheCanvas.height > 0) {
			this.context.drawImage(this.backgroundCacheCanvas, 0, 0);
		}
	}

	public invalidateBackgroundCache(): void { this.backgroundNeedsRedraw = true; }

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	private getTextPosition(
		lineIndex: number = 0,
		totalLines: number = 1,
		customCenterY?: number
	): { x: number; y: number } {
		const { width, height } = this.context.canvas;
		const spacing = height * UI_CONFIG.LAYOUT.VERTICAL_SPACING;
		const totalHeight = spacing * (totalLines - 1);
		const centerY = customCenterY !== undefined ? customCenterY : height * 0.5;
		const startY = centerY - totalHeight * 0.5;
		
		this._reusableTextPosition.x = width * 0.5;
		this._reusableTextPosition.y = startY + (lineIndex * spacing);
		return this._reusableTextPosition;
	}

	public setCountdownText(text: string | number | string[] | null): void { this.countdownText = text; }
	private setTextStyle(
		font: string,
		color: string,
		align: CanvasTextAlign = 'center',
		baseline: CanvasTextBaseline = 'middle'
	): void {
		this.context.font = font;
		this.context.fillStyle = color;
		this.context.textAlign = align;
		this.context.textBaseline = baseline;
	}

	private setTextStyleHelper(
		ctx: CanvasRenderingContext2D,
		font: string,
		color: string,
		align: CanvasTextAlign = 'center',
		baseline: CanvasTextBaseline = 'middle'
	): void {
		ctx.font = font;
		ctx.fillStyle = color;
		ctx.textAlign = align;
		ctx.textBaseline = baseline;
	}

	private getFontSizes(currentWidth: number, currentHeight: number): ReturnType<typeof calculateFontSizes> {
		if (this.cachedFontSizes && this.cachedCanvasWidth === currentWidth && this.cachedCanvasHeight === currentHeight) {
			return this.cachedFontSizes;
		}
		this.cachedCanvasWidth = currentWidth;
		this.cachedCanvasHeight = currentHeight;
		this.cachedFontSizes = calculateFontSizes(currentWidth, currentHeight);
		return this.cachedFontSizes;
	}
}
