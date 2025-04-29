import { Ball } from './Ball';
import { Paddle } from './Paddle';
import { GraphicalElement, GameContext, Direction, PlayerPosition, PlayerType, GameState } from '@pong/types';
import { COLORS, calculateGameSizes, KEYS } from '@pong/constants';
import { CollisionManager, PaddleHitbox, BallHitbox } from '@pong/game/physics';

/**
 * Represents a player in the game, managing paddle movement,
 * input handling, scoring, and AI behavior.
 */
export class Player implements GraphicalElement {
	// =========================================
	// Protected Properties
	// =========================================
	protected direction: Direction | null = null;
	protected speed: number = 0;
	protected colour = COLORS.PADDLE;
	protected score = 0;
	protected readonly startX: number;
	protected readonly startY: number;
	protected upPressed = false;
	protected downPressed = false;
	protected _name: string = 'Player';
	protected _type: PlayerType;
	protected _position: PlayerPosition;
	protected _upKey: string;
	protected _downKey: string;
	protected _targetY: number;
	protected predictedBouncePoint1: { x: number; y: number } | null = null;
	protected predictedBouncePoint2: { x: number; y: number } | null = null;
	protected predictedBouncePoint3: { x: number; y: number } | null = null;
	protected _lastCollisionTime: number;
	private paddle: Paddle;
	private paddleHitbox: PaddleHitbox;
	private readonly CollisionManager: CollisionManager;

	// =========================================
	// Event Handlers
	// =========================================
	/**
	 * Handles keyboard keydown events for player control
	 */
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

	/**
	 * Handles keyboard keyup events for player control
	 */
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
	/**
	 * Creates a new Player instance
	 * @param x The horizontal position
	 * @param y The vertical position
	 * @param ball The ball object for tracking and collision
	 * @param context The canvas rendering context
	 * @param position The player's position (left or right)
	 * @param type Whether the player is AI or human controlled
	 */
	constructor(
		public x: number,
		public y: number,
		protected readonly ball: Ball,
		protected readonly context: GameContext,
		position: PlayerPosition = PlayerPosition.LEFT,
		type: PlayerType = PlayerType.HUMAN
	) {
		if (!ball) {
			throw new Error('Ball must be provided to Player');
		}
		if (!context) {
			throw new Error('Context must be provided to Player');
		}

		this.startX = x;
		this.startY = context.canvas.height * 0.5 - this.paddleHeight * 0.5;
		this.y = this.startY;
		
		this._position = position;
		this._type = type;
		// this._isAIControlled = type === PlayerType.AI;
		this._targetY = this.startY + 150;
		this._lastCollisionTime = 2000;
		// Set keys based on position
		if (position === PlayerPosition.LEFT) {
			this._upKey = KEYS.PLAYER_LEFT_UP;
			this._downKey = KEYS.PLAYER_LEFT_DOWN;
			this._name = 'Player 1';
		} else {
			this._upKey = KEYS.PLAYER_RIGHT_UP;
			this._downKey = KEYS.PLAYER_RIGHT_DOWN;
			this._name = this._type === PlayerType.HUMAN ? 'Player 2' : 'Computer';
			// this._name = this._isAIControlled ? 'Computer' : 'Player 2';
		}
		
		// Initialize paddle first
		this.paddle = new Paddle(x, y, this.paddleWidth, this.paddleHeight, context);
		
		// Then initialize physics components
		this.paddleHitbox = new PaddleHitbox(this.paddle);
		this.CollisionManager = new CollisionManager();
		
		// Finally update sizes
		this.updateSizes();
	}

	// =========================================
	// Public API
	// =========================================
	/**
	 * Returns the player's current score
	 */
	public getScore(): number {
		return this.score;
	}

	/**
	 * Increments the player's score by one point
	 */
	public givePoint(): void {
		this.score += 1;
	}

	/**
	 * Resets the player's score to zero
	 */
	public resetScore(): void {
		this.score = 0;
	}

	/**
	 * Stops the player's paddle movement
	 */
	public stopMovement(): void {
		this.direction = null;
	}

	/**
	 * Resets the player's paddle to the center position
	 */
	public resetPosition(): void {
		const height = this.context.canvas.height;
		this.y = height * 0.5 - this.paddleHeight * 0.5;
		// Update paddle position
		this.paddle.setPosition(this.x, this.y);
	}
	
	/**
	 * Returns whether this player is AI controlled
	 */
	// public isAIControlled(): boolean {
	// 	return this._isAIControlled;
	// }
	
	public setPlayerType(type: PlayerType): void {
		this._type = type;
	}

	/**
	 * Returns the player's type
	 */
	public getPlayerType(): PlayerType {
		return this._type;
	}

	/**
	 * Returns the player's position (left or right)
	 */
	public getPosition(): PlayerPosition {
		return this._position;
	}

	// =========================================
	// Size Management
	// =========================================
	/**
	 * Updates the player's paddle dimensions based on canvas size
	 */
	public updateSizes(): void {
		if (!this.context) return;
		
		const { width, height } = this.context.canvas;
		const sizes = calculateGameSizes(width, height);
		
		this.paddleWidth = sizes.PADDLE_WIDTH;
		this.paddleHeight = sizes.PADDLE_HEIGHT;
		this.speed = sizes.PADDLE_SPEED;

		// Update paddle with new sizes
		this.paddle.updateDimensions(this.paddleWidth, this.paddleHeight);
		
		this.updateHorizontalPosition();
	}

	// =========================================
	// Game Loop Methods
	// =========================================
	/**
	 * Updates player state for the current frame
	 */
	public update(ctx: GameContext, deltaTime: number, state: GameState): void {
		const { width, height } = ctx.canvas;
		const sizes = calculateGameSizes(width, height);
		this.paddleHeight = sizes.PADDLE_HEIGHT;

		// Update AI inputs if AI-controlled and playing or in background mode
		if (this._type === PlayerType.BACKGROUND && (state === GameState.PLAYING || state === GameState.COUNTDOWN)) {
			this.updateBackgroundInputs(ctx);
		}

		if (this._type === PlayerType.AI && (state === GameState.PLAYING || state === GameState.COUNTDOWN)) {
			this.updateAIInputs(ctx);
		}
		if (state === GameState.PLAYING) {
			this.updateMovement(deltaTime);
		}
		
		this.updateHorizontalPosition();
		this.checkBallCollision();
	}

	/**
	 * Draws the player's paddle
	 */
	public draw(ctx: GameContext): void {
		ctx.fillStyle = this.colour;
		ctx.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);

		// Draw predicted bounce point for debugging
		if (this.predictedBouncePoint1 && this._position === PlayerPosition.RIGHT) {
			ctx.fillStyle = 'red';
			ctx.beginPath();
			ctx.arc(this.predictedBouncePoint1.x, this.predictedBouncePoint1.y, 5, 0, Math.PI * 2); // Draw a small red circle
			ctx.fill();
			ctx.closePath();
		}
	}

	// =========================================
	// Control Methods
	// =========================================
	/**
	 * Sets up keyboard event listeners for player control
	 */
	public bindControls(): void {
		// if (this._isAIControlled) return;
		
		window.addEventListener('keydown', this.handleKeydown, { passive: true });
		window.addEventListener('keyup', this.handleKeyup, { passive: true });
	}

	/**
	 * Removes keyboard event listeners for player control
	 */
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
	/**
	 * Sets whether this player is AI controlled or human controlled
	 */
	public setControlType(type: PlayerType): void {
		// const wasAI = this._type !== PlayerType.HUMAN;
		// const isAI = type !== PlayerType.HUMAN;
		this._type = type;
		
		// // Reset inputs
		// this.upPressed = false;
		// this.downPressed = false;
		// this.direction = null;
		
		// // Update name based on position and type
		// if (this._position === PlayerPosition.LEFT) {
		// 	this._name = 'Player 1';
		// } else {
		// 	this._name = this._type === PlayerType.HUMAN ? 'Player 2' : 'Computer';
		// }
		
		// Handle control binding/unbinding
		// if (wasAI && !isAI) {
		// 	// Changed from AI to human
		// 	this.bindControls();
		// } else if (!wasAI && isAI) {
		// 	// Changed from human to AI
		// 	this.unbindControls();
		// }
	}

	// =========================================
	// Protected Methods
	// =========================================
	/**
	 * Updates the horizontal position of the player's paddle.
	 * This method should be called whenever the player's x position changes.
	 */
	public updateHorizontalPosition(): void {
		const { width } = this.context.canvas;
		const sizes = calculateGameSizes(width, this.context.canvas.height);
		
		if (this._position === PlayerPosition.LEFT) {
			this.x = sizes.PLAYER_PADDING;
		} else {
			this.x = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
		}
		
		// Update paddle position
		this.paddle.setPosition(this.x, this.y);
	}

	/**
	 * Updates the paddle's position based on input direction
	 */
	protected updateMovement(deltaTime: number): void {
		// Update paddle direction based on input
		this.paddle.setDirection(this.direction);
		
		// Update paddle movement
		this.paddle.updateMovement(deltaTime);
		
		// Sync position with paddle
		const pos = this.paddle.getPosition();
		this.x = pos.x;
		this.y = pos.y;
	}

	/**
	 * Updates the movement direction based on current key states
	 */
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

	/**
	 * Checks for collision between this player's paddle and the ball
	 */
	protected checkBallCollision(): void {
		if (!this.ball) {
			console.warn('Ball is undefined in Player.checkBallCollision');
			return;
		}

		try {
			const ballHitbox = new BallHitbox(this.ball);
			ballHitbox.updatePreviousPosition();
			
			const collision = this.CollisionManager.checkBallPaddleCollision(
				ballHitbox,
				this.paddleHitbox
			);
			if (Date.now() - this._lastCollisionTime > 1000 && collision.collided) {
				this._lastCollisionTime = Date.now();
				this.ball.hit(collision.hitFace, collision.deflectionModifier);

				// Predict next bounce after the hit
				const postCollisionVelocity = this.ball.getVelocity();
				if (collision.collisionPoint) {
					this.predictBallBounce(collision.collisionPoint, postCollisionVelocity);
				} else {
					// Fallback if collisionPoint is somehow missing (shouldn't happen with current logic)
					this.predictedBouncePoint1 = null;
				}
			}
		} catch (error) {
			console.error('Error in checkBallCollision:', error);
		}
	}

	// =========================================
	// Prediction Methods
	// =========================================

	/**
	 * Predicts the ball's trajectory after a collision to determine the target Y.
	 * Calculates the next bounce off a horizontal wall.
	 */
	protected predictBallBounce(
		collisionPoint: { x: number; y: number },
		postCollisionVelocity: { dx: number; dy: number }
	): void {
		const { width, height } = this.context.canvas;
		const ballRadius = this.ball.getSize();
		const sizes = calculateGameSizes(width, height);

		let timeToWall = Infinity;
		let bounceY = 0;

		// Predict bounce off top/bottom wall
		if (postCollisionVelocity.dy !== 0) {
			if (postCollisionVelocity.dy < 0) { // Moving up
				bounceY = ballRadius;
				timeToWall = (bounceY - collisionPoint.y) / postCollisionVelocity.dy;
			} else { // Moving down
				bounceY = height - ballRadius;
				timeToWall = (bounceY - collisionPoint.y) / postCollisionVelocity.dy;
			}
		}

		if (timeToWall <= 0 || timeToWall === Infinity) {
			// No wall bounce predicted or happens instantly/in the past, reset prediction
			this.predictedBouncePoint1 = null;
			return;
		}

		const bounceX = collisionPoint.x + postCollisionVelocity.dx * timeToWall;

		// Check if bounce occurs within horizontal bounds
		if (bounceX < 0 || bounceX > width) {
			this.predictedBouncePoint1 = null; // Bounce happens off-screen horizontally
		} else {
			this.predictedBouncePoint1 = { x: bounceX, y: bounceY };
		}


		// Calculate trajectory after bounce
		const postBounceVelocityX = postCollisionVelocity.dx;
		const postBounceVelocityY = -postCollisionVelocity.dy; // Reverse Y velocity

		// Determine the X coordinate of the opponent's paddle line
		let opponentPaddleLineX: number;
		if (this._position === PlayerPosition.LEFT) {
			opponentPaddleLineX = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH / 2); // Target center of opponent paddle
		} else {
			opponentPaddleLineX = sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH / 2; // Target center of opponent paddle
		}

		// Calculate time to reach the opponent's paddle line from the bounce point
		let timeToOpponent = Infinity;
		if (postBounceVelocityX !== 0) {
			timeToOpponent = (opponentPaddleLineX - bounceX) / postBounceVelocityX;
		}

		if (timeToOpponent < 0 || timeToOpponent === Infinity) {
			// Ball won't reach opponent after bounce (e.g., moving away)
			// Keep the previous prediction or default to center? Let's default for now.
			return;
		}

		// Calculate the Y position at the opponent's line
		let finalPredictedY = bounceY + postBounceVelocityY * timeToOpponent;

		// Clamp the predicted Y to stay within playable bounds (paddle center)
		const paddleCenterMinY = this.paddleHeight / 2;
		const paddleCenterMaxY = height - this.paddleHeight / 2;
		finalPredictedY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedY));

	}

	// =========================================
	// AI Control Methods
	// =========================================
	/**
	 * Updates AI inputs based on ball position and game state
	 */
	protected updateAIInputs(ctx: GameContext): void {
		const paddleCenter = this.y + (this.paddleHeight * 0.5);
		this.moveTowardsPredictedBallY(paddleCenter);
		this.updateDirection();
	}

	protected updateBackgroundInputs(ctx: GameContext): void {
		const paddleCenter = this.y + (this.paddleHeight * 0.5);
		const centerY = ctx.canvas.height * 0.5 - this.paddleHeight * 0.5;
		
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
	
	/**
	 * AI helper method to move paddle towards center position
	 */
	private moveTowardsCenter(paddleCenter: number, centerY: number): void {
		// Create a moderate deadzone for center position to prevent jitter
		const deadzone = this.speed * 1.0;
		const targetY = centerY + (this.paddleHeight * 0.5);

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

	/**
	 * AI helper method to move paddle towards the predicted ball Y position
	 */
	private moveTowardsPredictedBallY(paddleCenter: number): void {
		const deadzone = this.speed * 0.5; // Smaller deadzone for more precise targeting

		if (Math.abs(paddleCenter - this._targetY) < deadzone) {
			// Within deadzone - stop movement
			this.upPressed = false;
			this.downPressed = false;
		} else {
			// Move towards the predicted Y
			this.upPressed = paddleCenter > this._targetY;
			this.downPressed = paddleCenter < this._targetY;
		}
		// updateDirection() will be called by the caller (updateAIInputs)
	}

	/**
	 * AI helper method to track the ball with realistic movement
	 */
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

	/**
	 * Sets the display name for this player
	 */
	public setName(name: string): void {
		this._name = name;
	}

	/**
	 * Sets the paddle color
	 * @param color Hex color string
	 */
	public setColor(color: string): void {
		(this as any).colour = color;
	}
}
