import { Ball, Player } from '@pong/game/objects';
import { PauseManager } from '@pong/game/engine';
import { GameContext, GameState } from '@pong/types';
import { calculateGameSizes } from '@pong/constants';
import { GameScene } from '@pong/game/scenes';

/**
 * Manages window resizing operations for the game, ensuring
 * that all game elements scale and position correctly.
 */
export class ResizeManager {

	private isResizing: boolean = false;
	private context: GameContext;
	private scene: GameScene;
	private ball: Ball | null;
	private player1: Player | null;
	private player2: Player | null;
	private pauseManager: PauseManager | null;
	private readonly DEBOUNCE_MS = 50;      // good cross‑platform sweet‑spot
	private lastResizeEvt = 0;
	private resizeTimeoutId: number | null = null;

	/**
	 * Creates a new ResizeManager
	 * @param ctx Canvas rendering context
	 * @param scene Game scene reference
	 * @param ball Ball object reference
	 * @param player1 Left player reference
	 * @param player2 Right player reference
	 * @param pauseManager PauseManager reference
	 */
	constructor(
		ctx: GameContext,
		scene: GameScene,
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
	}


	/**
	 * Cleans up resources and event listeners
	 */
	public cleanup(): void {
		if (this.resizeTimeoutId !== null) {
			clearTimeout(this.resizeTimeoutId);
			this.resizeTimeoutId = null;
		}
		this.context = null as any;
		this.scene = null as any;
		this.ball = null as any;
		this.player1 = null as any;
		this.player2 = null as any;
		this.pauseManager = null as any;
	}



	/**
	 * Called by GameEngine when the canvas has been resized.
	 * Orchestrates the resize process for game objects.
	 */
	public onCanvasResizedByEngine(): void {
		if (this.resizeTimeoutId !== null) {
			clearTimeout(this.resizeTimeoutId);
		}

		this.resizeTimeoutId = window.setTimeout(() => {
			this.isResizing = true;
			const isBackgroundMode = this.isInBackgroundDemo();
			const wasPlaying = this.pauseManager?.hasState(GameState.PLAYING) ?? false;
			const wasInCountdown = this.pauseManager?.hasState(GameState.COUNTDOWN) ?? false;

			if (!isBackgroundMode && this.pauseManager) {
				if (wasPlaying) {
					this.pauseManager.pause();
				} else if (wasInCountdown) {
					this.pauseManager.forcePauseFromCountdownKeepSnapshot();
				}
			}

			requestAnimationFrame(() => {
				this.resizeGameObjects();
				this.isResizing = false;
				this.resizeTimeoutId = null;
			});
		}, this.DEBOUNCE_MS);
	}

	/**
	 * Resizes all game objects while maintaining proper proportions
	 */
	private resizeGameObjects(): void {
		console.log('[ResizeManager] resizeGameObjects: Called.');
		if (!this.isGameScene()) {
			this.scene.draw(1);
			return;
		}
		const { width: newWidth, height: newHeight } = this.context.canvas;
		const sizes = calculateGameSizes(newWidth, newHeight);
		if (!this.ball || !this.player1 || !this.player2) return;
		const gameSnapshot = this.pauseManager?.GameSnapshot;
		console.log('[ResizeManager] resizeGameObjects: Game snapshot:', gameSnapshot);
		this.ball.updateSizes();
		this.player1.updateSizes();
		this.player2.updateSizes();
		this.player1.x = sizes.PLAYER_PADDING;
		this.player2.x = newWidth - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
		if (gameSnapshot) {
			this.player1.y = gameSnapshot.player1RelativeY * newHeight - this.player1.paddleHeight * 0.5;
			this.player2.y = gameSnapshot.player2RelativeY * newHeight - this.player2.paddleHeight * 0.5;
			this.ball.restoreState(gameSnapshot.ballState, newWidth, newHeight);
			gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / newHeight;
			gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / newHeight;
		} else {
			this.updatePaddleVerticalPositions(newHeight);
			const ballState = this.ball.saveState();
			this.ball.restoreState(ballState, newWidth, newHeight);
		}
		const maxY = newHeight - this.player1.paddleHeight;
		this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
		this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);
		this.player1.updateHorizontalPosition();
		this.player2.updateHorizontalPosition();
		this.handleResizeDuringCountdown();
		this.scene.draw(1);
	}

	/**
	 * Handles special resize behavior during countdown
	 */
	private handleResizeDuringCountdown(): void {
		if (!this.pauseManager) return;
		const isInCountdown = this.pauseManager.hasState(GameState.COUNTDOWN);
		if (isInCountdown) {
			if (this.ball) {
				this.ball.restart();
			}
			this.pauseManager.maintainCountdownState();
		}
	}

	/**
	 * Updates paddle vertical positions while maintaining proportionality
	 * @param newHeight The new canvas height
	 */
	private updatePaddleVerticalPositions(newHeight: number): void {
		if (!this.player1 || !this.player2) return;
		
		const p1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / this.context.canvas.height;
		const p2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / this.context.canvas.height;
		this.player1.y = (p1RelativeY * newHeight) - (this.player1.paddleHeight * 0.5);
		this.player2.y = (p2RelativeY * newHeight) - (this.player2.paddleHeight * 0.5);
		const maxY = newHeight - this.player1.paddleHeight;
		this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
		this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);
		const gameSnapshot = this.pauseManager?.GameSnapshot;
		if (gameSnapshot) {
			gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / newHeight;
			gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / newHeight;
		}
	}

	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////
	private isGameScene(): boolean { return !!(this.ball && this.player1 && this.player2 && this.pauseManager); }
	private isInBackgroundDemo(): boolean { return this.scene.isBackgroundDemo(); }
	public isCurrentlyResizing(): boolean { return this.isResizing; }
}
