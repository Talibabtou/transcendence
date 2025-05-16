import { GameContext, Player } from '@pong/types';
import { COLORS, FONTS, MESSAGES, UI_CONFIG, calculateFontSizes } from '@pong/constants';

/**
 * Manages all UI rendering in the game, including scores, player names,
 * countdown, pause overlay, and other UI elements.
 */
export class UIManager {

	private countdownText: string | number | string[] | null = null;
	private readonly context: GameContext;
	private player1NameCanvas: HTMLCanvasElement;
	private player1NameContext: CanvasRenderingContext2D | null;
	private player2NameCanvas: HTMLCanvasElement;
	private player2NameContext: CanvasRenderingContext2D | null;
	private player1CachedName: string = '';
	private player2CachedName: string = '';

	// Cached dimensions and font sizes
	private cachedCanvasWidth: number = 0;
	private cachedCanvasHeight: number = 0;
	private cachedFontSizes: ReturnType<typeof calculateFontSizes> | null = null;

	// Reusable object for getTextPosition
	private _reusableTextPosition = { x: 0, y: 0 };

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

		// Initialize name canvases to a fixed size
		const initialNameCanvasWidth = 350; // Increased width for longer names
		const initialNameCanvasHeight = 60; // Adjust as needed
		if (this.player1NameContext) {
			this.player1NameCanvas.width = initialNameCanvasWidth;
			this.player1NameCanvas.height = initialNameCanvasHeight;
		}
		if (this.player2NameContext) {
			this.player2NameCanvas.width = initialNameCanvasWidth;
			this.player2NameCanvas.height = initialNameCanvasHeight;
		}
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

		this.setTextStyle(
			`${sizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`,
			COLORS.SCORE,
			'center',
			'middle'
		);
		this.context.fillText(player1.Score.toString(), width * 0.25, height * 0.52);
		this.context.fillText(player2.Score.toString(), width * 0.75, height * 0.52);
	}

	/**
	 * Draws player names
	 */
	private drawPlayerNames(player1: Player, player2: Player): void {
		const { width, height } = this.context.canvas;
		const sizes = this.getFontSizes(width, height);
		const paddingTop = height * 0.02;
		const paddingLeft = width * 0.06;
		const paddingRight = width * 0.06;
		const nameFont = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;

		if (player1.name !== this.player1CachedName || this.player1NameCanvas.width === 0) {
			if (this.player1NameContext) {
				this.player1CachedName = player1.name;
				if (this.player1NameCanvas.width === 0 || this.player1NameCanvas.height === 0) {
					this.player1NameCanvas.width = 350;
					this.player1NameCanvas.height = 60;
				}
				this.player1NameContext.clearRect(0, 0, this.player1NameCanvas.width, this.player1NameCanvas.height);
				this.setTextStyleHelper(this.player1NameContext, nameFont, COLORS.NAMES, 'left', 'top');
				this.player1NameContext.fillText(player1.name, 0, 0);
			}
		}
		if (player2.name !== this.player2CachedName || this.player2NameCanvas.width === 0) {
			if (this.player2NameContext) {
				this.player2CachedName = player2.name;
				if (this.player2NameCanvas.width === 0 || this.player2NameCanvas.height === 0) {
					this.player2NameCanvas.width = 350;
					this.player2NameCanvas.height = 60;
				}
				this.player2NameContext.clearRect(0, 0, this.player2NameCanvas.width, this.player2NameCanvas.height);
				this.setTextStyleHelper(this.player2NameContext, nameFont, COLORS.NAMES, 'left', 'top');
				this.player2NameContext.fillText(player2.name, 0, 0);
			}
		}
		if (this.player1NameCanvas.width > 0) {
			this.context.drawImage(this.player1NameCanvas, paddingLeft, paddingTop);
		}
		if (this.player2NameCanvas.width > 0) {
			this.context.drawImage(this.player2NameCanvas, width - paddingRight - this.player2NameCanvas.width, paddingTop);
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
	 * Draws countdown number with stroke effect
	 */
	private drawCountdownNumber(): void {
		const customCenterY = this.context.canvas.height * 0.25;
		const pos = this.getTextPosition(0, 1, customCenterY);
		const text = this.countdownText!.toString();
		
		this.context.strokeStyle = UI_CONFIG.TEXT.STROKE.COLOR;
		this.context.lineWidth = UI_CONFIG.TEXT.STROKE.WIDTH;
		this.context.strokeText(text, pos.x, pos.y);
		this.context.fillText(text, pos.x, pos.y);
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

	public drawBackground(player1: Player, player2: Player): void {
		this.drawPlayerNames(player1, player2);
		this.drawScores(player1, player2);
	}

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
