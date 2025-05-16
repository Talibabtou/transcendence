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

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	
	public get Velocity(): { dx: number; dy: number } { return this.paddle.Velocity; }
	public get Position(): { x: number; y: number } { return this.paddle.Position; }
	public get PreviousPosition(): { x: number; y: number } { return this.paddle.PreviousPosition; }
	public get BoundingBox(): BoundingBox {
		const pos = this.paddle.Position;
		return {
			left: pos.x,
			right: pos.x + this.paddle.paddleWidth,
			top: pos.y + this.paddle.paddleHeight * 0.03,
			bottom: pos.y + this.paddle.paddleHeight - this.paddle.paddleHeight * 0.03
		};
	}
}
