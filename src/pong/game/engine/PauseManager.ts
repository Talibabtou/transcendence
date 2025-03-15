import { Ball, Player } from '@pong/game/objects';
import { GameState, GameSnapshot } from '@pong/types';

/**
 * Callback type for countdown events
 */
type CountdownCallback = (text: string | number | string[] | null) => void;

/**
 * Manages game pause, countdown, and resume functionality,
 * coordinating the state transitions between different game states.
 */
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
	private gameMode: 'single' | 'multi' | 'tournament' | 'background_demo' = 'single';
	private pendingPauseRequest: boolean = false;

	// =========================================
	// Constructor
	// =========================================
	/**
	 * Creates a new PauseManager
	 * @param ball The ball object
	 * @param player1 The left player
	 * @param player2 The right player
	 */
	constructor(ball: Ball, player1: Player, player2: Player) {
		this.ball = ball;
		this.player1 = player1;
		this.player2 = player2;
		this.states.clear();
		this.states.add(GameState.PAUSED);
		this.isFirstStart = true;
	}

	// =========================================
	// Public API (Facade)
	// =========================================
	
	/**
	 * Sets the callback function for countdown events
	 * @param callback The function to call during countdown events
	 */
	public setCountdownCallback(callback: CountdownCallback): void {
		this.countdownCallback = callback;
	}

	/**
	 * Starts a new game with countdown
	 */
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

	/**
	 * Pauses the current game state
	 */
	public pause(): void {
		if (this.states.has(GameState.PAUSED)) {
			return;
		}

		// If we're in countdown, set a flag to pause when countdown ends
		if (this.states.has(GameState.COUNTDOWN)) {
			this.pendingPauseRequest = true;
			return;
		}

		// Save the current game state
		this.saveGameState();
		
		// Remove PLAYING state and add PAUSED state
		this.states.delete(GameState.PLAYING);
		this.states.add(GameState.PAUSED);
	}

	/**
	 * Resumes the game from a paused state
	 */
	public resume(): void {
		if (!this.states.has(GameState.PAUSED)) return;
		
		// Remove pause state
		this.states.delete(GameState.PAUSED);
		
		// Handle different resume scenarios
		if (this.isFirstStart) {
			this.startGame();
		} else if (this.states.has(GameState.COUNTDOWN)) {
			// Just continue with countdown
		} else {
			// Resume from regular pause with countdown
			this.states.add(GameState.COUNTDOWN);
			this.startCountdown(() => {
				this.restoreGameState();
				this.states.delete(GameState.COUNTDOWN);
				this.states.add(GameState.PLAYING);
			});
		}
	}

	/**
	 * Updates game objects during pause/countdown
	 */
	public update(): void {
		if (this.isCountingDown || this.states.has(GameState.PAUSED)) {
			// Stop paddle movement during pause/countdown
			this.player1.stopMovement();
			this.player2.stopMovement();
			// Maintain positions from snapshot if available
			this.maintainPositionsFromSnapshot();
		}
	}

	/**
	 * Forces the game to stop
	 */
	public forceStop(): void {
		this.cleanupCountdown();
		this.resetToPostPoint();
	}

	/**
	 * Handles state transitions after a point is scored
	 */
	public handlePointScored(): void {
		// In background demo, skip countdown and just restart
		if (this.isBackground()) {
			
			this.ball.launchBall();
			return;
		}
		// Normal flow for regular gameplay
		// Reset states
		this.states.clear();
		this.states.add(GameState.PAUSED);
		this.gameSnapshot = null;
		// Clear any existing countdown
		this.cleanupCountdown();
		// Normal game mode with countdown
		this.states.clear();
		this.states.add(GameState.COUNTDOWN);
		// Start countdown after a brief delay
		setTimeout(() => {
			this.startCountdown(() => {
				this.ball.launchBall();
				this.states.delete(GameState.COUNTDOWN);
				this.states.add(GameState.PLAYING);
			});
		}, 500);
	}

	/**
	 * Checks if a specific state is active
	 */
	public hasState(state: GameState): boolean {
		return this.states.has(state);
	}

	/**
	 * Get a copy of all current states
	 */
	public getStates(): Set<GameState> {
		return new Set(this.states);
	}

	/**
	 * Get the current game snapshot
	 */
	public getGameSnapshot(): GameSnapshot | null {
		return this.gameSnapshot;
	}

	/**
	 * Maintain positions during resize
	 */
	public maintainCountdownState(): void {
		// If we're in countdown, make sure we maintain it
		if (this.states.has(GameState.COUNTDOWN) && !this.isCountingDown) {
			this.countdownCallback?.(null);
		}
	}

	/**
	 * Set game mode
	 */
	public setGameMode(mode: 'single' | 'multi' | 'tournament' | 'background_demo'): void {
		this.gameMode = mode;
	}

	/**
	 * Clean up resources
	 */
	public cleanup(): void {
		this.cleanupCountdown();
		this.gameSnapshot = null;
		this.countdownCallback = null;
		this.states.clear();
	}

	/**
	 * Set pending pause request
	 */
	public setPendingPauseRequest(value: boolean): void {
		this.pendingPauseRequest = value;
	}

	// =========================================
	// Private Helper Methods
	// =========================================
	
	/**
	 * Maintain positions from snapshot during pause
	 */
	private maintainPositionsFromSnapshot(): void {
		if (!this.gameSnapshot) return;
		
		const { width, height } = this.ball.getContext().canvas;
		
		// Keep ball's position proportional during pause
		this.ball.x = width * this.gameSnapshot.ballState.position.x;
		this.ball.y = height * this.gameSnapshot.ballState.position.y;
		
		// Keep paddles' positions proportional during pause
		this.player1.y = (this.gameSnapshot.player1RelativeY * height) - (this.player1.paddleHeight * 0.5);
		this.player2.y = (this.gameSnapshot.player2RelativeY * height) - (this.player2.paddleHeight * 0.5);
	}

	/**
	 * Save the current game state
	 */
	private saveGameState(): void {
		const canvas = this.ball.getContext().canvas;
		// Save paddle center positions relative to canvas height
		const p1Center = (this.player1.y + this.player1.paddleHeight * 0.5) / canvas.height;
		const p2Center = (this.player2.y + this.player2.paddleHeight * 0.5) / canvas.height;
		
		this.gameSnapshot = {
			ballState: this.ball.saveState(),
			player1RelativeY: p1Center,
			player2RelativeY: p2Center
		};
	}

	/**
	 * Restore the game state from snapshot
	 */
	private restoreGameState(): void {
		if (!this.gameSnapshot) return;
		this.ball.restoreState(this.gameSnapshot.ballState);
	}

	/**
	 * Start the countdown sequence
	 */
	private startCountdown(onComplete: () => void): void {
		// Cancel any existing countdown
		this.cleanupCountdown();
		
		let count = 3; // Default countdown
		const intervalTime = 1000; // Default interval (1 second)
		
		// Use shorter countdown for background demo
		if (this.isBackground()) {
			count = 1;  // Just do a quick 1-count
			// We could even make it shorter with:
			// count = 0; // Skip countdown entirely
		}
		
		this.isCountingDown = true;
		
		// If we want to skip countdown entirely for background demo
		if (this.isBackground() && count === 0) {
			this.cleanupCountdown();
			this.isCountingDown = false;
			onComplete();
			return;
		}
		
		// Send initial count
		if (this.countdownCallback) {
			this.countdownCallback(count);
		}
		
		// Modify the completion callback
		const originalOnComplete = onComplete;
		onComplete = () => {
			originalOnComplete();
			
			// If we had a pending pause request, pause immediately after countdown
			if (this.pendingPauseRequest) {
				this.pendingPauseRequest = false;
				this.pause();
			}
		};
		
		// Set up countdown interval
		this.countInterval = setInterval(() => {
			count--;
			
			// Update countdown display
			if (this.countdownCallback) {
				this.countdownCallback(count > 0 ? count : null);
			}
			
			// When countdown reaches zero
			if (count <= 0) {
				this.cleanupCountdown();
				this.isCountingDown = false;
				
				// Check for pending pause request before completing countdown
				if (this.pendingPauseRequest) {
					this.pendingPauseRequest = false;
					setTimeout(() => this.pause(), 0);
					// Call onComplete after the pause has been processed
					setTimeout(onComplete, 50);
				} else {
					onComplete();
				}
			}
		}, intervalTime);
	}

	/**
	 * Clean up countdown resources
	 */
	private cleanupCountdown(): void {
		if (this.countInterval) {
			clearInterval(this.countInterval);
			this.countInterval = null;
		}
		this.isCountingDown = false;
		this.countdownCallback?.(null);
	}

	/**
	 * Reset to post-point state
	 */
	private resetToPostPoint(): void {
		this.states.clear();
		this.states.add(GameState.PAUSED);
		this.gameSnapshot = null;
		this.cleanupCountdown();
	}

	/**
	 * Check if the current game mode is background demo
	 */
	private isBackground(): boolean {
		return this.gameMode === 'background_demo';
	}
}
