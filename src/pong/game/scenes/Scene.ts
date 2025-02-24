import { GameContext, SceneParams } from '@pong/types';
import { GameEngine, ResizeManager } from '@pong/game/engine/';
import { COLORS, UI_CONFIG } from '@pong/constants';

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
    // Clean up resize manager
    if (this.resizeManager) {
      this.resizeManager.cleanup?.();
      this.resizeManager = null;
    }

    // Clean up context references
    this.gameContext = null as any; // TypeScript needs this cast due to readonly
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
