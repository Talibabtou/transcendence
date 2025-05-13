import { GameContext, MovableObject, Direction } from '@pong/types';
import { COLORS, calculateGameSizes } from '@pong/constants';

/**
 * Represents a paddle in the game, handling its movement,
 * rendering, and physics properties.
 */
export class Paddle implements MovableObject {
	// =========================================
	// Properties
	// =========================================
	private direction: Direction | null = null;
	private speed: number;
	private _paddleWidth: number;
	private _paddleHeight: number;
	private prevX: number;
	private prevY: number;

	// =========================================
	// Constructor
	// =========================================
	/**
	 * Creates a new Paddle instance
	 * @param x The horizontal position
	 * @param y The vertical position
	 * @param paddleWidth The width of the paddle
	 * @param paddleHeight The height of the paddle
	 * @param context The canvas rendering context
	 */
	constructor(
		public x: number,
		public y: number,
		paddleWidth: number,
		paddleHeight: number,
		private readonly context: GameContext
	) {
		if (!context) {
			throw new Error('Context must be provided to Paddle');
		}
		const sizes = calculateGameSizes(context.canvas.width, context.canvas.height);
		this.speed = sizes.PADDLE_SPEED;
		this._paddleWidth = paddleWidth;
		this._paddleHeight = paddleHeight;
		this.prevX = x;
		this.prevY = y;
	}

	// =========================================
	// Getters and Setters
	// =========================================
	/**
	 * Gets the paddle width
	 */
	public get paddleWidth(): number {
		return this._paddleWidth;
	}

	/**
	 * Gets the paddle height
	 */
	public get paddleHeight(): number {
		return this._paddleHeight;
	}

	/**
	 * Updates paddle dimensions
	 * @param width The new paddle width
	 * @param height The new paddle height
	 */
	public updateDimensions(width: number, height: number): void {
		this._paddleWidth = width;
		this._paddleHeight = height;
	}

	// =========================================
	// Rendering Methods
	// =========================================
	/**
	 * Draws the paddle on the canvas
	 */
	public draw(): void {
		this.context.fillStyle = COLORS.PADDLE;
		this.context.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);
	}

	// =========================================
	// Movement and Physics Methods
	// =========================================
	/**
	 * Gets the current velocity of the paddle
	 */
	public getVelocity(): { dx: number; dy: number } {
		return { dx: 0, dy: this.y - this.prevY };
	}

	/**
	 * Gets the current position of the paddle
	 */
	public getPosition(): { x: number; y: number } {
		return { x: this.x, y: this.y };
	}

	/**
	 * Sets the paddle's movement direction
	 * @param direction The direction to move the paddle
	 */
	public setDirection(direction: Direction | null): void {
		this.direction = direction;
	}

	/**
	 * Updates the paddle's movement state
	 * @param deltaTime Time elapsed since last update
	 */
	public updateMovement(deltaTime: number): void {
		if (this.direction === null) return;

		const frameSpeed = this.speed * deltaTime;
		const newY = this.direction === Direction.UP 
			? this.y - frameSpeed 
			: this.y + frameSpeed;

		const maxY = this.context.canvas.height - this.paddleHeight;
		this.y = Math.min(Math.max(0, newY), maxY);
	}

	/**
	 * Updates paddle position
	 * @param x The new x position
	 * @param y The new y position
	 */
	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
	}

	/**
	 * Gets paddle dimensions
	 */
	public getDimensions(): { width: number; height: number } {
		return {
			width: this.paddleWidth,
			height: this.paddleHeight
		};
	}

	/**
	 * Sets the paddle's previous position for physics calculations.
	 * @param x The previous x position.
	 * @param y The previous y position.
	 */
	public setPreviousPosition(x: number, y: number): void {
		this.prevX = x;
		this.prevY = y;
	}

	/**
	 * Gets the paddle's previous position for physics calculations.
	 */
	public getPreviousPosition(): { x: number; y: number } {
		return { x: this.prevX, y: this.prevY };
	}
}
