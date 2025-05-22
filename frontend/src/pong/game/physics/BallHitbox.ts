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

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	public get BoundingBox(): BoundingBox {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		const radius = this.ball.Size;
		const pos = this.ball.Position;
		return {
			left: pos.x - radius,
			right: pos.x + radius,
			top: pos.y - radius,
			bottom: pos.y + radius
		};
	}

	public get Velocity(): { dx: number; dy: number } {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		return this.ball.Velocity;
	}

	public get Position(): { x: number; y: number } {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		return this.ball.Position;
	}
	public get PreviousPosition(): { x: number; y: number } { return this.ball.PrevPosition; }
}
