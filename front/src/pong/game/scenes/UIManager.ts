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
	private player1NameCanvas: HTMLCanvasElement;
	private player1NameContext: CanvasRenderingContext2D | null;
	private player2NameCanvas: HTMLCanvasElement;
	private player2NameContext: CanvasRenderingContext2D | null;
	private player1CachedName: string = '';
	private player2CachedName: string = '';

	/**
	 * Creates a new UIManager instance
	 * @param context The canvas rendering context
	 */
	constructor(context: GameContext) {
		this.context = context;
		this.player1NameCanvas = document.createElement('canvas');
		this.player1NameContext = this.player1NameCanvas.getContext('2d');
		this.player2NameCanvas = document.createElement('canvas');
		this.player2NameContext = this.player2NameCanvas.getContext('2d');
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
		console.time('UIManager.drawPlayerNames');
		this.drawPlayerNames(player1, player2);
		console.timeEnd('UIManager.drawPlayerNames');
		console.time('UIManager.drawScores');
		this.drawScores(player1, player2);
		console.timeEnd('UIManager.drawScores');
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
			console.time('UIManager.drawPause');
			this.drawPauseOverlay();
			this.drawPauseText();
			console.timeEnd('UIManager.drawPause');
		}

		if (this.shouldDrawCountdown(isBackgroundDemo)) {
			console.time('UIManager.drawCountdown');
			this.drawCountdown();
			console.timeEnd('UIManager.drawCountdown');
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

		this.context.fillText(player1.getScore().toString(), width * 0.25, height * 0.52);
		this.context.fillText(player2.getScore().toString(), width * 0.75, height * 0.52);
	}

	/**
	 * Draws player names
	 */
	private drawPlayerNames(player1: Player, player2: Player): void {
		console.time('UIManager.drawPlayerNames');
		const { width, height } = this.context.canvas;
		const sizes = calculateFontSizes(width, height);
		const paddingTop = height * 0.02;
		const paddingLeft = width * 0.06;
		const paddingRight = width * 0.06;
		const nameFont = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;

		// Player 1 Name Caching
		if (player1.name !== this.player1CachedName || this.player1NameCanvas.width === 0) {
			if (this.player1NameContext) {
				this.player1CachedName = player1.name;
				// Set font on offscreen context BEFORE measuring
				this.setTextStyleHelper(this.player1NameContext, nameFont, COLORS.NAMES, 'left', 'top');
				const p1NameMetrics = this.player1NameContext.measureText(player1.name);
				this.player1NameCanvas.width = p1NameMetrics.width * 1.1; // Adjusted padding slightly
				this.player1NameCanvas.height = parseInt(sizes.SUBTITLE_SIZE, 10) * 1.5;
				// Clear and re-apply style as clearRect might reset it, and fillText needs it.
				this.player1NameContext.clearRect(0, 0, this.player1NameCanvas.width, this.player1NameCanvas.height);
				this.setTextStyleHelper(this.player1NameContext, nameFont, COLORS.NAMES, 'left', 'top');
				this.player1NameContext.fillText(player1.name, 0, 0);
			}
		}

		// Player 2 Name Caching
		if (player2.name !== this.player2CachedName || this.player2NameCanvas.width === 0) {
			if (this.player2NameContext) {
				this.player2CachedName = player2.name;
				// Set font on offscreen context BEFORE measuring
				this.setTextStyleHelper(this.player2NameContext, nameFont, COLORS.NAMES, 'left', 'top');
				const p2NameMetrics = this.player2NameContext.measureText(player2.name);
				this.player2NameCanvas.width = p2NameMetrics.width * 1.1; // Adjusted padding slightly
				this.player2NameCanvas.height = parseInt(sizes.SUBTITLE_SIZE, 10) * 1.5;
				// Clear and re-apply style
				this.player2NameContext.clearRect(0, 0, this.player2NameCanvas.width, this.player2NameCanvas.height);
				this.setTextStyleHelper(this.player2NameContext, nameFont, COLORS.NAMES, 'left', 'top');
				this.player2NameContext.fillText(player2.name, 0, 0);
			}
		}

		// Draw cached names to main canvas
		if (this.player1NameCanvas.width > 0) {
			this.context.drawImage(this.player1NameCanvas, paddingLeft, paddingTop);
		}
		if (this.player2NameCanvas.width > 0) {
			this.context.drawImage(this.player2NameCanvas, width - paddingRight - this.player2NameCanvas.width, paddingTop);
		}

		console.timeEnd('UIManager.drawPlayerNames');
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

	/** Helper to set text style on a specific context */
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
}
