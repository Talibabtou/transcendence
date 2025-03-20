/**
 * Game Component Module
 * Main component that manages the game interface, state transitions, and sub-components.
 * Handles the complete game lifecycle from menu to gameplay to game over.
 */
import { Component, GameMenuComponent, GameOverComponent, GameCanvasComponent, GameManager, PlayersRegisterComponent } from '@website/scripts/components';
import { appState } from '@website/scripts/utils';
import { GameMode } from '@shared/types';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Define the possible game states
 */
enum GameState {
	MENU = 'menu',
	PLAYER_REGISTRATION = 'player_registration',
	PLAYING = 'playing',
	GAME_OVER = 'game_over'
}

/**
 * Define state interface for the game component
 */
interface GameComponentState {
	currentState: GameState;
	currentMode: GameMode;
	playerIds?: number[];
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
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement) {
		super(container, {
			currentState: GameState.MENU,
			currentMode: GameMode.SINGLE
		});
		
		this.gameManager = GameManager.getInstance();
		
		// Subscribe to app state changes
		this.unsubscribe = appState.subscribe((newState) => {
			this.handleStateChange(newState);
		});
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	render(): void {
		// Clear container
		this.container.innerHTML = '';
		
		// Style the main container - match background canvas size
		this.container.style.height = "100%"; // Change from 700px to match the whole available space
		
		// Create container for game components
		this.gameContainer = document.createElement('div');
		this.gameContainer.className = 'game-container';
		this.gameContainer.style.height = "100%";
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
		
		// Create components with proper containers
		this.menuComponent = new GameMenuComponent(
			this.gameContainer, 
			this.handleModeSelected.bind(this)
		);
		
		this.gameOverComponent = new GameOverComponent(
			this.gameContainer,
			this.handlePlayAgain.bind(this),
			this.handleBackToMenu.bind(this)
		);
		
		this.canvasComponent = new GameCanvasComponent(this.gameContainer);
		
		// No explicit renderComponent() calls here - let the state system handle it
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
		
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = new GameMenuComponent(
				this.gameContainer!, 
				this.handleModeSelected.bind(this)
			);
			this.menuComponent.show();
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
				console.error('Game container not available');
				return;
			}
		} else {
			// Re-render the canvas component
			this.canvasComponent.render();
		}
		
		// Get current user info
		const currentUser = appState.getCurrentUser();
		const playerName = currentUser?.username || 'Player 1';
		const playerColor = appState.getAccentColorHex();
		
		// Start the game with selected mode and player info
		if (this.canvasComponent) {
			this.canvasComponent.startGame(state.currentMode, {
				playerName: playerName,
				playerColor: playerColor
			});
		}
		
		// Start monitoring game state
		this.startGameStateMonitoring();
	}
	
	/**
	 * Shows the game over screen while keeping the game visible
	 */
	private showGameOver(): void {
		if (!this.canvasComponent) return;

		const gameState = this.canvasComponent.getGameState();
		if (!gameState) return;

		// Make sure the game is paused/frozen but still visible
		// Instead of calling stopGame(), just pause the game
		const gameEngine = this.canvasComponent.getEngine();
		if (gameEngine && !gameEngine.isGamePaused()) {
			gameEngine.togglePause();
		}

		// Show game over component as an overlay
		if (this.gameOverComponent) {
			this.gameOverComponent.showGameResult({
				winner: gameState.winner?.name || 'Unknown',
				gameMode: this.getInternalState().currentMode
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
			console.error('User not authenticated');
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
	 * @param mode - The game mode to restart
	 */
	private handlePlayAgain(mode: GameMode): void {
		// Prevent multiple transitions happening simultaneously
		if (this.isTransitioning) {
			console.warn('Ignoring play again request - transition already in progress');
			return;
		}
		
		this.isTransitioning = true;
		
		// First stop the game state monitoring to prevent race conditions
		this.stopGameStateMonitoring();
		
		// Perform the transition in sequence
		this.cleanupCurrentGame()
			.then(() => this.startNewGame(mode))
			.catch(error => {
				console.error('Error during game transition:', error);
				// Fallback to menu on error
				this.updateGameState(GameState.MENU);
			})
			.finally(() => {
				this.isTransitioning = false;
			});
	}

	/**
	 * Handles back to menu button from game over screen
	 */
	private handleBackToMenu(): void {
		// Prevent multiple transitions happening simultaneously
		if (this.isTransitioning) {
			console.warn('Ignoring back to menu request - transition already in progress');
			return;
		}
		
		this.isTransitioning = true;
		
		// Stop monitoring first
		this.stopGameStateMonitoring();
		
		// Clean up current game state
		this.cleanupCurrentGame()
			.then(() => {
				this.updateGameState(GameState.MENU);
			})
			.catch(error => {
				console.error('Error returning to menu:', error);
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
			
			// Then transition to playing state
			this.updateGameState(GameState.PLAYING);
			
			// Record start time for game over detection throttling
			this.gameStartTime = Date.now();
			
			// Allow game to initialize fully
			setTimeout(resolve, 100);
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
				this.handleModeSelected.bind(this)
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
				console.error('Error checking game state:', error);
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
		// Handle authentication changes
		if ('auth' in newState) {
			// Re-render the component
			this.renderComponent();
			
			// If we're on the menu, update it to reflect authenticated state
			if (this.menuComponent) {
				this.menuComponent.destroy();
				this.menuComponent = new GameMenuComponent(
					this.gameContainer!, 
					this.handleModeSelected.bind(this)
				);
				this.menuComponent.show();
			}
		}
		
		// For accent color changes, update the player's color in the game
		if ('accentColor' in newState) {
			const accentColorHex = appState.getAccentColorHex();
			console.log('Accent color changed to:', accentColorHex);
			
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
			this.gameOverComponent.hide();
		}
		
		// Keep the background game visible (don't hide it)
		
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
				this.handlePlayersRegistered.bind(this)
			);
			
			// Show the player registration component
			this.playerRegistrationComponent.render();
		}
	}

	/**
	 * Handles when players are registered
	 * @param playerIds - The registered player IDs
	 */
	private handlePlayersRegistered(playerIds: number[]): void {
		console.log('Players registered for game with valid IDs:', playerIds);
		
		// Prevent handling if already transitioning
		if (this.isTransitioning) {
			console.warn('Already transitioning, ignoring duplicate registration');
			return;
		}
		
		// Set transitioning flag
		this.isTransitioning = true;
		
		// Store player IDs for the game
		this.updateInternalState({
			playerIds: playerIds
		});
		
		// Clean up the player registration component
		if (this.playerRegistrationComponent) {
			this.playerRegistrationComponent.destroy();
			this.playerRegistrationComponent = null;
		}
		
		// Proceed to the game after a short delay to allow cleanup
		setTimeout(() => {
			this.updateGameState(GameState.PLAYING);
			this.isTransitioning = false;
		}, 200);
	}
}
