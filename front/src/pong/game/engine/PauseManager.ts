import { Ball, Player } from '@pong/game/objects';
import { GameState, GameSnapshot } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import { PlayerType } from '@pong/types';

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
	private readonly states: Set<GameState> = new Set<GameState>();
	
	private isCountingDown: boolean = false;
	private isFirstStart: boolean = true;
	private countInterval: NodeJS.Timeout | null = null;
	private gameSnapshot: GameSnapshot | null = null;
	private countdownCallback: CountdownCallback | null = null;
	private pendingPauseRequest: boolean = false;
	private gameEngine: any;
	private pointStartedCallback: (() => void) | null = null;
	private gameScene: GameScene;

	// =========================================
	// Constructor
	// =========================================
	/**
	 * Creates a new PauseManager
	 * @param ball The ball object
	 * @param player1 The left player
	 * @param player2 The right player
	 * @param gameScene The GameScene instance
	 */
	constructor(ball: Ball, player1: Player, player2: Player, gameScene: GameScene) {
		this.ball = ball;
		this.player1 = player1;
		this.player2 = player2;
		this.gameScene = gameScene;
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
	 * Sets the callback function for when a point starts
	 * @param callback The function to call when a point starts
	 */
	public setPointStartedCallback(callback: () => void): void {
		this.pointStartedCallback = callback;
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
			
			// Signal that a point has started and reset goal timer
			if (this.pointStartedCallback) {
				this.pointStartedCallback();
			}
			
			// Resume match timer if game engine is available
			if (this.gameEngine && typeof this.gameEngine.resumeMatchTimer === 'function') {
				this.gameEngine.resumeMatchTimer();
			}
			
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
		
		// Notify game engine about pause
		if (this.gameEngine && typeof this.gameEngine.pauseMatchTimer === 'function') {
			this.gameEngine.pauseMatchTimer();
		}
	}

	/**
	 * Resumes the game from a paused state
	 */
	public resume(): void {
		if (!this.states.has(GameState.PAUSED)) return;
		
		// Remove pause state
		this.states.delete(GameState.PAUSED);
		this.pendingPauseRequest = false;
		
		// Notify game engine about resume
		if (this.gameEngine && typeof this.gameEngine.resumeMatchTimer === 'function') {
			this.gameEngine.resumeMatchTimer();
		}
		
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
				this.pendingPauseRequest = false;
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
		// Check game mode - prefer GameScene if available
		const isBackground = this.gameScene?.isBackgroundDemo();
		
		if (isBackground) {
			// Use the same countdown logic as the startCountdown method
			this.startCountdown(() => {
				this.ball.launchBall();
			});
			return;
		}
		
		// Normal flow for regular gameplay
		// Reset states
		this.states.clear();
		this.states.add(GameState.PAUSED);
		this.gameSnapshot = null;
		
		// Clear any existing countdown
		this.cleanupCountdown();
		
		// Pause match timer when point is scored
		if (this.gameEngine && typeof this.gameEngine.pauseMatchTimer === 'function') {
			this.gameEngine.pauseMatchTimer();
		}
		
		// Normal game mode with countdown
		this.states.clear();
		this.states.add(GameState.COUNTDOWN);
		
		// Start countdown after a brief delay
		setTimeout(() => {
			this.startCountdown(() => {
				this.ball.launchBall();
				this.states.delete(GameState.COUNTDOWN);
				this.states.add(GameState.PLAYING);
				
				// Signal that a point has started and reset goal timer
				if (this.pointStartedCallback) {
					this.pointStartedCallback();
				}
				
				// Resume match timer after countdown
				if (this.gameEngine && typeof this.gameEngine.resumeMatchTimer === 'function') {
					this.gameEngine.resumeMatchTimer();
				}
			});
		}, 100);
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

	/**
	 * Sets the game engine reference
	 */
	public setGameEngine(engine: any): void {
		this.gameEngine = engine;
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
		
		// Check if we're in background mode
		const isBackground = this.gameScene?.isBackgroundDemo();
		
		// For background mode, use a simple timeout of 0.5 seconds
		if (isBackground) {
			this.isCountingDown = true;
			// No UI update needed for background
			
			// Just set a direct timeout instead of countdown
			this.countInterval = setTimeout(() => {
				this.cleanupCountdown();
				this.isCountingDown = false;
				setTimeout(onComplete, 50);
			}, 500); // 0.5 seconds for background
			return;
		}
		
		// Regular gameplay with normal countdown
		let count = 3;
		const intervalTime = 1000;
		
		this.isCountingDown = true;
		
		// Send initial count to UI
		if (this.countdownCallback) {
			this.countdownCallback(count);
		}
		
		// Set up countdown interval for regular gameplay
		this.countInterval = setInterval(() => {
			count--;
			
			// Update UI with current count
			if (this.countdownCallback) {
				this.countdownCallback(count > 0 ? count : null);
			}
			
			// When countdown reaches zero
			if (count <= 0) {
				this.cleanupCountdown();
				this.isCountingDown = false;
				
				// Process completion with slight delay
				setTimeout(() => {
					// If game engine is available, start the match timer
					if (this.gameEngine && typeof this.gameEngine.startMatchTimer === 'function') {
						// Only start match timer if this is not a resume from pause
						if (this.isFirstStart || !this.gameSnapshot) {
							this.gameEngine.startMatchTimer();
						}
					}
					
					// Call the completion function
					onComplete();

					// >> ADDED: Trigger initial prediction for AI player after launch <<
					// Check if player2 is the AI and trigger its prediction
					if (
						this.player2.getPlayerType() === PlayerType.AI
					) {
						// Call the new public method
						this.player2.calculateInitialPrediction();
					}
					// >> END ADDED CODE <<

					// Handle pending pause requests
					if (this.pendingPauseRequest) {
						this.pendingPauseRequest = false;
						this.pause(); // Pause immediately after countdown if requested
					}
				}, 50);
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
}
