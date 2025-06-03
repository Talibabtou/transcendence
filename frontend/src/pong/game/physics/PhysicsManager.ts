import { BALL_CONFIG } from '@pong/constants';
import { Ball, Player } from '@pong/game/objects';
import {GameState, PlayerType } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import {
		reflectVelocity,
		correctPosition,
		checkCircleAABBOverlap,
		applyPaddleDeflection,
		sweepCircleVsMovingRect,
		SweepResult,
		CircleAABBOverlapResult
} from '@pong/game/physics';

interface PositionVector {
	x: number;
	y: number;
}

interface DirectionVector {
	dx: number;
	dy: number;
}

export class PhysicsManager {
	private ball: Ball;
	private player1: Player;
	private player2: Player;
	private gameEngine: any;
	private gameScene: GameScene;
	private tmpPos: PositionVector;
	private tmpDir: DirectionVector;
	private onScoreUpdateCallback: (() => void) | null = null;

	private sweepResult: SweepResult = { t: 0, normal: { nx: 0, ny: 0 }, collided: false };
	private overlapResult: CircleAABBOverlapResult = {
		penetration: { dx: 0, dy: 0 },
		normal: { nx: 0, ny: 0 },
		collided: false
	};

	constructor(ball: Ball, player1: Player, player2: Player, gameEngine: any, gameScene: GameScene) {
		this.ball = ball;
		this.player1 = player1;
		this.player2 = player2;
		this.gameEngine = gameEngine;
		this.gameScene = gameScene;
		this.tmpPos = { x: 0, y: 0 };
		this.tmpDir = { dx: 0, dy: 0 };
	}

	/**
	 * Stores the ball's previous position and render states.
	 * Call this before updating the ball's position.
	 * @param ball The ball object.
	 */
	private storeBallPreviousStates(ball: Ball): void {
		ball.prevPosition.x = ball.x;
		ball.prevPosition.y = ball.y;
		ball.prevRenderX = ball.x;
		ball.prevRenderY = ball.y;
	}

	/**
	 * Applies movement to the ball based on its velocity and deltaTime.
	 * Also handles speed capping.
	 * @param ball The ball object.
	 * @param deltaTime The time elapsed since the last physics update, in seconds.
	 */
	private applyBallMovement(ball: Ball, deltaTime: number): void {
		const physicsDeltaTime = Math.min(deltaTime, BALL_CONFIG.PHYSICS_MAX_TIMESTEP_S);
		if (ball.currentSpeed > ball.baseSpeed * BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER) {
			ball.currentSpeed = ball.baseSpeed * BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER;
			const normalized = ball.NormalizedVelocity;
			ball.dx = normalized.dx * ball.currentSpeed;
			ball.dy = normalized.dy * ball.currentSpeed;
		}
		const moveX = ball.dx * physicsDeltaTime;
		const moveY = ball.dy * physicsDeltaTime;
		ball.x += moveX;
		ball.y += moveY;
	}

		/**
	 * Handles ball collisions with game boundaries (walls).
	 * Uses continuous collision detection for top/bottom walls.
	 * @param ball The ball object.
	 * @returns True if the ball hit a vertical (top/bottom) reflecting wall, false otherwise.
	 */
		private handleBallWallCollisions(ball: Ball): boolean {
			const ballRadius = ball.Size;
			const canvas = ball.Context.canvas;
			let reflectedOffVerticalWall = false;
			const epsilon = ballRadius * 0.02;
			const p0 = ball.prevPosition;

			this.tmpPos.x = ball.x;
			this.tmpPos.y = ball.y;

			this.tmpDir.dx = this.tmpPos.x - p0.x;
			this.tmpDir.dy = this.tmpPos.y - p0.y;

			if (Math.abs(this.tmpDir.dx) > 1e-6 || Math.abs(this.tmpDir.dy) > 1e-6) {
				const topWallY = ballRadius;
				if (p0.y > topWallY && this.tmpPos.y <= topWallY) {
					const t = (topWallY - p0.y) / this.tmpDir.dy;
					if (t >= 0 && t <= 1) {
						const hitX = p0.x + this.tmpDir.dx * t;
						ball.dy = Math.abs(ball.dy);
						ball.y = topWallY + epsilon;
						ball.x = hitX;
						reflectedOffVerticalWall = true;
					}
				}
				const bottomWallY = canvas.height - ballRadius;
				if (p0.y < bottomWallY && this.tmpPos.y >= bottomWallY) {
					const t = (bottomWallY - p0.y) / this.tmpDir.dy;
					if (t >= 0 && t <= 1) {
						const hitX = p0.x + this.tmpDir.dx * t;
						ball.dy = -Math.abs(ball.dy);
						ball.y = bottomWallY - epsilon;
						ball.x = hitX;
						reflectedOffVerticalWall = true;
					}
				}
			}
			if (!reflectedOffVerticalWall) {
				const topWallSurfaceY = ballRadius;
				if (ball.y <= topWallSurfaceY) {
					const penetration = topWallSurfaceY - ball.y;
					ball.dy = Math.abs(ball.dy);
					ball.y = topWallSurfaceY + penetration + epsilon;
					reflectedOffVerticalWall = true;
				}
				const bottomWallSurfaceY = canvas.height - ballRadius;
				if (ball.y >= bottomWallSurfaceY) {
					const penetration = ball.y - bottomWallSurfaceY;
					ball.dy = -Math.abs(ball.dy);
					ball.y = bottomWallSurfaceY - penetration - epsilon;
					reflectedOffVerticalWall = true;
				}
			}
			if (ball.x - ballRadius <= 0) {
				ball.destroyed = true;
				ball.hitLeftBorder = true;
			} else if (ball.x + ballRadius >= canvas.width) {
				ball.destroyed = true;
				ball.hitLeftBorder = false;
			}
			const minSpeed = 1;
			const currentSpeedSq = ball.dx * ball.dx + ball.dy * ball.dy;
			if (currentSpeedSq < minSpeed * minSpeed && currentSpeedSq > 1e-6) {
				const currentSpeed = Math.sqrt(currentSpeedSq);
				const scale = minSpeed / currentSpeed;
				ball.dx *= scale;
				ball.dy *= scale;
			}
			return reflectedOffVerticalWall;
		}

	/**
	 * Increases ball speed based on acceleration settings.
	 * @param ball The ball object.
	 */
	private accelerateBall(ball: Ball): void {
		ball.speedMultiplier = Math.min(
			ball.speedMultiplier + BALL_CONFIG.ACCELERATION.RATE,
			BALL_CONFIG.ACCELERATION.MAX_MULTIPLIER
		);
		ball.currentSpeed = ball.baseSpeed * ball.speedMultiplier;
		const normalized = ball.NormalizedVelocity;
		if (normalized.dx !== 0 || normalized.dy !== 0) {
				ball.dx = normalized.dx * ball.currentSpeed;
				ball.dy = normalized.dy * ball.currentSpeed;
		}
	}

	/**
	 * Updates physics simulation for one fixed timestep.
	 * @param deltaTime Fixed time step duration in seconds.
	 * @param gameState Current game state.
	 */
	public update(deltaTime: number, gameState: GameState): void {
		if (gameState !== GameState.PLAYING) {
			return;
		}
		this.storeBallPreviousStates(this.ball);
		this.applyBallMovement(this.ball, deltaTime);
		const reflectedOffVerticalWall = this.handleBallWallCollisions(this.ball);
		if (reflectedOffVerticalWall) {
			this.accelerateBall(this.ball);
		}
		const hitPlayer1 = this.collideBallWithPaddle(this.ball, this.player1);
		if (hitPlayer1) {
			this.accelerateBall(this.ball);
		}
		const hitPlayer2 = this.collideBallWithPaddle(this.ball, this.player2);
		if (hitPlayer2) {
			this.accelerateBall(this.ball);
			if (this.player2.PlayerType !== PlayerType.BACKGROUND) {
				this.player2.predictBallTrajectory(this.ball.Position, this.ball.Velocity);
			}
		}
		this.handleBallDestruction();
	}

	/**
	 * Handles ball destruction and point scoring
	 * Moved from GameScene
	 */
	private handleBallDestruction(): void {
		if (!this.ball.isDestroyed()) return;
		let scoringPlayerIndex: number;
		if (this.ball.isHitLeftBorder()) {
			this.player2.givePoint();
			scoringPlayerIndex = 1;
		} else {
			this.player1.givePoint();
			scoringPlayerIndex = 0;
		}
		if (this.onScoreUpdateCallback) {
			this.onScoreUpdateCallback();
		}
		if (!this.gameScene.isBackgroundDemo()) {
			if (this.gameEngine && typeof this.gameEngine.recordGoal === 'function') {
				this.gameEngine.recordGoal(scoringPlayerIndex);
			}

			if (this.gameEngine && typeof this.gameEngine.resetGoalTimer === 'function') {
				this.gameEngine.resetGoalTimer();
			}
		}
		this.gameScene.resetPositions(); 
		this.gameScene.PauseManager.handlePointScored();
	}

	public collideBallWithPaddle(
		ball: Ball,
		player: Player
	): boolean {
		const ballRadius = ball.Size;
		const epsilon = 0.03;
		const ballPosition = ball.Position;
		const ballVelocity = ball.Velocity;
		const paddleVelocity = player.paddle.Velocity;
		const pLeft = player.x;
		const pRight = player.x + player.paddle.paddleWidth;
		const pTop = player.y;
		const pBottom = player.y + player.paddle.paddleHeight;
		let hitOccurred = false;
		const prevBallPos = ball.PrevPosition ? ball.PrevPosition : ballPosition;
		
		this.tmpDir.dx = ballPosition.x - prevBallPos.x;
		this.tmpDir.dy = ballPosition.y - prevBallPos.y;
		const ballMoveDir = this.tmpDir;

		if (Math.abs(ballMoveDir.dx) > 1e-6 || Math.abs(ballMoveDir.dy) > 1e-6) {
			sweepCircleVsMovingRect(
				prevBallPos, 
				ballMoveDir,
				ballRadius,
				pLeft, pRight, pTop, pBottom,
				paddleVelocity,
				this.sweepResult
			);

			if (this.sweepResult.collided) {
				const { t, normal } = this.sweepResult;
				const contactX = prevBallPos.x + ballMoveDir.dx * t;
				const contactY = prevBallPos.y + ballMoveDir.dy * t;
				const dotProduct = ballVelocity.dx * normal.nx + ballVelocity.dy * normal.ny;
				if (dotProduct < 0) {
					if (normal.ny !== 0) {
						player.freezeMovement(0.2);
					}
					reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, dotProduct, this.tmpDir);

					this.tmpPos.x = contactX;
					this.tmpPos.y = contactY;

					applyPaddleDeflection(
						this.tmpPos,
						this.tmpDir,
						pTop, pBottom,
						this.tmpDir
					);
					ball.dx = this.tmpDir.dx;
					ball.dy = this.tmpDir.dy;
					correctPosition(ball, contactX, contactY, normal.nx, normal.ny, epsilon);
					hitOccurred = true;
				}
			}
		}

		checkCircleAABBOverlap(
			ball.Position,
			ballRadius,
			pLeft, pRight, pTop, pBottom,
			this.overlapResult
		);

		if (this.overlapResult.collided) {
			const { penetration, normal } = this.overlapResult;

			ball.x += penetration.dx;
			ball.y += penetration.dy;
			const dotProduct = ballVelocity.dx * normal.nx + ballVelocity.dy * normal.ny;
			if (dotProduct < 0 || hitOccurred) {
				if (normal.ny !== 0 && !hitOccurred) {
						player.freezeMovement(0.2);
				}
				reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, dotProduct, this.tmpDir);
				applyPaddleDeflection(
						ball.Position,
						this.tmpDir,
						pTop, pBottom,
						this.tmpDir
				);
				ball.dx = this.tmpDir.dx;
				ball.dy = this.tmpDir.dy;
				hitOccurred = true;
			} else {
				if (!hitOccurred) {
						const emergencyDot = -0.7; 
						if (normal.ny !== 0) {
								player.freezeMovement(0.2);
						}
						reflectVelocity(ballVelocity.dx, ballVelocity.dy, normal.nx, normal.ny, emergencyDot, this.tmpDir);
						applyPaddleDeflection(
								ball.Position,
								this.tmpDir,
								pTop, pBottom,
								this.tmpDir
						);
						ball.dx = this.tmpDir.dx;
						ball.dy = this.tmpDir.dy;
						hitOccurred = true;
				}
			}
		}
		if (hitOccurred) {
				let collisionNormalX = 0;
				if (this.overlapResult.collided) collisionNormalX = this.overlapResult.normal.nx;
				if (collisionNormalX !== 0) {
						const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
						if (speed > 1e-6) {
								const minVerticalComponent = speed * BALL_CONFIG.MIN_VERTICAL_VELOCITY_RATIO_ON_PADDLE_HIT;
								if (Math.abs(ball.dy) < minVerticalComponent) {
										ball.dy = ball.dy >= 0 ? minVerticalComponent : -minVerticalComponent;
								}
						}
				}
		}
		return hitOccurred;
	}

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	public setGameEngine(engine: any): void { this.gameEngine = engine; }
	public setOnScoreUpdateCallback(callback: () => void): void { this.onScoreUpdateCallback = callback; }
} 