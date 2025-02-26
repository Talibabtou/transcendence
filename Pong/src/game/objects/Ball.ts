import { GraphicalElement, GameContext, GameState } from '@/types';
import { COLORS, calculateGameSizes, BALL_CONFIG } from '@/constants';

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
    this.movePosition(deltaTime);
    this.checkBoundaries();
  }

  public launchBall(): void {
    // Reset speed state
    this.currentSpeed = this.baseSpeed;
    this.speedMultiplier = BALL_CONFIG.ACCELERATION.INITIAL;

    // Use the new angle configuration
    const baseAngle = BALL_CONFIG.SPEED.RELATIVE.INITIAL_ANGLE.BASE;
    const variation = BALL_CONFIG.SPEED.RELATIVE.INITIAL_ANGLE.VARIATION;
    const randomVariation = (Math.random() * variation * 2) - variation;
    const launchAngle = (baseAngle + randomVariation) * (Math.PI / 180);
    
    // Convert angle to direction vector
    this.dx = Math.cos(launchAngle);
    this.dy = Math.sin(launchAngle);
    
    // Normalize and apply initial speed
    const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    this.dx = (this.dx / magnitude) * this.currentSpeed;
    this.dy = (this.dy / magnitude) * this.currentSpeed;

    // Randomize horizontal direction
    if (Math.random() > 0.5) {
      this.dx = -this.dx;
    }
  }

  public hit(hitFace: 'front' | 'top' | 'bottom', deflectionModifier: number = 0): void {
    const currentAngle = Math.atan2(this.dy, this.dx);
    const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

    switch (hitFace) {
      case 'front':
        // Reflect horizontally and apply deflection to angle
        const newAngle = Math.PI - currentAngle + (deflectionModifier * Math.PI);
        this.dx = Math.cos(newAngle) * speed;
        this.dy = Math.sin(newAngle) * speed;
        break;
      case 'bottom':
        // Reflect downward with same angle mechanics
        const topAngle = -currentAngle + (deflectionModifier * Math.PI);
        this.dx = Math.cos(topAngle) * speed;
        this.dy = Math.abs(Math.sin(topAngle) * speed); // Force downward
        break;
      case 'top':
        // Reflect upward with same angle mechanics
        const bottomAngle = -currentAngle + (deflectionModifier * Math.PI);
        this.dx = Math.cos(bottomAngle) * speed;
        this.dy = -Math.abs(Math.sin(bottomAngle) * speed); // Force upward
        break;
    }
    
    // Accelerate on every hit
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
    this.x = this.context.canvas.width / 2;
    this.y = this.context.canvas.height / 2;
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

  private movePosition(deltaTime: number): void {
    if (this.destroyed) return;
    this.x += this.dx * deltaTime;
    this.y += this.dy * deltaTime;
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
