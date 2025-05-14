import { GameContext, GameState, GameStateInfo, PlayerType } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import { KEYS, GAME_CONFIG, COLORS } from '@pong/constants';
import { DbService } from '@website/scripts/utils';
import { GameMode } from '@shared/types';

/**
 * Main game engine that coordinates game scenes, handles input,
 * and manages the game loop.
 */
export class GameEngine {
	private scene!: GameScene;
	private context: GameContext;
	private gameMode: GameMode = GameMode.SINGLE;
	private keyboardEventListener: ((evt: KeyboardEvent) => void) | null = null;
	private readonly boundKeydownHandler: (evt: KeyboardEvent) => void;
	private matchStartTime: number = 0;
	private playerIds: number[] = [];
	private playerColors: [string, string] = [COLORS.PADDLE, COLORS.PADDLE];
	private matchId: number | null = null;
	private goalStartTime: number = 0;
	private isPaused: boolean = false;
	private pauseStartTime: number = 0;
	private totalPausedTime: number = 0;
	private matchCreated: boolean = false;
	private matchCompleted: boolean = false;
	public onGameOver?: (detail: any) => void;

	/**
	 * Creates a new GameEngine.
	 * @param ctx Canvas rendering context.
	 */
	constructor(ctx: GameContext) {
		this.context = ctx;
		this.boundKeydownHandler = this.handleKeydown.bind(this);
	}

	/**
	 * Initializes the game engine and scene with a specific game mode.
	 * @param mode The game mode to initialize.
	 */
	public initialize(mode: GameMode): void {
		this.gameMode = mode;
		this.scene = new GameScene(this.context);
		if (typeof this.scene.setGameEngine === 'function') {
			this.scene.setGameEngine(this);
		}
		this.bindPauseControls();
		this.loadMainScene();
	}

	/**
	 * Loads the main game scene with appropriate settings.
	 */
	private loadMainScene(): void {
		this.scene.setGameMode(this.gameMode);
		if (this.scene.Ball) {
			this.scene.Ball.restart();
		}
		if (this.scene.Player1) {
			this.scene.Player1.resetPosition();
		}
		if (this.scene.Player2) {
			this.scene.Player2.resetPosition();
		}
		this.scene.load();
	}

	/**
	 * Renders the current game scene.
	 * @param alpha Interpolation factor (0 to 1).
	 */
	public draw(alpha: number): void {
		this.clearScreen();
		this.scene.draw(alpha);
	}

	/**
	 * Updates the game state for the current frame.
	 * @param deltaTime Time elapsed since the last update in seconds.
	 */
	public update(deltaTime: number): void {
		if (this.scene) {
			try {
				this.scene.update(deltaTime);
			} catch (error) {
				console.error('Error updating game scene:', error);
			}
		}
	}

	/**
	 * Sets up keyboard event listeners for pause control.
	 */
	private bindPauseControls(): void {
		if (this.keyboardEventListener) {
			window.removeEventListener('keydown', this.keyboardEventListener);
		}
		this.keyboardEventListener = this.boundKeydownHandler;
		window.addEventListener('keydown', this.keyboardEventListener);
	}

	/**
	 * Toggles the game between paused and playing states.
	 */
	public togglePause(): void {
		if (!(this.scene instanceof GameScene)) {
			return;
		}
		const gameScene = this.scene;
		const resizeManager = gameScene.ResizeManager;
		if (resizeManager?.isCurrentlyResizing()) {
			return;
		}
		const pauseManager = gameScene.PauseManager;
		if (pauseManager.hasState(GameState.PLAYING)) {
			gameScene.handlePause();
			this.pauseMatchTimer();
		} else if (pauseManager.hasState(GameState.PAUSED)) {
			gameScene.handleResume();
			this.resumeMatchTimer();
		}
	}

	/**
	 * Returns whether the game is currently paused.
	 * @returns True if the game is paused, false otherwise.
	 */
	public isGamePaused(): boolean {
		if (!(this.scene instanceof GameScene)) {
			return false;
		}
		return this.scene.PauseManager.hasState(GameState.PAUSED);
	}

	/**
	 * Handles canvas resize operations.
	 * @param width The new canvas width.
	 * @param height The new canvas height.
	 */
	public resize(width: number, height: number): void {
		if (this.context && this.context.canvas) {
			this.context.canvas.width = width;
			this.context.canvas.height = height;
		}
		if (this.scene instanceof GameScene) {
			this.scene.Player1?.updateSizes();
			this.scene.Player2?.updateSizes();
		}
		this.draw(1);
	}

	/**
	 * Clears the canvas for a new frame.
	 */
	private clearScreen(): void {
		const { width, height } = this.context.canvas;
		this.context.beginPath();
		this.context.clearRect(0, 0, width, height);
		this.context.closePath();
	}

	/**
	 * Cleans up resources.
	 */
	public cleanup(): void {
		this.stopAllTimers();
		if (this.keyboardEventListener === this.boundKeydownHandler) {
			window.removeEventListener('keydown', this.boundKeydownHandler);
		}
		this.keyboardEventListener = null;
		if (this.scene) {
			try {
				this.scene.unload();
				this.scene = null as any;
			} catch (error) {
				console.error('Error unloading scene:', error);
			}
		}
		this.context = null as any;
	}

	/**
	 * Updates the player colors.
	 * @param p1ColorInput The color for player 1.
	 * @param p2ColorInput The color for player 2 (optional, defaults to player 1's color if AI or same as player 1).
	 */
	public updatePlayerColors(p1ColorInput: string, p2ColorInput?: string): void {
		try {
			const scene = this.scene;
			if (!scene) return;
			const player1 = scene.Player1;
			const player2 = scene.Player2;
			let actualP1Color: string = p1ColorInput;
			let actualP2Color: string;

			if (player2) {
				const p2Type = player2.PlayerType;
				if (p2Type === PlayerType.AI) {
					actualP2Color = '#ffffff';
				} else if (p2Type === PlayerType.BACKGROUND) {
					actualP2Color = '#808080';
				} else if (p2Type === PlayerType.HUMAN) {
					if (p2ColorInput) {
						actualP2Color = p2ColorInput;
					} else {
						actualP2Color = '#2ecc71';
					}
				} else {
					actualP2Color = p2ColorInput || COLORS.PADDLE; 
				}
			} else {
				actualP2Color = p2ColorInput || COLORS.PADDLE;
			}
			if (player1) {
				player1.setColor(actualP1Color);
			}
			if (player2) {
				player2.setColor(actualP2Color);
			}
			this.playerColors = [actualP1Color, actualP2Color];
		} catch (error: any) {
			console.error('Error updating player colors:', error);
		}
	}

	/**
	 * Creates a new match in the database.
	 * @param tournamentId Optional tournament ID if the match is part of a tournament.
	 */
	private createMatch(tournamentId?: string): void {
		if (this.matchCreated || this.scene.isBackgroundDemo()) {
			return;
		}
		const isSinglePlayer = this.gameMode === GameMode.SINGLE;
		if (this.playerIds.length < 1 || this.playerIds[0] === undefined) {
			return;
		}
		const player1Id = this.playerIds[0];
		let player2Id: number;
		
		if (isSinglePlayer) {
			player2Id = 0;
		} else {
			if (this.playerIds.length >= 2) {
				player2Id = this.playerIds[1];
			} else {
				return;
			}
		}
		this.matchCreated = true;
		DbService.createMatch(player1Id, player2Id, tournamentId)
			.then(match => {
				this.matchId = match.id;
				localStorage.setItem('current_match_id', match.id.toString());
				localStorage.setItem('current_match_start_time', Date.now().toString());
			})
			.catch(error => {
				console.error('Failed to create match:', error);
				this.matchCreated = false;
			});
	}

	/**
	 * Starts the match timer - called when actual gameplay begins
	 * This should be called AFTER the initial countdown
	 */
	public startMatchTimer(): void {
		if (this.scene.isBackgroundDemo()) {
			return;
		}
		this.matchStartTime = Date.now();
		this.goalStartTime = Date.now();
		this.totalPausedTime = 0;
		this.isPaused = false;
		if (!this.matchCreated) {
			this.createMatch();
		}
		this.setupMatchTimeout();
	}

	/**
	 * Sets up a timeout to auto-complete matches after 10 minutes
	 * This prevents abandoned matches from staying open
	 */
	private setupMatchTimeout(): void {
		setTimeout(() => {
			if (!this.matchCompleted && this.matchId && !this.scene.isBackgroundDemo()) {
				const winnerIndex = this.scene?.Player1?.Score > this.scene?.Player2?.Score ? 0 : 1;
				this.completeMatch(winnerIndex);
			}
		}, GAME_CONFIG.MAX_MATCH_DURATION);
	}

	/**
	 * Completes the match and records the result.
	 * @param winnerIndex The index of the winning player (0 or 1), or -1 for a draw.
	 */
	public completeMatch(_winnerIndex: number): void {
		if (this.scene.isBackgroundDemo() || this.matchCompleted) {
			return;
		}
		this.matchCompleted = true;
		this.dispatchGameOver();
		this.isPaused = true;
	}

	/**
	 * Requests a pause in the game, typically from an external source like a component.
	 */
	public requestPause(): void {
		if (!(this.scene instanceof GameScene)) {
			return;
		}
		const pauseManager = this.scene.PauseManager;
		if (pauseManager.hasState(GameState.COUNTDOWN)) {
			pauseManager.setPendingPauseRequest(true);
		} 
		else if (!pauseManager.hasState(GameState.PAUSED)) {
			this.scene.handlePause();
			this.pauseMatchTimer();
		}
	}

	/**
	 * Pauses the match timer.
	 */
	public pauseMatchTimer(): void {
		if (this.scene.isBackgroundDemo()) {
			return;
		}
		if (!this.isPaused) {
			this.isPaused = true;
			this.pauseStartTime = Date.now();
		}
	}

	/**
	 * Resumes the match timer.
	 */
	public resumeMatchTimer(): void {
		if (this.scene.isBackgroundDemo()) {
			return;
		}
		if (this.isPaused) {
			this.totalPausedTime += (Date.now() - this.pauseStartTime);
			this.isPaused = false;
		}
	}
	
	/**
	 * Records a goal scored by a player.
	 * @param scoringPlayerIndex The index of the player who scored (0 or 1).
	 */
	public recordGoal(scoringPlayerIndex: number): void {
		if (this.scene.isBackgroundDemo()) {
			return;
		}
		if (this.matchCompleted) {
			return;
		}
		if (!this.matchId) {
			if (!this.matchCreated && this.scene.requiresDbRecording()) {
				this.createMatch();
				if (!this.matchId) {
					return;
				}
			} else {
				return;
			}
		}
		let scoringPlayerId: number;
		if (scoringPlayerIndex === 1 && this.scene.isSinglePlayer()) {
			scoringPlayerId = 0;
		} else if (scoringPlayerIndex >= 0 && scoringPlayerIndex < this.playerIds.length) {
			scoringPlayerId = this.playerIds[scoringPlayerIndex];
		} else {
			return;
		}
		const currentTime = Date.now();
		const goalDuration = ((currentTime - this.goalStartTime) - 
							  (this.isPaused ? (currentTime - this.pauseStartTime) : 0)) / 1000;
		DbService.recordGoal(this.matchId, scoringPlayerId, goalDuration)
			.then(() => {
				this.resetGoalTimer();
			})
			.catch((error: any) => {
				if (!(error && error.message && error.message.includes('already completed'))) {
					console.error('Failed to record goal:', error);
				}
			});
	}

	/**
	 * Dispatches a game over event.
	 */
	private dispatchGameOver(): void {
		if (this.scene.isBackgroundDemo()) return;
		const player1 = this.scene.Player1;
		const player2 = this.scene.Player2;
		const winner = this.scene.Winner;
		const player1Name = player1.name; 
		const player2Name = player2.name;
		const player1Score = player1.Score;
		const player2Score = player2.Score;
		const winnerName = winner ? winner.name : (player1Score > player2Score ? player1Name : player2Name);

		import('@website/scripts/utils').then(({ MatchCache }) => {
			MatchCache.setLastMatchResult({
				winner: winnerName,
				player1Name: player1Name,
				player2Name: player2Name,
				player1Score: player1Score,
				player2Score: player2Score,
				isBackgroundGame: false
			});
			MatchCache.setCurrentGameInfo({
				gameMode: this.gameMode,
				playerIds: this.playerIds,
				playerNames: [player1Name, player2Name],
				playerColors: this.playerColors
			});
			if (this.onGameOver) {
				this.onGameOver({
					matchId: this.matchId,
					gameMode: this.gameMode,
					isBackgroundGame: false,
					player1Score: player1Score,
					player2Score: player2Score,
					player1Name: player1Name,
					player2Name: player2Name,
					winner: winnerName
				});
			}
		});
	}

	/**
	 * Checks if the win condition for the match has been met.
	 */
	public checkWinCondition(): void {
		if (this.matchCompleted || this.scene.isBackgroundDemo()) {
			return;
		}
		if (this.scene.isGameOver()) {
			const player1 = this.scene.Player1;
			const player2 = this.scene.Player2;
			const winnerIndex = player1.Score > player2.Score ? 0 : 1;
			this.completeMatch(winnerIndex);
		}
	}

	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////

	public resetGoalTimer(): void {
		if (this.scene.isBackgroundDemo()) {
			return;
		}
		this.goalStartTime = Date.now() - this.totalPausedTime;
	}

	private handleKeydown(evt: KeyboardEvent): void {
		if (evt.code === KEYS.ENTER || evt.code === KEYS.ESC) {
			this.togglePause();
		}
	}

	public stopAllTimers(): void {
		this.isPaused = true;
		this.matchCompleted = true;
	}
	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	public get MatchId(): number | null { return this.matchId; }
	public get GameState(): GameStateInfo {
		return {
			player1Score: this.scene.Player1?.Score ?? 0,
			player2Score: this.scene.Player2?.Score ?? 0,
			isGameOver: this.scene.isGameOver(),
			winner: this.scene.Winner
		};
	}
	public get MatchDuration(): number {
		if (!this.matchStartTime) return 0;
		const currentTime = Date.now();
		const totalPaused = this.totalPausedTime + (this.isPaused ? (currentTime - this.pauseStartTime) : 0);
		return (currentTime - this.matchStartTime - totalPaused) / 1000;
	}

	public setPlayerNames(player1Name: string, player2Name: string): void {
		if (this.scene.Player1) {
			this.scene.Player1.setName(player1Name);
		}
		if (this.scene.Player2) {
			this.scene.Player2.setName(player2Name);
		}
	}
	public setKeyboardEnabled(enabled: boolean): void {
		const isActive = this.keyboardEventListener === this.boundKeydownHandler;
		if (enabled && !isActive) {
			window.addEventListener('keydown', this.boundKeydownHandler);
			this.keyboardEventListener = this.boundKeydownHandler;
		} else if (!enabled && isActive) {
			window.removeEventListener('keydown', this.boundKeydownHandler);
			this.keyboardEventListener = null;
		}
	}
	public setPlayerIds(ids: number[], tournamentId?: string): void {
		this.playerIds = ids;
		if (!this.matchCreated) {
			this.createMatch(tournamentId);
		}
	}
}
