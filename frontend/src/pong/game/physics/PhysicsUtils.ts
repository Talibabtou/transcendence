import { SweepResult, CircleAABBOverlapResult } from '@pong/types';
import { BALL_CONFIG } from '@pong/constants';
import { Ball } from '@pong/game/objects';

/**
 * Helper for basic velocity reflection.
 * @param vx Current x-velocity.
 * @param vy Current y-velocity.
 * @param nx X-component of the collision normal.
 * @param ny Y-component of the collision normal.
 * @param dot Pre-calculated dot product (v . n).
 * @param out Output parameter to store reflected dx and dy velocities.
 */
export function reflectVelocity(
	vx: number, vy: number,
	nx: number, ny: number,
	dot: number,
	out: { dx: number, dy: number }
): void {
	out.dx = vx - 2 * dot * nx;
	out.dy = vy - 2 * dot * ny;
}

/**
 * Helper to correct ball position after a sweep collision.
 * @param ball The ball object.
 * @param contactX X-coordinate of the contact point.
 * @param contactY Y-coordinate of the contact point.
 * @param nx X-component of the collision normal.
 * @param ny Y-component of the collision normal.
 * @param epsilon Small buffer distance to push the ball out.
 */
export function correctPosition(
	ball: Ball,
	contactX: number, contactY: number,
	nx: number, ny: number,
	epsilon: number
): void {
	ball.x = contactX;
	ball.y = contactY;
	const pushX = nx * epsilon;
	const pushY = ny * epsilon;
	ball.x += pushX;
	ball.y += pushY;
}

/**
 * Checks for overlap between a circle and an AABB (Axis-Aligned Bounding Box).
 * If an overlap occurs, updates the 'out' parameter with penetration depth and collision normal.
 * @param ballPos Current position of the ball's center.
 * @param ballRadius Radius of the ball.
 * @param rectLeft Left edge of the rectangle.
 * @param rectRight Right edge of the rectangle.
 * @param rectTop Top edge of the rectangle.
 * @param rectBottom Bottom edge of the rectangle.
 * @param out Output parameter to store collision result.
 */
export function checkCircleAABBOverlap(
	ballPos: { x: number; y: number },
	ballRadius: number,
	rectLeft: number,
	rectRight: number,
	rectTop: number,
	rectBottom: number,
	out: CircleAABBOverlapResult
): void {
	out.collided = false;

	const closestX = Math.max(rectLeft, Math.min(ballPos.x, rectRight));
	const closestY = Math.max(rectTop, Math.min(ballPos.y, rectBottom));
	const distanceX = ballPos.x - closestX;
	const distanceY = ballPos.y - closestY;
	const distanceSquared = distanceX * distanceX + distanceY * distanceY;
	if (distanceSquared < ballRadius * ballRadius && distanceSquared > 1e-9) {
		const distance = Math.sqrt(distanceSquared);
		const penetrationDepth = ballRadius - distance;
		const normalX = distanceX / distance;
		const normalY = distanceY / distance;
		out.penetration.dx = normalX * penetrationDepth;
		out.penetration.dy = normalY * penetrationDepth;
		out.normal.nx = normalX;
		out.normal.ny = normalY;
		out.collided = true;
		return;
	}
}

/**
 * Helper function to apply paddle deflection to the ball's velocity.
 * @param ballPos Position of the ball at impact.
 * @param reflectedVel Velocity of the ball after basic reflection.
 * @param paddleTop Top Y-coordinate of the paddle.
 * @param paddleBottom Bottom Y-coordinate of the paddle.
 * @param out Output parameter to store final dx and dy velocities after deflection.
 */
export function applyPaddleDeflection(
	ballPos: { x: number; y: number },
	reflectedVel: { dx: number; dy: number },
	paddleTop: number,
	paddleBottom: number,
	out: { dx: number; dy: number }
): void {
	const zoneSize = BALL_CONFIG.EDGES.ZONE_SIZE;
	const maxDeflection = BALL_CONFIG.EDGES.MAX_DEFLECTION;
	const paddleHeight = paddleBottom - paddleTop;
	if (paddleHeight <= 0) {
		out.dx = reflectedVel.dx;
		out.dy = reflectedVel.dy;
		return;
	}
	const clampedY = Math.max(paddleTop, Math.min(ballPos.y, paddleBottom));
	const relHit = (clampedY - paddleTop) / paddleHeight;
	const midStart = zoneSize;
	const midEnd = 1 - zoneSize;
	let defNorm = 0;
	if (relHit < midStart) {
		defNorm = -1 * (1 - (relHit / midStart));
	} else if (relHit > midEnd) {
		defNorm = (relHit - midEnd) / (1 - midEnd);
	}
	if (maxDeflection > 0 && defNorm !== 0) {
		const angle = defNorm * maxDeflection;
		const cosA = Math.cos(angle);
		const sinA = Math.sin(angle);
		out.dx = reflectedVel.dx * cosA - reflectedVel.dy * sinA;
		out.dy = reflectedVel.dx * sinA + reflectedVel.dy * cosA;
	} else {
		out.dx = reflectedVel.dx;
		out.dy = reflectedVel.dy;
	}
}

/**
 * Continuous sweep vs AABB helper.
 * Updates the 'out' parameter with collision time and normal, or indicates no collision.
 * Handles moving rectangle (paddle).
 * @param p0 Circle start position.
 * @param vCircle Circle velocity.
 * @param r Circle radius.
 * @param rectLeft Left X-coordinate of the rectangle.
 * @param rectRight Right X-coordinate of the rectangle.
 * @param rectTop Top Y-coordinate of the rectangle.
 * @param rectBottom Bottom Y-coordinate of the rectangle.
 * @param vRect Rectangle velocity.
 * @param out Output parameter to store sweep result.
 */
export function sweepCircleVsMovingRect(
	p0: {x: number; y: number},
	vCircle: {dx: number; dy: number},
	r: number,
	rectLeft: number,
	rectRight: number,
	rectTop: number,
	rectBottom: number,
	vRect: {dx: number; dy: number},
	out: SweepResult
): void {
	out.collided = false;

	const relDx = vCircle.dx - vRect.dx;
	const relDy = vCircle.dy - vRect.dy;

	if (Math.abs(relDx) < 1e-6 && Math.abs(relDy) < 1e-6) {
			return;
	}
	let tmin = 0, tmax = 1;
	let txmin = -Infinity, tymin = -Infinity;
	const minX = rectLeft - r, maxX = rectRight + r, minY = rectTop - r, maxY = rectBottom + r;

	// --- X-axis sweep ---
	if (Math.abs(relDx) > 1e-6) {
		const inv = 1 / relDx;
		const t1 = (minX - p0.x) * inv;
		const t2 = (maxX - p0.x) * inv;
		txmin = Math.min(t1, t2);
		const txmax = Math.max(t1, t2);
		tmin = Math.max(tmin, txmin);
		tmax = Math.min(tmax, txmax);
		if (tmin > tmax) return;
	} else if (p0.x < minX || p0.x > maxX) {
			return;
	}

	// --- Y-axis sweep ---
	if (Math.abs(relDy) > 1e-6) {
		const inv = 1 / relDy;
		const t1 = (minY - p0.y) * inv;
		const t2 = (maxY - p0.y) * inv;
		tymin = Math.min(t1, t2);
		const tymax = Math.max(t1, t2);
		tmin = Math.max(tmin, tymin);
		tmax = Math.min(tmax, tymax);
		if (tmin > tmax) return;
	} else if (p0.y < minY || p0.y > maxY) {
		return;
	}
	if (tmin < 0 || tmin > 1) return;
	const axis = txmin > tymin ? 'x' : 'y';
	out.t = tmin;
	out.normal.nx = axis === 'x' ? (relDx < 0 ? 1 : -1) : 0;
	out.normal.ny = axis === 'y' ? (relDy < 0 ? 1 : -1) : 0;
	out.collided = true;
}
