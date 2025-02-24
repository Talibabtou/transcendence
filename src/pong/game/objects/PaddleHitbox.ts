import { Ball } from './Ball';
import { Paddle, BoundingBox } from '@pong/types';
import { BALL_CONFIG } from '@pong/constants';

interface CollisionResult {
  collided: boolean;
  hitFace: 'front' | 'top' | 'bottom';
  deflectionModifier: number; // -0.1 to 0.1 (10% max deflection)
}

export class PaddleHitbox {
  private readonly EDGE_ZONE = BALL_CONFIG.EDGES.ZONE_SIZE;
  private readonly MAX_DEFLECTION = BALL_CONFIG.EDGES.MAX_DEFLECTION;

  // =========================================
  // Constructor
  // =========================================
  constructor(
    private readonly paddle: Paddle,
    private readonly ball: Ball
  ) {}

  // =========================================
  // Public Methods
  // =========================================
  public checkCollision(): CollisionResult {
    if (this.isStationary()) {
      return { collided: false, hitFace: 'front', deflectionModifier: 0 };
    }

    const ballBox = this.getBallBoundingBox();
    const paddleBox = this.getPaddleBoundingBox();

    if (!this.doBoxesIntersect(ballBox, paddleBox)) {
      return { collided: false, hitFace: 'front', deflectionModifier: 0 };
    }

    // Determine if ball is approaching the paddle
    const isApproachingFromLeft = this.ball.dx > 0 && this.ball.x < this.paddle.x;
    const isApproachingFromRight = this.ball.dx < 0 && this.ball.x > this.paddle.x + this.paddle.paddleWidth;

    // Only register collision if ball is approaching the paddle
    if (!isApproachingFromLeft && !isApproachingFromRight) {
      return { collided: false, hitFace: 'front', deflectionModifier: 0 };
    }

    // Calculate relative hit position
    const relativeHitPos = (this.ball.y - this.paddle.y) / this.paddle.paddleHeight;

    // Determine hit face and calculate deflection
    let hitFace: 'front' | 'top' | 'bottom';
    let deflectionModifier = 0;

    // Check for top/bottom collisions first
    if (this.ball.dy > 0 && this.ball.y - this.ball.getSize() <= this.paddle.y) {
      hitFace = 'top';
    } else if (this.ball.dy < 0 && this.ball.y + this.ball.getSize() >= this.paddle.y + this.paddle.paddleHeight) {
      hitFace = 'bottom';
    } else {
      // Front collision with edge detection
      hitFace = 'front';
      if (relativeHitPos < this.EDGE_ZONE) {
        deflectionModifier = -this.MAX_DEFLECTION * (1 - (relativeHitPos / this.EDGE_ZONE));
      } else if (relativeHitPos > (1 - this.EDGE_ZONE)) {
        deflectionModifier = this.MAX_DEFLECTION * ((relativeHitPos - (1 - this.EDGE_ZONE)) / this.EDGE_ZONE);
      }
    }

    // After collision, move ball outside paddle to prevent sticking
    if (hitFace === 'front') {
      if (isApproachingFromLeft) {
        this.ball.x = this.paddle.x - this.ball.getSize();
      } else {
        this.ball.x = this.paddle.x + this.paddle.paddleWidth + this.ball.getSize();
      }
    }

    return { collided: true, hitFace, deflectionModifier };
  }

  // =========================================
  // Private Methods
  // =========================================
  private isStationary(): boolean {
    return this.ball.dx === 0 && this.ball.dy === 0;
  }

  private getBallBoundingBox(): BoundingBox {
    const ballSize = this.ball.getSize();
    return {
      left: this.ball.x - ballSize,
      right: this.ball.x + ballSize,
      top: this.ball.y - ballSize,
      bottom: this.ball.y + ballSize
    };
  }

  private getPaddleBoundingBox(): BoundingBox {
    return {
      left: this.paddle.x,
      right: this.paddle.x + this.paddle.paddleWidth,
      top: this.paddle.y,
      bottom: this.paddle.y + this.paddle.paddleHeight
    };
  }

  private doBoxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    return box1.right >= box2.left && 
           box1.left <= box2.right && 
           box1.bottom >= box2.top && 
           box1.top <= box2.bottom;
  }
}
