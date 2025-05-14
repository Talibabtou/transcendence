import { Ball, Player } from '@pong/game/objects';
import { GameState, GameSnapshot, CountdownCallback } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import { PlayerType } from '@pong/types';

/**
 * Manages game pause, countdown, and resume functionality,
 * coordinating the state transitions between different game states.
 */
export class PauseManager {
	
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

	/**
	 * Creates a new PauseManager.
	 * @param ball The ball object.
	 * @param player1 The left player.
	 * @param player2 The right player.
	 * @param gameScene The GameScene instance.
	 */
	constructor(ball: Ball, player1: Player, player2: Player, gameScene: GameScene) {
		this.ball = ball;
		this.player1 = player1;
		this.player2 = player2;
		this.gameScene = gameScene;
		this.states.add(GameState.PAUSED);
		this.isFirstStart = true;
	}



	/**
	 * Starts a new game with countdown.
	 */
	public startGame(): void {
		this.states.clear();
		this.states.add(GameState.COUNTDOWN);
		this.startCountdown(() => {
			this.ball.launchBall();
			this.states.delete(GameState.COUNTDOWN);
			this.states.add(GameState.PLAYING);
			this.isFirstStart = false;
			if (this.pointStartedCallback) {
				this.pointStartedCallback();
			}
			if (this.gameEngine && typeof this.gameEngine.resumeMatchTimer === 'function') {
				this.gameEngine.resumeMatchTimer();
			}
			this.countdownCallback?.(null);
		});
	}

	/**
	 * Pauses the current game state.
	 */
	public pause(): void {
		if (this.states.has(GameState.PAUSED)) {
			return;
		}
		if (this.states.has(GameState.COUNTDOWN)) {
			this.pendingPauseRequest = true;
			return;
		}
		this.saveGameState();
		this.states.delete(GameState.PLAYING);
		this.states.add(GameState.PAUSED);
		if (this.gameEngine && typeof this.gameEngine.pauseMatchTimer === 'function') {
			this.gameEngine.pauseMatchTimer();
		}
	}

	/**
	 * Resumes the game from a paused state.
	 */
	public resume(): void {
		if (!this.states.has(GameState.PAUSED)) return;
		this.states.delete(GameState.PAUSED);
		this.pendingPauseRequest = false;
		if (this.gameEngine && typeof this.gameEngine.resumeMatchTimer === 'function') {
			this.gameEngine.resumeMatchTimer();
		}
		if (this.isFirstStart) {
			this.startGame();
		} else if (this.states.has(GameState.COUNTDOWN)) {
		} else {
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
	 * Updates game objects during pause/countdown.
	 */
	public update(): void {
		if (this.isCountingDown || this.states.has(GameState.PAUSED)) {
			this.player1.stopMovement();
			this.player2.stopMovement();
			this.maintainPositionsFromSnapshot();
		}
	}

	/**
	 * Forces the game to stop.
	 */
	public forceStop(): void {
		this.cleanupCountdown();
		this.resetToPostPoint();
	}

	/**
	 * Handles state transitions after a point is scored.
	 */
	public handlePointScored(): void {
		const isBackground = this.gameScene?.isBackgroundDemo();
		if (isBackground) {
			this.startCountdown(() => {
				this.ball.launchBall();
			});
			return;
		}
		this.states.clear();
		this.states.add(GameState.PAUSED);
		this.gameSnapshot = null;
		this.cleanupCountdown();
		if (this.gameEngine && typeof this.gameEngine.pauseMatchTimer === 'function') {
			this.gameEngine.pauseMatchTimer();
		}
		this.states.clear();
		this.states.add(GameState.COUNTDOWN);
		setTimeout(() => {
			this.startCountdown(() => {
				this.ball.launchBall();
				this.states.delete(GameState.COUNTDOWN);
				this.states.add(GameState.PLAYING);
				if (this.pointStartedCallback) {
					this.pointStartedCallback();
				}
				if (this.gameEngine && typeof this.gameEngine.resumeMatchTimer === 'function') {
					this.gameEngine.resumeMatchTimer();
				}
			});
		}, 100);
	}

	/**
	 * Checks if a specific state is active.
	 * @param state The game state to check.
	 * @returns True if the state is active, false otherwise.
	 */
	public hasState(state: GameState): boolean {
		return this.states.has(state);
	}

	/**
	 * Maintains the countdown state.
	 */
	public maintainCountdownState(): void {
		if (!this.isCountingDown) {
			this.countdownCallback?.(null);
		}
	}

	/**
	 * Cleans up resources used by the PauseManager.
	 */
	public cleanup(): void {
		this.cleanupCountdown();
		this.states.clear();
		this.gameSnapshot = null;
		this.countdownCallback = null;
	}

	/**
	 * Maintains player and ball positions from the snapshot if available.
	 */
	private maintainPositionsFromSnapshot(): void {
		if (!this.gameSnapshot) return;
		
		const { width, height } = this.ball.getContext().canvas;
		this.ball.x = width * this.gameSnapshot.ballState.position.x;
		this.ball.y = height * this.gameSnapshot.ballState.position.y;
		this.player1.y = (this.gameSnapshot.player1RelativeY * height) - (this.player1.paddleHeight * 0.5);
		this.player2.y = (this.gameSnapshot.player2RelativeY * height) - (this.player2.paddleHeight * 0.5);
	}

	/**
	 * Saves the current game state into a snapshot.
	 */
	private saveGameState(): void {
		const canvas = this.ball.getContext().canvas;
		const p1Center = (this.player1.y + this.player1.paddleHeight * 0.5) / canvas.height;
		const p2Center = (this.player2.y + this.player2.paddleHeight * 0.5) / canvas.height;
		
		this.gameSnapshot = {
			ballState: this.ball.saveState(),
			player1RelativeY: p1Center,
			player2RelativeY: p2Center
		};
	}

	/**
	 * Restores the game state from the snapshot.
	 */
	private restoreGameState(): void {
		if (!this.gameSnapshot) return;
		this.ball.restoreState(this.gameSnapshot.ballState);
	}

	/**
	 * Starts a countdown with a callback on completion.
	 * @param onComplete The function to call when the countdown completes.
	 */
	private startCountdown(onComplete: () => void): void {
		this.cleanupCountdown();
		const isBackground = this.gameScene?.isBackgroundDemo();
		if (isBackground) {
			this.isCountingDown = true;
			this.countInterval = setTimeout(() => {
				this.cleanupCountdown();
				this.isCountingDown = false;
				setTimeout(onComplete, 50);
			}, 500);
			return;
		}
		let count = 3;
		const intervalTime = 1000;
		this.isCountingDown = true;
		if (this.countdownCallback) {
			this.countdownCallback(count);
		}
		this.countInterval = setInterval(() => {
			count--;
			if (this.countdownCallback) {
				this.countdownCallback(count > 0 ? count : null);
			}
			if (count <= 0) {
				this.cleanupCountdown();
				this.isCountingDown = false;
				setTimeout(() => {
					if (this.gameEngine && typeof this.gameEngine.startMatchTimer === 'function') {
						if (this.isFirstStart || !this.gameSnapshot) {
							this.gameEngine.startMatchTimer();
						}
					}
					onComplete();
					if (
						this.player2.getPlayerType() === PlayerType.AI
					) {
						this.player2.calculateInitialPrediction();
					}
					if (this.pendingPauseRequest) {
						this.pendingPauseRequest = false;
						this.pause();
					}
				}, 50);
			}
		}, intervalTime);
	}

	/**
	 * Cleans up any active countdown interval.
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
	 * Resets the game state to how it should be after a point is scored.
	 */
	private resetToPostPoint(): void {
		this.states.clear();
		this.states.add(GameState.PAUSED);
		this.gameSnapshot = null;
		this.cleanupCountdown();
	}

	////////////////////////////////////////////////////////////
	// Getters and Setters
	////////////////////////////////////////////////////////////
	public getStates(): Set<GameState> { return new Set(this.states); }
	public getGameSnapshot(): GameSnapshot | null { return this.gameSnapshot; }
	public getStatesArray(): GameState[] { return Array.from(this.states); }
	public getIsCountingDown(): boolean { return this.isCountingDown; }

	public setCountdownCallback(callback: CountdownCallback): void { this.countdownCallback = callback; }
	public setPointStartedCallback(callback: () => void): void { this.pointStartedCallback = callback; }
	public setPendingPauseRequest(value: boolean): void { this.pendingPauseRequest = value; }
	public getPendingPauseRequest(): boolean { return this.pendingPauseRequest; }
	public setGameEngine(engine: any): void { this.gameEngine = engine; }
}
