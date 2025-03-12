import { Paddle } from '@pong/game/objects';
import { BoundingBox, Collidable } from '@pong/types';

export class PaddleHitbox implements Collidable {
	constructor(private readonly paddle: Paddle) {
		if (!paddle) {
			throw new Error('Paddle must be provided to PaddleHitbox');
		}
	}

	public getBoundingBox(): BoundingBox {
		const pos = this.paddle.getPosition();
		return {
			left: pos.x,
			right: pos.x + this.paddle.paddleWidth,
			top: pos.y,
			bottom: pos.y + this.paddle.paddleHeight
		};
	}

	public getVelocity(): { dx: number; dy: number } {
		return this.paddle.getVelocity();
	}

	public getPosition(): { x: number; y: number } {
		return this.paddle.getPosition();
	}

	public getPreviousPosition(): { x: number; y: number } {
		return this.getPosition(); // Paddle doesn't need previous position
	}
}
