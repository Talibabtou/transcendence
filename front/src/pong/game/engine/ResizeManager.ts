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
	// =========================================
	// Private Properties
	// =========================================
	private isResizing: boolean = false;
	private context: GameContext;
	private scene: GameScene;
	private ball: Ball | null;
	private player1: Player | null;
	private player2: Player | null;
	private pauseManager: PauseManager | null;
	private boundResizeHandler: () => void;
	private readonly DEBOUNCE_MS = 50;      // good cross‑platform sweet‑spot
	private lastResizeEvt = 0;

	// =========================================
	// Constructor
	// =========================================
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
		
		// Create bound handler to properly remove listener later
		this.boundResizeHandler = this.handleResize.bind(this);
		this.setupResizeHandler();
	}

	// =========================================
	// Public Methods (Facade)
	// =========================================
	
	/**
	 * Returns whether a resize operation is currently in progress
	 */
	public isCurrentlyResizing(): boolean {
		return this.isResizing;
	}

	/**
	 * Cleans up resources and event listeners
	 */
	public cleanup(): void {

		
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
	// Resize Event Handling
	// =========================================
	
	/**
	 * Sets up the window resize event listener
	 */
	private setupResizeHandler(): void {
		window.addEventListener('resize', this.boundResizeHandler);
	}

	/**
	 * Main resize handler that orchestrates the resize process
	 */
	public handleResize(): void {
		const now = performance.now();
		if (now - this.lastResizeEvt < this.DEBOUNCE_MS) {
			this.isResizing = false;
			return;   // Debounced
		}
		this.lastResizeEvt = now;
		this.isResizing   = true;

		// Only ONE queue jump – run heavy work in next frame, not a timeout

		
		// Check if we're in background mode - use GameScene
		const isBackgroundMode = this.isInBackgroundDemo();
		
		// Check game state
		const wasPlaying = this.pauseManager?.hasState(GameState.PLAYING) ?? false;
		const wasInCountdown = this.pauseManager?.hasState(GameState.COUNTDOWN) ?? false;
		
		// If countdown is active, set a pending pause request
		if (wasInCountdown && this.pauseManager) {
			this.pauseManager.setPendingPauseRequest(true);
		}
		
		// If not in background mode and playing, pause the game first
		if (!isBackgroundMode && wasPlaying && this.pauseManager) {
			this.pauseManager.pause();
		}
		
		requestAnimationFrame(() => {
			this.updateCanvasSize();
			this.resizeGameObjects();
			this.isResizing = false;          // reset flag
			if (!isBackgroundMode && wasPlaying && this.pauseManager) {
							this.pauseManager.resume();
			}
		});
	}

	// =========================================
	// Canvas Handling
	// =========================================
	
	/**
	 * Updates the canvas size while preserving context properties
	 */
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
		}
	}

	// =========================================
	// Game Object Resizing
	// =========================================
	
	/**
	 * Resizes all game objects while maintaining proper proportions
	 */
	private resizeGameObjects(): void {
		// Check if we are in a game scene with objects
		if (!this.isGameScene()) {
			this.scene.draw(1); // Just redraw for non-game scenes
			return;
		}
		
		// Get new dimensions
		const { width: newWidth, height: newHeight } = this.context.canvas;
		const sizes = calculateGameSizes(newWidth, newHeight);
		
		if (!this.ball || !this.player1 || !this.player2) return;
		
		// Get game snapshot first - we'll need this for positioning
		const gameSnapshot = this.pauseManager?.getGameSnapshot();
		
		// Update sizes for all game objects first
		this.ball.updateSizes();
		this.player1.updateSizes();
		this.player2.updateSizes();

		// // <<< Add UIManager font size update here >>>
		// if (typeof this.scene.getUIManager === 'function') {
		// 	this.scene.getUIManager().updateFontSizes(newWidth, newHeight);
		// }
		
		// Update horizontal paddle positions
		this.player1.x = sizes.PLAYER_PADDING;
		this.player2.x = newWidth - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
		
		// Handle vertical positioning of paddles
		if (gameSnapshot) {
			// Use the saved proportional positions from the snapshot
			this.player1.y = gameSnapshot.player1RelativeY * newHeight - this.player1.paddleHeight * 0.5;
			this.player2.y = gameSnapshot.player2RelativeY * newHeight - this.player2.paddleHeight * 0.5;
			
			// Update ball from snapshot immediately for visual consistency
			this.ball.restoreState(gameSnapshot.ballState, newWidth, newHeight);
			
			// Update snapshot with new proportions
			gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / newHeight;
			gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / newHeight;
		} else {
			// No snapshot - use current proportional positions
			this.updatePaddleVerticalPositions(newHeight);
			
			// Save and restore ball state to maintain proportions
			const ballState = this.ball.saveState();
			this.ball.restoreState(ballState, newWidth, newHeight);
		}
		
		// Ensure paddles stay within bounds
		const maxY = newHeight - this.player1.paddleHeight;
		this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
		this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);

		// Update paddle positions after bounds check
		this.player1.updateHorizontalPosition();
		this.player2.updateHorizontalPosition();
		// Handle countdown state explicitly
		this.handleResizeDuringCountdown();
		
		// Force redraw
		this.scene.draw(1);
	}

	/**
	 * Handles special resize behavior during countdown
	 */
	private handleResizeDuringCountdown(): void {
		if (!this.pauseManager) return;
		
		const isInCountdown = this.pauseManager.hasState(GameState.COUNTDOWN);
		if (isInCountdown) {
			// Position the ball in the center if we're in countdown
			if (this.ball) {
				this.ball.restart(); // Use restart to correctly center and snap visual history
			}
			
			// Tell pause manager to maintain countdown state
			this.pauseManager.maintainCountdownState();
		}
	}

	/**
	 * Updates paddle vertical positions while maintaining proportionality
	 * @param newHeight The new canvas height
	 */
	private updatePaddleVerticalPositions(newHeight: number): void {
		if (!this.player1 || !this.player2) return;
		
		// Calculate relative paddle center positions (as percentage of canvas height)
		const p1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / this.context.canvas.height;
		const p2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / this.context.canvas.height;
		
		// Apply relative positions to new height
		this.player1.y = (p1RelativeY * newHeight) - (this.player1.paddleHeight * 0.5);
		this.player2.y = (p2RelativeY * newHeight) - (this.player2.paddleHeight * 0.5);
		
		// Ensure paddles stay within bounds
		const maxY = newHeight - this.player1.paddleHeight;
		this.player1.y = Math.min(Math.max(this.player1.y, 0), maxY);
		this.player2.y = Math.min(Math.max(this.player2.y, 0), maxY);
		
		// Update snapshot in pause manager if available
		const gameSnapshot = this.pauseManager?.getGameSnapshot();
		if (gameSnapshot) {
			gameSnapshot.player1RelativeY = (this.player1.y + this.player1.paddleHeight * 0.5) / newHeight;
			gameSnapshot.player2RelativeY = (this.player2.y + this.player2.paddleHeight * 0.5) / newHeight;
		}
	}

	// =========================================
	// Helper Methods
	// =========================================
	
	/**
	 * Checks if we have a valid game scene with all needed objects
	 */
	private isGameScene(): boolean {
		return !!(this.ball && this.player1 && this.player2 && this.pauseManager);
	}

	/**
	 * Checks if we're in background demo mode
	 */
	private isInBackgroundDemo(): boolean {
		return this.scene.isBackgroundDemo();
	}
}
