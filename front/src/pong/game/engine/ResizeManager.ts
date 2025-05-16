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
	private resizeTimeoutId: number | null = null;

	private previousCanvasWidth: number;
	private previousCanvasHeight: number;

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
					this.pauseManager.pause(this.previousCanvasWidth, this.previousCanvasHeight);
				} else if (wasInCountdown) {
					this.pauseManager.forcePauseFromCountdownKeepSnapshot();
				}
			}

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
		console.log('[ResizeManager] resizeGameObjects: Called.');
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
			// Ball: update sizes first, then restore state which includes position.
			this.ball.updateSizes(); // Updates size, baseSpeed based on newWidth, newHeight
			this.ball.restoreState(gameSnapshot.ballState, newWidth, newHeight);

			// Players: update sizes, then set position from snapshot.
			this.player1.updateSizes(); // Updates paddle dimensions, speed based on newW, newH
			this.player2.updateSizes();
			
			this.player1.x = sizes.PLAYER_PADDING;
			this.player2.x = newWidth - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
			
			// Y positions from snapshot (relative) applied to new height
			this.player1.y = gameSnapshot.player1RelativeY * newHeight - this.player1.paddleHeight * 0.5;
			this.player2.y = gameSnapshot.player2RelativeY * newHeight - this.player2.paddleHeight * 0.5;
			
			// Update snapshot with new relative positions for consistency if needed later
			gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / newHeight;
			gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / newHeight;
		} else {
			// No snapshot - maintain relative positions

			// Ball
			const ballRelativeX = this.ball.x / oldWidth;
			const ballRelativeY = this.ball.y / oldHeight;
			this.ball.updateSizes(); // Updates size, baseSpeed
			this.ball.x = ballRelativeX * newWidth;
			this.ball.y = ballRelativeY * newHeight;
			this.ball.prevRenderX = this.ball.x;
			this.ball.prevRenderY = this.ball.y;
			this.ball.prevPosition.x = this.ball.x;
			this.ball.prevPosition.y = this.ball.y;

			// Player 1
			const p1CurrentCenterY = this.player1.y + this.player1.paddleHeight * 0.5; // Use old paddleHeight
			const p1RelativeY = p1CurrentCenterY / oldHeight;
			this.player1.updateSizes(); // Updates paddle W/H, speed. Also updates player1.x via updateHorizontalPosition.
			const p1NewCenterY = p1RelativeY * newHeight;
			this.player1.y = p1NewCenterY - this.player1.paddleHeight * 0.5; // Use new paddleHeight

			// Player 2
			const p2CurrentCenterY = this.player2.y + this.player2.paddleHeight * 0.5; // Use old paddleHeight
			const p2RelativeY = p2CurrentCenterY / oldHeight;
			this.player2.updateSizes(); // Updates paddle W/H, speed. Also updates player2.x.
			const p2NewCenterY = p2RelativeY * newHeight;
			this.player2.y = p2NewCenterY - this.player2.paddleHeight * 0.5; // Use new paddleHeight
		}

		// Common adjustments for players after positions are set (either from snapshot or relative logic)
		const maxY = newHeight - this.player1.paddleHeight; // Use new paddleHeight
		this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
		this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);

		// Sync player's prevRender states AFTER their x,y are finalized for this resize step.
		// Player.x is updated within player.updateSizes() via updateHorizontalPosition().
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
