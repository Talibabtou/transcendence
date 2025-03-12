import { GraphicalElement, GameContext, GameState } from '@pong/types';
import { COLORS, calculateGameSizes, BALL_CONFIG, GAME_CONFIG} from '@pong/constants';

const PHYSICS_TIMESTEP = 1000 / GAME_CONFIG.FPS;
const MAX_STEPS_PER_FRAME = 4;

const MAX_DELTA_TIME = 1000 / 120; // Cap at 120fps equivalent

export interface BallState {
	position: { x: number; y: number };
	velocity: { dx: number; dy: number };
	speedMultiplier: number;
}

export class Ball implements GraphicalElement {
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
	private accumulator: number = 0;

	constructor(
		public x: number,
		public y: number,
		context: GameContext
	) {
		this.context = context;
		this.initializeSizes();
	}

	// =========================================
	// Public Methods
	// =========================================
	public getContext(): GameContext {
		return this.context;
	}

	public getSize(): number {
		return this.size;
	}

	public isDestroyed(): boolean {
		return this.destroyed;
	}

	public isHitLeftBorder(): boolean {
		return this.hitLeftBorder;
	}

	public draw(): void {
		this.context.beginPath();
		this.context.fillStyle = this.colour;
		this.context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		this.context.fill();
		this.context.closePath();
	}

	public update(_context: GameContext, deltaTime: number, state: GameState): void {
		if (state !== GameState.PLAYING) return;
		// Convert deltaTime to milliseconds and clamp it
		const dt = Math.min(deltaTime * 1000, MAX_DELTA_TIME);
		// Reset accumulator if it's too large (tab was inactive)
		if (this.accumulator > MAX_DELTA_TIME * 2) {
				this.accumulator = 0;
		}
		// Accumulate time since last frame
		this.accumulator += dt;
		// Run physics updates at fixed timesteps
		let steps = 0;
		while (this.accumulator >= PHYSICS_TIMESTEP && steps < MAX_STEPS_PER_FRAME) {
				this.updatePhysics(PHYSICS_TIMESTEP / 1000);
				this.accumulator -= PHYSICS_TIMESTEP;
				steps++;
		}
		// If we still have accumulated time but not too much, do one last update
		if (this.accumulator > 0 && this.accumulator < PHYSICS_TIMESTEP * 2 && steps < MAX_STEPS_PER_FRAME) {
				const remainingTime = this.accumulator / 1000;
				this.updatePhysics(remainingTime);
				this.accumulator = 0;
		} else {
				// If we have too much accumulated time, just drop it
				this.accumulator = Math.min(this.accumulator, PHYSICS_TIMESTEP * 2);
		}
	}

	private updatePhysics(deltaTime: number): void {
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

	public launchBall(): void {
		// Reset speed state
		this.currentSpeed = this.baseSpeed;
		this.speedMultiplier = BALL_CONFIG.ACCELERATION.INITIAL;

		// Generate a random angle that prioritizes diagonals but more centered
		let angle;
		
		// First decide if we're going up or down
		const goingUp = Math.random() > 0.5;
		
		// Define the "sweet spot" for diagonal angles that are more centered
		// For upward: between 25° and 45° from horizontal (more centered diagonal)
		// For downward: between -25° and -45° from horizontal (more centered diagonal)
		if (goingUp) {
			// Upward diagonal trajectory (between 25° and 45° from horizontal)
			angle = (25 + Math.random() * 20) * (Math.PI / 180);
		} else {
			// Downward diagonal trajectory (between -25° and -45° from horizontal)
			angle = (-25 - Math.random() * 20) * (Math.PI / 180);
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

	public hit(hitFace: 'front' | 'top' | 'bottom', deflectionModifier: number = 0): void {
		// Store current speed
		const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

		if (hitFace === 'front') {
				// Basic reflection
				this.dx = -this.dx;
				
				// Apply minimal deflection
				if (deflectionModifier !== 0) {
						// Normalize current velocity
						const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
						let nx = this.dx / currentSpeed;
						let ny = this.dy / currentSpeed;
						
						// Apply small rotation
						const cos = Math.cos(deflectionModifier);
						const sin = Math.sin(deflectionModifier);
						const newNx = nx * cos - ny * sin;
						const newNy = nx * sin + ny * cos;
						
						// Apply speed
						this.dx = newNx * speed;
						this.dy = newNy * speed;
				}
		} else {
				// Simple reflection for top/bottom
				this.dy = -this.dy;
		}

		// Apply acceleration
		this.accelerate();
	}

	public updateSizes(): void {
		const oldWidth = this.context.canvas.width;
		const oldHeight = this.context.canvas.height;
		const newWidth = this.context.canvas.width;
		const newHeight = this.context.canvas.height;
		
		// Calculate aspect ratio change
		const widthRatio = newWidth / oldWidth;
		const heightRatio = newHeight / oldHeight;
		
		// Save current velocity components before updating
		const oldDx = this.dx;
		const oldDy = this.dy;
		
		// Update ball size
		const sizes = calculateGameSizes(newWidth, newHeight);
		this.size = sizes.BALL_SIZE;
		
		// Update base speed (this won't affect current velocity)
		this.baseSpeed = newWidth / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
		
		// Scale velocity components according to dimension changes
		if (oldDx !== 0 || oldDy !== 0) {
			// Simply scale the components by their respective ratios
			this.dx = oldDx * widthRatio;
			this.dy = oldDy * heightRatio;
		}
	}

	public restart(): void {
		this.x = this.context.canvas.width * 0.5;
		this.y = this.context.canvas.height * 0.5;
		this.dx = 0;
		this.dy = 0;
		this.destroyed = false;
		this.hitLeftBorder = false;
	}

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
	// Private Methods
	// =========================================
	private initializeSizes(): void {
		const sizes = calculateGameSizes(this.context.canvas.width, this.context.canvas.height);
		this.size = sizes.BALL_SIZE;
		this.baseSpeed = this.context.canvas.width / BALL_CONFIG.SPEED.RELATIVE.TIME_TO_CROSS;
		this.currentSpeed = this.baseSpeed;
	}

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

	private getNormalizedVelocity(): { dx: number; dy: number } {
		const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		if (magnitude === 0) return { dx: 0, dy: 0 };
		return {
			dx: this.dx / magnitude,
			dy: this.dy / magnitude
		};
	}
}
