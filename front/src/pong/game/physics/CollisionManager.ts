import { BoundingBox, CollisionResult, Collidable } from '@pong/types';
import { BALL_CONFIG } from '@pong/constants';

/**
 * Manages collision detection and response between game objects
 * Uses continuous collision detection for accurate physics simulation
 */
export class CollisionManager {
	// =========================================
	// Public Methods
	// =========================================
	
	/**
	 * Checks for collision between ball and paddle using continuous collision detection
	 * @param ballHitbox The ball's hitbox
	 * @param paddleHitbox The paddle's hitbox
	 * @returns Collision result with deflection data if collision occurred
	 */
	public checkBallPaddleCollision(
		ballHitbox: Collidable,
		paddleHitbox: Collidable
	): CollisionResult {
		const ballVelocity = ballHitbox.getVelocity();
		const ballPos = ballHitbox.getPosition();
		const paddleBox = paddleHitbox.getBoundingBox();

		// Early validations
		if (this.isStationary(ballVelocity) || !this.isApproachingPaddle(ballPos, ballVelocity, paddleBox)) {
			return this.createNoCollisionResult();
		}
		
		// Check for collision
		const collision = this.detectCollision(ballHitbox, paddleBox);
		if (!collision.collided) {
			return this.createNoCollisionResult();
		}

		// Calculate deflection only if hitting the front face
		let deflection = 0;
		if (collision.hitFace === 'front') {
			deflection = this.calculateDeflection(collision.collisionPoint!, paddleBox);
		}

		return {
			collided: true,
			hitFace: collision.hitFace!, // Assert non-null as collided is true
			deflectionModifier: deflection,
			collisionPoint: collision.collisionPoint
		};
	}

	// =========================================
	// Collision Detection Helpers
	// =========================================
	
	/**
	 * Checks if an object is stationary
	 */
	private isStationary(velocity: { dx: number; dy: number }): boolean {
		return velocity.dx === 0 && velocity.dy === 0;
	}

	/**
	 * Determines if ball is moving toward the paddle
	 */
	private isApproachingPaddle(
		ballPos: { x: number; y: number },
		ballVelocity: { dx: number; dy: number },
		paddleBox: BoundingBox
	): boolean {
		const isApproachingFromLeft = ballVelocity.dx > 0 && ballPos.x < paddleBox.left;
		const isApproachingFromRight = ballVelocity.dx < 0 && ballPos.x > paddleBox.right;
		return isApproachingFromLeft || isApproachingFromRight;
	}

	/**
	 * Detects if a collision occurred between ball and paddle
	 */
	private detectCollision(
		ballHitbox: Collidable,
		paddleBox: BoundingBox
	): { collided: boolean; collisionPoint?: { x: number; y: number }; hitFace?: 'front' | 'top' | 'bottom' } {
		return this.checkSweptCollision(
			ballHitbox.getPreviousPosition(),
			ballHitbox.getPosition(),
			ballHitbox.getBoundingBox(),
			paddleBox
		);
	}

	/**
	 * Creates a default no-collision result
	 */
	private createNoCollisionResult(): CollisionResult {
		return { collided: false, hitFace: 'front', deflectionModifier: 0 };
	}

	// =========================================
	// Swept Collision Detection
	// =========================================
	
	/**
	 * Performs swept collision detection between a moving ball and stationary paddle
	 */
	private checkSweptCollision(
		prevPos: { x: number; y: number },
		currentPos: { x: number; y: number },
		ballBox: BoundingBox,
		paddleBox: BoundingBox
	): { collided: boolean; collisionPoint?: { x: number; y: number }; hitFace?: 'front' | 'top' | 'bottom' } {
		// Calculate movement vector
		const moveX = currentPos.x - prevPos.x;
		const moveY = currentPos.y - prevPos.y;

		// Calculate time and face of collision
		const collisionInfo = this.getCollisionTimeAndFace(
			prevPos,
			moveX,
			moveY,
			ballBox,
			paddleBox
		);

		if (!collisionInfo.collided) {
			return { collided: false };
		}

		// Calculate exact collision point
		const collisionPoint = {
			x: prevPos.x + moveX * collisionInfo.time!,
			y: prevPos.y + moveY * collisionInfo.time!
		};

		// Determine hit face based on collision axis and movement direction
		let hitFace: 'front' | 'top' | 'bottom';
		if (collisionInfo.face === 'x') {
			hitFace = 'front';
		} else { // collisionInfo.face === 'y'
			hitFace = moveY > 0 ? 'top' : 'bottom';
		}

		return {
			collided: true,
			collisionPoint: collisionPoint,
			hitFace: hitFace
		};
	}

	/**
	 * Calculates the exact time of collision using ray-AABB intersection
	 * and determines the collision face axis ('x' or 'y').
	 */
	private getCollisionTimeAndFace(
		prevPos: { x: number; y: number },
		moveX: number,
		moveY: number,
		ballBox: BoundingBox,
		paddleBox: BoundingBox
	): { collided: boolean; time?: number; face?: 'x' | 'y' } {
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

		// Calculate the time intervals for collision on each axis
		const tEnterX = Math.min(txMin, txMax);
		const tLeaveX = Math.max(txMin, txMax);
		const tEnterY = Math.min(tyMin, tyMax);
		const tLeaveY = Math.max(tyMin, tyMax);

		// Find the actual time of entry and exit from the intersection
		const tEnter = Math.max(tEnterX, tEnterY);
		const tLeave = Math.min(tLeaveX, tLeaveY);

		// Check for valid collision within the movement interval [0, 1]
		if (tEnter > tLeave || tEnter < 0 || tEnter > 1) {
			return { collided: false }; // No collision within this frame
		}

		// Determine which axis caused the collision
		const face = tEnter === tEnterX ? 'x' : 'y';

		return { collided: true, time: tEnter, face: face };
	}

	// =========================================
	// Deflection Calculation
	// =========================================
	
	/**
	 * Calculates the deflection angle modifier based on where the ball hit the paddle
	 */
	private calculateDeflection(
		hitPoint: { x: number; y: number },
		paddleBox: BoundingBox
	): number {
		const relativeHitPoint = this.getRelativeHitPoint(hitPoint, paddleBox);
		const zoneSize = BALL_CONFIG.EDGES.ZONE_SIZE;

		if (this.isInTopZone(relativeHitPoint, zoneSize)) {
			return this.calculateTopZoneDeflection(relativeHitPoint, zoneSize);
		}
		
		else if (this.isInBottomZone(relativeHitPoint, zoneSize)) {
			return this.calculateBottomZoneDeflection(relativeHitPoint, zoneSize);
		}
		return 0;
	}

	/**
	 * Gets the relative hit position on the paddle (0 = top, 1 = bottom)
	 */
	private getRelativeHitPoint(
		hitPoint: { x: number; y: number },
		paddleBox: BoundingBox
	): number {
		return (hitPoint.y - paddleBox.top) / (paddleBox.bottom - paddleBox.top);
	}

	/**
	 * Checks if the hit is in the top zone of the paddle
	 */
	private isInTopZone(relativeHitPoint: number, zoneSize: number): boolean {
		return relativeHitPoint < zoneSize;
	}

	/**
	 * Checks if the hit is in the bottom zone of the paddle
	 */
	private isInBottomZone(relativeHitPoint: number, zoneSize: number): boolean {
		return relativeHitPoint > (1 - zoneSize);
	}

	/**
	 * Calculates deflection for hits in the top zone
	 */
	private calculateTopZoneDeflection(relativeHitPoint: number, zoneSize: number): number {
		return -BALL_CONFIG.EDGES.MAX_DEFLECTION * (1 - relativeHitPoint/zoneSize);
	}

	/**
	 * Calculates deflection for hits in the bottom zone
	 */
	private calculateBottomZoneDeflection(relativeHitPoint: number, zoneSize: number): number {
		return BALL_CONFIG.EDGES.MAX_DEFLECTION * (1 - (1 - relativeHitPoint)/zoneSize);
	}
}
