import { Ball } from '@pong/game/objects';
import { BoundingBox, Collidable } from '@pong/types';

export class BallHitbox implements Collidable {
	private previousPosition: { x: number; y: number };

	constructor(private readonly ball: Ball) {
		if (!ball) {
			throw new Error('Ball must be provided to BallHitbox');
		}
		this.previousPosition = ball.getPosition();
	}

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

	public getVelocity(): { dx: number; dy: number } {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		return this.ball.getVelocity();
	}

	public getPosition(): { x: number; y: number } {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		return this.ball.getPosition();
	}

	public getPreviousPosition(): { x: number; y: number } {
		return this.previousPosition;
	}

	public updatePreviousPosition(): void {
		if (!this.ball) {
			throw new Error('Ball is undefined in BallHitbox');
		}
		this.previousPosition = this.ball.getPosition();
	}
}
