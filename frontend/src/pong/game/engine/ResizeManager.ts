import { GameContext, GameState } from '@pong/types';
import { calculateGameSizes } from '@pong/constants';
import { Ball, Player } from '@pong/game/objects';
import { PauseManager } from '@pong/game/engine';
import { GameScene } from '@pong/game/scenes';

export class ResizeManager {
	private isResizing: boolean = false;
	private context: GameContext;
	private scene: GameScene;
	private ball: Ball | null;
	private player1: Player | null;
	private player2: Player | null;
	private pauseManager: PauseManager | null;
	private readonly DEBOUNCE_MS = 50;
	private resizeTimeoutId: number | null = null;
	private previousCanvasWidth: number;
	private previousCanvasHeight: number;

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
		this.previousCanvasWidth = ctx.canvas.width;
		this.previousCanvasHeight = ctx.canvas.height;
	}


	/**
	 * Cleans up resources and event listeners
	 */
	public cleanup(): void {
		if (this.resizeTimeoutId !== null) {
			clearTimeout(this.resizeTimeoutId);
			this.resizeTimeoutId = null;
		}
		this.context = null as unknown as GameContext;
		this.scene = null as unknown as GameScene;
		this.ball = null as unknown as Ball;
		this.player1 = null as unknown as Player;
		this.player2 = null as unknown as Player;
		this.pauseManager = null as unknown as PauseManager;
	}



	/**
	 * Called by GameEngine when the canvas has been resized.
	 * Orchestrates the resize process for game objects.
	 */
	public onCanvasResizedByEngine(): void {
		const isBackgroundMode = this.isInBackgroundDemo();
		if (!isBackgroundMode && this.pauseManager) {
			const wasPlaying = this.pauseManager.hasState(GameState.PLAYING);
			const wasInCountdown = this.pauseManager.hasState(GameState.COUNTDOWN);

			if (wasPlaying) {
				this.pauseManager.pause(this.previousCanvasWidth, this.previousCanvasHeight);
			} else if (wasInCountdown) {
				this.pauseManager.forcePauseFromCountdownKeepSnapshot();
			}
		}

		if (this.resizeTimeoutId !== null) {
			clearTimeout(this.resizeTimeoutId);
		}

		this.resizeTimeoutId = window.setTimeout(() => {
			this.isResizing = true;

			requestAnimationFrame(() => {
				this.resizeGameObjects();
				
				this.isResizing = false;
				this.resizeTimeoutId = null;
				
				if (this.context && this.context.canvas) {
					this.previousCanvasWidth = this.context.canvas.width;
					this.previousCanvasHeight = this.context.canvas.height;
				}
			});
		}, this.DEBOUNCE_MS);
	}

	/**
	 * Resizes all game objects while maintaining proper proportions
	 */
	private resizeGameObjects(): void {
		if (!this.isGameScene() || !this.ball || !this.player1 || !this.player2) {
			if (this.scene) this.scene.draw(1);
			return;
		}

		const newWidth = this.context.canvas.width;
		const newHeight = this.context.canvas.height;
		const oldWidth = this.previousCanvasWidth;
		const oldHeight = this.previousCanvasHeight;

		const sizes = calculateGameSizes(newWidth, newHeight);
		const gameSnapshot = this.pauseManager?.GameSnapshot;

		if (gameSnapshot) {
			this.ball.updateSizes();
			this.ball.restoreState(gameSnapshot.ballState, newWidth, newHeight);

			this.player1.updateSizes();
			this.player2.updateSizes();
			
			this.player1.x = sizes.PLAYER_PADDING;
			this.player2.x = newWidth - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
			
			this.player1.y = gameSnapshot.player1RelativeY * newHeight - this.player1.paddleHeight * 0.5;
			this.player2.y = gameSnapshot.player2RelativeY * newHeight - this.player2.paddleHeight * 0.5;
			
			gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / newHeight;
			gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / newHeight;
		} else {
			const ballRelativeX = this.ball.x / oldWidth;
			const ballRelativeY = this.ball.y / oldHeight;
			this.ball.updateSizes();
			this.ball.x = ballRelativeX * newWidth;
			this.ball.y = ballRelativeY * newHeight;
			this.ball.prevRenderX = this.ball.x;
			this.ball.prevRenderY = this.ball.y;
			this.ball.prevPosition.x = this.ball.x;
			this.ball.prevPosition.y = this.ball.y;

			const p1CurrentCenterY = this.player1.y + this.player1.paddleHeight * 0.5;
			const p1RelativeY = p1CurrentCenterY / oldHeight;
			this.player1.updateSizes();
			const p1NewCenterY = p1RelativeY * newHeight;
			this.player1.y = p1NewCenterY - this.player1.paddleHeight * 0.5;

			const p2CurrentCenterY = this.player2.y + this.player2.paddleHeight * 0.5;
			const p2RelativeY = p2CurrentCenterY / oldHeight;
			this.player2.updateSizes();
			const p2NewCenterY = p2RelativeY * newHeight;
			this.player2.y = p2NewCenterY - this.player2.paddleHeight * 0.5;
		}

		const maxY = newHeight - this.player1.paddleHeight;
		this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
		this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);

		this.player1.syncPrevRenderStates();
		this.player2.syncPrevRenderStates();

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

	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////
	
	private isGameScene(): boolean { return !!(this.context && this.scene && this.ball && this.player1 && this.player2 && this.pauseManager); }
	private isInBackgroundDemo(): boolean { return this.scene?.isBackgroundDemo() ?? false; }
	public isCurrentlyResizing(): boolean { return this.isResizing; }
}
