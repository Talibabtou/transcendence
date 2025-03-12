import { BoundingBox, CollisionResult, Collidable } from '@pong/types';

export class CollisionManager {
	/**
	 * Checks for collision between ball and paddle using continuous collision detection
	 */
	public checkBallPaddleCollision(
			ballHitbox: Collidable,
			paddleHitbox: Collidable
	): CollisionResult {
			const ballBox = ballHitbox.getBoundingBox();
			const paddleBox = paddleHitbox.getBoundingBox();
			const ballVelocity = ballHitbox.getVelocity();

			// Early exit if ball is stationary
			if (ballVelocity.dx === 0 && ballVelocity.dy === 0) {
					return this.createNoCollisionResult();
			}

			// Get ball's previous position
			const prevPos = ballHitbox.getPreviousPosition();
			const currentPos = ballHitbox.getPosition();

			// Check if ball is moving towards paddle
			const isApproachingFromLeft = ballVelocity.dx > 0 && currentPos.x < paddleBox.left;
			const isApproachingFromRight = ballVelocity.dx < 0 && currentPos.x > paddleBox.right;

			if (!isApproachingFromLeft && !isApproachingFromRight) {
					return this.createNoCollisionResult();
			}

			// Perform swept collision detection
			const collision = this.checkSweptCollision(
					prevPos,
					currentPos,
					ballBox,
					paddleBox
			);

			if (!collision.collided) {
					return this.createNoCollisionResult();
			}

			// Calculate deflection based on hit position
			const relativeHitPoint = (collision.collisionPoint!.y - paddleBox.top) / 
															(paddleBox.bottom - paddleBox.top);
			
			// Calculate deflection modifier (maximum ~1.5 degrees)
			const maxDeflection = 0.027;
			const deflectionModifier = (relativeHitPoint - 0.5) * maxDeflection;

			return {
					collided: true,
					hitFace: 'front',
					deflectionModifier,
					collisionPoint: collision.collisionPoint
			};
	}

	private checkSweptCollision(
			prevPos: { x: number; y: number },
			currentPos: { x: number; y: number },
			ballBox: BoundingBox,
			paddleBox: BoundingBox
	): { collided: boolean; collisionPoint?: { x: number; y: number } } {
			// Calculate movement vector
			const moveX = currentPos.x - prevPos.x;
			const moveY = currentPos.y - prevPos.y;

			// Calculate time of collision (-1 if no collision)
			const collisionTime = this.getCollisionTime(
					prevPos,
					moveX,
					moveY,
					ballBox,
					paddleBox
			);

			if (collisionTime < 0 || collisionTime > 1) {
					return { collided: false };
			}

			// Calculate exact collision point
			return {
					collided: true,
					collisionPoint: {
							x: prevPos.x + moveX * collisionTime,
							y: prevPos.y + moveY * collisionTime
					}
			};
	}

	private getCollisionTime(
			prevPos: { x: number; y: number },
			moveX: number,
			moveY: number,
			ballBox: BoundingBox,
			paddleBox: BoundingBox
	): number {
			// Ray-AABB intersection algorithm
			const ballRadius = (ballBox.right - ballBox.left) / 2;
			
			// Expand paddle box by ball radius
			const expandedBox = {
					left: paddleBox.left - ballRadius,
					right: paddleBox.right + ballRadius,
					top: paddleBox.top - ballRadius,
					bottom: paddleBox.bottom + ballRadius
			};

			// Calculate intersection
			const txMin = moveX !== 0 ? 
					(expandedBox.left - prevPos.x) / moveX : 
					(prevPos.x <= expandedBox.right && prevPos.x >= expandedBox.left ? 0 : -1);
			
			const txMax = moveX !== 0 ? 
					(expandedBox.right - prevPos.x) / moveX : 
					(prevPos.x <= expandedBox.right && prevPos.x >= expandedBox.left ? 1 : -1);

			const tyMin = moveY !== 0 ? 
					(expandedBox.top - prevPos.y) / moveY : 
					(prevPos.y <= expandedBox.bottom && prevPos.y >= expandedBox.top ? 0 : -1);
			
			const tyMax = moveY !== 0 ? 
					(expandedBox.bottom - prevPos.y) / moveY : 
					(prevPos.y <= expandedBox.bottom && prevPos.y >= expandedBox.top ? 1 : -1);

			const tMin = Math.max(Math.min(txMin, txMax), Math.min(tyMin, tyMax));
			const tMax = Math.min(Math.max(txMin, txMax), Math.max(tyMin, tyMax));

			return tMax >= tMin && tMin >= 0 && tMin <= 1 ? tMin : -1;
	}

	private createNoCollisionResult(): CollisionResult {
			return { collided: false, hitFace: 'front', deflectionModifier: 0 };
	}
}
