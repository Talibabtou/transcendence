import { Ball } from './Ball';
import { Paddle } from './Paddle';
import { GraphicalElement, GameContext, Direction, PlayerPosition, PlayerType, GameState } from '@pong/types';
import { COLORS, calculateGameSizes, KEYS, BALL_CONFIG, DEBUG } from '@pong/constants';

// Define a simple AABB interface for dirty rectangles
interface AABB {
	x: number;
	y: number;
	width: number;
	height: number;
}

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

	// Bounding boxes for dirty rectangle calculation
	protected currentBoundingBox: AABB;
	protected previousBoundingBox: AABB;

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
	
		// Initialize bounding boxes (paddle dimensions might not be final yet)
		this.currentBoundingBox = { x: this.x, y: this.y, width: this.paddleWidth, height: this.paddleHeight };
		this.previousBoundingBox = { ...this.currentBoundingBox };
		
		// Finally update sizes (this will also update bounding box based on final dims)
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
		// Update bounding box after size change
		this.updateBoundingBox();
	}

	// =========================================
	// Game Loop Methods
	// =========================================
	/**
	 * Updates player state for the current frame
	 */
	public update(ctx: GameContext, deltaTime: number, state: GameState): void {
		// --- Bounding Box Update (Start) ---
		// Store the *current* box as the *previous* one before any potential updates this frame
		this.previousBoundingBox = { ...this.currentBoundingBox };
		// --- End Bounding Box Update (Start) ---

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

		// --- Bounding Box Update (End) ---
		// Update the current bounding box based on the final position for this frame
		this.updateBoundingBox();
		// --- End Bounding Box Update (End) ---
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
	 * Now accounts for ball acceleration after simulated bounces.
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
		const maxBounces = 6;

		let currentPos = { ...startPoint };
		let currentVel = { ...initialVelocity };

		// Initialize simulated speed state based on the initial velocity
		let simulatedCurrentSpeed = Math.sqrt(currentVel.dx * currentVel.dx + currentVel.dy * currentVel.dy);
		// Estimate initial multiplier (this might not be perfectly accurate if prediction starts mid-flight,
		// but it's the best guess without tracking the ball's actual multiplier history)
		let simulatedSpeedMultiplier = this.ball.baseSpeed > 0 ? simulatedCurrentSpeed / this.ball.baseSpeed : BALL_CONFIG.ACCELERATION.INITIAL;
		simulatedSpeedMultiplier = Math.max(BALL_CONFIG.ACCELERATION.INITIAL, simulatedSpeedMultiplier); // Ensure it's at least the initial multiplier

		const playerPaddleEdgeX = this._position === PlayerPosition.LEFT
			? sizes.PLAYER_PADDING + this.paddleWidth
			: width - (sizes.PLAYER_PADDING + this.paddleWidth);
		const opponentPaddleEdgeX = this._position === PlayerPosition.LEFT
			? width - (sizes.PLAYER_PADDING + this.paddleWidth)
			: sizes.PLAYER_PADDING + this.paddleWidth;

		for (let bounceCount = 0; bounceCount < maxBounces; bounceCount++) {
			let timeToCollision = Infinity;
			let collisionType: 'top' | 'bottom' | 'opponent' | 'player' | 'none' = 'none';
			let collisionPoint: { x: number; y: number } | null = null;

			// Recalculate times based on currentVel (which now includes speed changes)
			let timeToTop = Infinity;
			if (currentVel.dy < 0) { timeToTop = (ballRadius - currentPos.y) / currentVel.dy; }
			let timeToBottom = Infinity;
			if (currentVel.dy > 0) { timeToBottom = (height - ballRadius - currentPos.y) / currentVel.dy; }
			let timeToOpponent = Infinity;
			if (currentVel.dx !== 0) {
				if ((this._position === PlayerPosition.LEFT && currentVel.dx > 0)) {
					const targetX = opponentPaddleEdgeX - ballRadius;
					if (currentVel.dx !== 0) timeToOpponent = (targetX - currentPos.x) / currentVel.dx;
				} else if ((this._position === PlayerPosition.RIGHT && currentVel.dx < 0)) {
					const targetX = opponentPaddleEdgeX + ballRadius;
					if (currentVel.dx !== 0) timeToOpponent = (targetX - currentPos.x) / currentVel.dx;
				}
			}
			let timeToPlayer = Infinity;
			if (currentVel.dx !== 0) {
				if ((this._position === PlayerPosition.LEFT && currentVel.dx < 0)) {
					const targetX = playerPaddleEdgeX + ballRadius;
					if (currentVel.dx !== 0) timeToPlayer = (targetX - currentPos.x) / currentVel.dx;
				} else if ((this._position === PlayerPosition.RIGHT && currentVel.dx > 0)) {
					const targetX = playerPaddleEdgeX - ballRadius;
					if (currentVel.dx !== 0) timeToPlayer = (targetX - currentPos.x) / currentVel.dx;
				}
			}

			// Filter out non-positive times before finding the minimum
			const positiveTimes = [timeToTop, timeToBottom, timeToOpponent, timeToPlayer].filter(t => t > 1e-6); // Use small epsilon
			if (positiveTimes.length === 0) break; // No valid future collision

			timeToCollision = Math.min(...positiveTimes);

			// Calculate the exact point of collision
			collisionPoint = {
				x: currentPos.x + currentVel.dx * timeToCollision,
				y: currentPos.y + currentVel.dy * timeToCollision
			};

			// Determine type based on which time was the minimum (using a small tolerance)
			const tolerance = 1e-6;
			if (Math.abs(timeToCollision - timeToTop) < tolerance) collisionType = 'top';
			else if (Math.abs(timeToCollision - timeToBottom) < tolerance) collisionType = 'bottom';
			else if (Math.abs(timeToCollision - timeToOpponent) < tolerance) collisionType = 'opponent';
			else if (Math.abs(timeToCollision - timeToPlayer) < tolerance) collisionType = 'player';
			else break; // Should not happen if filtering works correctly

			// If the collision is with the player's line, we've found the end point.
			if (collisionType === 'player') {
				this.finalPredictedImpactPoint = collisionPoint;
				const finalPredictedY = collisionPoint.y;
				const paddleCenterMinY = this.paddleHeight / 2;
				const paddleCenterMaxY = height - this.paddleHeight / 2;
				this._targetY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedY));
				break;
			}

			// --- Apply Collision Response and Acceleration ---
			let reflected = false;
			if (collisionType === 'top' || collisionType === 'bottom') {
				currentVel.dy *= -1;
				reflected = true;
			} else if (collisionType === 'opponent') {
				currentVel.dx *= -1;
				reflected = true;
			}

			if (reflected) {
				// Accelerate the ball after the simulated reflection
				simulatedSpeedMultiplier = Math.min(
					simulatedSpeedMultiplier + BALL_CONFIG.ACCELERATION.RATE,
					BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER
				);
				simulatedCurrentSpeed = this.ball.baseSpeed * simulatedSpeedMultiplier;

				// Re-normalize velocity and apply new speed
				const magnitude = Math.sqrt(currentVel.dx * currentVel.dx + currentVel.dy * currentVel.dy);
				if (magnitude > 1e-6) { // Avoid division by zero
					const normDx = currentVel.dx / magnitude;
					const normDy = currentVel.dy / magnitude;
					currentVel.dx = normDx * simulatedCurrentSpeed;
					currentVel.dy = normDy * simulatedCurrentSpeed;
				} else {
					// If velocity somehow became zero, we can't accelerate. Stop prediction.
					break;
				}
			}
			// --- End Collision Response and Acceleration ---

			// Store the valid bounce point
			if (collisionPoint) {
				this.predictedBouncePoints.push(collisionPoint);
			}

			// Update current position for the next iteration
			currentPos = collisionPoint;

			// If loop finishes (max bounces), predict final impact on player line if possible
			if (bounceCount === maxBounces - 1) {
				let finalTimeToPlayerFallback = Infinity;
				if (currentVel.dx !== 0) { // Check based on the updated currentVel
					if ((this._position === PlayerPosition.LEFT && currentVel.dx < 0)) {
						const targetX = playerPaddleEdgeX + ballRadius;
						if (currentVel.dx !== 0) finalTimeToPlayerFallback = (targetX - currentPos.x) / currentVel.dx;
					} else if ((this._position === PlayerPosition.RIGHT && currentVel.dx > 0)) {
						const targetX = playerPaddleEdgeX - ballRadius;
						if (currentVel.dx !== 0) finalTimeToPlayerFallback = (targetX - currentPos.x) / currentVel.dx;
					}
				}

				if (finalTimeToPlayerFallback > 0 && finalTimeToPlayerFallback !== Infinity) {
					const finalPredictedYFallback = currentPos.y + currentVel.dy * finalTimeToPlayerFallback;
					const finalPredictedXFallback = currentPos.x + currentVel.dx * finalTimeToPlayerFallback;
					this.finalPredictedImpactPoint = { x: finalPredictedXFallback, y: finalPredictedYFallback };
					const paddleCenterMinY = this.paddleHeight / 2;
					const paddleCenterMaxY = height - this.paddleHeight / 2;
					this._targetY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedYFallback));
				} else {
					this.finalPredictedImpactPoint = null;
					this._targetY = this.y + this.paddleHeight / 2;
				}
			}
		} // End bounce loop
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

	// =========================================
	// Dirty Rectangle Methods (NEW)
	// =========================================

	/** Updates the current bounding box based on position and size */
	protected updateBoundingBox(): void {
		this.currentBoundingBox = {
			x: this.x,
			y: this.y,
			width: this.paddleWidth,
			height: this.paddleHeight
		};
	}

	/** Gets the current bounding box */
	public getBoundingBox(): AABB {
		return this.currentBoundingBox;
	}

	/** 
	 * Returns an array of dirty rectangles (previous and current bounding box)
	 * if the player paddle has moved significantly since the last frame.
	 */
	public getDirtyRects(): AABB[] {
		// Use a small epsilon for floating point comparisons
		const epsilon = 0.1;
		if (Math.abs(this.currentBoundingBox.x - this.previousBoundingBox.x) > epsilon ||
			Math.abs(this.currentBoundingBox.y - this.previousBoundingBox.y) > epsilon ||
			Math.abs(this.currentBoundingBox.width - this.previousBoundingBox.width) > epsilon ||
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
