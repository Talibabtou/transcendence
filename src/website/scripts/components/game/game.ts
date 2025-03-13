/**
 * Game Component Module
 * Main component that manages the game interface, state transitions, and sub-components.
 * Handles the complete game lifecycle from menu to gameplay to game over.
 */
import { Component, GameMenuComponent, GameMode, GameOverComponent, GameCanvasComponent } from '@website/scripts/components';
import { GameManager, DbService } from '@website/scripts/utils';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Define the possible game states
 */
enum GameState {
	MENU = 'menu',
	PLAYING = 'playing',
	GAME_OVER = 'game_over'
}

/**
 * Define state interface for the game component
 */
interface GameComponentState {
	currentState: GameState;
	currentMode: GameMode;
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
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement) {
		super(container, {
			currentState: GameState.MENU,
			currentMode: GameMode.SINGLE
		});
		
		this.gameManager = GameManager.getInstance();
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	render(): void {
		// Clear container
		this.container.innerHTML = '';
		
		// Style the main container
		this.container.style.height = "700px";
		
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
		
		// Start the game with selected mode
		if (this.canvasComponent) {
			this.canvasComponent.startGame(state.currentMode);
		}
		
		// Start monitoring game state
		this.startGameStateMonitoring();
	}
	
	/**
	 * Shows the game over screen with results
	 */
	private showGameOver(): void {
		if (!this.canvasComponent) return;

		const gameState = this.canvasComponent.getGameState();
		if (!gameState) return;

		// Show game over component without scores (they're visible in the frozen game)
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
		this.updateInternalState({ currentMode: mode });
		this.updateGameState(GameState.PLAYING);
	}

	/**
	 * Handles play again button from game over screen
	 * @param mode - The game mode to restart
	 */
	private handlePlayAgain(mode: GameMode): void {
		// Now we need to properly clean up the frozen game
		if (this.canvasComponent) {
			this.canvasComponent.stopGame(); // This will fully clean up the previous game
		}
		
		if (this.gameOverComponent) {
			this.gameOverComponent.hide();
		}
		
		// Start fresh game after a small delay to ensure cleanup
		setTimeout(() => {
			this.updateInternalState({ currentMode: mode });
			this.updateGameState(GameState.PLAYING);
		}, 50);
	}

	/**
	 * Handles back to menu button from game over screen
	 */
	private handleBackToMenu(): void {
		// Make sure to clean up the frozen game when going back to menu
		if (this.canvasComponent) {
			this.canvasComponent.stopGame();
		}
		
		this.updateGameState(GameState.MENU);
	}

	// =========================================
	// GAME STATE MONITORING
	// =========================================

	/**
	 * Starts monitoring game state to detect game over
	 */
	private startGameStateMonitoring(): void {
		this.stopGameStateMonitoring();
		this.gameStateInterval = window.setInterval(() => {
			if (!this.canvasComponent) return;
			if (this.canvasComponent.isGameOver()) {
				this.updateGameState(GameState.GAME_OVER);
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
}
