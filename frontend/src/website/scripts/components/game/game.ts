import { Component, GameMenuComponent, GameOverComponent, GameCanvasComponent, GameManager, PlayersRegisterComponent, TournamentComponent } from '@website/scripts/components';
import { appState, MatchCache, TournamentCache } from '@website/scripts/utils';
import { GameMode } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import { NotificationManager } from '@website/scripts/services';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Define the possible game states
 */
enum GameState {
	MENU = 'menu',
	PLAYER_REGISTRATION = 'player_registration',
	TOURNAMENT = 'tournament',
	PLAYING = 'playing',
	GAME_OVER = 'game_over'
}

/**
 * Define state interface for the game component
 */
interface GameComponentState {
	currentState: GameState;
	currentMode: GameMode;
	playerIds?: string[];
	playerNames?: string[];
	playerColors?: string[];
}

// =========================================
// GAME COMPONENT
// =========================================

export class GameComponent extends Component<GameComponentState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private gameManager: GameManager;
	private gameStateInterval: number | null = null;
	
	// Sub-components
	private menuComponent: GameMenuComponent | null = null;
	private gameOverComponent: GameOverComponent | null = null;
	private canvasComponent: GameCanvasComponent | null = null;
	
	// Container for game components
	private gameContainer: HTMLElement | null = null;
	
	private isTransitioning = false;
	private lastGameOverCheck = 0;
	private readonly MIN_GAME_DURATION_MS = 2000;
	private gameStartTime = 0;
	private unsubscribe: (() => void) | null = null;
	
	// Add a reference to the player registration component
	private playerRegistrationComponent: PlayersRegisterComponent | null = null;
	
	// Add a reference to the TournamentComponent
	private TournamentComponent: TournamentComponent | null = null;
	
	private lastAuthState: boolean | null = null;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement) {
		super(container, {
			currentState: GameState.MENU,
			currentMode: GameMode.SINGLE
		});
		
		this.gameManager = GameManager.getInstance();
		this.lastAuthState = appState.isAuthenticated();
		
		// Subscribe to app state changes
		this.unsubscribe = appState.subscribe((newState) => {
			this.handleStateChange(newState);
		});
		
		// Set game over callback
		this.gameManager.setOnGameOverCallback((result) => {
			
			// If in tournament mode, process the result in the tournament component
			if (this.getInternalState().currentMode === GameMode.TOURNAMENT && this.TournamentComponent) {
				// Process the game result in the tournament
				this.TournamentComponent.processGameResult(
					result.player1Score,
					result.player2Score,
					result.matchId
				);
			}
			
			// Force transition to game over state
			this.updateGameState(GameState.GAME_OVER);
		});
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	render(): void {
		// Clear container
		this.container.innerHTML = '';
		this.container.style.height = "100%";
		this.gameContainer = document.createElement('div');
		this.gameContainer.className = 'game-container';
		this.gameContainer.style.position = "relative";
		this.container.appendChild(this.gameContainer);
		
		// Initialize sub-components
		this.initializeComponents();
		
		// Show initial menu - DON'T call renderComponent() - just set state
		if (this.menuComponent) {
			this.menuComponent.show(); // This will update state and trigger render automatically
		}
	}
	
	destroy(): void {
		// Unsubscribe from app state
		if (this.unsubscribe) {
			this.unsubscribe();
		}
		
		// Clean up the main game
		if (this.canvasComponent) {
			this.canvasComponent.stopGame();
		}
		
		// Show background game
		this.gameManager.showBackgroundGame();
		
		// Now clean up sub-components
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = null;
		}
		if (this.gameOverComponent) {
			this.gameOverComponent.destroy();
			this.gameOverComponent = null;
		}
		if (this.canvasComponent) {
			this.canvasComponent.destroy();
			this.canvasComponent = null;
		}
		// Stop monitoring
		this.stopGameStateMonitoring();
		// Call parent destroy last
		super.destroy();
	}
	
	// =========================================
	// COMPONENT MANAGEMENT
	// =========================================
	
	/**
	 * Initializes all sub-components
	 */
	private initializeComponents(): void {
		if (!this.gameContainer) return;
		
		// Destroy existing components first to prevent duplicate listeners/instances
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = null;
		}
		if (this.gameOverComponent) {
			this.gameOverComponent.destroy();
			this.gameOverComponent = null;
		}
		if (this.canvasComponent) {
			// Decide if canvas needs full destroy or just stopGame/hide
			// For safety, let's destroy it if we are re-initializing everything
			this.canvasComponent.destroy();
			this.canvasComponent = null;
		}

		// Create components with proper containers
		this.menuComponent = new GameMenuComponent(
			this.gameContainer,
			this.handleModeSelected.bind(this),
			this.handleTournamentRestored.bind(this),
			this.handleShowTournamentSchedule.bind(this)
		);

		this.gameOverComponent = new GameOverComponent(
			this.gameContainer,
			this.handlePlayAgain.bind(this),
			this.handleBackToMenu.bind(this),
			this.handleShowTournamentSchedule.bind(this)
		);

		this.canvasComponent = new GameCanvasComponent(this.gameContainer);
	}
	
	// =========================================
	// STATE MANAGEMENT
	// =========================================
	
	/**
	 * Updates the game state and handles state transitions
	 * @param newState - The new game state to transition to
	 */
	private updateGameState(newState: GameState): void {
		const state = this.getInternalState();
		
		// Skip if state hasn't changed
		if (state.currentState === newState) return;
		
		// Update internal state
		this.updateInternalState({
			currentState: newState
		});
		
		// Handle state transition
		switch (newState) {
			case GameState.MENU:
				this.showMenu();
				break;
				
			case GameState.PLAYER_REGISTRATION:
				this.showPlayerRegistration();
				break;
				
			case GameState.TOURNAMENT:
				this.showTournamentTransition();
				break;
				
			case GameState.PLAYING:
				this.startPlaying();
				break;
				
			case GameState.GAME_OVER:
				this.showGameOver();
				break;
		}
	}
	
	/**
	 * Shows the game menu and handles related state changes
	 */
	private showMenu(): void {
		if (this.canvasComponent) {
			this.canvasComponent.stopGame();
		}

		if (this.gameOverComponent) {
			this.gameOverComponent.hide();
		}

		// Ensure menu component is destroyed BEFORE creating a new one
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = null; // Explicitly nullify
		}

		// Create and show the new menu component
		if (this.gameContainer) {
			this.menuComponent = new GameMenuComponent(
				this.gameContainer,
				this.handleModeSelected.bind(this),
				this.handleTournamentRestored.bind(this),
				this.handleShowTournamentSchedule.bind(this)
			);
			this.menuComponent.show();
		} else {
			NotificationManager.showError('Game container not found, cannot create menu.');
		}

		// Show background game
		this.gameManager.showBackgroundGame();

		this.stopGameStateMonitoring();
	}
	
	/**
	 * Starts the game with the selected mode
	 */
	private startPlaying(): void {
		const state = this.getInternalState();
		
		// Get current user info
		const currentUser = appState.getCurrentUser();
		const playerName = currentUser?.username || 'Player 1';
		const playerColor = appState.getAccentColorHex() || '#ffffff';

		// Ensure we have player IDs for single player mode
		if (state.currentMode === GameMode.SINGLE && (!state.playerIds || state.playerIds.length === 0)) {
			// For single player, we need to explicitly set the current user's ID
			if (currentUser && currentUser.id) {
				state.playerIds = [currentUser.id];
			}
		}
		
		if (this.menuComponent) {
			this.menuComponent.hide();
		}
		
		if (this.gameOverComponent) {
			this.gameOverComponent.hide();
		}
		
		// Hide background game (but keep it running)
		this.gameManager.hideBackgroundGame();
		
		// Ensure the canvas component is properly created and rendered
		if (!this.canvasComponent) {
			if (this.gameContainer) {
				this.canvasComponent = new GameCanvasComponent(this.gameContainer);
				this.canvasComponent.render();
			} else {
				NotificationManager.showError('Game container not available');
				return;
			}
		} else {
			// Re-render the canvas component
			this.canvasComponent.render();
		}
		
		// Start the game with selected mode and player info
		if (this.canvasComponent) {
			
			// For single player mode, use the current user's info if playerNames not already set
			const playerNames = state.playerNames || [playerName];
			const playerColors = state.playerColors || [playerColor];
			
			this.canvasComponent.startGame(state.currentMode, {
				playerIds: state.playerIds,
				playerNames: playerNames,
				playerColors: playerColors
			});
		}
		
		// Start monitoring game state
		this.startGameStateMonitoring();
	}
	
	/**
	 * Shows the game over screen while keeping the game visible
	 */
	private showGameOver(): void {
		// Get data from MatchCache instead of canvas component
		const cachedResult = MatchCache.getLastMatchResult();
		const gameInfo = MatchCache.getCurrentGameInfo();
		
		if (!cachedResult) {
			NotificationManager.showError('No game result found in cache');
			return;
		}
		
		// Make sure the game is paused but still visible
		if (this.canvasComponent) {
			const gameEngine = this.canvasComponent.getEngine();
			if (gameEngine && !gameEngine.isGamePaused()) {
				gameEngine.togglePause();
			}
		}

		// Show game over component with the cached data
		if (this.gameOverComponent) {
			this.gameOverComponent.showGameResult({
				winner: cachedResult.winner || 'Unknown',
				gameMode: gameInfo.gameMode,
				player1Name: cachedResult.player1Name || 'Player 1',
				player2Name: cachedResult.player2Name || 'Player 2',
				player1Score: cachedResult.player1Score || 0,
				player2Score: cachedResult.player2Score || 0,
				matchId: cachedResult.matchId
			});
		}
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================

	/**
	 * Handles mode selection from the menu
	 * @param mode - The selected game mode
	 */
	private handleModeSelected(mode: GameMode): void {
		// Check if user is authenticated before starting game
		if (!appState.isAuthenticated()) {
			NotificationManager.showError('User not authenticated');
			this.updateGameState(GameState.MENU);
			return;
		}
		
		this.updateInternalState({ currentMode: mode });
		
		// For multiplayer and tournament modes, show player registration first
		if (mode === GameMode.MULTI || mode === GameMode.TOURNAMENT) {
			this.updateGameState(GameState.PLAYER_REGISTRATION);
		} else {
			// For single player, go straight to game
			this.updateGameState(GameState.PLAYING);
		}
	}

	/**
	 * Handles play again button from game over screen
	 */
	private handlePlayAgain(mode: GameMode): void {
		// Prevent multiple transitions
		if (this.isTransitioning === true) {
			return;
		}
		
		// Set flag immediately to prevent duplicate calls
		this.isTransitioning = true;
		
		// Stop monitoring game state
		this.stopGameStateMonitoring();
		
		// Hide game over component
		if (this.gameOverComponent) {
			this.gameOverComponent.hide();
		}
		
		// Get player info from MatchCache instead of gameManager
		const gameInfo = MatchCache.getCurrentGameInfo();
		
		// Update state with mode AND player info from cache
		this.updateInternalState({ 
			currentMode: mode,
			playerIds: gameInfo.playerIds,
			playerNames: gameInfo.playerNames,
			playerColors: gameInfo.playerColors
		});
		
		// IMPORTANT: Check if we need to clean up first or can start directly
		const needsCleanup = this.canvasComponent && this.gameManager.isMainGameActive();
		
		// Create a promise chain that conditionally includes cleanup
		let startSequence: Promise<void>;
		
		if (needsCleanup) {
			startSequence = this.cleanupCurrentGame();
		} else {
			startSequence = Promise.resolve();
		}
		
		// Continue with starting the new game
		startSequence
			.then(() => {
				// Hide background game before starting new game
				const gameManager = GameManager.getInstance();
				gameManager.hideBackgroundGame();
				
				// Start the game with the selected mode
				return this.startNewGame(mode);
			})
			.catch(error => {
				NotificationManager.showError('Error restarting game: ' + error);
				// On error, go back to menu
				this.updateGameState(GameState.MENU);
			})
			.finally(() => {
				// Add a small delay before resetting the transition flag
				setTimeout(() => {
					this.isTransitioning = false;
				}, 500);
			});
	}

	/**
	 * Handles back to menu button from game over screen
	 */
	private handleBackToMenu(): void {
		// Prevent multiple transitions happening simultaneously
		if (this.isTransitioning) {
			NotificationManager.showWarning('Ignoring back to menu request - transition already in progress');
			return;
		}
		
		this.isTransitioning = true;
		
		// Stop monitoring first
		this.stopGameStateMonitoring();
		
		// Clear the match cache since we're going back to menu
		MatchCache.clearCache();
		
		// Hide tournament transitions component if it exists
		if (this.TournamentComponent) {
			this.TournamentComponent.hide();
			// Destroy it to make sure we create a new one next time
			this.TournamentComponent.destroy();
			this.TournamentComponent = null;
		}
		
		// Force a complete recreate of the menu component
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = null;
		}
		
		// Clean up current game state
		this.cleanupCurrentGame()
			.then(() => {
				// Create a new menu component
				if (this.gameContainer) {
					this.menuComponent = new GameMenuComponent(
						this.gameContainer,
						this.handleModeSelected.bind(this),
						this.handleTournamentRestored.bind(this),
						this.handleShowTournamentSchedule.bind(this)
					);
				}
				
				// Update state to menu
				this.updateInternalState({
					currentState: GameState.MENU
				});
				
				// Show the menu
				if (this.menuComponent) {
					this.menuComponent.show();
				}
			})
			.catch(error => {
				NotificationManager.showError('Error returning to menu: ' + error);
				// Force a menu state even on error
				this.forceMenuState();
			})
			.finally(() => {
				this.isTransitioning = false;
			});
	}

	/**
	 * Cleans up the current game state
	 * @returns Promise that resolves when cleanup is complete
	 */
	private cleanupCurrentGame(): Promise<void> {
		return new Promise<void>((resolve) => {
			// Now we actually want to fully stop the game
			if (this.canvasComponent) {
				this.canvasComponent.stopGame();
			}
			
			if (this.gameOverComponent) {
				this.gameOverComponent.hide();
			}
			
			// Allow a brief moment for cleanup to propagate
			setTimeout(resolve, 100);
		});
	}

	/**
	 * Starts a new game with the specified mode
	 * @param mode - Game mode to start
	 */
	private startNewGame(mode: GameMode): Promise<void> {
		return new Promise<void>((resolve) => {
			// Update state first
			this.updateInternalState({ currentMode: mode });
			
			// Check if we need to create a new canvas component
			if (!this.canvasComponent && this.gameContainer) {
				this.canvasComponent = new GameCanvasComponent(this.gameContainer);
			}
			
			// Ensure the canvas component is rendered
			if (this.canvasComponent) {
				this.canvasComponent.render();
				
				const state = this.getInternalState();
				const gameInfo = MatchCache.getCurrentGameInfo();
				
				// Use cache info if available, fallback to current user info
				const currentUser = appState.getCurrentUser();
				const playerName = currentUser?.username || 'Player 1';
				const playerColor = appState.getAccentColorHex() || '#ffffff';
				
				// Prioritize cached info over defaults
				const playerNames = state.playerNames || gameInfo.playerNames || [playerName];
				const playerColors = state.playerColors || gameInfo.playerColors || [playerColor];
				const playerIds = state.playerIds || gameInfo.playerIds;
				
				// Start the game with all available info
				this.canvasComponent.startGame(mode, {
					playerIds: playerIds,
					playerNames: playerNames,
					playerColors: playerColors
				});
			} else {
				NotificationManager.showError('Failed to create canvas component');
			}
			
			// Then transition to playing state
			this.updateGameState(GameState.PLAYING);
			
			// Record start time for game over detection throttling
			this.gameStartTime = Date.now();
			
			// Allow game to initialize fully
			setTimeout(resolve, 200);
		});
	}

	/**
	 * Emergency recovery method to force menu state when other transitions fail
	 */
	private forceMenuState(): void {
		// Hard reset of all game components
		if (this.canvasComponent) {
			this.canvasComponent.destroy();
			this.canvasComponent = null;
		}
		
		if (this.gameOverComponent) {
			this.gameOverComponent.hide();
		}
		
		// Recreate the menu component from scratch
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = null;
		}
		
		if (this.gameContainer) {
			this.menuComponent = new GameMenuComponent(
				this.gameContainer,
				this.handleModeSelected.bind(this),
				this.handleTournamentRestored.bind(this),
				this.handleShowTournamentSchedule.bind(this)
			);
		}
		
		// Show the background game
		this.gameManager.showBackgroundGame();
		
		// Force state update without using normal transition methods
		this.updateInternalState({
			currentState: GameState.MENU
		});
		
		// Show the menu if it exists
		if (this.menuComponent) {
			this.menuComponent.show();
		}
	}

	// =========================================
	// GAME STATE MONITORING
	// =========================================

	/**
	 * Starts monitoring game state to detect game over with safeguards
	 * against premature detection
	 */
	private startGameStateMonitoring(): void {
		this.stopGameStateMonitoring();
		this.lastGameOverCheck = Date.now();
		
		this.gameStateInterval = window.setInterval(() => {
			if (!this.canvasComponent) return;
			
			const now = Date.now();
			const gameElapsedTime = now - this.gameStartTime;
			
			// Prevent checks if game just started or we just checked
			if (gameElapsedTime < this.MIN_GAME_DURATION_MS || 
				(now - this.lastGameOverCheck) < 1000) {
				return;
			}
			
			// Update last check time
			this.lastGameOverCheck = now;
			
			// Check game state
			try {
				if (this.canvasComponent.isGameOver()) {
					this.updateGameState(GameState.GAME_OVER);
				}
			} catch (error) {
				NotificationManager.showError('Error checking game state: ' + error);
				// Prevent error loop by stopping monitoring on error
				this.stopGameStateMonitoring();
			}
		}, 500);
	}

	/**
	 * Stops monitoring game state
	 */
	private stopGameStateMonitoring(): void {
		if (this.gameStateInterval !== null) {
			clearInterval(this.gameStateInterval);
			this.gameStateInterval = null;
		}
	}

	// =========================================
	// AUTHENTICATION HANDLERS
	// =========================================

	/**
	 * Handles app state changes
	 * @param newState - The updated state properties
	 */
	private handleStateChange(newState: Partial<any>): void {
		const currentAuth = appState.isAuthenticated();

		// Handle authentication changes ONLY if the status has actually changed
		if ('auth' in newState && currentAuth !== this.lastAuthState) {
			this.lastAuthState = currentAuth;
			this.renderComponent();
		}

		// For accent color changes, update the player's color in the game
		if ('accentColor' in newState) {
			const accentColorHex = appState.getAccentColorHex();

			// Update color using the GameManager
			if (this.gameManager.isMainGameActive()) {
				this.gameManager.updateMainGamePlayerColor(accentColorHex);
			}
		}
	}

	/**
	 * Public method to reset the game component to menu state
	 * Called by the router when returning from auth cancellation
	 */
	public resetToMenu(): void {
		// Force a transition to menu state
		this.updateGameState(GameState.MENU);
	}

	// =========================================
	// NEW METHODS FOR GAME COMPONENT
	// =========================================

	/**
	 * Shows the player registration screen
	 */
	private showPlayerRegistration(): void {
		const state = this.getInternalState();
		
		if (this.menuComponent) {
			this.menuComponent.hide();
		}
		
		if (this.gameOverComponent) {
			this.gameOverComponent.destroy();
		}
		
		// Destroy previous player registration component if it exists
		if (this.playerRegistrationComponent) {
			this.playerRegistrationComponent.destroy();
			this.playerRegistrationComponent = null;
		}
		
		// Create new player registration component
		if (this.gameContainer) {
			this.playerRegistrationComponent = new PlayersRegisterComponent(
				this.gameContainer,
				state.currentMode,
				this.handlePlayersRegistered.bind(this),
				this.handleBackToMenu.bind(this),
				this.handleShowTournamentSchedule.bind(this)
			);
			
			// Show the player registration component
			this.playerRegistrationComponent.render();
		}
	}

	/**
	 * Handles when players are registered
	 * @param playerIds - The registered player IDs
	 * @param playerNames - The player names
	 * @param playerColors - The player colors
	 */
	private handlePlayersRegistered(playerIds: string[], playerNames: string[], playerColors: string[]): void {
		// Prevent handling if already transitioning
		if (this.isTransitioning) {
			return;
		}
		
		// Set transitioning flag
		this.isTransitioning = true;
		
		// Store player information for the game
		this.updateInternalState({
			playerIds: playerIds,
			playerNames: playerNames,
			playerColors: playerColors
		});
		
		// Clean up the player registration component
		if (this.playerRegistrationComponent) {
			this.playerRegistrationComponent.destroy();
			this.playerRegistrationComponent = null;
		}
		
		// For tournament mode, initialize tournament data
		const state = this.getInternalState();
		if (state.currentMode === GameMode.TOURNAMENT) {
			// Initialize tournament data
			TournamentCache.initializeTournament(playerIds, playerNames, playerColors);
			
			// Don't show tournament schedule here - wait for the event
			this.isTransitioning = false;
		} else {
			// For other modes, proceed directly to game
			setTimeout(() => {
				this.updateGameState(GameState.PLAYING);
				this.isTransitioning = false;
			}, 10);
		}
	}

	// Add a method to handle the tournament transition screen
	private showTournamentTransition(): void {
		// Add a small delay to ensure tournament data is initialized
		setTimeout(() => {
			if (!this.TournamentComponent && this.gameContainer) {
				this.TournamentComponent = new TournamentComponent(
					this.gameContainer,
					this.handleTournamentContinue.bind(this),
					this.handleBackToMenu.bind(this)
				);
			}
			
			// Check tournament phase directly from cache
			const phase = TournamentCache.getTournamentPhase();
			
			// Show the appropriate tournament screen based on phase
			if (this.TournamentComponent) {
				if (phase === 'complete') {
					this.TournamentComponent.showTournamentWinner();
				} else {
					this.TournamentComponent.showTournamentSchedule();
				}
			}
			
			// Reset transition flag
			this.isTransitioning = false;
		}, 50);
	}

	/**
	 * Handle continue button from tournament screens
	 */
	private handleTournamentContinue(): void {
		if (!this.TournamentComponent) return;
		
		try {
			// Use the tournament component's method to get player info
			const playerInfo = this.TournamentComponent.handleContinue();
			
			if (!playerInfo) {
				// No more matches, go back to menu
				this.handleBackToMenu();
				return;
			}
			
			// Update state with player info for the current match
			this.updateInternalState({
				playerIds: playerInfo.playerIds,
				playerNames: playerInfo.playerNames,
				playerColors: playerInfo.playerColors
			});
			
			// Start the actual game
			this.updateGameState(GameState.PLAYING);
		} catch (error) {
			// Use the correct notification manager methods
			if (error instanceof Error) {
				if (error.message.includes(ErrorCodes.TOURNAMENT_NOT_FOUND)) {
					NotificationManager.showError('Tournament not found');
				} else if (error.message.includes(ErrorCodes.MATCH_NOT_FOUND)) {
					NotificationManager.showError('Match not found');
				} else {
					NotificationManager.handleError(error);
				}
			} else {
				NotificationManager.handleError(error);
			}
			this.handleBackToMenu();
		}
	}

	// Add this method if you don't have it
	private handleShowTournamentSchedule = (): void => {
		this.updateGameState(GameState.TOURNAMENT);
	};

	private handleTournamentRestored(): void {
		// Set the appropriate game mode
		this.updateInternalState({ currentMode: GameMode.TOURNAMENT });
		
		// Update the game state to show tournament transition
		this.updateGameState(GameState.TOURNAMENT);
	}
}
