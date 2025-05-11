import { GraphicalElement, GameContext, GameState, PhysicsObject, BallState } from '@pong/types';
import { COLORS, calculateGameSizes, BALL_CONFIG } from '@pong/constants';

// const PHYSICS_TIMESTEP = 1000 / GAME_CONFIG.FPS; // Removed: Fixed timestep now handled by GameManager
const MAX_DELTA_TIME = 1000 / 120; // Max physics delta allowed per update call

/**
 * Represents the ball in the game, handling its movement,
 * physics, collisions, and rendering.
 */
export class Ball implements GraphicalElement, PhysicsObject {
	// =========================================
	// Private Properties
	// =========================================
	private readonly context: GameContext;
	private size!: number;
	private baseSpeed!: number;
	private currentSpeed!: number;
	private readonly colour = COLORS.BALL;
	
	// State flags
	private destroyed = false;
	private hitLeftBorder = false;
	
	// Speed control
	private speedMultiplier: number = BALL_CONFIG.ACCELERATION.INITIAL;
	
	// =========================================
	// Public Properties
	// =========================================
	public dx = 0;
	public dy = 0;

	// Pool vector calculations to avoid creating new objects
	// Position from previous physics step (for swept collision)
	private prevPosition: { x: number; y: number } = { x: 0, y: 0 };
	private prevRenderX: number = 0; // For rendering interpolation
	private prevRenderY: number = 0; // For rendering interpolation
	private readonly velocityCache = { dx: 0, dy: 0 };
	private readonly positionCache = { x: 0, y: 0 };

	// =========================================
	// Constructor
	// =========================================
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
		// Initialize previous position for continuous collision
		this.prevPosition.x = this.x;
		this.prevPosition.y = this.y;
		// Initialize previous render position for interpolation
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;
	}

	// =========================================
	// Public Methods
	// =========================================
	/**
	 * Gets the rendering context
	 */
	public getContext(): GameContext {
		return this.context;
	}

	/**
	 * Gets the ball radius
	 */
	public getSize(): number {
		return this.size;
	}

	/**
	 * Returns whether the ball is destroyed (out of bounds)
	 */
	public isDestroyed(): boolean {
		return this.destroyed;
	}

	/**
	 * Returns whether the ball hit the left border
	 */
	public isHitLeftBorder(): boolean {
		return this.hitLeftBorder;
	}

	/**
	 * Draws the ball on the canvas using interpolation
	 * @param alpha Interpolation factor (0 to 1)
	 */
	public draw(ctx: GameContext, alpha: number): void {
		const interpolatedX = this.prevRenderX * (1 - alpha) + this.x * alpha;
		const interpolatedY = this.prevRenderY * (1 - alpha) + this.y * alpha;

		ctx.beginPath();
		ctx.fillStyle = this.colour;
		ctx.arc(interpolatedX, interpolatedY, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	}

	/**
	 * Updates the ball's position and state
	 * Note: The fixed timestep logic is now handled by the main game loop (GameManager).
	 * This method now directly calls updatePhysics with the provided deltaTime.
	 */
	public update(_context: GameContext, deltaTime: number, state: GameState): void {
		if (state !== GameState.PLAYING) return;

		// Directly update physics using the delta time from the main loop
		// Clamp deltaTime to prevent extreme jumps if needed (optional, but safer)
		const clampedDeltaTime = Math.min(deltaTime, MAX_DELTA_TIME / 1000); // MAX_DELTA_TIME is in ms
		this.updatePhysics(clampedDeltaTime); 
	}

	// =========================================
	// Physics Update Methods
	// =========================================
	/**
	 * Updates ball physics for a fixed timestep
	 */
	public updatePhysics(deltaTime: number): void {
		// Store previous position for sweep collision BEFORE interpolation state
		this.prevPosition.x = this.x;
		this.prevPosition.y = this.y;

		// Store position for rendering interpolation BEFORE moving
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;

		// Add speed cap for background mode
		if (this.currentSpeed > this.baseSpeed * BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER) {
				this.currentSpeed = this.baseSpeed * BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER;
				const normalized = this.getNormalizedVelocity();
				this.dx = normalized.dx * this.currentSpeed;
				this.dy = normalized.dy * this.currentSpeed;
		}
		// Calculate how far the ball will move this step
		const moveX = this.dx * deltaTime;
		const moveY = this.dy * deltaTime;
		// Move the ball
		this.x = this.x + moveX;
		this.y = this.y + moveY;
		// Check boundaries
		this.checkBoundaries();
	}

	/**
	 * Launches the ball in a random direction
	 */
	public launchBall(): void {
		// Reset speed state
		this.currentSpeed = this.baseSpeed;
		this.speedMultiplier = BALL_CONFIG.ACCELERATION.INITIAL;

		// Get angle range from constants
		const { MIN, MAX } = BALL_CONFIG.SPEED.RELATIVE.INITIAL_ANGLE;
		
		// First decide if we're going up or down
		const goingUp = Math.random() > 0.5;
		
		let angle;
		if (goingUp) {
			// Choose a random angle within the entire MIN to MAX range
			angle = (MIN + Math.random() * (MAX - MIN)) * (Math.PI / 180);
		} else {
			// Same for downward direction but negative
			angle = (-MIN - Math.random() * (MAX - MIN)) * (Math.PI / 180);
		}
		
		// Convert angle to direction vector
		this.dx = Math.cos(angle);
		this.dy = Math.sin(angle);
		
		// Normalize and apply initial speed
		const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		this.dx = (this.dx / magnitude) * this.currentSpeed;
		this.dy = (this.dy / magnitude) * this.currentSpeed;

		// Randomize horizontal direction (left/right)
		if (Math.random() > 0.5) {
			this.dx = -this.dx;
		}
	}

	/**
	 * Handle ball collision with paddle or wall
	 * @param hitFace The face that was hit
	 * @param deflectionModifier Angle modification value
	 */
	public hit(hitFace: 'front' | 'top' | 'bottom', deflectionModifier: number = 0): void {
		// Store current speed
		const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

		if (hitFace === 'front') {
			// Reverse horizontal direction
			this.dx = -this.dx;
			// deflectionModifier = 0;
			if (deflectionModifier !== 0) {
				// Apply rotation matrix for deflection
				const cos = Math.cos(deflectionModifier);
				const sin = Math.sin(deflectionModifier);
				
				// Normalize velocity
				const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
				const nx = this.dx / magnitude;
				const ny = this.dy / magnitude;
				
				// Apply rotation
				this.dx = (nx * cos - ny * sin) * speed;
				this.dy = (nx * sin + ny * cos) * speed;
			}

			// Ensure minimum vertical velocity to prevent horizontal stalemates
			const minVerticalComponent = speed * 0.1;
			if (Math.abs(this.dy) < minVerticalComponent) {
				this.dy = this.dy >= 0 ? minVerticalComponent : -minVerticalComponent;
			}
		} else {
			// Top/bottom collision
			this.dy = -this.dy;
		}

		// Apply acceleration
		this.accelerate();
	}

	/**
	 * Updates ball size and speed based on canvas dimensions
	 */
	public updateSizes(): void {
		const newWidth = this.context.canvas.width;
		const newHeight = this.context.canvas.height;
		
		// Update ball size
		const sizes = calculateGameSizes(newWidth, newHeight);
		this.size = sizes.BALL_SIZE;
		
		// Calculate the new base speed based on current dimensions
		// This ensures speed is always proportional to screen size
		this.baseSpeed = newWidth / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
		
		// If the ball is moving, adjust its velocity to maintain relative speed
		if (this.dx !== 0 || this.dy !== 0) {
			// Get current direction (normalized vector)
			const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
			const normalizedDx = this.dx / currentSpeed;
			const normalizedDy = this.dy / currentSpeed;
			
			// Calculate new speed maintaining the current multiplier
			const newSpeed = this.baseSpeed * this.speedMultiplier;
			
			// Apply new speed while keeping direction
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
		// Snap previous render and physics positions to the new position
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;
		this.prevPosition.x = this.x;
		this.prevPosition.y = this.y;
	}

	// =========================================
	// State Management Methods
	// =========================================
	/**
	 * Saves the ball's current state for serialization
	 */
	public saveState(): BallState {
		const { width, height } = this.context.canvas;
		return {
			position: {
				x: this.x / width,
				y: this.y / height
			},
			velocity: this.getNormalizedVelocity(),  // This already gives us normalized direction
			speedMultiplier: this.speedMultiplier
		};
	}

	/**
	 * Restores the ball's state from saved data
	 */
	public restoreState(state: BallState, newWidth?: number, newHeight?: number): void {
		const width = newWidth ?? this.context.canvas.width;
		const height = newHeight ?? this.context.canvas.height;

		// Restore position
		this.x = width * state.position.x;
		this.y = height * state.position.y;

		// Restore velocity and speed
		if (state.velocity.dx !== 0 || state.velocity.dy !== 0) {
			// First restore the normalized direction
			this.dx = state.velocity.dx;
			this.dy = state.velocity.dy;
			
			// Then restore speed state
			this.speedMultiplier = state.speedMultiplier;
			this.currentSpeed = this.baseSpeed * this.speedMultiplier;
			
			// The velocity is already scaled by currentSpeed, so we don't need to normalize and rescale
			// Just restore the saved direction with the current speed
			this.dx = state.velocity.dx * this.currentSpeed;
			this.dy = state.velocity.dy * this.currentSpeed;
		}
	}

	// =========================================
	// Private Helper Methods
	// =========================================
	/**
	 * Initializes ball size and speed based on canvas dimensions
	 */
	private initializeSizes(): void {
		const sizes = calculateGameSizes(this.context.canvas.width, this.context.canvas.height);
		this.size = sizes.BALL_SIZE;
		this.baseSpeed = this.context.canvas.width / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
		this.currentSpeed = this.baseSpeed;
	}

	/**
	 * Checks if the ball collides with game boundaries
	 */
	private checkBoundaries(): void {
		const ballRadius = this.size;
		// Vertical boundaries with position correction and acceleration
		if (this.y - ballRadius <= 0) {
			this.y = ballRadius;
			this.dy = Math.abs(this.dy); // Force positive
			this.accelerate(); // Accelerate on wall hit
		} else if (this.y + ballRadius >= this.context.canvas.height) {
			this.y = this.context.canvas.height - ballRadius;
			this.dy = -Math.abs(this.dy); // Force negative
			this.accelerate(); // Accelerate on wall hit
		}
		// Horizontal boundaries with destruction
		if (this.x - ballRadius <= 0) {
			this.destroyed = true;
			this.hitLeftBorder = true;
		} else if (this.x + ballRadius >= this.context.canvas.width) {
			this.destroyed = true;
			this.hitLeftBorder = false;
		}
		// Ensure minimum velocity to prevent sticking
		const minSpeed = 1;
		const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		if (currentSpeed < minSpeed && currentSpeed > 0) {
			const scale = minSpeed / currentSpeed;
			this.dx *= scale;
			this.dy *= scale;
		}
	}

	/**
	 * Increases ball speed based on acceleration settings
	 */
	private accelerate(): void {
		this.speedMultiplier = Math.min(
			this.speedMultiplier + BALL_CONFIG.ACCELERATION.RATE,
			BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER
		);
		this.currentSpeed = this.baseSpeed * this.speedMultiplier;
		// Apply new speed while maintaining direction
		const normalized = this.getNormalizedVelocity();
		this.dx = normalized.dx * this.currentSpeed;
		this.dy = normalized.dy * this.currentSpeed;
	}

	/**
	 * Returns the normalized velocity vector (unit vector of direction)
	 */
	private getNormalizedVelocity(): { dx: number; dy: number } {
		const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		if (magnitude === 0) return { dx: 0, dy: 0 };
		return {
			dx: this.dx / magnitude,
			dy: this.dy / magnitude
		};
	}

	// =========================================
	// Interface Implementation Methods
	// =========================================
	/**
	 * Gets the current velocity (required by PhysicsObject interface)
	 */
	public getVelocity(): { dx: number; dy: number } {
		this.velocityCache.dx = this.dx;
		this.velocityCache.dy = this.dy;
		return this.velocityCache;
	}

	/**
	 * Gets the current position (required by PhysicsObject interface)
	 */
	public getPosition(): { x: number; y: number } {
		this.positionCache.x = this.x;
		this.positionCache.y = this.y;
		return this.positionCache;
	}

	/** Returns the position from the last physics step for continuous collision tests */
	public getPrevPosition(): { x: number; y: number } {
		return { x: this.prevPosition.x, y: this.prevPosition.y };
	}
}
