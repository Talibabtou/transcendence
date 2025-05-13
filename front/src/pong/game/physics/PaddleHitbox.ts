import { Paddle } from '@pong/game/objects';
import { BoundingBox, Collidable } from '@pong/types';

/**
 * Provides collision detection capabilities for Paddle objects
 * by implementing the Collidable interface.
 */
export class PaddleHitbox implements Collidable {
	/**
	 * Creates a new PaddleHitbox instance
	 * @param paddle The paddle object this hitbox represents
	 */
	constructor(private readonly paddle: Paddle) {
		if (!paddle) {
			throw new Error('Paddle must be provided to PaddleHitbox');
		}
	}

	// =========================================
	// Collidable Interface Implementation
	// =========================================
	
	/**
	 * Returns the current bounding box of the paddle
	 */
	public getBoundingBox(): BoundingBox {
		const pos = this.paddle.getPosition();
		return {
			left: pos.x,
			right: pos.x + this.paddle.paddleWidth,
			top: pos.y,
			bottom: pos.y + this.paddle.paddleHeight
		};
	}

	/**
	 * Returns the current velocity of the paddle
	 */
	public getVelocity(): { dx: number; dy: number } {
		return this.paddle.getVelocity();
	}

	/**
	 * Returns the current position of the paddle
	 */
	public getPosition(): { x: number; y: number } {
		return this.paddle.getPosition();
	}

	/**
	 * Returns the previous position of the paddle
	 * Note: For paddles, we currently use the current position
	 */
	public getPreviousPosition(): { x: number; y: number } {
		return this.paddle.getPreviousPosition();
	}
}
