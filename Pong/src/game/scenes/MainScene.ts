import { Scene } from './Scene';
import { EndScene } from './EndScene';
import { Ball, PlayerLeft, PlayerRight } from '@/game/objects';
import { GraphicalElement, GameContext, GameState } from '@/types';
import { COLORS, GAME_CONFIG, FONTS, UI_CONFIG, calculateFontSizes, calculateGameSizes } from '@/constants';
import { PauseManager } from '@/game/engine';
import { ResizeManager } from '@/game/engine';

export class MainScene extends Scene {
  // =========================================
  // Private Properties
  // =========================================
  private ball!: Ball;
  private player1!: PlayerLeft;
  private player2!: PlayerRight;
  private readonly winningScore = GAME_CONFIG.WINNING_SCORE;
  private objectsInScene: Array<GraphicalElement> = [];
  private pauseManager!: PauseManager;
  protected resizeManager: ResizeManager | null = null;
  
  private lastTime: number = 0;
  private countdownText: string | number | string[] | null = null;

  // =========================================
  // Constructor
  // =========================================
  constructor(protected readonly context: GameContext) {
    super(context);
    this.setupScene();
    this.lastTime = performance.now();
  }

  // =========================================
  // Lifecycle Methods
  // =========================================
  public load(): void {
    this.player1.bind();
    this.pauseManager.startGame();
  }

  public unload(): void {
    this.player1.unbind();
    super.unload();
  }

  public update(): void {
    if (this.shouldSkipUpdate()) return;
    
    const deltaTime = this.calculateDeltaTime();
    this.updateGameState(deltaTime);
    this.checkWinCondition();
  }

  // =========================================
  // Protected Methods
  // =========================================
  protected drawContent(): void {
    this.drawGameElements();
    this.drawUI();
  }

  protected drawBackground(): void {
    const { width, height } = this.context.canvas;
    
    // Draw background
    this.context.fillStyle = COLORS.GAME_BACKGROUND;
    this.context.fillRect(0, 0, width, height);

    // Draw center line
    this.context.beginPath();
    this.context.strokeStyle = COLORS.PITCH;
    this.context.setLineDash([5, 15]);
    this.context.moveTo(width / 2, 0);
    this.context.lineTo(width / 2, height);
    this.context.stroke();
    this.context.closePath();
  }

  // =========================================
  // Public Methods
  // =========================================
  public handlePause(): void {
    this.pauseManager.pause();
  }

  public handleResume(): void {
    this.pauseManager.resume();
  }

  public getPauseManager(): PauseManager {
    return this.pauseManager;
  }

  // =========================================
  // Private Setup Methods
  // =========================================
  private setupScene(): void {
    const { width, height } = this.context.canvas;
    this.createGameObjects(width, height);
    this.objectsInScene = [this.player1, this.player2, this.ball];
    this.initializePauseManager();
    this.initializeResizeManager();
  }

  private initializePauseManager(): void {
    this.pauseManager = new PauseManager(this.ball, this.player1, this.player2);
    this.pauseManager.setCountdownCallback((text) => {
      this.countdownText = text;
    });
  }

  private initializeResizeManager(): void {
    this.resizeManager = new ResizeManager(
      this.context,
      this,
      this.ball,
      this.player1,
      this.player2,
      this.pauseManager
    );
  }

  private createGameObjects(width: number, height: number): void {
    const centerH = width / 2;
    
    this.ball = new Ball(centerH, height / 2, this.context);
    this.createPlayers(width);
  }

  private createPlayers(width: number): void {
    const sizes = calculateGameSizes(width, this.context.canvas.height);
    const height = this.context.canvas.height;
    
    // Calculate initial center position accounting for paddle height
    const centerPaddleY = height / 2 - sizes.PADDLE_HEIGHT / 2;
    
    this.player1 = new PlayerLeft(
      sizes.PLAYER_PADDING,
      centerPaddleY, 
      this.ball,
      this.context
    );

    const player2X = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
    this.player2 = new PlayerRight(
      player2X,
      centerPaddleY,
      this.ball,
      this.context
    );
  }

  // =========================================
  // Private Update Methods
  // =========================================
  private shouldSkipUpdate(): boolean {
    return this.pauseManager.hasState(GameState.PAUSED);
  }

  private calculateDeltaTime(): number {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    return deltaTime;
  }

  private updateGameState(deltaTime: number): void {
    this.pauseManager.update();
    this.handleBallDestruction();
    this.updateGameObjects(deltaTime);
  }

  private handleBallDestruction(): void {
    if (!this.ball.isDestroyed()) return;

    if (this.ball.isHitLeftBorder()) {
      this.player2.givePoint();
    } else {
      this.player1.givePoint();
    }

    // Only reset positions after a point is scored
    this.ball.restart();
    this.player1.resetPosition();
    this.player2.resetPosition();
    
    this.pauseManager.handlePointScored();
    this.pauseManager.startGame();
  }

  private updateGameObjects(deltaTime: number): void {
    const currentState = this.pauseManager.hasState(GameState.PLAYING) 
      ? GameState.PLAYING 
      : GameState.PAUSED;
      
    this.objectsInScene.forEach(object => 
      object.update(this.context, deltaTime, currentState)
    );
  }

  private checkWinCondition(): void {
    if (this.player1.getScore() >= this.winningScore) {
      this.gameContext.loadScene(new EndScene(this.context), { winner: this.player1 });
    } else if (this.player2.getScore() >= this.winningScore) {
      this.gameContext.loadScene(new EndScene(this.context), { winner: this.player2 });
    }
  }

  // =========================================
  // Private Drawing Methods
  // =========================================
  private drawGameElements(): void {
    this.objectsInScene.forEach(object => object.draw(this.context));
    this.drawScores();
  }

  private drawScores(): void {
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);

    this.context.font = `${sizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`;
    this.context.fillStyle = COLORS.SCORE;
    this.context.fillText(this.player1.getScore().toString(), width / 4, height / 2);
    this.context.fillText(this.player2.getScore().toString(), 3 * (width / 4), height / 2);
  }

  private drawUI(): void {
    if (this.pauseManager.hasState(GameState.PAUSED)) {
      this.drawPauseOverlay();
    }

    if (this.shouldDrawCountdown()) {
      this.drawCountdown();
    }
  }

  private shouldDrawCountdown(): boolean {
    return this.countdownText !== null && (
      this.pauseManager.hasState(GameState.COUNTDOWN) || 
      this.pauseManager.hasState(GameState.PAUSED)
    );
  }

  private drawPauseOverlay(): void {
    const { width, height } = this.context.canvas;
    
    // Draw semi-transparent overlay
    this.context.fillStyle = COLORS.OVERLAY;
    this.context.fillRect(0, 0, width, height);
  }

  private drawCountdown(): void {
    if (this.countdownText === null) return;
    
    const { width, height } = this.context.canvas;
    const sizes = calculateFontSizes(width, height);
    
    this.context.fillStyle = UI_CONFIG.TEXT.COLOR;
    this.context.textAlign = UI_CONFIG.TEXT.ALIGN;
    
    if (Array.isArray(this.countdownText)) {
      // Draw pause messages
      this.context.font = `${sizes.PAUSE_SIZE} ${FONTS.FAMILIES.PAUSE}`;
      const pausePos = this.getTextPosition(0, 2);
      this.context.fillText(this.countdownText[0], pausePos.x, pausePos.y);
      
      this.context.font = `${sizes.RESUME_PROMPT_SIZE} ${FONTS.FAMILIES.PAUSE}`;
      const promptPos = this.getTextPosition(1, 2);
      this.context.fillText(this.countdownText[1], promptPos.x, promptPos.y);
    } else {
      // Draw countdown number
      const isNumber = typeof this.countdownText === 'number';
      this.context.font = `${sizes.COUNTDOWN_SIZE} ${FONTS.FAMILIES.COUNTDOWN}`;
      
      if (isNumber) {
        const pos = this.getTextPosition(0, 1);
        const textToDisplay = this.countdownText.toString();
        this.context.strokeStyle = UI_CONFIG.TEXT.STROKE.COLOR;
        this.context.lineWidth = UI_CONFIG.TEXT.STROKE.WIDTH;
        this.context.strokeText(textToDisplay, pos.x, pos.y);
        this.context.fillText(textToDisplay, pos.x, pos.y);
      }
    }
  }
}
