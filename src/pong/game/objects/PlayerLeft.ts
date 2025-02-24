import { Player } from './Player';
import { GameContext, GameState } from '@pong/types';
import { KEYS } from '@pong/constants';

export class PlayerLeft extends Player {
  public readonly name = 'Player 1';

  // =========================================
  // Event Handlers
  // =========================================
  private readonly handleKeydown = (evt: KeyboardEvent): void => {
    switch (evt.code) {
      case KEYS.PLAYER_LEFT_UP:
        this.upPressed = true;
        break;
      case KEYS.PLAYER_LEFT_DOWN:
        this.downPressed = true;
        break;
    }
    this.updateDirection();
  };

  private readonly handleKeyup = (evt: KeyboardEvent): void => {
    switch (evt.code) {
      case KEYS.PLAYER_LEFT_UP:
        this.upPressed = false;
        break;
      case KEYS.PLAYER_LEFT_DOWN:
        this.downPressed = false;
        break;
    }
    this.updateDirection();
  };

  // =========================================
  // Public Methods
  // =========================================
  public bind(): void {
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('keyup', this.handleKeyup);
  }

  public unbind(): void {
    this.upPressed = false;
    this.downPressed = false;
    this.direction = null;
    
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('keyup', this.handleKeyup);
  }

  // Override update to ensure direction is always current
  public update(ctx: GameContext, deltaTime: number, state: GameState): void {
    this.updateDirection();
    super.update(ctx, deltaTime, state);
  }
}
