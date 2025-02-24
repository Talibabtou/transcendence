import { Scene } from './Scene';
import { MenuScene } from './MenuScene';
import { Player } from '@pong/game/objects';
import { COLORS, FONTS, MESSAGES, UI_CONFIG, calculateFontSizes } from '@pong/constants';
import { ResizeManager } from '@pong/game/engine';

export class EndScene extends Scene {
  // =========================================
  // Private Properties
  // =========================================
  private winner!: Player;
  protected resizeManager: ResizeManager | null = null;

  // =========================================
  // Event Handlers
  // =========================================
  private readonly handleClick = (): void => {
    this.gameContext.loadScene(new MenuScene(this.context));
  };

  // =========================================
  // Lifecycle Methods
  // =========================================
  public load(params: { winner: Player }): void {
    this.winner = params.winner;
    this.context.canvas.addEventListener('click', this.handleClick);
    
    // Initialize resize manager
    this.resizeManager = new ResizeManager(
      this.context,
      this,
      null,
      null,
      null,
      null
    );
  }

  public unload(): void {
    this.context.canvas.removeEventListener('click', this.handleClick);
    if (this.resizeManager) {
      this.resizeManager.cleanup();
    }
    super.unload();
  }

  // =========================================
  // Protected Methods
  // =========================================
  protected drawContent(): void {
    this.drawGameOver();
    this.drawReturnPrompt();
  }

  // =========================================
  // Private Methods
  // =========================================
  private drawGameOver(): void {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    
    this.context.font = `${sizes.TITLE_SIZE} ${FONTS.FAMILIES.TITLE}`;
    this.context.fillStyle = COLORS.TITLE;
    this.context.textAlign = UI_CONFIG.TEXT.ALIGN;
    
    const messages = MESSAGES.GAME_OVER(this.winner.name);
    messages.forEach((message, index) => {
      const pos = this.getTextPosition(index, messages.length + 1); // +1 for return prompt
      this.context.fillText(message, pos.x, pos.y);
    });
  }

  private drawReturnPrompt(): void {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;
    
    const messages = MESSAGES.GAME_OVER(this.winner.name);
    const pos = this.getTextPosition(messages.length, messages.length + 1);
    this.context.fillText(MESSAGES.RETURN_TO_MENU, pos.x, pos.y);
  }
}
