import { Ball } from '@pong/game/objects';
import { BoundingBox, Collidable } from '@pong/types';

/**
 * Provides collision detection capabilities for the Ball object
 * by implementing the Collidable interface.
 */
export class BallHitbox implements Collidable {
	// =========================================
	// Properties
	// =========================================

	/**
	 * Creates a new BallHitbox instance
	 * @param ball The ball object this hitbox represents
	 */
	constructor(private readonly ball: Ball) {
		if (!ball) {
			throw new Error('Ball must be provided to BallHitbox');
		}
	}

	// =========================================
	// Collidable Interface Implementation
	// =========================================
	
	/**
	 * Returns the current bounding box of the ball
	 */
	public getBoundingBox(): BoundingBox {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		const radius = this.ball.getSize();
		const pos = this.ball.getPosition();
		return {
			left: pos.x - radius,
			right: pos.x + radius,
			top: pos.y - radius,
			bottom: pos.y + radius
		};
	}

	/**
	 * Returns the current velocity of the ball
	 */
	public getVelocity(): { dx: number; dy: number } {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		return this.ball.getVelocity();
	}

	/**
	 * Returns the current position of the ball
	 */
	public getPosition(): { x: number; y: number } {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		return this.ball.getPosition();
	}

	/**
	 * Returns the previous position of the ball
	 */
	public getPreviousPosition(): { x: number; y: number } {
		return this.ball.getPrevPosition();
	}

	// =========================================
	// State Management
	// =========================================
}
