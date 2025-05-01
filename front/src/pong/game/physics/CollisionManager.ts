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
		const ballCurrentPos = ballHitbox.getPosition();
		const ballPrevPos = ballHitbox.getPreviousPosition();
		const ballBox = ballHitbox.getBoundingBox();
		const paddleBox = paddleHitbox.getBoundingBox();

		// Early validations
		if (this.isStationary(ballVelocity) || !this.isApproachingPaddle(ballCurrentPos, ballVelocity, paddleBox)) {
			return this.createNoCollisionResult();
		}
		
		// Calculate movement vector
		let moveX = ballCurrentPos.x - ballPrevPos.x;
		let moveY = ballCurrentPos.y - ballPrevPos.y;
		console.log('moveX', moveX);
		console.log('moveY', moveY);
		// If moveX and moveY are both 0 but velocity is non-zero, use velocity for projection
		// This happens when previous position equals current position but ball is moving
		if ((Math.abs(moveX) < 1e-6 && Math.abs(moveY) < 1e-6) && 
			(Math.abs(ballVelocity.dx) > 1e-6 || Math.abs(ballVelocity.dy) > 1e-6)) {
			// Use a small time step for projection (e.g., 1/60 for 60fps)
			const timeStep = 1/60;
			moveX = ballVelocity.dx * timeStep;
			moveY = ballVelocity.dy * timeStep;
			console.log("Using velocity for projection: ", moveX, moveY);
		}
		
		// If we still don't have movement, we can't detect a collision
		if (Math.abs(moveX) < 1e-6 && Math.abs(moveY) < 1e-6) {
			return this.createNoCollisionResult();
		}

		// Perform swept collision detection
		const collision = this.detectSweptCollision(
			ballPrevPos,
			{ x: ballPrevPos.x + moveX, y: ballPrevPos.y + moveY },
			ballBox,
			paddleBox
		);

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
			hitFace: collision.hitFace!,
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
		// Add small epsilon for floating point comparison
		return Math.abs(velocity.dx) < 1e-6 && Math.abs(velocity.dy) < 1e-6;
	}

	/**
	 * Determines if ball is moving toward the paddle
	 * Considers the side the paddle is on (simple check based on paddle center)
	 */
	private isApproachingPaddle(
		ballPos: { x: number; y: number },
		ballVelocity: { dx: number; dy: number },
		paddleBox: BoundingBox
	): boolean {
		const paddleCenterX = (paddleBox.left + paddleBox.right) / 2;
		// Approaching from left towards right-side paddle
		if (ballVelocity.dx > 0 && ballPos.x < paddleCenterX) return true;
		// Approaching from right towards left-side paddle
		if (ballVelocity.dx < 0 && ballPos.x > paddleCenterX) return true;
		return false;
	}
	
	/**
	 * Creates a default no-collision result
	 */
	private createNoCollisionResult(): CollisionResult {
		return { collided: false, hitFace: 'front', deflectionModifier: 0 }; // Default hitFace might not matter
	}

	// =========================================
	// Swept Collision Detection (Refined)
	// =========================================
	
	/**
	 * Performs swept collision detection between a moving ball and stationary paddle.
	 * Refined to better determine the actual hit face (front, top, bottom).
	 */
	private detectSweptCollision(
		prevPos: { x: number; y: number }, // Ball's previous center position
		currentPos: { x: number; y: number }, // Ball's current or projected center position
		ballBox: BoundingBox, // Ball's bounding box (to get radius)
		paddleBox: BoundingBox // Paddle's bounding box
	): { collided: boolean; collisionPoint?: { x: number; y: number }; hitFace?: 'front' | 'top' | 'bottom' } {
		
		const ballRadius = (ballBox.right - ballBox.left) / 2; // Assuming square hitbox for ball
		const moveX = currentPos.x - prevPos.x;
		const moveY = currentPos.y - prevPos.y;

		// Use Minkowski difference (expand paddle by ball radius) for swept AABB
		const expandedPaddleBox = {
			left: paddleBox.left - ballRadius,
			right: paddleBox.right + ballRadius,
			top: paddleBox.top - ballRadius,
			bottom: paddleBox.bottom + ballRadius
		};

		// Calculate time of intersection with expanded box edges
		let tEnterX: number, tLeaveX: number, tEnterY: number, tLeaveY: number;

		if (Math.abs(moveX) < 1e-6) {
			// Handle vertical movement: collision only if already overlapping horizontally
			if (prevPos.x > expandedPaddleBox.left && prevPos.x < expandedPaddleBox.right) {
				tEnterX = -Infinity;
				tLeaveX = Infinity;
			} else {
				return { collided: false }; // No horizontal overlap, no collision possible
			}
		} else {
			tEnterX = (expandedPaddleBox.left - prevPos.x) / moveX;
			tLeaveX = (expandedPaddleBox.right - prevPos.x) / moveX;
			if (tEnterX > tLeaveX) [tEnterX, tLeaveX] = [tLeaveX, tEnterX]; // Ensure tEnterX <= tLeaveX
		}

		if (Math.abs(moveY) < 1e-6) {
			// Handle horizontal movement: collision only if already overlapping vertically
			if (prevPos.y > expandedPaddleBox.top && prevPos.y < expandedPaddleBox.bottom) {
				tEnterY = -Infinity;
				tLeaveY = Infinity;
			} else {
				return { collided: false }; // No vertical overlap, no collision possible
			}
		} else {
			tEnterY = (expandedPaddleBox.top - prevPos.y) / moveY;
			tLeaveY = (expandedPaddleBox.bottom - prevPos.y) / moveY;
			if (tEnterY > tLeaveY) [tEnterY, tLeaveY] = [tLeaveY, tEnterY]; // Ensure tEnterY <= tLeaveY
		}

		// Find the actual interval of overlap
		const tEnter = Math.max(tEnterX, tEnterY);
		const tLeave = Math.min(tLeaveX, tLeaveY);

		// Check for valid collision within the movement interval [0, 1]
		if (tEnter > tLeave || tEnter < 0 || tEnter > 1) {
			return { collided: false }; // No collision within this frame
		}

		// Calculate exact collision point (center of the ball at time tEnter)
		const collisionPoint = {
			x: prevPos.x + moveX * tEnter,
			y: prevPos.y + moveY * tEnter
		};

		// --- Refined Hit Face Determination ---
		let hitFace: 'front' | 'top' | 'bottom';

		// Prioritize 'front' hit if the collision time corresponds to horizontal entry 
		// AND the vertical position at collision is within the paddle's original height.
		// A small tolerance might be needed for floating point comparisons.
		const epsilon = 1e-6; 
		
		if (tEnter === tEnterX) { // Hit vertical slab first (potentially front)
			// Check if ball's vertical center is within paddle's actual vertical bounds at collision time
			if (collisionPoint.y >= paddleBox.top - epsilon && collisionPoint.y <= paddleBox.bottom + epsilon) {
				hitFace = 'front';
			} else { 
				// If hit vertical slab first but outside paddle height, must be top/bottom edge contact
				hitFace = moveY > 0 ? 'top' : 'bottom';
			}
		} else if (tEnter === tEnterY) { // Hit horizontal slab first (potentially top/bottom)
		    // Check if ball's horizontal center is within paddle's actual horizontal bounds at collision time
			if (collisionPoint.x >= paddleBox.left - epsilon && collisionPoint.x <= paddleBox.right + epsilon) {
				hitFace = moveY > 0 ? 'top' : 'bottom'; // Moving down hits top, moving up hits bottom
			} else {
				// If hit horizontal slab first but outside paddle width, must be front face contact (side edge)
				hitFace = 'front';
			}
		} else {
			// Should not happen with Math.max if values are distinct numbers.
			// Handle potential edge case or default (e.g., based on dominant velocity) if necessary.
			// For now, default based on which interval entry time was larger (closer to equal)
			hitFace = (tEnterX > tEnterY) ? 'front' : (moveY > 0 ? 'top' : 'bottom'); 
		}
		// --- End Refined Hit Face Determination ---

		return {
			collided: true,
			collisionPoint: collisionPoint,
			hitFace: hitFace
		};
	}

	// =========================================
	// Deflection Calculation (Remains the same)
	// =========================================
	
	/**
	 * Calculates the deflection angle modifier based on where the ball hit the paddle
	 */
	private calculateDeflection(
		hitPoint: { x: number; y: number }, // This is the ball's center at collision
		paddleBox: BoundingBox
	): number {
		// Calculate hit position relative to the paddle's height (0 = top, 1 = bottom)
		const paddleHeight = paddleBox.bottom - paddleBox.top;
		// Clamp hitpoint y to paddle bounds before calculating relative position
		const clampedHitY = Math.max(paddleBox.top, Math.min(hitPoint.y, paddleBox.bottom));
		const relativeHitPoint = (clampedHitY - paddleBox.top) / paddleHeight;

		const zoneSize = BALL_CONFIG.EDGES.ZONE_SIZE; // e.g., 0.1 (10% from top/bottom)
		const middleZoneStart = zoneSize;
		const middleZoneEnd = 1.0 - zoneSize;
		return 0;
		if (relativeHitPoint < middleZoneStart) { // Hit in top zone
			// Map relativeHitPoint (0 to zoneSize) to deflection (-1 to 0)
			// When hitPoint=0 (very top), deflection=-1. When hitPoint=zoneSize, deflection=0.
			return -1.0 * (1.0 - (relativeHitPoint / zoneSize));
		} else if (relativeHitPoint > middleZoneEnd) { // Hit in bottom zone
			// Map relativeHitPoint (middleZoneEnd to 1.0) to deflection (0 to 1)
			// When hitPoint=middleZoneEnd, deflection=0. When hitPoint=1.0 (very bottom), deflection=1.
			return (relativeHitPoint - middleZoneEnd) / zoneSize;
		} else { // Hit in middle zone
			return 0; // No deflection modifier
		}
	}
}
