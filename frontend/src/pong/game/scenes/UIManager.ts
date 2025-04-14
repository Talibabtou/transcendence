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
	private cachedTextMetrics: Map<string, TextMetrics> = new Map();

	/**
	 * Creates a new UIManager instance
	 * @param context The canvas rendering context
	 */
	constructor(context: GameContext) {
		this.context = context;
	}

	// =========================================
	// Public Methods
	// =========================================

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
		const sizes = calculateFontSizes(width, height);

		this.setTextStyle(
			`${sizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`,
			COLORS.SCORE,
			'center',
			'middle'
		);

		this.context.fillText(player1.getScore().toString(), width * 0.25, height * 0.5);
		this.context.fillText(player2.getScore().toString(), width * 0.75, height * 0.5);
	}

	/**
	 * Draws player names
	 */
	private drawPlayerNames(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas;
		const sizes = calculateFontSizes(width, height);
		
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
		const { width, height } = this.context.canvas;
		const sizes = calculateFontSizes(width, height);
		
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
		
		const sizes = calculateFontSizes(
			this.context.canvas.width,
			this.context.canvas.height
		);
		
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
		this.context.font = font;
		this.context.fillStyle = color;
		this.context.textAlign = align;
		this.context.textBaseline = baseline;
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

	private getTextMetrics(text: string, font: string): TextMetrics {
		const cacheKey = `${text}-${font}`;
		if (!this.cachedTextMetrics.has(cacheKey)) {
			this.context.font = font;
			const metrics = this.context.measureText(text);
			this.cachedTextMetrics.set(cacheKey, metrics);
		}
		return this.cachedTextMetrics.get(cacheKey)!;
	}

	public clearTextMetricsCache(): void {
		this.cachedTextMetrics.clear();
	}
}
