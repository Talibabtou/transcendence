import { GameContext, MovableObject, Direction } from '@pong/types';
import { COLORS, calculateGameSizes } from '@pong/constants';

interface PositionValue {
	x: number;
	y: number;
}

interface VelocityValue {
	dx: number;
	dy: number;
}

interface DimensionsValue {
	width: number;
	height: number;
}

/**
 * Represents a paddle in the game, handling its movement,
 * rendering, and physics properties.
 */
export class Paddle implements MovableObject {
	// =========================================
	// Properties
	// =========================================
	private direction: Direction = Direction.NONE;
	private speed: number;
	private _paddleWidth: number;
	private _paddleHeight: number;
	private prevX: number;
	private prevY: number;

	// Pre-allocated objects for getters
	private _currentPosition: PositionValue;
	private _currentVelocity: VelocityValue;
	private _previousPositionObj: PositionValue;
	private _dimensions: DimensionsValue;

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

		// Initialize pre-allocated objects
		this._currentPosition = { x: this.x, y: this.y };
		this._currentVelocity = { dx: 0, dy: 0 };
		this._previousPositionObj = { x: this.prevX, y: this.prevY };
		this._dimensions = { width: this._paddleWidth, height: this._paddleHeight };
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

	/**
	 * Draws the paddle on the canvas
	 */
	public draw(): void {
		this.context.fillStyle = COLORS.PADDLE;
		this.context.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);
	}

	/**
	 * Updates the paddle's movement state
	 * @param deltaTime Time elapsed since last update
	 */
	public updateMovement(deltaTime: number): void {
		if (this.direction === Direction.NONE) return;

		const frameSpeed = this.speed * deltaTime;
		const newY = this.direction === Direction.UP 
			? this.y - frameSpeed 
			: this.y + frameSpeed;

		const maxY = this.context.canvas.height - this.paddleHeight;
		this.y = Math.min(Math.max(0, newY), maxY);
	}

	////////////////////////////////////////////////////////////
	// Getters and Setters
	////////////////////////////////////////////////////////////
	public get PreviousPosition(): PositionValue {
		this._previousPositionObj.x = this.prevX;
		this._previousPositionObj.y = this.prevY;
		return this._previousPositionObj;
	}
	public get Velocity(): VelocityValue {
		this._currentVelocity.dx = 0; 
		this._currentVelocity.dy = this.y - this.prevY;
		return this._currentVelocity;
	}
	public get Position(): PositionValue {
		this._currentPosition.x = this.x;
		this._currentPosition.y = this.y;
		return this._currentPosition;
	}
	public get paddleWidth(): number { return this._paddleWidth; }
	public get paddleHeight(): number { return this._paddleHeight; }
	public get Dimensions(): DimensionsValue {
		this._dimensions.width = this._paddleWidth;
		this._dimensions.height = this._paddleHeight;
		return this._dimensions;
	}
	
	public setDirection(direction: Direction): void { this.direction = direction; }
	public setPreviousPosition(x: number, y: number): void {
		this.prevX = x;
		this.prevY = y;
	}
	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
	}
}
