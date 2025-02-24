import { Ball, Player } from '@pong/game/objects';
import type { BallState } from '@pong/game/objects';
import { MESSAGES } from '@pong/constants';
import { GameState } from '@pong/types';

// =========================================
// Types
// =========================================
interface GameSnapshot {
  ballState: BallState;
  player1RelativeY: number;
  player2RelativeY: number;
}

type CountdownCallback = (text: string | number | string[] | null) => void;

export class PauseManager {
  // =========================================
  // Private Properties
  // =========================================
  private ball: Ball;
  private player1: Player;
  private player2: Player;
  private readonly states: Set<GameState> = new Set([GameState.PAUSED]);
  
  private isCountingDown: boolean = false;
  private isFirstStart: boolean = true;
  private countInterval: NodeJS.Timeout | null = null;
  private gameSnapshot: GameSnapshot | null = null;
  private countdownCallback: CountdownCallback | null = null;

  // =========================================
  // Constructor
  // =========================================
  constructor(ball: Ball, player1: Player, player2: Player) {
    this.ball = ball;
    this.player1 = player1;
    this.player2 = player2;
    this.states.clear();
    this.states.add(GameState.PAUSED);
    this.isFirstStart = true;
  }

  // =========================================
  // Public API
  // =========================================
  public setCountdownCallback(callback: CountdownCallback): void {
    this.countdownCallback = callback;
  }

  public startGame(): void {
    this.states.clear();
    this.states.add(GameState.COUNTDOWN);
    
    this.startCountdown(() => {
      this.ball.launchBall();
      this.states.delete(GameState.COUNTDOWN);
      this.states.add(GameState.PLAYING);
      this.isFirstStart = false;
      
      this.countdownCallback?.(null);
    });
  }

  public pause(): void {
    if (this.states.has(GameState.PAUSED)) {
      return;
    }

    if (this.states.has(GameState.COUNTDOWN)) {
      this.handleCountdownPause();
      return;
    }

    if (this.states.has(GameState.PLAYING)) {
      this.handleGamePause();
    }
  }

  public resume(): void {
    if (!this.states.has(GameState.PAUSED)) return;
    
    if (this.states.has(GameState.COUNTDOWN)) {
      this.states.delete(GameState.PAUSED);
      return;
    }
    
    if (this.isFirstStart) {
      this.startGame();
      return;
    }
    
    // Keep the snapshot when transitioning to countdown
    this.states.delete(GameState.PAUSED);
    this.states.add(GameState.COUNTDOWN);
    
    this.startCountdown(() => {
      this.restoreGameState();
      this.states.delete(GameState.COUNTDOWN);
      this.states.add(GameState.PLAYING);
    });
  }

  public update(): void {
    if (this.isCountingDown || this.states.has(GameState.PAUSED)) {
      this.player1.stopMovement();
      this.player2.stopMovement();
      
      if (this.gameSnapshot) {
        const { width, height } = this.ball.getContext().canvas;
        
        // Keep ball's position proportional during pause
        this.ball.x = width * this.gameSnapshot.ballState.position.x;
        this.ball.y = height * this.gameSnapshot.ballState.position.y;
        
        // Keep paddles' positions proportional during pause
        this.player1.y = (this.gameSnapshot.player1RelativeY * height) - (this.player1.paddleHeight / 2);
        this.player2.y = (this.gameSnapshot.player2RelativeY * height) - (this.player2.paddleHeight / 2);
      }
    }
  }

  public forceStop(): void {
    this.cleanupCountdown();
    this.resetToPostPoint();
  }

  public handlePointScored(): void {
    this.states.clear();
    this.states.add(GameState.PAUSED);
    this.gameSnapshot = null;
  }

  // =========================================
  // State Management
  // =========================================
  public hasState(state: GameState): boolean {
    return this.states.has(state);
  }

  public getStates(): Set<GameState> {
    return new Set(this.states);
  }

  public canCombineStates(state1: GameState, state2: GameState): boolean {
    if (this.areStatesExclusive(state1, state2)) return false;
    if (this.isPostPointState(state1, state2)) {
      return state1 === GameState.PAUSED || state2 === GameState.PAUSED;
    }
    return true;
  }

  public isStateActive(state: GameState): boolean {
    return this.states.has(state);
  }

  // =========================================
  // Game State Management
  // =========================================
  public updateSavedState(): void {
    if (!this.gameSnapshot) return;
    
    this.gameSnapshot.ballState = this.ball.saveState();
  }

  public updateSavedPositions(): void {
    if (!this.gameSnapshot) return;

    const canvas = this.ball.getContext().canvas;
    const relativeX = this.ball.x / canvas.width;
    const relativeY = this.ball.y / canvas.height;
    
    this.gameSnapshot.ballState.position = {
      x: relativeX,
      y: relativeY
    };

    // Keep direction normalized, speed is handled separately
    const { dx, dy } = this.getNormalizedVelocity();
    this.gameSnapshot.ballState.velocity = {
      dx: dx,
      dy: dy
    };
  }

  // =========================================
  // Private Helper Methods
  // =========================================
  private saveGameState(): void {
    const canvas = this.ball.getContext().canvas;
    // Save paddle center positions relative to canvas height
    const p1Center = (this.player1.y + this.player1.paddleHeight / 2) / canvas.height;
    const p2Center = (this.player2.y + this.player2.paddleHeight / 2) / canvas.height;
    
    this.gameSnapshot = {
      ballState: this.ball.saveState(),
      player1RelativeY: p1Center,
      player2RelativeY: p2Center
    };
  }

  private restoreGameState(): void {
    if (!this.gameSnapshot) return;
    this.ball.restoreState(this.gameSnapshot.ballState);
  }

  private startCountdown(onComplete: () => void): void {
    if (this.isCountingDown) return;
    
    this.isCountingDown = true;
    let count = 3;
    
    this.countdownCallback?.(count);
    
    this.countInterval = setInterval(() => {
      count--;
      
      if (count > 0) {
        this.countdownCallback?.(count);
      } else {
        this.countdownCallback?.(null);
        this.cleanupCountdown();
        onComplete();
      }
    }, 1000);
  }

  private cleanupCountdown(): void {
    if (this.countInterval) {
      clearInterval(this.countInterval);
      this.countInterval = null;
    }
    this.isCountingDown = false;
  }

  private resetToPostPoint(): void {
    this.gameSnapshot = null;
    this.states.clear();
    this.states.add(GameState.PAUSED);
    this.countdownCallback?.(null);
  }

  private handleCountdownPause(): void {
    this.cancelCountdown();
    this.states.add(GameState.PAUSED);
  }

  private handleGamePause(): void {
    // Save current state before zeroing velocity
    this.saveGameState();
    
    // Store velocity but zero it for pause
    this.ball.dx = 0;
    this.ball.dy = 0;
    
    this.states.delete(GameState.PLAYING);
    this.states.add(GameState.PAUSED);
    
    this.countdownCallback?.([MESSAGES.PAUSED, MESSAGES.RESUME_PROMPT]);
  }

  private cancelCountdown(): void {
    this.cleanupCountdown();
    this.states.delete(GameState.COUNTDOWN);
    
    if (this.isFirstStart) {
      this.states.add(GameState.PAUSED);
    }
  }

  private areStatesExclusive(state1: GameState, state2: GameState): boolean {
    return (state1 === GameState.PLAYING && state2 === GameState.COUNTDOWN) ||
           (state1 === GameState.COUNTDOWN && state2 === GameState.PLAYING);
  }

  private isPostPointState(state1: GameState, state2: GameState): boolean {
    return state1 === GameState.PAUSED || state2 === GameState.PAUSED;
  }

  private getNormalizedVelocity(): { dx: number; dy: number } {
    const magnitude = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
    if (magnitude === 0) {
      return { dx: 0, dy: 0 };
    }
    return {
      dx: this.ball.dx / magnitude,
      dy: this.ball.dy / magnitude
    };
  }

  public getGameSnapshot(): GameSnapshot | null {
    return this.gameSnapshot;
  }

  public maintainCountdownState(): void {
    if (this.states.has(GameState.COUNTDOWN)) {
      const canvas = this.ball.getContext().canvas;
      
      // Center everything for first launch or post-point (no snapshot)
      if (this.isFirstStart || !this.gameSnapshot) {
        // Center ball
        this.ball.x = canvas.width / 2;
        this.ball.y = canvas.height / 2;
        this.ball.dx = 0;
        this.ball.dy = 0;
        
        // Center paddles
        this.player1.y = (canvas.height / 2) - (this.player1.paddleHeight / 2);
        this.player2.y = (canvas.height / 2) - (this.player2.paddleHeight / 2);
      } else {
        // For countdown after pause, maintain saved positions
        this.ball.restoreState(this.gameSnapshot.ballState);
      }
    }
  }

  public cleanup(): void {
    // Clear countdown interval
    this.cleanupCountdown();
    
    // Clear references
    this.ball = null as any;
    this.player1 = null as any;
    this.player2 = null as any;
    this.countdownCallback = null;
    this.gameSnapshot = null;
    
    // Clear states
    this.states.clear();
  }
}
