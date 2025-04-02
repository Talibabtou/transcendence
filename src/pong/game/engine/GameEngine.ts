import { GameContext, GameState, GameStateInfo } from '@pong/types';
import { GameScene, GameModeType } from '@pong/game/scenes';
import { KEYS } from '@pong/constants';
import { DbService } from '@website/scripts/utils';
import { GameMode } from '@shared/types';


/**
 * Main game engine that coordinates game scenes, handles input,
 * and manages the game loop.
 */
export class GameEngine {
	// =========================================
	// Properties
	// =========================================
	private scene!: GameScene; // Use definite assignment assertion
	private context: GameContext;
	private gameMode: GameModeType = 'single';
	private keyboardEventListener: ((evt: KeyboardEvent) => void) | null = null;
	private matchStartTime: number = 0;
	private playerIds: number[] = [];
	private playerColors: string[] = [];
	private matchId: number | null = null;
	private goalStartTime: number = 0;
	private isPaused: boolean = false;
	private pauseStartTime: number = 0;
	private totalPausedTime: number = 0;
	private matchCreated: boolean = false;
	private matchCompleted: boolean = false;

	// =========================================
	// Lifecycle
	// =========================================
	/**
	 * Creates a new GameEngine
	 * @param ctx Canvas rendering context
	 */
	constructor(ctx: GameContext) {
		this.context = ctx;
		this.initializeGame();
	}

	/**
	 * Initializes the game engine and scene
	 */
	private initializeGame(): void {
		this.scene = new GameScene(this.context);
		
		// Make the scene aware of the game engine for database interactions
		if (typeof this.scene.setGameEngine === 'function') {
			this.scene.setGameEngine(this);
		}
		
		this.bindPauseControls();
	}

	// =========================================
	// Game Mode Initialization
	// =========================================
	/**
	 * Initializes a single player game
	 */
	public initializeSinglePlayer(): void {
		this.gameMode = 'single';
		this.loadMainScene();
	}

	/**
	 * Initializes a multiplayer game
	 */
	public initializeMultiPlayer(): void {
		this.gameMode = 'multi';
		this.loadMainScene();
	}

	/**
	 * Initializes a tournament game
	 */
	public initializeTournament(): void {
		this.gameMode = 'tournament';
		// For now, just start a multiplayer game
		// We'll implement tournament specifics later
		this.loadMainScene();
	}

	/**
	 * Initializes a background demo
	 */
	public initializeBackgroundDemo(): void {
		this.gameMode = 'background_demo';
		this.loadMainScene();
	}

	/**
	 * Loads the main game scene with appropriate settings
	 */
	private loadMainScene(): void {
		if (this.gameMode === 'single') {
			this.scene.setGameMode('single');
		} else if (this.gameMode === 'multi') {
			this.scene.setGameMode('multi');
		} else if (this.gameMode === 'tournament') {
			this.scene.setGameMode('tournament');
		} else if (this.gameMode === 'background_demo') {
			this.scene.setGameMode('background_demo');
		}

		// Reset positions of game objects
		if (this.scene.getBall()) {
			this.scene.getBall().restart();
		}
		if (this.scene.getPlayer1()) {
			this.scene.getPlayer1().resetPosition();
		}
		if (this.scene.getPlayer2()) {
			this.scene.getPlayer2().resetPosition();
		}

		// Load the scene
		this.scene.load();
	}

	// =========================================
	// Game Loop
	// =========================================
	/**
	 * Renders the current game scene
	 */
	public draw(): void {
		this.clearScreen();
		this.scene.draw();
	}

	/**
	 * Updates the game state for the current frame
	 */
	public update(): void {
		if (this.scene) {
			// Only update if the game is active
			if (this.scene.isBackgroundDemo()) {
				// Background demo has special update rules
				// For example, ignore certain input checks
			}
			
			try {
				this.scene.update();
			} catch (error) {
				console.error('Error updating game scene:', error);
			}
		}
	}

	// =========================================
	// Pause Management
	// =========================================
	/**
	 * Sets up keyboard event listeners for pause control
	 */
	private bindPauseControls(): void {
		this.keyboardEventListener = this.handleKeydown.bind(this);
		window.addEventListener('keydown', this.keyboardEventListener);
	}

	/**
	 * Toggles the game between paused and playing states
	 */
	public togglePause(): void {
		if (!(this.scene instanceof GameScene)) {
			return;
		}

		const gameScene = this.scene;
		const resizeManager = gameScene.getResizeManager();
		if (resizeManager?.isCurrentlyResizing()) {
			return;
		}
		
		const pauseManager = gameScene.getPauseManager();
		if (pauseManager.hasState(GameState.PLAYING)) {
			gameScene.handlePause();
			this.pauseMatchTimer();
		} else if (pauseManager.hasState(GameState.PAUSED)) {
			gameScene.handleResume();
			this.resumeMatchTimer();
		}
	}

	/**
	 * Returns whether the game is currently paused
	 */
	public isGamePaused(): boolean {
		if (!(this.scene instanceof GameScene)) {
			return false;
		}
		return this.scene.getPauseManager().hasState(GameState.PAUSED);
	}

	// =========================================
	// Resize Handling
	// =========================================
	/**
	 * Handles canvas resize operations
	 * @param width The new canvas width
	 * @param height The new canvas height
	 */
	public resize(width: number, height: number): void {
		// Update the canvas size first
		if (this.context && this.context.canvas) {
			this.context.canvas.width = width;
			this.context.canvas.height = height;
		}
		
		// Inform game objects about the resize
		if (this.scene instanceof GameScene) {
			// Let the scene handle updating its objects
			this.scene.getPlayer1()?.updateSizes();
			this.scene.getPlayer2()?.updateSizes();
		}
		
		// Redraw the scene
		this.draw();
	}

	// =========================================
	// Rendering Methods
	// =========================================
	/**
	 * Clears the canvas for a new frame
	 */
	private clearScreen(): void {
		const { width, height } = this.context.canvas;
		this.context.beginPath();
		this.context.clearRect(0, 0, width, height);
		this.context.closePath();
	}

	// =========================================
	// Cleanup and State Management
	// =========================================
	/**
	 * Cleans up resources
	 */
	public cleanup(): void {
		// Stop all timers first to prevent any further recording
		this.stopAllTimers();
		
		// Remove keyboard event listener if it exists
		if (this.keyboardEventListener) {
			window.removeEventListener('keydown', this.keyboardEventListener);
			this.keyboardEventListener = null;
		}
		
		// Complete any active match if it hasn't been completed yet
		if (!this.matchCompleted && this.matchId && !this.scene.isBackgroundDemo()) {
			try {
				const winnerIndex = this.scene?.getPlayer1().getScore() > this.scene?.getPlayer2().getScore() ? 0 : 1;
				this.completeMatch(winnerIndex);
			} catch (error) {
				console.error('Error completing match during cleanup:', error);
			}
		}
		
		// Clean up the scene
		if (this.scene) {
			try {
				this.scene.unload();
				this.scene = null as any;
			} catch (error) {
				console.error('Error unloading scene:', error);
			}
		}
		
		// Clear the context reference
		this.context = null as any;
	}

	/**
	 * Returns information about the current game state
	 */
	public getGameState(): GameStateInfo {
		return {
			player1Score: this.scene.getPlayer1().getScore(),
			player2Score: this.scene.getPlayer2().getScore(),
			isGameOver: this.scene.isGameOver(),
			winner: this.scene.getWinner()
		};
	}

	/**
	 * Sets player names for display and tracking
	 * @param player1Name Name for player 1
	 * @param player2Name Name for player 2
	 */
	public setPlayerNames(player1Name: string, player2Name: string): void {
		if (this.scene) {
			this.scene.getPlayer1().setName(player1Name);
			this.scene.getPlayer2().setName(player2Name);
		}
	}

	/**
	 * Update player colors for paddles
	 * @param p1Color Color for player 1's paddle (hex format)
	 * @param p2Color Color for player 2's paddle (hex format)
	 */
	public updatePlayerColors(p1Color: string, p2Color?: string): void {
		try {
			const scene = this.scene;
			if (!scene) return;
			
			// Store colors in the playerColors array for reference
			this.playerColors[0] = p1Color;
			if (p2Color) {
				this.playerColors[1] = p2Color;
			}
			
			const player1 = scene.getPlayer1();
			const player2 = scene.getPlayer2();
			
			if (player1) {
				// Set player 1's color
				player1.setColor(p1Color);
			}
			
			if (player2) {
				if (this.gameMode === 'single' && player2.isAIControlled()) {
					// For AI in single player mode, always use white
					player2.setColor('#ffffff');
					this.playerColors[1] = '#ffffff';
				} else if (p2Color) {
					// For human player 2, always use their chosen color
					player2.setColor(p2Color);
				} else {
					// Fallback only if p2Color is undefined/null
					player2.setColor('#2ecc71');
					this.playerColors[1] = '#2ecc71';
				}
			}
		} catch (error: any) {
			console.error('Error updating player colors:', error);
		}
	}

	/**
	 * Sets player IDs for match tracking
	 * @param ids - Array of player IDs
	 */
	public setPlayerIds(ids: number[]): void {
		this.playerIds = ids.map(id => Number(id)); // Ensure all IDs are numbers
		
		// Create match if we have valid IDs
		this.createMatch();
	}

	/**
	 * Creates a match in the database for any game mode
	 */
	private createMatch(): void {
		// Skip if already created or in background demo
		if (this.matchCreated || this.scene.isBackgroundDemo()) {
			return;
		}

		// For single player mode, we only need player 1 ID
		const isSinglePlayer = this.gameMode === 'single';
		
		// Ensure we have at least one player ID (for single player)
		if (this.playerIds.length < 1 || this.playerIds[0] === undefined) {
			return;
		}

		const player1Id = this.playerIds[0];
		
		// For single player, create an AI opponent ID
		let player2Id: number;
		
		if (isSinglePlayer) {
			// Use ID 0 for AI opponent
			player2Id = 0;
		} else {
			// For multiplayer modes, use the second player's ID
			if (this.playerIds.length >= 2) {
				player2Id = this.playerIds[1];
			} else {
				return;
			}
		}

		// Set flag to prevent duplicate creation during async operation
		this.matchCreated = true;
		
		// Create match based on game mode
		const tournamentId = this.gameMode === 'tournament' ? 1 : undefined;
		
		DbService.createMatch(player1Id, player2Id, tournamentId)
			.then(match => {
				this.matchId = match.id;
				
				// Store match ID in localStorage for reference
				localStorage.setItem('current_match_id', match.id.toString());
				localStorage.setItem('current_match_start_time', Date.now().toString());
			})
			.catch(error => {
				console.error('Failed to create match:', error);
				// Reset flag to allow retry
				this.matchCreated = false;
			});
	}

	/**
	 * Starts the match timer - called when actual gameplay begins
	 * This should be called AFTER the initial countdown
	 */
	public startMatchTimer(): void {
		// Skip for background demo mode
		if (this.scene.isBackgroundDemo()) {
			return;
		}

		// Initialize timers
		this.matchStartTime = Date.now();
		this.goalStartTime = Date.now();
		this.totalPausedTime = 0;
		this.isPaused = false;
		
		// Create match record in database if needed
		if (!this.matchCreated) {
			this.createMatch();
		}
		
		// Set up match timeout (10 minutes)
		this.setupMatchTimeout();
	}

	/**
	 * Sets up a timeout to auto-complete matches after 10 minutes
	 * This prevents abandoned matches from staying open
	 */
	private setupMatchTimeout(): void {
		// 10 minutes in milliseconds
		const MAX_MATCH_DURATION = 10 * 60 * 1000;
		
		setTimeout(() => {
			// Only timeout if match is still active and not completed
			if (!this.matchCompleted && this.matchId && !this.scene.isBackgroundDemo()) {
				// Determine winner based on current score
				const winnerIndex = this.scene?.getPlayer1().getScore() > this.scene?.getPlayer2().getScore() ? 0 : 1;
				
				// Complete the match with timeout flag
				this.completeMatch(winnerIndex, true);
			}
		}, MAX_MATCH_DURATION);
	}

	/**
	 * Completes the match in the database
	 * @param winnerIndex - Index of the winning player (0 for player 1, 1 for player 2)
	 * @param timeout - Whether the match ended due to timeout
	 */
	public completeMatch(_winnerIndex: number, timeout: boolean = false): void {
		// Skip if already completed or in background demo
		if (this.scene.isBackgroundDemo() || this.matchCompleted) {
			return;
		}

		// Store game result in cache before completing match
		this.dispatchGameOver();
		
		// Ensure we have a match ID
		if (!this.matchId) {
			if (this.gameMode === 'single' && this.playerIds.length > 0 && !this.matchCreated) {
				// Last attempt to create match for single player
				this.createMatch();
				
				if (!this.matchId) {
					return;
				}
			} else {
				return;
			}
		}
		
		// Calculate match duration
		const matchDuration = this.getMatchDuration();
		
		// Stop the timer
		this.isPaused = true;
		
		// Mark match as completed to prevent duplicates
		this.matchCompleted = true;
		
		// Update match in database
		DbService.completeMatch(this.matchId, matchDuration, timeout)
			.then(() => {
				// Clean up localStorage references
				localStorage.removeItem('current_match_id');
				localStorage.removeItem('current_match_start_time');
			})
			.catch((error: any) => {
				console.error('Failed to complete match:', error);
				// Reset completed flag to allow retry
				this.matchCompleted = false;
			});
	}
	
	/**
	 * Gets the current match duration in seconds, accounting for paused time
	 */
	public getMatchDuration(): number {
		if (!this.matchStartTime) return 0;
		
		const currentTime = Date.now();
		const totalPaused = this.totalPausedTime + (this.isPaused ? (currentTime - this.pauseStartTime) : 0);
		return (currentTime - this.matchStartTime - totalPaused) / 1000;
	}

	/**
	 * Requests the game to pause, considering the current game state
	 */
	public requestPause(): void {
		if (!(this.scene instanceof GameScene)) {
			return;
		}
		
		const pauseManager = this.scene.getPauseManager();
		
		// If in countdown, set a flag for pending pause
		if (pauseManager.hasState(GameState.COUNTDOWN)) {
			pauseManager.setPendingPauseRequest(true);
		} 
		// Otherwise pause immediately if not already paused
		else if (!pauseManager.hasState(GameState.PAUSED)) {
			this.scene.handlePause();
			this.pauseMatchTimer();
		}
	}

	/**
	 * Pauses the match timer
	 */
	public pauseMatchTimer(): void {
		// Skip for background demo mode
		if (this.scene.isBackgroundDemo()) {
			return;
		}

		if (!this.isPaused) {
			this.isPaused = true;
			this.pauseStartTime = Date.now();
		}
	}

	/**
	 * Resumes the match timer
	 */
	public resumeMatchTimer(): void {
		// Skip for background demo mode
		if (this.scene.isBackgroundDemo()) {
			return;
		}

		if (this.isPaused) {
			// Add the paused duration to the total paused time
			this.totalPausedTime += (Date.now() - this.pauseStartTime);
			this.isPaused = false;
		}
	}

	/**
	 * Starts the goal timer
	 */
	public startGoalTimer(): void {
		this.goalStartTime = Date.now() - this.totalPausedTime;
	}
	
	/**
	 * Records a goal in the database
	 * @param scoringPlayerIndex - The index of the player who scored (0 for player 1, 1 for player 2)
	 */
	public recordGoal(scoringPlayerIndex: number): void {
		// Skip recording for background demo
		if (this.scene.isBackgroundDemo()) {
			return;
		}
		
		// Skip if match is already completed
		if (this.matchCompleted) {
			return;
		}
		
		// Ensure we have a match ID
		if (!this.matchId) {
			if (!this.matchCreated && this.scene.requiresDbRecording()) {
				this.createMatch();
				
				// If still no match after creation attempt, give up
				if (!this.matchId) {
					return;
				}
			} else {
				return;
			}
		}
		
		// Determine the scoring player's ID
		let scoringPlayerId: number;
		
		// Special handling for AI in single player mode
		if (scoringPlayerIndex === 1 && this.scene.isSinglePlayer()) {
			scoringPlayerId = 0; // Use ID 0 for AI
		} else if (scoringPlayerIndex >= 0 && scoringPlayerIndex < this.playerIds.length) {
			scoringPlayerId = this.playerIds[scoringPlayerIndex];
		} else {
			return;
		}
		
		// Calculate goal duration accounting for pauses
		const currentTime = Date.now();
		const goalDuration = ((currentTime - this.goalStartTime) - 
							  (this.isPaused ? (currentTime - this.pauseStartTime) : 0)) / 1000;
		
		// Record the goal in the database
		DbService.recordGoal(this.matchId, scoringPlayerId, goalDuration)
			.then(() => {
				// Reset the goal timer for the next goal
				this.resetGoalTimer();
			})
			.catch((error: any) => {
				// Don't log errors for completed matches as these are expected
				if (!(error && error.message && error.message.includes('already completed'))) {
					console.error('Failed to record goal:', error);
				}
			});
	}
	
	/**
	 * Resets the goal timer for a new point
	 * Called after a goal is scored or at point start
	 */
	public resetGoalTimer(): void {
		// Skip for background demo mode
		if (this.scene.isBackgroundDemo()) {
			return;
		}

		// Account for paused time when resetting
		this.goalStartTime = Date.now() - this.totalPausedTime;
	}

	/**
	 * Enables or disables keyboard input
	 * @param enabled Whether keyboard control should be enabled
	 */
	public setKeyboardEnabled(enabled: boolean): void {
		// If there's an existing listener, remove it
		if (this.keyboardEventListener) {
			window.removeEventListener('keydown', this.keyboardEventListener);
			this.keyboardEventListener = null;
		}
		
		// Only add a new listener if enabled
		if (enabled) {
			this.keyboardEventListener = this.handleKeydown.bind(this);
			window.addEventListener('keydown', this.keyboardEventListener);
		}
	}

	/**
	 * Handles keyboard input events
	 * @param evt The keyboard event
	 */
	private handleKeydown(evt: KeyboardEvent): void {
		if (evt.code === KEYS.ENTER || evt.code === KEYS.ESC) {
			this.togglePause();
		}
	}

	/**
	 * Gets the current match ID
	 * @returns The current match ID or null
	 */
	public getMatchId(): number | null {
		return this.matchId;
	}

	/**
	 * Stops all timers and ongoing processes
	 * Used during cleanup or when the game ends
	 */
	public stopAllTimers(): void {
		// Flag to prevent further timer updates
		this.isPaused = true;
		this.matchCompleted = true;
	}

	private dispatchGameOver(): void {
		if (this.scene.isBackgroundDemo()) return;

		const player1 = this.scene.getPlayer1();
		const player2 = this.scene.getPlayer2();
		const winner = this.scene.getWinner();

		// Get player names and scores correctly
		const player1Name = player1.name; // Access name property directly
		const player2Name = player2.name;
		const player1Score = player1.getScore();
		const player2Score = player2.getScore();
		const winnerName = winner ? winner.name : (player1Score > player2Score ? player1Name : player2Name);

		// Store game result directly in cache
		import('@website/scripts/utils').then(({ MatchCache }) => {
			// Store complete game info in cache
			MatchCache.setLastMatchResult({
				winner: winnerName,
				player1Name: player1Name,
				player2Name: player2Name,
				player1Score: player1Score,
				player2Score: player2Score
			});

			// Use proper GameMode enum values
			MatchCache.setCurrentGameInfo({
				gameMode: this.gameMode === 'single' ? GameMode.SINGLE : 
						 this.gameMode === 'multi' ? GameMode.MULTI : 
						 this.gameMode === 'tournament' ? GameMode.TOURNAMENT : GameMode.SINGLE,
				playerIds: this.playerIds,
				playerNames: [player1Name, player2Name],
				playerColors: this.playerColors
			});

			// Dispatch minimal game over event
			const gameOverEvent = new CustomEvent('gameOver', {
				detail: {
					matchId: this.matchId,
					gameMode: this.gameMode
				}
			});
			window.dispatchEvent(gameOverEvent);
		});
	}
}
