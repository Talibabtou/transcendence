import { Ball } from './Ball';
import { GraphicalElement, GameContext, Direction, PlayerPosition, PlayerType } from '@pong/types';
import { COLORS, GAME_CONFIG, calculateGameSizes, KEYS } from '@pong/constants';
import { PaddleHitbox } from './PaddleHitbox';
import { GameState } from '@pong/types';

export class Player implements GraphicalElement {
	// =========================================
	// Protected Properties
	// =========================================
	protected direction: Direction | null = null;
	protected speed: number = 5;
	protected readonly colour = COLORS.PADDLE;
	protected score = 0;
	protected readonly startX: number;
	protected readonly startY: number;
	protected readonly hitbox: PaddleHitbox;
	protected upPressed = false;
	protected downPressed = false;
	protected _name: string = 'Player';
	protected _isAIControlled: boolean;
	protected _position: PlayerPosition;
	protected _upKey: string;
	protected _downKey: string;

	// =========================================
	// Event Handlers
	// =========================================
	private readonly handleKeydown = (evt: KeyboardEvent): void => {
		switch (evt.code) {
			case this._upKey:
				this.upPressed = true;
				break;
			case this._downKey:
				this.downPressed = true;
				break;
		}
		this.updateDirection();
	};

	private readonly handleKeyup = (evt: KeyboardEvent): void => {
		switch (evt.code) {
			case this._upKey:
				this.upPressed = false;
				break;
			case this._downKey:
				this.downPressed = false;
				break;
		}
		this.updateDirection();
	};

	// =========================================
	// Public Properties
	// =========================================
	public paddleWidth: number = 10;
	public paddleHeight: number = 100;
	public get name(): string {
		return this._name;
	}

	// =========================================
	// Constructor
	// =========================================
	constructor(
		public x: number,
		public y: number,
		protected readonly ball: Ball,
		protected readonly context: GameContext,
		position: PlayerPosition = PlayerPosition.LEFT,
		type: PlayerType = PlayerType.HUMAN
	) {
		this.startX = x;
		this.startY = context.canvas.height / 2 - this.paddleHeight / 2;
		this.y = this.startY;
		
		this._position = position;
		this._isAIControlled = type === PlayerType.AI;
		
		// Set keys based on position
		if (position === PlayerPosition.LEFT) {
			this._upKey = KEYS.PLAYER_LEFT_UP;
			this._downKey = KEYS.PLAYER_LEFT_DOWN;
			this._name = 'Player 1';
		} else {
			this._upKey = KEYS.PLAYER_RIGHT_UP;
			this._downKey = KEYS.PLAYER_RIGHT_DOWN;
			this._name = this._isAIControlled ? 'Computer' : 'Player 2';
		}
		
		this.hitbox = new PaddleHitbox(this, ball);
		this.updateSizes();
	}

	// =========================================
	// Public API
	// =========================================
	public getScore(): number {
		return this.score;
	}

	public givePoint(): void {
		this.score += 1;
	}

	public resetScore(): void {
		this.score = 0;
	}

	public stopMovement(): void {
		this.direction = null;
	}

	public resetPosition(): void {
		const height = this.context.canvas.height;
		this.y = height / 2 - this.paddleHeight / 2;
	}
	
	public isAIControlled(): boolean {
		return this._isAIControlled;
	}
	
	public getPosition(): PlayerPosition {
		return this._position;
	}

	// =========================================
	// Size Management
	// =========================================
	public updateSizes(): void {
		if (!this.context) return;
		
		const { width, height } = this.context.canvas;
		const sizes = calculateGameSizes(width, height);
		
		this.paddleWidth = sizes.PADDLE_WIDTH;
		this.paddleHeight = sizes.PADDLE_HEIGHT;
		this.speed = sizes.PADDLE_SPEED;

		this.updateHorizontalPosition();
	}

	// =========================================
	// Game Loop Methods
	// =========================================
	public update(ctx: GameContext, deltaTime: number, state: GameState): void {
		const { width, height } = ctx.canvas;
		const sizes = calculateGameSizes(width, height);
		this.paddleHeight = sizes.PADDLE_HEIGHT;

		// Update AI inputs if AI-controlled and playing or in background mode
		if (this._isAIControlled && (state === GameState.PLAYING || state === GameState.COUNTDOWN)) {
			this.updateAIInputs(ctx);
		}
		
		if (state === GameState.PLAYING) {
			this.updateMovement(deltaTime);
		}
		
		this.updateHorizontalPosition();
		this.checkBallCollision();
	}

	public draw(ctx: GameContext): void {
		ctx.fillStyle = this.colour;
		ctx.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);
	}

	// =========================================
	// Control Methods
	// =========================================
	public bindControls(): void {
		if (this.isAIControlled()) {
			return;
		}

		// Set up controls based on player position
		if (this._position === PlayerPosition.LEFT) {
			this._upKey = KEYS.PLAYER_LEFT_UP;     // 'KeyW'
			this._downKey = KEYS.PLAYER_LEFT_DOWN;  // 'KeyS'
		} else {
			this._upKey = KEYS.PLAYER_RIGHT_UP;     // 'ArrowUp'
			this._downKey = KEYS.PLAYER_RIGHT_DOWN;  // 'ArrowDown'
		}

		window.addEventListener('keydown', this.handleKeydown);
		window.addEventListener('keyup', this.handleKeyup);
	}

	public unbindControls(): void {
		this.upPressed = false;
		this.downPressed = false;
		this.direction = null;
		
		window.removeEventListener('keydown', this.handleKeydown);
		window.removeEventListener('keyup', this.handleKeyup);
	}
	
	// =========================================
	// Control Mode Methods
	// =========================================
	public setControlType(type: PlayerType): void {
		const wasAI = this._isAIControlled;
		this._isAIControlled = type === PlayerType.AI;
		
		// Reset inputs
		this.upPressed = false;
		this.downPressed = false;
		this.direction = null;
		
		// Update name based on position and type
		if (this._position === PlayerPosition.LEFT) {
			this._name = 'Player 1';
		} else {
			this._name = this._isAIControlled ? 'Computer' : 'Player 2';
		}
		
		// Handle control binding/unbinding
		if (wasAI && !this._isAIControlled) {
			// Changed from AI to human
			this.bindControls();
		} else if (!wasAI && this._isAIControlled) {
			// Changed from human to AI
			this.unbindControls();
		}
	}

	// =========================================
	// Protected Methods
	// =========================================
	protected updateHorizontalPosition(): void {
		const { width } = this.context.canvas;
		const sizes = calculateGameSizes(width, this.context.canvas.height);
		
		if (this._position === PlayerPosition.LEFT) {
			this.x = sizes.PLAYER_PADDING;
		} else {
			this.x = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
		}
	}

	protected updateMovement(deltaTime: number): void {
		if (this.direction === null) return;

		const frameSpeed = this.speed * GAME_CONFIG.FPS * deltaTime;
		const newY = this.direction === Direction.UP 
			? this.y - frameSpeed 
			: this.y + frameSpeed;

		const maxY = this.context.canvas.height - this.paddleHeight;
		this.y = Math.min(Math.max(0, newY), maxY);
	}

	protected updateDirection(): void {
		if (this.upPressed && this.downPressed) {
			this.direction = null;
		} else if (this.upPressed) {
			this.direction = Direction.UP;
		} else if (this.downPressed) {
			this.direction = Direction.DOWN;
		} else {
			this.direction = null;
		}
	}

	protected checkBallCollision(): void {
		const collision = this.hitbox.checkCollision();
		if (collision.collided) {
			this.ball.hit(collision.hitFace, collision.deflectionModifier);
		}
	}
	
	// =========================================
	// AI Control Methods
	// =========================================
	protected updateAIInputs(ctx: GameContext): void {
		const paddleCenter = this.y + (this.paddleHeight / 2);
		const centerY = ctx.canvas.height / 2 - this.paddleHeight / 2;
		
		// Only update AI movement if the ball is actually moving
		if (this.ball.dx === 0 && this.ball.dy === 0) {
			// Slowly return to center when ball is not moving
			this.moveTowardsCenter(paddleCenter, centerY);
			return;
		}
		
		// Different behavior based on player position and ball direction
		if (this._position === PlayerPosition.LEFT) {
			// Left player AI
			if (this.ball.dx >= 0) {
				// Ball moving away - return to center with smooth movement
				this.moveTowardsCenter(paddleCenter, centerY);
			} else {
				// Ball coming towards - track with smooth movement
				this.trackBallWithDelay(paddleCenter);
			}
		} else {
			// Right player AI
			if (this.ball.dx <= 0) {
				// Ball moving away - return to center with smooth movement
				this.moveTowardsCenter(paddleCenter, centerY);
			} else {
				// Ball coming towards - track with smooth movement
				this.trackBallWithDelay(paddleCenter);
			}
		}
	}

	private moveTowardsCenter(paddleCenter: number, centerY: number): void {
		// Create a moderate deadzone for center position to prevent jitter
		const deadzone = this.speed * 1.0;
		const targetY = centerY + (this.paddleHeight / 2);
		
		if (Math.abs(paddleCenter - targetY) < deadzone) {
			// Within deadzone - stop movement
			this.upPressed = false;
			this.downPressed = false;
		} else {
			// Move towards center with smooth movement
			this.upPressed = paddleCenter > targetY;
			this.downPressed = paddleCenter < targetY;
		}
		this.updateDirection();
	}

	private trackBallWithDelay(paddleCenter: number): void {
		// Remove prediction error and directly track ball
		const targetY = this.ball.y;
		
		// Keep a small deadzone to prevent jitter
		const deadzone = this.speed * 0.5; // Reduced from 0.6 for more precise tracking
		
		if (Math.abs(paddleCenter - targetY) < deadzone) {
			this.upPressed = false;
			this.downPressed = false;
		} else {
			this.upPressed = paddleCenter > targetY;
			this.downPressed = paddleCenter < targetY;
		}
		
		this.updateDirection();
	}

	public setName(name: string): void {
		this._name = name;
	}
}
