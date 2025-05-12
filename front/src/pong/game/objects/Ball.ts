import { GraphicalElement, GameContext, GameState, PhysicsObject, BallState } from '@pong/types';
import { COLORS, calculateGameSizes, BALL_CONFIG } from '@pong/constants';

// Define a simple AABB interface for dirty rectangles
interface AABB {
	x: number;
	y: number;
	width: number;
	height: number;
}

// const PHYSICS_TIMESTEP = 1000 / GAME_CONFIG.FPS; // Removed: Fixed timestep now handled by GameManager
// const MAX_DELTA_TIME = 1000 / 120; // Max physics delta allowed per update call - MOVED TO BALL_CONFIG

/**
 * Represents the ball in the game, handling its movement,
 * physics, collisions, and rendering.
 */
export class Ball implements GraphicalElement, PhysicsObject {
	// =========================================
	// Private Properties
	// =========================================
	private readonly context: GameContext;
	// Made public for PhysicsManager access
	public size!: number;
	public baseSpeed!: number;
	public currentSpeed!: number;
	private readonly colour = COLORS.BALL;
	
	// State flags - Made public for PhysicsManager access
	public destroyed = false;
	public hitLeftBorder = false;
	
	// Speed control - Made public for PhysicsManager access
	public speedMultiplier: number = BALL_CONFIG.ACCELERATION.INITIAL;
	
	// Bounding boxes for dirty rectangle calculation
	private currentBoundingBox: AABB;
	private previousBoundingBox: AABB;
	
	// =========================================
	// Public Properties
	// =========================================
	public dx = 0;
	public dy = 0;

	// Pool vector calculations to avoid creating new objects
	// Position from previous physics step (for swept collision)
	// Made public for PhysicsManager access
	public prevPosition: { x: number; y: number } = { x: 0, y: 0 };
	public prevRenderX: number = 0; // For rendering interpolation
	public prevRenderY: number = 0; // For rendering interpolation
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

		// Initialize bounding boxes
		this.currentBoundingBox = { x: this.x - this.size, y: this.y - this.size, width: this.size * 2, height: this.size * 2 };
		this.previousBoundingBox = { ...this.currentBoundingBox };
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
	 * Updates the ball's state. Physics is now handled by PhysicsManager.
	 * This method is called by the game engine's update loop.
	 * @param _context The game context.
	 * @param _deltaTime The time elapsed since the last frame.
	 * @param _state The current game state.
	 */
	public update(_context: GameContext, _deltaTime: number, _state: GameState): void {
		// Physics logic is now handled by PhysicsManager.
		// This method can be used for non-physics updates if any are needed in the future.

		// --- Update Bounding Box Logic ---
		// Store the *current* box as the *previous* one before any potential updates this frame
		this.previousBoundingBox = { ...this.currentBoundingBox };

		// Update the current bounding box based on the ball's state (potentially updated by PhysicsManager)
		this.updateBoundingBox();
		// --- End Bounding Box Logic ---
	}

	// =========================================
	// Physics Update Methods (REMOVED - MOVED TO PHYSICS MANAGER)
	// =========================================
	// updatePhysics(deltaTime: number) - REMOVED
	// checkBoundaries() - REMOVED
	// hit(hitFace, deflectionModifier) - REMOVED
	// accelerate() - REMOVED

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
		// Update bounding box after restart
		this.updateBoundingBox();
		this.previousBoundingBox = { ...this.currentBoundingBox }; // Ensure previous matches current after restart
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
		// Update bounding box after restoring state
		this.updateBoundingBox();
		this.previousBoundingBox = { ...this.currentBoundingBox }; // Ensure previous matches current after restore
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

	/**
	 * Returns the normalized velocity vector (unit vector of direction)
	 * This is still useful for PhysicsManager.
	 */
	public getNormalizedVelocity(): { dx: number; dy: number } {
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

	// =========================================
	// Dirty Rectangle Methods (NEW)
	// =========================================

	/** Updates the current bounding box based on position and size */
	private updateBoundingBox(): void {
		const diameter = this.size * 2;
		this.currentBoundingBox = {
			x: this.x - this.size,
			y: this.y - this.size,
			width: diameter,
			height: diameter
		};
	}

	/** Gets the current bounding box */
	public getBoundingBox(): AABB {
		return this.currentBoundingBox;
	}

	/** 
	 * Returns an array of dirty rectangles (previous and current bounding box)
	 * if the ball has moved significantly since the last frame.
	 */
	public getDirtyRects(): AABB[] {
		// Use a small epsilon for floating point comparisons
		const epsilon = 0.1;
		if (Math.abs(this.currentBoundingBox.x - this.previousBoundingBox.x) > epsilon ||
			Math.abs(this.currentBoundingBox.y - this.previousBoundingBox.y) > epsilon ||
			Math.abs(this.currentBoundingBox.width - this.previousBoundingBox.width) > epsilon || // Check size change too
			Math.abs(this.currentBoundingBox.height - this.previousBoundingBox.height) > epsilon)
		{
			// Add a small padding to the dirty rectangles to avoid artifacts from anti-aliasing or interpolation
			const padding = 2;
			const prevPadded = {
				...this.previousBoundingBox,
				x: this.previousBoundingBox.x - padding,
				y: this.previousBoundingBox.y - padding,
				width: this.previousBoundingBox.width + padding * 2,
				height: this.previousBoundingBox.height + padding * 2
			};
			const currentPadded = {
				...this.currentBoundingBox,
				x: this.currentBoundingBox.x - padding,
				y: this.currentBoundingBox.y - padding,
				width: this.currentBoundingBox.width + padding * 2,
				height: this.currentBoundingBox.height + padding * 2
			};
			return [prevPadded, currentPadded];
		}
		return []; // No significant change
	}
}
