import { Player } from './Player';
import { GameContext, GameState } from '@/types';
import { calculateGameSizes } from '@/constants';

export class PlayerRight extends Player {
  // =========================================
  // Properties
  // =========================================
  public readonly name = 'Computer';
  protected isAIControlled: boolean = true;

  // =========================================
  // Game Loop Methods
  // =========================================
  public update(ctx: GameContext, deltaTime: number, state: GameState): void {
    // Only update AI inputs if we're actually playing
    if (this.isAIControlled && state === GameState.PLAYING) {
      this.updateAIInputs(ctx);
    }
    this.updateDirection();
    super.update(ctx, deltaTime, state);
  }

  // =========================================
  // Protected Methods
  // =========================================
  protected updateHorizontalPosition(ctx: GameContext): void {
    const width = ctx.canvas.width;
    const sizes = calculateGameSizes(width, ctx.canvas.height);
    this.x = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
    this.paddleWidth = sizes.PADDLE_WIDTH;
  }

  // =========================================
  // AI Control Methods
  // =========================================
  private updateAIInputs(ctx: GameContext): void {
    const paddleCenter = this.y + (this.paddleHeight / 2);
    const centerY = ctx.canvas.height / 2 - this.paddleHeight / 2;

    // Only update AI movement if the ball is actually moving
    if (this.ball.dx === 0 && this.ball.dy === 0) {
      this.upPressed = false;
      this.downPressed = false;
      return;
    }

    if (this.ball.dx <= 0) {
      this.simulateAIReturn(centerY);
    } else {
      this.simulateAIFollow(paddleCenter);
    }
  }

  private simulateAIReturn(centerY: number): void {
    const deadzone = this.speed / 2;
    if (Math.abs(this.y - centerY) < deadzone) {
      this.upPressed = false;
      this.downPressed = false;
    } else {
      this.upPressed = this.y > centerY;
      this.downPressed = this.y < centerY;
    }
  }

  private simulateAIFollow(paddleCenter: number): void {
    const deadzone = this.speed / 2;
    if (Math.abs(this.ball.y - paddleCenter) < deadzone) {
      this.upPressed = false;
      this.downPressed = false;
    } else {
      this.upPressed = this.ball.y < paddleCenter;
      this.downPressed = this.ball.y > paddleCenter;
    }
  }

  // =========================================
  // Control Mode Methods
  // =========================================
  public setAIControl(enabled: boolean): void {
    this.isAIControlled = enabled;
    this.upPressed = false;
    this.downPressed = false;
  }
}

