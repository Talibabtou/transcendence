import { Ball, Player } from '@pong/game/objects';
import { GraphicalElement, GameContext, GameState, PlayerPosition, PlayerType } from '@pong/types';
import { COLORS, GAME_CONFIG, FONTS, UI_CONFIG, calculateFontSizes, calculateGameSizes } from '@pong/constants';
import { PauseManager, ResizeManager } from '@pong/game/engine';

export class GameScene {
	// =========================================
	// Properties
	// =========================================
	private ball!: Ball;
	private player1!: Player;
	private player2!: Player;
	private readonly winningScore = GAME_CONFIG.WINNING_SCORE;
	private objectsInScene: Array<GraphicalElement> = [];
	private pauseManager!: PauseManager;
	private resizeManager: ResizeManager | null = null;
	private isBackgroundDemo: boolean = false;
	private gameContext: any; // Will be set by GameEngine
	
	private lastTime: number = 0;
	private countdownText: string | number | string[] | null = null;

	// =========================================
	// Constructor
	// =========================================
	constructor(private readonly context: GameContext) {
		this.setupScene();
		this.lastTime = performance.now();
	}

	// =========================================
	// Public Methods
	// =========================================
	public load(): void {
		this.player1.bindControls();
		this.pauseManager.startGame();
	}

	public unload(): void {
		// Clean up event listeners
		this.player1.unbindControls();
		if (this.player2 && !this.player2.isAIControlled()) {
			this.player2.unbindControls();
		}
		
		// Clean up game objects
		this.objectsInScene = [];
		this.ball = null as any;
		this.player1 = null as any;
		this.player2 = null as any;

		// Clean up managers
		if (this.pauseManager) {
			this.pauseManager.forceStop();
			this.pauseManager = null as any;
		}
		if (this.resizeManager) {
			this.resizeManager.cleanup();
			this.resizeManager = null;
		}

		// Clean up other properties
		this.countdownText = null;
		this.lastTime = 0;
		this.gameContext = null;
	}

	public setGameContext(context: any): void {
		this.gameContext = context;
	}

	public update(): void {
		if (this.shouldSkipUpdate()) return;
		
		const deltaTime = this.calculateDeltaTime();
		this.updateGameState(deltaTime);
		this.checkWinCondition();
	}

	public draw(): void {
		this.drawBackground();
		this.drawContent();
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

	public getResizeManager(): ResizeManager | null {
		return this.resizeManager;
	}

	public getPlayer1(): Player {
		return this.player1;
	}

	public getPlayer2(): Player {
		return this.player2;
	}

	public getBall(): Ball {
		return this.ball;
	}

	// =========================================
	// Game Mode Methods
	// =========================================
	public setGameMode(mode: 'single' | 'multi'): void {
		if (this.player1 && this.player2) {
			if (mode === 'single') {
				// Left player is human, right player is AI
				this.player1.setControlType(PlayerType.HUMAN);
				this.player2.setControlType(PlayerType.AI);
			} else if (mode === 'multi') {
				// Both players are human
				this.player1.setControlType(PlayerType.HUMAN);
				this.player2.setControlType(PlayerType.HUMAN);
			}
			
			// Bind controls for human players
			this.player1.bindControls();
			if (mode === 'multi') {
				this.player2.bindControls();
			}
		}
	}

	public setBackgroundMode(enabled: boolean): void {
		this.isBackgroundDemo = enabled;
		
		if (enabled) {
				// Background demo specific settings
				this.player1.setControlType(PlayerType.AI);
				this.player2.setControlType(PlayerType.AI);
				this.countdownText = null;  // No countdown in background mode
		}
		
		// Update resize manager with background mode setting
		if (this.resizeManager) {
				this.resizeManager.setBackgroundMode(enabled);
		}
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
			// Don't show countdown in background mode
			if (!this.isBackgroundDemo) {
				this.countdownText = text;
			}
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
		
		// Create left player
		this.player1 = new Player(
			sizes.PLAYER_PADDING,
			centerPaddleY, 
			this.ball,
			this.context,
			PlayerPosition.LEFT,
			PlayerType.AI  // Default to AI for background mode
		);

		// Create right player
		const player2X = width - (sizes.PLAYER_PADDING + sizes.PADDLE_WIDTH);
		this.player2 = new Player(
			player2X,
			centerPaddleY,
			this.ball,
			this.context,
			PlayerPosition.RIGHT,
			PlayerType.AI  // Default to AI for background mode
		);
	}

	// =========================================
	// Private Update Methods
	// =========================================
	private shouldSkipUpdate(): boolean {
		// In background mode, we should never skip updates
		if (this.isBackgroundDemo) {
			return false;
		}
		
		// For regular gameplay, skip if paused
		return this.pauseManager.hasState(GameState.PAUSED);
	}

	private calculateDeltaTime(): number {
		const currentTime = performance.now();
		const deltaTime = (currentTime - this.lastTime) / 1000;
		this.lastTime = currentTime;
		return deltaTime;
	}

	private updateGameState(deltaTime: number): void {
		// Only update pause manager if not in background mode
		if (!this.isBackgroundDemo) {
				this.pauseManager.update();
		}
		
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
	}

	private updateGameObjects(deltaTime: number): void {
		// Get current game state
		const currentState = this.pauseManager.hasState(GameState.PLAYING) 
			? GameState.PLAYING 
			: this.pauseManager.hasState(GameState.PAUSED) 
				? GameState.PAUSED 
				: GameState.COUNTDOWN;
		
		// In background mode, force update players even if paused
		const updateState = this.isBackgroundDemo ? GameState.PLAYING : currentState;
		
		// Update game objects
		this.objectsInScene.forEach(object => 
			object.update(this.context, deltaTime, updateState)
		);
	}

	private checkWinCondition(): void {
		// Skip win condition check in background demo mode
		if (this.isBackgroundDemo) return;
		
		if (this.player1.getScore() >= this.winningScore || 
				this.player2.getScore() >= this.winningScore) {
			
			// Create game result data
			const gameResult = {
				winner: this.getWinner(),
				player1Score: this.player1.getScore(),
				player2Score: this.player2.getScore(),
				player1Name: this.player1.name,
				player2Name: this.player2.name
			};

			// Dispatch custom event with game result
			const event = new CustomEvent('gameOver', { 
				detail: gameResult
			});
			window.dispatchEvent(event);
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
		// Don't draw scores in background demo mode
		if (this.isBackgroundDemo) return;
		
		const { width, height } = this.context.canvas;
		const sizes = calculateFontSizes(width, height);

		this.context.font = `${sizes.SCORE_SIZE} ${FONTS.FAMILIES.SCORE}`;
		this.context.fillStyle = COLORS.SCORE;
		this.context.fillText(this.player1.getScore().toString(), width / 4, height / 2);
		this.context.fillText(this.player2.getScore().toString(), 3 * (width / 4), height / 2);
	}

	private drawUI(): void {
		if (this.pauseManager.hasState(GameState.PAUSED) && !this.isBackgroundDemo) {
			this.drawPauseOverlay();
		}

		if (this.shouldDrawCountdown()) {
			this.drawCountdown();
		}
	}

	private shouldDrawCountdown(): boolean {
		// Don't show countdown in background mode
		if (this.isBackgroundDemo) return false;
		
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

	// Add these new methods for game state management
	public isGameOver(): boolean {
		return this.player1.getScore() >= this.winningScore || 
					 this.player2.getScore() >= this.winningScore;
	}

	public getWinner(): Player | null {
		if (!this.isGameOver()) return null;
		return this.player1.getScore() >= this.winningScore ? this.player1 : this.player2;
	}

	private getTextPosition(
		lineIndex: number = 0, 
		totalLines: number = 1
	): { x: number; y: number } {
		const { width, height } = this.context.canvas;
		
		// Calculate vertical offset from center
		const spacing = height * UI_CONFIG.LAYOUT.VERTICAL_SPACING;
		const totalHeight = spacing * (totalLines - 1);
		const startY = height / 2 - totalHeight / 2;
		
		return {
			x: width / 2,
			y: startY + (lineIndex * spacing)
		};
	}
}
