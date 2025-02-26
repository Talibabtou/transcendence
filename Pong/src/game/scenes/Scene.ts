import { GameContext, SceneParams } from '@/types';
import { GameEngine, ResizeManager } from '@/game/engine/';
import { COLORS, UI_CONFIG } from '@/constants';

export abstract class Scene {
  // =========================================
  // Protected Properties
  // =========================================
  protected gameContext!: GameEngine;
  protected abstract resizeManager: ResizeManager | null;

  // =========================================
  // Constructor
  // =========================================
  constructor(protected readonly context: GameContext) {
  }


  // =========================================
  // Abstract Methods
  // =========================================
  protected abstract drawContent(): void;

  // =========================================
  // Public Methods
  // =========================================
  public draw(): void {
    this.drawBackground();
    this.drawContent();
  }

  public load(_params: SceneParams = {}): void {
    // Override in child classes if needed
  }
  
  public unload(): void {
    if (this.resizeManager) {
      this.resizeManager.cleanup?.();
    }
  }

  public update?(): void;

  public setGameContext(game: GameEngine): void {
    this.gameContext = game;
  }

  public getResizeManager(): ResizeManager | null {
    return this.resizeManager;
  }

  // =========================================
  // Protected Helper Methods
  // =========================================
  protected getTextPosition(
    lineIndex: number = 0, 
    totalLines: number = 1
  ): { x: number; y: number } {
    const { width, height } = this.context.canvas;
    
    // Calculate vertical offset from center
    const spacing = height * UI_CONFIG.LAYOUT.VERTICAL_SPACING;
    const totalHeight = spacing * (totalLines - 1);
    const startY = height / 2 - totalHeight / 2;
    
    return {
      x: width / 2,
      y: startY + (lineIndex * spacing)
    };
  }

  // =========================================
  // Protected Methods
  // =========================================
  protected drawBackground(): void {
    const { width, height } = this.context.canvas;
    this.context.fillStyle = COLORS.MENU_BACKGROUND;
    this.context.fillRect(0, 0, width, height);
  }
}
