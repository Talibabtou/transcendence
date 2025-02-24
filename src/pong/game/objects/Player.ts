import { Ball } from './Ball';
import { GraphicalElement, GameContext, Direction } from '@pong/types';
import { COLORS, GAME_CONFIG, calculateGameSizes } from '@pong/constants';
import { PaddleHitbox } from './PaddleHitbox';
import { GameState } from '@pong/types';

export abstract class Player implements GraphicalElement {
  // =========================================
  // Protected Properties
  // =========================================
  protected direction: Direction | null = null;
  protected speed: number = 5;
  protected readonly colour = COLORS.PADDLE;
  protected score = 0;
  protected readonly startX: number;
  protected readonly startY: number;
  protected readonly hitbox: PaddleHitbox;
  protected upPressed = false;
  protected downPressed = false;

  // =========================================
  // Public Properties
  // =========================================
  public paddleWidth: number = 10;
  public paddleHeight: number = 100;
  public name = 'Human Player';

  // =========================================
  // Constructor
  // =========================================
  constructor(
    public x: number,
    public y: number,
    protected readonly ball: Ball,
    protected readonly context: GameContext
  ) {
    this.startX = x;
    this.startY = context.canvas.height / 2 - this.paddleHeight / 2;
    this.y = this.startY;
    
    this.hitbox = new PaddleHitbox(this, ball);
    this.updateSizes();
  }

  // =========================================
  // Public API
  // =========================================
  public getScore(): number {
    return this.score;
  }

  public givePoint(): void {
    this.score += 1;
  }

  public resetScore(): void {
    this.score = 0;
  }

  public stopMovement(): void {
    this.direction = null;
  }

  public resetPosition(): void {
    const height = this.context.canvas.height;
    this.y = height / 2 - this.paddleHeight / 2;
  }

  // =========================================
  // Size Management
  // =========================================
  public updateSizes(): void {
    if (!this.context) return;
    
    const { width, height } = this.context.canvas;
    const sizes = calculateGameSizes(width, height);
    
    this.paddleWidth = sizes.PADDLE_WIDTH;
    this.paddleHeight = sizes.PADDLE_HEIGHT;
    this.speed = sizes.PADDLE_SPEED;

    this.updateHorizontalPosition(this.context);
  }

  // =========================================
  // Game Loop Methods
  // =========================================
  public update(ctx: GameContext, deltaTime: number, state: GameState): void {
    const { width, height } = ctx.canvas;
    const sizes = calculateGameSizes(width, height);
    this.paddleHeight = sizes.PADDLE_HEIGHT;

    if (state === GameState.PLAYING) {
      this.updateMovement(deltaTime);
    }
    this.updateHorizontalPosition(ctx);
    this.checkBallCollision();
  }

  public draw(ctx: GameContext): void {
    ctx.fillStyle = this.colour;
    ctx.fillRect(this.x, this.y, this.paddleWidth, this.paddleHeight);
  }

  // =========================================
  // Protected Methods
  // =========================================
  protected updateHorizontalPosition(ctx: GameContext): void {
    const { width } = ctx.canvas;
    const sizes = calculateGameSizes(width, ctx.canvas.height);
    
    const isRightPlayer = this.startX > width / 2;
    this.x = isRightPlayer 
      ? width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH)
      : sizes.PLAYER_PADDING;
  }

  private updateMovement(deltaTime: number): void {
    if (this.direction === null) return;

    const frameSpeed = this.speed * GAME_CONFIG.FPS * deltaTime;
    const newY = this.direction === Direction.UP 
      ? this.y - frameSpeed 
      : this.y + frameSpeed;

    const maxY = this.context.canvas.height - this.paddleHeight;
    this.y = Math.min(Math.max(0, newY), maxY);
  }

  protected updateDirection(): void {
    if (this.upPressed && this.downPressed) {
      this.direction = null;
    } else if (this.upPressed) {
      this.direction = Direction.UP;
    } else if (this.downPressed) {
      this.direction = Direction.DOWN;
    } else {
      this.direction = null;
    }
  }

  protected checkBallCollision(): void {
    const collision = this.hitbox.checkCollision();
    if (collision.collided) {
      this.ball.hit(collision.hitFace, collision.deflectionModifier);
    }
  }
}
