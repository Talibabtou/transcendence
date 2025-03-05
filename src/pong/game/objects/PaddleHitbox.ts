import { Ball } from './Ball';
import { Paddle, BoundingBox } from '@pong/types';
import { BALL_CONFIG } from '@pong/constants';

interface CollisionResult {
	collided: boolean;
	hitFace: 'front' | 'top' | 'bottom';
	deflectionModifier: number; // -0.1 to 0.1 (10% max deflection)
}

export class PaddleHitbox {
	private readonly paddle: Paddle;
	private readonly ball: Ball;

	constructor(paddle: Paddle, ball: Ball) {
		this.paddle = paddle;
		this.ball = ball;
	}

	public checkCollision(): CollisionResult {
		if (this.isStationary()) {
			return { collided: false, hitFace: 'front', deflectionModifier: 0 };
		}

		const ballRadius = this.ball.getSize();
		
		// Get current ball position
		const ballBox = {
			left: this.ball.x - ballRadius,
			right: this.ball.x + ballRadius,
			top: this.ball.y - ballRadius,
			bottom: this.ball.y + ballRadius
		};

		const paddleBox = {
			left: this.paddle.x,
			right: this.paddle.x + this.paddle.paddleWidth,
			top: this.paddle.y,
			bottom: this.paddle.y + this.paddle.paddleHeight
		};

		// Early exit if no collision possible
		if (!this.doBoxesIntersect(ballBox, paddleBox)) {
			return { collided: false, hitFace: 'front', deflectionModifier: 0 };
		}

		// Determine if ball is approaching paddle
		const isApproachingFromLeft = this.ball.dx > 0 && this.ball.x < this.paddle.x;
		const isApproachingFromRight = this.ball.dx < 0 && this.ball.x > this.paddle.x + this.paddle.paddleWidth;

		if (!isApproachingFromLeft && !isApproachingFromRight) {
			return { collided: false, hitFace: 'front', deflectionModifier: 0 };
		}

		// Calculate precise collision point
		const relativeHitPoint = (this.ball.y - this.paddle.y) / this.paddle.paddleHeight;
		
		// Ensure hit point is within paddle bounds
		if (relativeHitPoint < 0 || relativeHitPoint > 1) {
			return { collided: false, hitFace: 'front', deflectionModifier: 0 };
		}

		// Very small deflection angle (maximum 3 degrees = ~0.052 radians)
		const maxDeflection = 0.02; // About 1.15 degrees
		const deflectionModifier = (relativeHitPoint - 0.5) * maxDeflection;

		return {
			collided: true,
			hitFace: 'front',
			deflectionModifier
		};
	}

	private handleCollision(): CollisionResult {
		// Calculate relative hit position (0 = top, 1 = bottom)
		const relativeHitPoint = (this.ball.y - this.paddle.y) / this.paddle.paddleHeight;
		
		// Small deflection angle (maximum 5 degrees = ~0.087 radians)
		const maxDeflection = 0.027; // About 1.5 degrees in radians
		
		// Linear deflection based on hit position
		const deflectionModifier = (relativeHitPoint - 0.5) * maxDeflection;

		// Prevent ball from getting stuck in paddle
		const ballRadius = this.ball.getSize();
		if (this.ball.dx > 0) {
			this.ball.x = this.paddle.x - ballRadius;
		} else {
			this.ball.x = this.paddle.x + this.paddle.paddleWidth + ballRadius;
		}

		return {
			collided: true,
			hitFace: 'front',
			deflectionModifier
		};
	}

	private isStationary(): boolean {
		return this.ball.dx === 0 && this.ball.dy === 0;
	}

	private getBallBoundingBox(): BoundingBox {
		const ballSize = this.ball.getSize();
		return {
			left: this.ball.x - ballSize,
			right: this.ball.x + ballSize,
			top: this.ball.y - ballSize,
			bottom: this.ball.y + ballSize
		};
	}

	private getPaddleBoundingBox(): BoundingBox {
		return {
			left: this.paddle.x,
			right: this.paddle.x + this.paddle.paddleWidth,
			top: this.paddle.y,
			bottom: this.paddle.y + this.paddle.paddleHeight
		};
	}

	private doBoxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
		return box1.right >= box2.left && 
					 box1.left <= box2.right && 
					 box1.bottom >= box2.top && 
					 box1.top <= box2.bottom;
	}
}
