import { Scene } from './Scene';
import { MainScene } from './MainScene';
import { COLORS, FONTS, MESSAGES, UI_CONFIG, calculateFontSizes } from '@/constants';
import { ResizeManager } from '@/game/engine';

export class MenuScene extends Scene {
  // =========================================
  // Protected Properties
  // =========================================
  protected resizeManager: ResizeManager | null = null;

  // =========================================
  // Event Handlers
  // =========================================
  private readonly handleClick = (): void => {
    this.gameContext.loadScene(new MainScene(this.context));
  };

  // =========================================
  // Lifecycle Methods
  // =========================================
  public load(): void {
    super.load();
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
    this.drawTitle();
    this.drawSubtitle();
  }

  private drawTitle(): void {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    
    this.context.font = `${sizes.TITLE_SIZE} ${FONTS.FAMILIES.TITLE}`;
    this.context.fillStyle = COLORS.TITLE;
    this.context.textAlign = UI_CONFIG.TEXT.ALIGN;
    
    const pos = this.getTextPosition(0, 2);
    this.context.fillText(MESSAGES.GAME_TITLE, pos.x, pos.y);
  }

  private drawSubtitle(): void {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    this.context.font = `${sizes.SUBTITLE_SIZE} ${FONTS.FAMILIES.SUBTITLE}`;
    
    const pos = this.getTextPosition(1, 2);
    this.context.fillText(MESSAGES.GAME_SUBTITLE, pos.x, pos.y);
  }
}
