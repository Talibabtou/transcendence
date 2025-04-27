import { GameContext, GameState, GameStateInfo } from '@pong/types';
import { GameScene } from '@pong/game/scenes';
import { KEYS } from '@pong/constants';
import { DbService } from '@website/scripts/utils';

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
	private gameMode: 'single' | 'multi' | 'tournament' | 'background_demo' = 'single';
	private keyboardEventListener: ((evt: KeyboardEvent) => void) | null = null;
	private matchStartTime: number = 0;
	private playerIds: number[] = [];
	private playerNames: string[] = [];
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
			if (this.gameMode === 'background_demo') {
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
		if (this.scene) {
			this.scene.unload();
			this.scene = null as any;
		}
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
		this.playerNames = [player1Name, player2Name];
		console.log('Player names set:', this.playerNames);
		
		if (this.scene) {
			this.scene.getPlayer1().setName(player1Name);
			this.scene.getPlayer2().setName(player2Name);
		}
	}

	/**
	 * Sets player colors
	 * @param playerOneColor Color for player one (hex format)
	 * @param playerTwoColor Optional color for player two (hex format)
	 */
	public updatePlayerColors(playerOneColor: string, playerTwoColor?: string): void {
		this.playerColors = [playerOneColor, playerTwoColor || '#FF5722'];
		console.log('Player colors set:', this.playerColors);
		
		if (this.scene) {
			// Update Player 1's color
			const player1 = this.scene.getPlayer1();
			if (player1) {
				player1.setColor(playerOneColor);
			}
			
			// If player two color is provided, update it as well
			const player2 = this.scene.getPlayer2();
			if (player2 && playerTwoColor) {
				player2.setColor(playerTwoColor);
			}
		}
	}

	/**
	 * Sets player IDs for match tracking
	 * @param ids - Array of player IDs
	 */
	public setPlayerIds(ids: number[]): void {
		this.playerIds = ids.map(id => Number(id)); // Ensure all IDs are numbers
		console.log('Player IDs set in game engine:', this.playerIds);
		
		// Create match if we have valid IDs
		this.createMatch();
	}

	/**
	 * Creates a match in the database for any game mode
	 */
	private createMatch(): void {
		// Skip if already created or in background demo
		if (this.matchCreated || this.gameMode === 'background_demo') {
			console.log('Skipping match creation - already created or background demo');
			return;
		}

		// For single player mode, we only need player 1 ID
		const isSinglePlayer = this.gameMode === 'single';
		
		// Ensure we have at least one player ID (for single player)
		if (this.playerIds.length < 1 || this.playerIds[0] === undefined) {
			console.warn('Cannot create match - missing player IDs', this.playerIds);
			return;
		}

		const player1Id = this.playerIds[0];
		
		// For single player, create an AI opponent ID
		let player2Id: number;
		
		if (isSinglePlayer) {
			// Use ID 0 for AI opponent
			player2Id = 0;
			console.log('Using AI player ID 0 for single player match');
		} else {
			// For multiplayer modes, use the second player's ID
			if (this.playerIds.length >= 2) {
				player2Id = this.playerIds[1];
			} else {
				console.warn('Missing second player ID for multiplayer match');
				return;
			}
		}

		// Set flag to prevent duplicate creation during async operation
		this.matchCreated = true;
		
		// Create match based on game mode
		const tournamentId = this.gameMode === 'tournament' ? 1 : undefined;
		
		console.log('Creating match with players:', player1Id, player2Id);
		
		DbService.createMatch(player1Id, player2Id, tournamentId)
			.then(match => {
				this.matchId = match.id;
				console.log('Created match in game engine:', match);
				
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
	 * Starts the match and goal timers
	 */
	public startMatchTimer(): void {
		// Skip for background demo mode
		if (this.gameMode === 'background_demo') {
			console.log('Background demo - skipping timer initialization');
			return;
		}

		this.matchStartTime = Date.now();
		this.goalStartTime = Date.now();
		this.totalPausedTime = 0;
		this.isPaused = false;
		
		console.log('Match timer started at:', new Date(this.matchStartTime).toISOString());
		
		// Create match if it hasn't been created yet (fallback)
		if (!this.matchCreated) {
			this.createMatch();
		}
	}

	/**
	 * Pauses the match timer
	 */
	public pauseMatchTimer(): void {
		// Skip for background demo mode
		if (this.gameMode === 'background_demo') {
			return;
		}

		if (!this.isPaused) {
			this.isPaused = true;
			this.pauseStartTime = Date.now();
			console.log('Match timer paused at:', this.getMatchDuration());
		}
	}

	/**
	 * Resumes the match timer
	 */
	public resumeMatchTimer(): void {
		// Skip for background demo mode
		if (this.gameMode === 'background_demo') {
			return;
		}

		if (this.isPaused) {
			// Add the paused duration to the total paused time
			this.totalPausedTime += (Date.now() - this.pauseStartTime);
			this.isPaused = false;
			console.log('Match timer resumed at:', this.getMatchDuration());
		}
	}

	/**
	 * Starts the goal timer
	 */
	public startGoalTimer(): void {
		this.goalStartTime = Date.now() - this.totalPausedTime;
		console.log('Goal timer started');
	}
	
	/**
	 * Records a goal in the database
	 * @param scoringPlayerIndex - The index of the player who scored (0 for player 1, 1 for player 2)
	 */
	public recordGoal(scoringPlayerIndex: number): void {
		// Skip recording for background demo
		if (this.gameMode === 'background_demo') {
			return;
		}
		
		if (!this.matchId) {
			console.warn('Cannot record goal - missing match ID, attempting to create match');
			this.createMatch();
			return;
		}
		
		let scoringPlayerId: number;
		
		// Handle single player AI (player 2) specially
		if (scoringPlayerIndex === 1 && this.gameMode === 'single') {
			scoringPlayerId = 0; // Use ID 0 for AI
			console.log('Recording goal for AI player (ID: 0)');
		} else if (scoringPlayerIndex > 1 || this.playerIds.length <= scoringPlayerIndex) {
			// This handles invalid indices for real players
			console.warn('Cannot record goal - invalid player index:', scoringPlayerIndex);
			return;
		} else {
			// Normal goal for human player
			scoringPlayerId = this.playerIds[scoringPlayerIndex];
			if (!scoringPlayerId) {
				console.warn('Cannot record goal - player ID not found for index', scoringPlayerIndex);
				return;
			}
		}
		
		// Calculate goal duration accounting for pauses
		const currentTime = Date.now();
		const goalDuration = ((currentTime - this.goalStartTime) - 
							  (this.isPaused ? (currentTime - this.pauseStartTime) : 0)) / 1000;
		
		console.log('Recording goal:', {
			matchId: this.matchId,
			playerId: scoringPlayerId,
			duration: goalDuration.toFixed(2)
		});
		
		// Record the goal in the database
		DbService.recordGoal(this.matchId, scoringPlayerId, goalDuration)
			.then(goal => {
				console.log('Goal recorded successfully:', goal);
				// Reset the goal timer for the next goal
				this.goalStartTime = Date.now() - this.totalPausedTime;
			})
			.catch(error => {
				console.error('Failed to record goal:', error);
			});
	}
	
	/**
	 * Completes the match in the database
	 * @param winnerIndex - Index of the winning player (0 for player 1, 1 for player 2)
	 */
	public completeMatch(winnerIndex: number): void {
		// Skip recording for background demo
		if (this.gameMode === 'background_demo') {
			return;
		}
		
		// Skip if we've already completed this match
		if (this.matchCompleted) {
			console.log('Match already completed, skipping duplicate completion');
			return;
		}
		
		if (!this.matchId && this.gameMode === 'single' && this.playerIds.length > 0) {
			// Try to create match one last time for single player
			console.log('Attempting to create match before completion for single player');
			this.createMatch();
			
			// If still no match ID, we can't complete
			if (!this.matchId) {
				console.warn('Cannot complete match - still missing match ID after creation attempt');
				return;
			}
		} else if (!this.matchId) {
			console.warn('Cannot complete match - missing match ID');
			return;
		}
		
		// Calculate total match duration and stop timer
		const matchDuration = this.getMatchDuration();
		this.isPaused = true; // Stop the timer
		
		console.log('Completing match:', {
			matchId: this.matchId,
			duration: matchDuration.toFixed(2),
			winner: this.playerIds[winnerIndex] || (winnerIndex === 1 ? 0 : 'unknown')
		});
		
		// Mark match as completed to prevent duplicates
		this.matchCompleted = true;
		
		// Get winner ID - for AI (player 2 in single player), use 0
		const winnerId = winnerIndex === 1 && this.gameMode === 'single' ? 
			0 : // AI ID 
			(this.playerIds[winnerIndex] || 0);
		
		// Update the match as completed in the database
		DbService.completeMatch(this.matchId, matchDuration)
			.then(match => {
				console.log('Match completed successfully:', match);
				
				// Clear the current match ID from localStorage
				localStorage.removeItem('current_match_id');
				localStorage.removeItem('current_match_start_time');
			})
			.catch(error => {
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
	 * Resets the goal timer for a new point
	 */
	public resetGoalTimer(): void {
		// Skip for background demo mode
		if (this.gameMode === 'background_demo') {
			return;
		}

		// Account for paused time when resetting
		this.goalStartTime = Date.now() - this.totalPausedTime;
		console.log('Goal timer reset for new point');
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
}
