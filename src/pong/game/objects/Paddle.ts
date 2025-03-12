import { GameContext, MovableObject, Direction } from '@pong/types';
import { COLORS, GAME_CONFIG, calculateGameSizes } from '@pong/constants';

export class Paddle implements MovableObject {
	// =========================================
	// Properties
	// =========================================
	private direction: Direction | null = null;
	private speed: number;
	private _paddleWidth: number;
	private _paddleHeight: number;

	// =========================================
	// Constructor
	// =========================================
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
	}

	// Getters for dimensions
	public get paddleWidth(): number {
		return this._paddleWidth;
	}

	public get paddleHeight(): number {
		return this._paddleHeight;
	}

	/**
	 * Updates paddle dimensions
	 */
	public updateDimensions(width: number, height: number): void {
		this._paddleWidth = width;
		this._paddleHeight = height;
	}

	// =========================================
	// Public Methods
	// =========================================
	/**
	 * Draws the paddle on the canvas
	 */
	public draw(): void {
		this.context.fillStyle = COLORS.PADDLE;
		this.context.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);
	}

	/**
	 * Gets the current velocity of the paddle
	 */
	public getVelocity(): { dx: number; dy: number } {
		const dy = this.direction === Direction.UP ? -this.speed : 
				  this.direction === Direction.DOWN ? this.speed : 0;
		return { dx: 0, dy };
	}

	/**
	 * Gets the current position of the paddle
	 */
	public getPosition(): { x: number; y: number } {
		return { x: this.x, y: this.y };
	}

	/**
	 * Sets the paddle's movement direction
	 */
	public setDirection(direction: Direction | null): void {
		this.direction = direction;
	}

	/**
	 * Updates the paddle's movement state
	 */
	public updateMovement(deltaTime: number): void {
		if (this.direction === null) return;

		const frameSpeed = this.speed * GAME_CONFIG.FPS * deltaTime;
		const newY = this.direction === Direction.UP 
			? this.y - frameSpeed 
			: this.y + frameSpeed;

		const maxY = this.context.canvas.height - this.paddleHeight;
		this.y = Math.min(Math.max(0, newY), maxY);
	}

	/**
	 * Updates paddle position
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
}
