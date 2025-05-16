import { GraphicalElement, GameContext, GameState, PhysicsObject, BallState } from '@pong/types';
import { COLORS, calculateGameSizes, BALL_CONFIG } from '@pong/constants';

interface PositionValue {
	x: number;
	y: number;
}

interface VelocityValue {
	dx: number;
	dy: number;
}

/**
 * Represents the ball in the game, handling its movement,
 * physics, collisions, and rendering.
 */
export class Ball implements GraphicalElement, PhysicsObject {

	private readonly context: GameContext;
	private readonly color = COLORS.BALL;
	public size!: number;
	public baseSpeed!: number;
	public currentSpeed!: number;
	public destroyed = false;
	public hitLeftBorder = false;
	public speedMultiplier: number = BALL_CONFIG.ACCELERATION.INITIAL;
	public dx = 0;
	public dy = 0;
	public prevPosition: { x: number; y: number } = { x: 0, y: 0 };
	public prevRenderX: number = 0;
	public prevRenderY: number = 0;

	// Pre-allocated objects for getters
	private _currentPosition: PositionValue;
	private _currentVelocity: VelocityValue;
	private _prevPositionObj: PositionValue;
	private _normalizedVelocity: VelocityValue;

	/**
	 * Creates a new Ball instance
	 * @param x The initial x position
	 * @param y The initial y position
	 * @param context The canvas rendering context
	 */
	constructor(
		public x: number,
		public y: number,
		context: GameContext
	) {
		this.context = context;
		this.initializeSizes();
		this.prevPosition.x = this.x;
		this.prevPosition.y = this.y;
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;

		// Initialize pre-allocated objects
		this._currentPosition = { x: this.x, y: this.y };
		this._currentVelocity = { dx: this.dx, dy: this.dy };
		this._prevPositionObj = { x: this.prevPosition.x, y: this.prevPosition.y };
		this._normalizedVelocity = { dx: 0, dy: 0 };
		// Initial calculation for normalized velocity if needed, or done on first get
		const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		if (magnitude !== 0) {
			this._normalizedVelocity.dx = this.dx / magnitude;
			this._normalizedVelocity.dy = this.dy / magnitude;
		}
	}

	/**
	 * Draws the ball on the canvas using interpolation
	 * @param alpha Interpolation factor (0 to 1)
	 */
	public draw(ctx: GameContext, alpha: number): void {
		const interpolatedX = this.prevRenderX * (1 - alpha) + this.x * alpha;
		const interpolatedY = this.prevRenderY * (1 - alpha) + this.y * alpha;

		ctx.beginPath();
		ctx.fillStyle = this.color;
		ctx.arc(interpolatedX, interpolatedY, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	}

	/**
	 * Updates the ball's state. Physics is now handled by PhysicsManager.
	 * This method is called by the game engine's update loop.
	 * @param _context The game context.
	 * @param _deltaTime The time elapsed since the last frame.
	 * @param _state The current game state.
	 */
	public update(_context: GameContext, _deltaTime: number, _state: GameState): void {}

	/**
	 * Launches the ball in a random direction
	 */
	public launchBall(): void {
		this.currentSpeed = this.baseSpeed;
		this.speedMultiplier = BALL_CONFIG.ACCELERATION.INITIAL;
		const { MIN, MAX } = BALL_CONFIG.SPEED.RELATIVE.INITIAL_ANGLE;
		const goingUp = Math.random() > 0.5;
		let angle;
		if (goingUp) {
			angle = (MIN + Math.random() * (MAX - MIN)) * (Math.PI / 180);
		} else {
			angle = (-MIN - Math.random() * (MAX - MIN)) * (Math.PI / 180);
		}
		this.dx = Math.cos(angle);
		this.dy = Math.sin(angle);
		const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		this.dx = (this.dx / magnitude) * this.currentSpeed;
		this.dy = (this.dy / magnitude) * this.currentSpeed;
		if (Math.random() > 0.5) {
			this.dx = -this.dx;
		}
	}

	/**
	 * Updates ball size and speed based on canvas dimensions
	 */
	public updateSizes(): void {
		const newWidth = this.context.canvas.width;
		const newHeight = this.context.canvas.height;
		const sizes = calculateGameSizes(newWidth, newHeight);
		this.size = sizes.BALL_SIZE;
		this.baseSpeed = newWidth / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
		if (this.dx !== 0 || this.dy !== 0) {
			const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
			const normalizedDx = this.dx / currentSpeed;
			const normalizedDy = this.dy / currentSpeed;
			const newSpeed = this.baseSpeed * this.speedMultiplier;
			this.dx = normalizedDx * newSpeed;
			this.dy = normalizedDy * newSpeed;
		}
	}

	/**
	 * Resets the ball to the center of the screen
	 */
	public restart(): void {
		this.x = this.context.canvas.width * 0.5;
		this.y = this.context.canvas.height * 0.5;
		this.dx = 0;
		this.dy = 0;
		this.destroyed = false;
		this.hitLeftBorder = false;
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;
		this.prevPosition.x = this.x;
		this.prevPosition.y = this.y;
	}

	/**
	 * Saves the ball's current state for serialization
	 */
	public saveState(canvasWidthOverride?: number, canvasHeightOverride?: number): BallState {
		const width = canvasWidthOverride ?? this.context.canvas.width;
		const height = canvasHeightOverride ?? this.context.canvas.height;
		
		// Ensure x and y are within bounds if overrides are significantly different, though usually,
		// the ball's x,y should be valid for the dimensions it's currently operating in.
		// This check is more of a safeguard if overrides are used in unusual ways.
		const currentX = Math.max(0, Math.min(this.x, width));
		const currentY = Math.max(0, Math.min(this.y, height));

		return {
			position: {
				x: currentX / width,
				y: currentY / height
			},
			velocity: this.NormalizedVelocity,
			speedMultiplier: this.speedMultiplier
		};
	}

	/**
	 * Restores the ball's state from saved data
	 */
	public restoreState(state: BallState, newWidth?: number, newHeight?: number): void {
		const width = newWidth ?? this.context.canvas.width;
		const height = newHeight ?? this.context.canvas.height;

		this.x = width * state.position.x;
		this.y = height * state.position.y;

		// Sync previous render and physics positions to the new state
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;
		this.prevPosition.x = this.x;
		this.prevPosition.y = this.y;

		if (state.velocity.dx !== 0 || state.velocity.dy !== 0) {
			this.dx = state.velocity.dx;
			this.dy = state.velocity.dy;
			this.speedMultiplier = state.speedMultiplier;
			this.currentSpeed = this.baseSpeed * this.speedMultiplier;
			this.dx = state.velocity.dx * this.currentSpeed;
			this.dy = state.velocity.dy * this.currentSpeed;
		}
		// Add an else case to ensure velocity is zeroed out if state.velocity is zero
		else {
			this.dx = 0;
			this.dy = 0;
			this.currentSpeed = 0; // Or adjust based on how speedMultiplier affects zero velocity
		}
	}

	/**
	 * Initializes ball size and speed based on canvas dimensions
	 */
	private initializeSizes(): void {
		const sizes = calculateGameSizes(this.context.canvas.width, this.context.canvas.height);
		this.size = sizes.BALL_SIZE;
		this.baseSpeed = this.context.canvas.width / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
		this.currentSpeed = this.baseSpeed;
	}


	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////
	public isDestroyed(): boolean { return this.destroyed; }
	public isHitLeftBorder(): boolean { return this.hitLeftBorder; }

	////////////////////////////////////////////////////////////
	// Getters
	////////////////////////////////////////////////////////////
	public get Velocity(): VelocityValue {
		this._currentVelocity.dx = this.dx;
		this._currentVelocity.dy = this.dy;
		return this._currentVelocity;
	}
	public get Position(): PositionValue {
		this._currentPosition.x = this.x;
		this._currentPosition.y = this.y;
		return this._currentPosition;
	}
	public get PrevPosition(): PositionValue {
		this._prevPositionObj.x = this.prevPosition.x;
		this._prevPositionObj.y = this.prevPosition.y;
		return this._prevPositionObj;
	}
	public get Context(): GameContext { return this.context; }
	public get Size(): number { return this.size; }
	public get NormalizedVelocity(): VelocityValue {
		const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		if (magnitude === 0) {
			this._normalizedVelocity.dx = 0;
			this._normalizedVelocity.dy = 0;
		} else {
			this._normalizedVelocity.dx = this.dx / magnitude;
			this._normalizedVelocity.dy = this.dy / magnitude;
		}
		return this._normalizedVelocity;
	}
}
