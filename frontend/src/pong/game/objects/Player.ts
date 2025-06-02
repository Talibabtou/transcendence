import { Ball } from './Ball';
import { Paddle } from './Paddle';
import { GraphicalElement, GameContext, Direction, PlayerPosition, PlayerType, GameState } from '@pong/types';
import { COLORS, calculateGameSizes, KEYS, BALL_CONFIG } from '@pong/constants';

interface VelocityValue { dx: number; dy: number; }

export class Player implements GraphicalElement {

	public paddle: Paddle;
	public paddleWidth: number = 10;
	public paddleHeight: number = 100;
	private direction: Direction = Direction.NONE;
	private speed: number = 0;
	private color: string = COLORS.PADDLE;
	private score = 0;
	private upPressed = false;
	private downPressed = false;
	private _name: string = 'Player';
	private _type: PlayerType;
	private _position: PlayerPosition;
	private _upKey: string;
	private _downKey: string;
	private _targetY: number;
	private _lastCollisionTime: number;
	public prevRenderX: number = 0;
	public prevRenderY: number = 0;
	private movementFrozen: number = 0;
	private readonly startY: number;
	private readonly currentPosVec: { x: number; y: number };
	private readonly currentVelVec: { dx: number; dy: number };
	private readonly collisionPointVec: { x: number; y: number };
	private readonly finalPredictedImpactPointVec: { x: number; y: number };
	private static readonly MAX_PREDICTED_BOUNCES = 10;
	private _reusableVelocityVector: VelocityValue;
	private readonly _collisionTimesHolder: { timeToTop: number; timeToBottom: number; timeToOpponent: number; timeToPlayer: number; };
	private readonly _earliestCollisionHolder: { timeToCollision: number; collisionType: 'top' | 'bottom' | 'opponent' | 'player' | 'none'; };
	private _reflectionSpeedMultiplierHolder: number;

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
		this.startY = context.canvas.height * 0.5 - this.paddleHeight * 0.5;
		this.y = this.startY;
		this._position = position;
		this._type = type;
		this._targetY = this.startY;
		this._lastCollisionTime = 1000;
		this.upPressed = false;
		this.downPressed = false;
		this.direction = Direction.NONE;
		this.currentPosVec = { x: 0, y: 0 };
		this.currentVelVec = { dx: 0, dy: 0 };
		this.collisionPointVec = { x: 0, y: 0 };
		this.finalPredictedImpactPointVec = { x: 0, y: 0 };
		this._reusableVelocityVector = { dx: 0, dy: 0 };
		this._collisionTimesHolder = { timeToTop: Infinity, timeToBottom: Infinity, timeToOpponent: Infinity, timeToPlayer: Infinity };
		this._earliestCollisionHolder = { timeToCollision: Infinity, collisionType: 'none' };
		this._reflectionSpeedMultiplierHolder = 0;
		if (position === PlayerPosition.LEFT) {
			this._upKey = KEYS.PLAYER_LEFT_UP;
			this._downKey = KEYS.PLAYER_LEFT_DOWN;
			this._name = 'Player 1';
		} else {
			this._upKey = KEYS.PLAYER_RIGHT_UP;
			this._downKey = KEYS.PLAYER_RIGHT_DOWN;
			this._name = this._type === PlayerType.HUMAN ? 'Player 2' : 'Computer';
		}
		this.paddle = new Paddle(x, y, this.paddleWidth, this.paddleHeight, context);
		this.updateSizes();
	}

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
		this.paddle.updateDimensions(this.paddleWidth, this.paddleHeight);
		this.updateHorizontalPosition();
	}


	/**
	 * Updates player state for the current frame
	 */
	public update(ctx: GameContext, deltaTime: number, state: GameState): void {

		this.prevRenderX = this.x;
		this.prevRenderY = this.y;
		if (this.paddle) {
			this.paddle.setPreviousPosition(this.paddle.x, this.paddle.y);
		}
		const { width, height } = ctx.canvas;
		const sizes = calculateGameSizes(width, height);
		this.paddleHeight = sizes.PADDLE_HEIGHT;
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
	}

	/**
	 * Draws the player's paddle using interpolation
	 * @param alpha Interpolation factor (0 to 1)
	 */
	public draw(ctx: GameContext, alpha: number): void {
		const interpolatedX = this.prevRenderX * (1 - alpha) + this.x * alpha;
		const interpolatedY = this.prevRenderY * (1 - alpha) + this.y * alpha;
		ctx.fillStyle = this.color;
		ctx.fillRect(interpolatedX, interpolatedY, this.paddleWidth, this.paddleHeight);
	}

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
		this.direction = Direction.NONE;
		window.removeEventListener('keydown', this.handleKeydown);
		window.removeEventListener('keyup', this.handleKeyup);
	}

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
		this.paddle.setPosition(this.x, this.y);
	}

	/**
	 * Updates the paddle's position based on input direction
	 */
	protected updateMovement(deltaTime: number): void {
		if (this.movementFrozen > 0) {
			this.direction = Direction.NONE;
			this.movementFrozen -= deltaTime;
			if (this.movementFrozen < 0) this.movementFrozen = 0;
			return;
		}
		if (this.direction === Direction.NONE) return;
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
			this.direction = Direction.NONE;
		} else if (this.upPressed) {
			this.direction = Direction.UP;
		} else if (this.downPressed) {
			this.direction = Direction.DOWN;
		} else {
			this.direction = Direction.NONE;
		}
	}


	/**
	 * Public method to trigger an initial prediction calculation, usually at the start of a point.
	 * Checks if the ball is moving before calling the internal prediction logic.
	 */
	public calculateInitialPrediction(): void {
		if (!this.ball) return;
		const ballVelocity = this.ball.Velocity;
		if (ballVelocity.dx !== 0 || ballVelocity.dy !== 0) {
			this.predictBallTrajectory(this.ball.Position, ballVelocity);
			this._lastCollisionTime = 0;
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

		const { width, height } = this.context.canvas;
		const ballRadius = this.ball.Size;
		const sizes = calculateGameSizes(width, height);
		const maxBouncesToSimulate = Player.MAX_PREDICTED_BOUNCES;

		this.currentPosVec.x = startPoint.x;
		this.currentPosVec.y = startPoint.y;
		this.currentVelVec.dx = initialVelocity.dx;
		this.currentVelVec.dy = initialVelocity.dy;

		let simulatedCurrentSpeed = Math.sqrt(this.currentVelVec.dx * this.currentVelVec.dx + this.currentVelVec.dy * this.currentVelVec.dy);
		let simulatedSpeedMultiplier = this.ball.baseSpeed > 0 ? simulatedCurrentSpeed / this.ball.baseSpeed : BALL_CONFIG.ACCELERATION.INITIAL;
		simulatedSpeedMultiplier = Math.max(BALL_CONFIG.ACCELERATION.INITIAL, simulatedSpeedMultiplier);
		const playerPaddleEdgeX = this._position === PlayerPosition.LEFT
			? sizes.PLAYER_PADDING + this.paddleWidth
			: width - (sizes.PLAYER_PADDING + this.paddleWidth);
		const opponentPaddleEdgeX = this._position === PlayerPosition.LEFT
			? width - (sizes.PLAYER_PADDING + this.paddleWidth)
			: sizes.PLAYER_PADDING + this.paddleWidth;

		for (let bounceCount = 0; bounceCount < maxBouncesToSimulate; bounceCount++) {
			this._calculateCollisionTimes(
				this.currentPosVec,
				this.currentVelVec,
				ballRadius,
				height,
				playerPaddleEdgeX,
				opponentPaddleEdgeX
			);

			this._determineEarliestCollision();

			if (this._earliestCollisionHolder.collisionType === 'none' || this._earliestCollisionHolder.timeToCollision === Infinity) {
				this._targetY = this.y + this.paddleHeight / 2;
				break;
			}

			this.collisionPointVec.x = this.currentPosVec.x + this.currentVelVec.dx * this._earliestCollisionHolder.timeToCollision;
			this.collisionPointVec.y = this.currentPosVec.y + this.currentVelVec.dy * this._earliestCollisionHolder.timeToCollision;

			if (this._earliestCollisionHolder.collisionType === 'player') {
				this._handlePlayerCollision(this.collisionPointVec, height);
				break;
			}

			this._handleReflection(
				this._earliestCollisionHolder.collisionType as 'top' | 'bottom' | 'opponent',
				this.currentVelVec,
				simulatedSpeedMultiplier,
				this.ball.baseSpeed
			);
			this.currentVelVec.dx = this._reusableVelocityVector.dx;
			this.currentVelVec.dy = this._reusableVelocityVector.dy;
			simulatedSpeedMultiplier = this._reflectionSpeedMultiplierHolder;

			this.currentPosVec.x = this.collisionPointVec.x;
			this.currentPosVec.y = this.collisionPointVec.y;

			if (bounceCount === maxBouncesToSimulate - 1) {
				this._predictTargetYAtMaxBounces(
					this.currentPosVec,
					this.currentVelVec,
					playerPaddleEdgeX,
					ballRadius,
					height,
					this.paddleHeight
				);
			}
		}
	}

	private _calculateCollisionTimes(
		currentPos: { x: number; y: number },
		currentVel: { dx: number; dy: number },
		ballRadius: number,
		canvasHeight: number,
		playerPaddleEdgeX: number,
		opponentPaddleEdgeX: number
	): void {
		let timeToTop = Infinity;
		if (currentVel.dy < 0) { timeToTop = (ballRadius - currentPos.y) / currentVel.dy; }

		let timeToBottom = Infinity;
		if (currentVel.dy > 0) { timeToBottom = (canvasHeight - ballRadius - currentPos.y) / currentVel.dy; }

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
		this._collisionTimesHolder.timeToTop = timeToTop;
		this._collisionTimesHolder.timeToBottom = timeToBottom;
		this._collisionTimesHolder.timeToOpponent = timeToOpponent;
		this._collisionTimesHolder.timeToPlayer = timeToPlayer;
	}

	private _determineEarliestCollision(): void {
		const times = this._collisionTimesHolder;
		let minTime = Infinity;
		let determinedCollisionType: 'top' | 'bottom' | 'opponent' | 'player' | 'none' = 'none';

		if (times.timeToTop > 1e-6 && times.timeToTop < minTime) {
			minTime = times.timeToTop;
			determinedCollisionType = 'top';
		}
		if (times.timeToBottom > 1e-6 && times.timeToBottom < minTime) {
			minTime = times.timeToBottom;
			determinedCollisionType = 'bottom';
		}
		if (times.timeToOpponent > 1e-6 && times.timeToOpponent < minTime) {
			minTime = times.timeToOpponent;
			determinedCollisionType = 'opponent';
		}
		if (times.timeToPlayer > 1e-6 && times.timeToPlayer < minTime) {
			minTime = times.timeToPlayer;
			determinedCollisionType = 'player';
		}

		if (minTime === Infinity) {
			this._earliestCollisionHolder.timeToCollision = Infinity;
			this._earliestCollisionHolder.collisionType = 'none';
		} else {
			this._earliestCollisionHolder.timeToCollision = minTime;
			this._earliestCollisionHolder.collisionType = determinedCollisionType;
		}
	}

	private _handlePlayerCollision(collisionPoint: { x: number; y: number }, canvasHeight: number): void {
		this.finalPredictedImpactPointVec.x = collisionPoint.x;
		this.finalPredictedImpactPointVec.y = collisionPoint.y;
		const finalPredictedY = collisionPoint.y;
		const paddleCenterMinY = this.paddleHeight / 2;
		const paddleCenterMaxY = canvasHeight - this.paddleHeight / 2;
		this._targetY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedY));
	}

	private _handleReflection(
		collisionType: 'top' | 'bottom' | 'opponent',
		currentVel: { dx: number; dy: number },
		simulatedSpeedMultiplier: number,
		baseSpeed: number
	): void {
		this._reusableVelocityVector.dx = currentVel.dx;
		this._reusableVelocityVector.dy = currentVel.dy;

		if (collisionType === 'top' || collisionType === 'bottom') {
			this._reusableVelocityVector.dy *= -1;
		} else if (collisionType === 'opponent') {
			this._reusableVelocityVector.dx *= -1;
		}
		const newSimulatedSpeedMultiplier = Math.min(
			simulatedSpeedMultiplier + BALL_CONFIG.ACCELERATION.RATE,
			BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER
		);
		const simulatedCurrentSpeed = baseSpeed * newSimulatedSpeedMultiplier;
		const magnitude = Math.sqrt(this._reusableVelocityVector.dx * this._reusableVelocityVector.dx + this._reusableVelocityVector.dy * this._reusableVelocityVector.dy);
		if (magnitude > 1e-6) {
			const normDx = this._reusableVelocityVector.dx / magnitude;
			const normDy = this._reusableVelocityVector.dy / magnitude;
			this._reusableVelocityVector.dx = normDx * simulatedCurrentSpeed;
			this._reusableVelocityVector.dy = normDy * simulatedCurrentSpeed;
		} else {
			this._reusableVelocityVector.dx = 0;
			this._reusableVelocityVector.dy = 0;
		}
		this._reflectionSpeedMultiplierHolder = newSimulatedSpeedMultiplier;
	}

	private _predictTargetYAtMaxBounces(
		currentPos: { x: number; y: number },
		currentVel: { dx: number; dy: number },
		playerPaddleEdgeX: number,
		ballRadius: number,
		canvasHeight: number,
		paddleHeight: number
	): void {
		let finalTimeToPlayerFallback = Infinity;
		if (currentVel.dx !== 0) {
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
			this.finalPredictedImpactPointVec.x = finalPredictedXFallback;
			this.finalPredictedImpactPointVec.y = finalPredictedYFallback;
			const paddleCenterMinY = paddleHeight / 2;
			const paddleCenterMaxY = canvasHeight - paddleHeight / 2;
			this._targetY = Math.max(paddleCenterMinY, Math.min(paddleCenterMaxY, finalPredictedYFallback));
		} else {
			this._targetY = this.y + paddleHeight / 2;
		}
	}

	/**
	 * Updates AI inputs based on ball position and game state
	 */
	protected updateAIInputs(ctx: GameContext): void {
		const vx = Math.abs(this.ball.Velocity.dx);
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
		if (this.ball.dx === 0 && this.ball.dy === 0) {
			this.moveTowardsCenter(paddleCenter, centerY);
			return;
		}
		if (this._position === PlayerPosition.LEFT) {
			if (this.ball.dx >= 0) {
				this.moveTowardsCenter(paddleCenter, centerY);
			} else {
				this.trackBallWithDelay(paddleCenter);
			}
		} else {
			if (this.ball.dx <= 0) {
				this.moveTowardsCenter(paddleCenter, centerY);
			} else {
				this.trackBallWithDelay(paddleCenter);
			}
		}
	}
	
	/**
	 * AI helper method to move paddle towards center position
	 */
	private moveTowardsCenter(paddleCenter: number, centerY: number): void {
		const deadzone = this.paddleHeight * 0.1;
		const targetY = centerY + (this.paddleHeight * 0.5);
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
	 * AI helper method to move paddle towards the predicted ball Y position
	 */
	private moveTowardsPredictedBallY(paddleCenter: number): void {
		const deadzone = this.paddleHeight * 0.1;

		if (Math.abs(paddleCenter - this._targetY) < deadzone) {
			this.upPressed = false;
			this.downPressed = false;
		} else {
			this.upPressed = paddleCenter > this._targetY;
			this.downPressed = paddleCenter < this._targetY;
		}
	}

	/**
	 * AI helper method to track the ball with realistic movement
	 */
	private trackBallWithDelay(paddleCenter: number): void {
		const targetY = this.ball.y;
		const deadzone = this.paddleHeight * 0.1;
		
		if (Math.abs(paddleCenter - targetY) < deadzone) {
			this.upPressed = false;
			this.downPressed = false;
		} else {
			this.upPressed = paddleCenter > targetY;
			this.downPressed = paddleCenter < targetY;
		}
		this.updateDirection();
	}

	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////
	public freezeMovement(duration: number): void { this.movementFrozen = duration; }
	public stopMovement(): void { this.direction = Direction.NONE; }
	public givePoint(): void { this.score += 1; }
	public resetScore(): void { this.score = 0; }
	public resetPosition(): void {
		const height = this.context.canvas.height;
		this.y = height * 0.5 - this.paddleHeight * 0.5;
		this.paddle.setPosition(this.x, this.y);
	}

	public syncPrevRenderStates(): void {
		this.prevRenderX = this.x;
		this.prevRenderY = this.y;
	}

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	public get name(): string { return this._name; }
	public get PlayerType(): PlayerType { return this._type; }
	public get Score(): number { return this.score; }
	public get Position(): PlayerPosition { return this._position; }
	
	public setName(name: string): void { this._name = name; }
	public setPlayerType(type: PlayerType): void { this._type = type; }
	public setColor(newColor: string): void { this.color = newColor; }
	public getColor(): string { return this.color; }
}
