import { Ball, Player } from '@pong/game/objects';
import { PauseManager } from '@pong/game/engine';
import { GameContext, GameState } from '@pong/types';
import { calculateGameSizes } from '@pong/constants';
import { Scene } from '@pong/game/scenes';

export class ResizeManager {
  // =========================================
  // Private Properties
  // =========================================
  private resizeTimeout: number | null = null;
  private isResizing: boolean = false;
  private context: GameContext;
  private scene: Scene;
  private ball: Ball | null;
  private player1: Player | null;
  private player2: Player | null;
  private pauseManager: PauseManager | null;
  private boundResizeHandler: () => void;

  // =========================================
  // Constructor
  // =========================================
  constructor(
    ctx: GameContext,
    scene: Scene,
    ball: Ball | null,
    player1: Player | null,
    player2: Player | null,
    pauseManager: PauseManager | null
  ) {
    this.context = ctx;
    this.scene = scene;
    this.ball = ball;
    this.player1 = player1;
    this.player2 = player2;
    this.pauseManager = pauseManager;
    
    // Create bound handler to properly remove listener later
    this.boundResizeHandler = this.handleResize.bind(this);
    this.setupResizeHandler();
  }

  // =========================================
  // Public Methods
  // =========================================
  public isCurrentlyResizing(): boolean {
    return this.isResizing;
  }

  public cleanup(): void {
    // Clear timeout if exists
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    // Remove event listener
    window.removeEventListener('resize', this.boundResizeHandler);
    
    // Clear references
    this.context = null as any;
    this.scene = null as any;
    this.ball = null as any;
    this.player1 = null as any;
    this.player2 = null as any;
    this.pauseManager = null as any;
    this.boundResizeHandler = null as any;
  }

  // =========================================
  // Private Methods
  // =========================================
  private setupResizeHandler(): void {
    window.addEventListener('resize', this.boundResizeHandler);
  }

  private handleResize(): void {
    // Cancel any pending resize timeout
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout);
    }

    // Set resizing state
    this.isResizing = true;

    // Only check pauseManager if it exists
    const wasPlaying = this.pauseManager?.hasState(GameState.PLAYING) ?? false;
    if (wasPlaying && this.pauseManager) {
      this.pauseManager.pause();
    }

    // Request animation frame for smooth resize
    requestAnimationFrame(() => {
      if (this.isGameScene()) {
        this.handleGameSceneResize();
      } else {
        this.handleMenuSceneResize();
      }

      // Debounce the resize end
      this.resizeTimeout = window.setTimeout(() => {
        this.isResizing = false;
        if (wasPlaying && this.pauseManager) {
          this.pauseManager.resume();
        }
      }, 150);
    });
  }

  private handleGameSceneResize(): void {
    // First check if we're in a countdown or transitional state
    const pauseManager = this.pauseManager;
    if (!pauseManager) return;

    const wasPlaying = pauseManager.hasState(GameState.PLAYING);
    const wasInCountdown = pauseManager.hasState(GameState.COUNTDOWN);
    
    if (wasPlaying) {
      // During gameplay: pause -> resize -> resume
      pauseManager.pause();
      this.updateGameObjects();
      
      // Resume after a short delay to allow resize to complete
      this.resizeTimeout = window.setTimeout(() => {
        this.isResizing = false;
        pauseManager.resume();
      }, 150);
    } else if (wasInCountdown) {
      // During countdown: maintain countdown state and ball position
      this.updateGameObjects();
      pauseManager.maintainCountdownState();
    } else {
      // Default case (paused)
      this.updateGameObjects();
    }
  }

  private handleMenuSceneResize(): void {
    this.updateCanvasSize();
    this.scene.draw();
  }

  private updateGameObjects(): void {
    // First pause the game if it's playing
    const wasPlaying = this.pauseManager?.hasState(GameState.PLAYING) ?? false;
    if (wasPlaying && this.pauseManager) {
      this.pauseManager.pause();  // This saves the current game state
    }

    // Update canvas and calculate new sizes
    this.updateCanvasSize();
    const { width: newWidth, height: newHeight } = this.context.canvas;
    const sizes = calculateGameSizes(newWidth, newHeight);

    // Update game objects with new sizes
    this.updatePaddles(sizes, newWidth, newHeight);
    this.updateBall(newWidth, newHeight);

    // Resume if it was playing before - this will restore velocity
    if (wasPlaying && this.pauseManager) {
      this.pauseManager.resume();
    }
  }

  private updatePaddles(
    sizes: any,
    newWidth: number,
    newHeight: number
  ): void {
    if (!this.player1 || !this.player2 || !this.pauseManager) return;

    // Get the saved positions from PauseManager if available
    const gameSnapshot = this.pauseManager.getGameSnapshot();
    
    if (gameSnapshot) {
      // Use saved relative positions from pause
      this.player1.y = (gameSnapshot.player1RelativeY * newHeight) - (this.player1.paddleHeight / 2);
      this.player2.y = (gameSnapshot.player2RelativeY * newHeight) - (this.player2.paddleHeight / 2);
    } else {
      // Calculate new relative positions if no snapshot
      const currentHeight = this.context.canvas.height;
      const p1Center = (this.player1.y + this.player1.paddleHeight / 2) / currentHeight;
      const p2Center = (this.player2.y + this.player2.paddleHeight / 2) / currentHeight;
      
      this.player1.y = (p1Center * newHeight) - (this.player1.paddleHeight / 2);
      this.player2.y = (p2Center * newHeight) - (this.player2.paddleHeight / 2);
    }

    // Update sizes and horizontal positions
    this.player1.updateSizes();
    this.player2.updateSizes();
    
    this.player1.x = sizes.PLAYER_PADDING;
    this.player2.x = newWidth - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
    
    // Ensure bounds
    const maxY = newHeight - this.player1.paddleHeight;
    this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
    this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);

    // Update the pause manager's snapshot with new positions
    if (gameSnapshot) {
      gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight / 2) / newHeight;
      gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight / 2) / newHeight;
    }
  }

  private updateBall(newWidth: number, newHeight: number): void {
    if (!this.ball || !this.pauseManager) return;

    // Get saved state from PauseManager if available
    const gameSnapshot = this.pauseManager.getGameSnapshot();
    
    if (gameSnapshot) {
      // Update ball sizes first
      this.ball.updateSizes();
      // Use saved state to maintain position
      this.ball.restoreState(gameSnapshot.ballState, newWidth, newHeight);
    } else {
      // If no snapshot, save current relative position before updating
      const state = this.ball.saveState();
      this.ball.updateSizes();
      this.ball.restoreState(state, newWidth, newHeight);
    }
  }

  private updateCanvasSize(): void {
    const targetWidth = window.innerWidth;
    const targetHeight = window.innerHeight;
    
    // Only update if dimensions actually changed
    if (this.context.canvas.width !== targetWidth || 
        this.context.canvas.height !== targetHeight) {
        
        // Store the current context properties
        const contextProps = {
            fillStyle: this.context.fillStyle,
            strokeStyle: this.context.strokeStyle,
            lineWidth: this.context.lineWidth,
            font: this.context.font,
            textAlign: this.context.textAlign,
            textBaseline: this.context.textBaseline,
            globalAlpha: this.context.globalAlpha,
        };

        // Update canvas size
        this.context.canvas.width = targetWidth;
        this.context.canvas.height = targetHeight;

        // Restore context properties
        Object.assign(this.context, contextProps);

        // Force immediate redraw to prevent flash
        this.scene.draw();
    }
  }

  private isGameScene(): boolean {
    return !!(this.ball && this.player1 && this.player2 && this.pauseManager);
  }
}
