import { Ball } from './Ball';
import { Paddle } from './Paddle';
import { GraphicalElement, GameContext, Direction, PlayerPosition, PlayerType, GameState } from '@pong/types';
import { COLORS, calculateGameSizes, KEYS, BALL_CONFIG, DEBUG } from '@pong/constants';

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
	protected predictedBouncePoints: { x: number; y: number }[] = [];
	protected finalPredictedImpactPoint: { x: number; y: number } | null = null;
	protected _lastCollisionTime: number;
	private paddle: Paddle;
	private movementFrozen: number = 0;
	protected prevRenderX: number = 0; // For rendering interpolation
	protected prevRenderY: number = 0; // For rendering interpolation

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
		this._targetY = this.startY;
		this._lastCollisionTime = 1000;
		this.upPressed = false;
		this.downPressed = false;
		this.direction = null;
		// Set keys based on position
		if (position === PlayerPosition.LEFT) {
			this._upKey = KEYS.PLAYER_LEFT_UP;
			this._downKey = KEYS.PLAYER_LEFT_DOWN;
			this._name = 'Player 1';
		} else {
			this._upKey = KEYS.PLAYER_RIGHT_UP;
			this._downKey = KEYS.PLAYER_RIGHT_DOWN;
			this._name = this._type === PlayerType.HUMAN ? 'Player 2' : 'Computer';
		}
		
		// Initialize paddle first
		this.paddle = new Paddle(x, y, this.paddleWidth, this.paddleHeight, context);
	
		
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
		// Store position for rendering interpolation BEFORE moving
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;

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
		
		// Update horizontal position AFTER potential y movement
		this.updateHorizontalPosition();
	}

	/**
	 * Draws the player's paddle using interpolation
	 * @param alpha Interpolation factor (0 to 1)
	 */
	public draw(ctx: GameContext, alpha: number): void {
		const interpolatedX = this.prevRenderX * (1 - alpha) + this.x * alpha;
		const interpolatedY = this.prevRenderY * (1 - alpha) + this.y * alpha;

		ctx.fillStyle = this.colour;
		ctx.fillRect(interpolatedX, interpolatedY, this.paddleWidth, this.paddleHeight);

		if (!DEBUG.enabled) return;

		// Draw debug info relative to interpolated position
		const zone = BALL_CONFIG.EDGES.ZONE_SIZE;
		const yTop = interpolatedY + this.paddleHeight * zone;
		const yBot = interpolatedY + this.paddleHeight * (1 - zone);
		ctx.strokeStyle = 'red';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(interpolatedX, yTop);
		ctx.lineTo(interpolatedX + this.paddleWidth, yTop);
		ctx.moveTo(interpolatedX, yBot);
		ctx.lineTo(interpolatedX + this.paddleWidth, yBot);
		ctx.stroke();

		// Draw predicted bounce points for debugging
		const bounceColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
		this.predictedBouncePoints.forEach((point, index) => {
			if (point) {
				// Cycle through colors if more bounces than defined colors
				ctx.fillStyle = bounceColors[index % bounceColors.length];
				ctx.beginPath();
				// Draw a small circle for each predicted bounce
				ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.closePath();
			}
		});

		// Draw final predicted impact point with a distinct color
		if (this.finalPredictedImpactPoint && this._position === PlayerPosition.RIGHT) { // Only draw for the predicting player
			ctx.fillStyle = 'cyan'; // Use cyan for the final impact point
			ctx.beginPath();
			ctx.arc(this.finalPredictedImpactPoint.x, this.finalPredictedImpactPoint.y, 6, 0, Math.PI * 2); // Slightly larger
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
		// if frozen, decrement timer and skip moving
		if (this.movementFrozen > 0) {
			console.log('movementFrozen', this.movementFrozen);
			this.direction = null;
			this.movementFrozen -= deltaTime;
			if (this.movementFrozen < 0) this.movementFrozen = 0;
			return;
		}
		if (this.direction === null) return;

		const frameSpeed = this.speed * deltaTime;
		const newY = this.direction === Direction.UP 
			? this.y - frameSpeed 
			: this.y + frameSpeed;

		const maxY = this.context.canvas.height - this.paddleHeight;
		this.y = Math.min(Math.max(0, newY), maxY);
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

	// =========================================
	// Prediction Methods
	// =========================================

	/**
	 * Public method to trigger an initial prediction calculation, usually at the start of a point.
	 * Checks if the ball is moving before calling the internal prediction logic.
	 */
	public calculateInitialPrediction(): void {
		// Ensure the ball object exists and has a non-zero velocity
		if (!this.ball) return;
		const ballVelocity = this.ball.getVelocity();
		if (ballVelocity.dx !== 0 || ballVelocity.dy !== 0) {
			this.predictBallTrajectory(this.ball.getPosition(), ballVelocity);
			this._lastCollisionTime = 0;
		} else {
			// If ball is not moving, clear predictions
			this.predictedBouncePoints = [];
			this.finalPredictedImpactPoint = null;
		}
	}

	/**
	 * Predicts the ball's trajectory through multiple bounces until it heads back
	 * towards the player's paddle line. Updates `predictedBouncePoints` and `_targetY`.
	 */
	public predictBallTrajectory(
		startPoint: { x: number; y: number },
		initialVelocity: { dx: number; dy: number }
	): void {
		if (Date.now() - this._lastCollisionTime < 1000) {
			return;
		}
		this._lastCollisionTime = Date.now();
		this.predictedBouncePoints = []; // Reset points for new prediction
		this.finalPredictedImpactPoint = null; // Reset final impact point
		const { width, height } = this.context.canvas;
		const ballRadius = this.ball.getSize();
		const sizes = calculateGameSizes(width, height);
		const maxBounces = 6; // Limit the number of predicted bounces

		let currentPos = { ...startPoint };
		let currentVel = { ...initialVelocity };

		// Determine player and opponent X coordinates (edge of paddle facing the ball)
		const playerPaddleEdgeX = this._position === PlayerPosition.LEFT
			? sizes.PLAYER_PADDING + this.paddleWidth // Right edge of left paddle
			: width - (sizes.PLAYER_PADDING + this.paddleWidth); // Left edge of right paddle
		const opponentPaddleEdgeX = this._position === PlayerPosition.LEFT
			? width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH) // Left edge of right (opponent) paddle
			: sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH; // Right edge of left (opponent) paddle

		for (let bounceCount = 0; bounceCount < maxBounces; bounceCount++) {
			let timeToCollision = Infinity;
			let collisionType: 'top' | 'bottom' | 'opponent' | 'player' | 'none' = 'none';
			let collisionPoint: { x: number; y: number } | null = null;

			// Time to hit vertical walls (Top/Bottom)
			let timeToTop = Infinity;
			if (currentVel.dy < 0) { // Moving up
				timeToTop = (ballRadius - currentPos.y) / currentVel.dy;
			}
			let timeToBottom = Infinity;
			if (currentVel.dy > 0) { // Moving down
				timeToBottom = (height - ballRadius - currentPos.y) / currentVel.dy;
			}

			// Time to hit paddle lines (Opponent/Player), adjusted for ball radius
			let timeToOpponent = Infinity;
			if (currentVel.dx !== 0) {
				// Check if moving towards opponent
				if ((this._position === PlayerPosition.LEFT && currentVel.dx > 0)) { // Moving right towards right opponent
					const targetX = opponentPaddleEdgeX - ballRadius; // Left edge of opponent - radius
					timeToOpponent = (targetX - currentPos.x) / currentVel.dx;
				} else if ((this._position === PlayerPosition.RIGHT && currentVel.dx < 0)) { // Moving left towards left opponent
					const targetX = opponentPaddleEdgeX + ballRadius; // Right edge of opponent + radius
					timeToOpponent = (targetX - currentPos.x) / currentVel.dx;
				}
			}

			let timeToPlayer = Infinity;
			if (currentVel.dx !== 0) {
				// Check if moving towards player
				if ((this._position === PlayerPosition.LEFT && currentVel.dx < 0)) { // Moving left towards left player
					const targetX = playerPaddleEdgeX + ballRadius; // Right edge of player + radius
					timeToPlayer = (targetX - currentPos.x) / currentVel.dx;
				} else if ((this._position === PlayerPosition.RIGHT && currentVel.dx > 0)) { // Moving right towards right player
					const targetX = playerPaddleEdgeX - ballRadius; // Left edge of player - radius
					timeToPlayer = (targetX - currentPos.x) / currentVel.dx;
				}
			}

			// Find the earliest positive collision time
			timeToCollision = Math.min(timeToTop, timeToBottom, timeToOpponent, timeToPlayer);

			// Determine collision type based on the minimum time
			if (timeToCollision <= 0 || timeToCollision === Infinity) {
				// No valid collision predicted, stop simulation
				break;
			}

			// Calculate the exact point of collision
			collisionPoint = {
				x: currentPos.x + currentVel.dx * timeToCollision,
				y: currentPos.y + currentVel.dy * timeToCollision
			};

			// Determine type and update velocity for next segment
			if (timeToCollision === timeToTop) {
				collisionType = 'top';
				currentVel.dy *= -1; // Reflect vertically
			} else if (timeToCollision === timeToBottom) {
				collisionType = 'bottom';
				currentVel.dy *= -1; // Reflect vertically
			} else if (timeToCollision === timeToOpponent) {
				// Opponent paddle: pure horizontal bounce, no vertical deflection
				collisionType = 'opponent';
				currentVel.dx = -currentVel.dx;
			} else if (timeToCollision === timeToPlayer) {
				// Ball is heading towards the player's line. This is our target.
				// We don't add this point to bounces, but use it to calculate targetY.
				collisionType = 'player'; // Set type but break below
			}

			// If the collision is with the player's line, we've found the end point.
			if (collisionType === 'player') {
				// Store the final impact point
				this.finalPredictedImpactPoint = collisionPoint;

				// Calculate final target Y based on this collision point
				const finalPredictedY = collisionPoint.y;
				// Clamp the predicted Y to stay within playable bounds (paddle center)
				const paddleCenterMinY = this.paddleHeight / 2;
				const paddleCenterMaxY = height - this.paddleHeight / 2;
				this._targetY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedY));
				break; // Exit the loop, prediction complete
			}

			// Store the valid bounce point (wall or opponent paddle)
			if (collisionPoint) {
				this.predictedBouncePoints.push(collisionPoint);
			}

			// Update current position for the next iteration
			currentPos = collisionPoint;

			// If loop finishes without hitting player line, reset targetY?
			if (bounceCount === maxBounces - 1) {
				// Max bounces reached, predict final impact on player line if possible
				let finalTimeToPlayerFallback = Infinity;
				if (currentVel.dx !== 0) {
					if ((this._position === PlayerPosition.LEFT && currentVel.dx < 0)) { // Moving left towards left player
						const targetX = playerPaddleEdgeX + ballRadius;
						finalTimeToPlayerFallback = (targetX - currentPos.x) / currentVel.dx;
					} else if ((this._position === PlayerPosition.RIGHT && currentVel.dx > 0)) { // Moving right towards right player
						const targetX = playerPaddleEdgeX - ballRadius;
						finalTimeToPlayerFallback = (targetX - currentPos.x) / currentVel.dx;
					}
				}

				if (finalTimeToPlayerFallback > 0 && finalTimeToPlayerFallback !== Infinity) {
					const finalPredictedYFallback = currentPos.y + currentVel.dy * finalTimeToPlayerFallback;
					const finalPredictedXFallback = currentPos.x + currentVel.dx * finalTimeToPlayerFallback; // Calculate X as well

					// Store the final impact point from fallback
					this.finalPredictedImpactPoint = { x: finalPredictedXFallback, y: finalPredictedYFallback };

					const paddleCenterMinY = this.paddleHeight / 2;
					const paddleCenterMaxY = height - this.paddleHeight / 2;
					this._targetY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedYFallback));
				} else {
					// Cannot predict return, default target and clear final point
					this.finalPredictedImpactPoint = null;
					this._targetY = this.y + this.paddleHeight / 2; // Default to current paddle center
				}
			}
		}
	}

	// =========================================
	// AI Control Methods
	// =========================================
	/**
	 * Updates AI inputs based on ball position and game state
	 */
	protected updateAIInputs(ctx: GameContext): void {
		// Compute time to cross half the canvas at current horizontal speed
		const vx = Math.abs(this.ball.getVelocity().dx);
		const paddleCenter = this.y + (this.paddleHeight * 0.5);
		if (vx > 0) {
			const Width = ctx.canvas.width;
			const thresholdMs = (Width / vx) * 1.2 * 1000;
			if (Date.now() - this._lastCollisionTime < thresholdMs) {
				this.moveTowardsCenter(paddleCenter, ctx.canvas.height * 0.5);
				return;
			}
		}
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
		// Use a fraction of paddle height instead of speed
		const deadzone = this.paddleHeight * 0.1; // 10% of paddle height
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
		// Use a fraction of paddle height instead of speed
		const deadzone = this.paddleHeight * 0.1; // 10% of paddle height

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
		// Use a fraction of paddle height instead of speed
		const deadzone = this.paddleHeight * 0.1; // 10% of paddle height
		
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

	/**
	 * Freeze this paddle's movement for a duration (in seconds).
	 */
	public freezeMovement(duration: number): void {
		this.movementFrozen = duration;
	}
}
