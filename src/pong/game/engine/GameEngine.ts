import { GameContext, SceneParams, GameState } from '@pong/types';
import { MenuScene, MainScene, Scene } from '@pong/game/scenes';
import { KEYS } from '@pong/constants';

export class GameEngine {
  // =========================================
  // Properties
  // =========================================
  protected scene!: Scene;
  private context: GameContext;

  // =========================================
  // Lifecycle
  // =========================================
  constructor(ctx: GameContext) {
    this.context = ctx;
    this.initializeGame();
  }

  private initializeGame(): void {
    const menu = new MenuScene(this.context);
    this.loadScene(menu);
    this.bindPauseControls();
  }

  // =========================================
  // Scene Management
  // =========================================
  public loadScene(newScene: Scene, params: SceneParams = {}): void {
    if (this.scene) {
      this.scene.unload();
    }
    this.scene = newScene;
    this.scene.setGameContext(this);
    this.scene.load(params);
  }

  public getScene(): Scene {
    return this.scene;
  }

  // =========================================
  // Game Loop
  // =========================================
  public draw(): void {
    this.clearScreen();
    this.scene.draw();
  }

  public update(): void {
    if (this.isGamePaused()) {
      return;
    }
    this.scene.update?.();
  }

  // =========================================
  // Pause Management
  // =========================================
  private bindPauseControls(): void {
    window.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.code === KEYS.ENTER || evt.code === KEYS.ESC) {
        this.togglePause();
      }
    });
  }

  private togglePause(): void {
    if (!(this.scene instanceof MainScene)) {
      return;
    }

    const mainScene = this.scene;
    const resizeManager = mainScene.getResizeManager();
    if (resizeManager?.isCurrentlyResizing()) {
      return;
    }
    
    const pauseManager = mainScene.getPauseManager();
    if (pauseManager.hasState(GameState.PLAYING)) {
      mainScene.handlePause();
    } else if (pauseManager.hasState(GameState.PAUSED)) {
      mainScene.handleResume();
    }
  }

  public isGamePaused(): boolean {
    if (!(this.scene instanceof MainScene)) {
      return false;
    }
    return this.scene.getPauseManager().hasState(GameState.PAUSED);
  }

  // =========================================
  // Private Rendering Methods
  // =========================================
  private clearScreen(): void {
    const { width, height } = this.context.canvas;
    this.context.beginPath();
    this.context.clearRect(0, 0, width, height);
    this.context.closePath();
  }

  public cleanup(): void {
    if (this.scene) {
      this.scene.unload();
      this.scene = null as any;
    }
    this.context = null as any;
  }
}
