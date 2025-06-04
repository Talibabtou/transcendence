import { Component, GameMenuComponent, GameOverComponent, GameCanvasComponent, GameManager, PlayersRegisterComponent, TournamentComponent } from '@website/scripts/components';
import { appState, MatchCache, TournamentCache } from '@website/scripts/utils';
import { GameMode, GameComponentState, GameState } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import { NotificationManager } from '@website/scripts/services';

export class GameComponent extends Component<GameComponentState> {
	private gameManager: GameManager;
	private gameStateInterval: number | null = null;
	private menuComponent: GameMenuComponent | null = null;
	private gameOverComponent: GameOverComponent | null = null;
	private canvasComponent: GameCanvasComponent | null = null;
	private playerRegistrationComponent: PlayersRegisterComponent | null = null;
	private TournamentComponent: TournamentComponent | null = null;
	private gameContainer: HTMLElement | null = null;
	private isTransitioning = false;
	private lastGameOverCheck = 0;
	private readonly MIN_GAME_DURATION_MS = 2000;
	private gameStartTime = 0;
	private unsubscribe: (() => void) | null = null;
	private lastAuthState: boolean | null = null;
	
	constructor(container: HTMLElement) {
		super(container, {
			currentState: GameState.MENU,
			currentMode: GameMode.SINGLE
		});
		
		this.gameManager = GameManager.getInstance();
		this.lastAuthState = appState.isAuthenticated();
		
		this.unsubscribe = appState.subscribe(this.handleStateChange.bind(this));
		
		this.gameManager.setOnGameOverCallback((result) => {
			if (this.getInternalState().currentMode === GameMode.TOURNAMENT && this.TournamentComponent) {
				this.TournamentComponent.processGameResult(
					result.player1Score,
					result.player2Score,
					result.matchId,
					result.isTimeout
				);
			}
			this.updateGameState(GameState.GAME_OVER);
		});
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Renders the game component by clearing the container, creating a game container,
	 * initializing sub-components, and showing the initial menu.
	 */
	render(): void {
		this.container.innerHTML = '';
		this.gameContainer = document.createElement('div');
		this.gameContainer.className = 'game-container';
		this.gameContainer.style.position = "relative";
		this.container.appendChild(this.gameContainer);
		this.initializeComponents();
		this.menuComponent?.show();
	}
	
	/**
	 * Destroys the game component by unsubscribing from app state, cleaning up the main game,
	 * showing the background game, destroying sub-components, stopping game state monitoring,
	 * and calling the parent destroy method.
	 */
	destroy(): void {
		this.unsubscribe?.();
		this.canvasComponent?.stopGame();
		this.gameManager.showBackgroundGame();
		
		[this.menuComponent, this.gameOverComponent, this.canvasComponent, 
		 this.playerRegistrationComponent, this.TournamentComponent].forEach(component => {
			if (component) {
				component.destroy();
			}
		});
		
		this.menuComponent = null;
		this.gameOverComponent = null;
		this.canvasComponent = null;
		this.playerRegistrationComponent = null;
		this.TournamentComponent = null;
		
		this.stopGameStateMonitoring();
		super.destroy();
	}
	
	// =========================================
	// COMPONENT MANAGEMENT
	// =========================================
	
	/**
	 * Initializes all sub-components by destroying existing components and creating new ones.
	 */
	private initializeComponents(): void {
		if (!this.gameContainer) return;
		
		[this.menuComponent, this.gameOverComponent, this.canvasComponent].forEach(component => {
			if (component) {
				component.destroy();
			}
		});
		
		this.menuComponent = null;
		this.gameOverComponent = null;
		this.canvasComponent = null;
		
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
	 * Updates the game state and handles state transitions.
	 * @param newState - The new game state to transition to
	 */
	private updateGameState(newState: GameState): void {
		const state = this.getInternalState();
		if (state.currentState === newState) return;
		
		this.updateInternalState({ currentState: newState });
		
		const stateHandlers = {
			[GameState.MENU]: this.showMenu,
			[GameState.PLAYER_REGISTRATION]: this.showPlayerRegistration,
			[GameState.TOURNAMENT]: this.showTournamentTransition,
			[GameState.PLAYING]: this.startPlaying,
			[GameState.GAME_OVER]: this.showGameOver
		};
		
		stateHandlers[newState].call(this);
	}
	
	/**
	 * Shows the game menu and handles related state changes.
	 */
	private showMenu(): void {
		this.canvasComponent?.stopGame();
		this.gameOverComponent?.hide();
		
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
			this.menuComponent.show();
		} else {
			NotificationManager.showError('Game container not found, cannot create menu.');
		}
		
		this.gameManager.showBackgroundGame();
		this.stopGameStateMonitoring();
	}
	
	/**
	 * Starts the game with the selected mode.
	 */
	private startPlaying(): void {
		const state = this.getInternalState();
		const currentUser = appState.getCurrentUser();
		const playerName = currentUser?.username || 'Player 1';
		const playerColor = appState.getAccentColorHex() || '#ffffff';
		
		if (state.currentMode === GameMode.SINGLE && (!state.playerIds || state.playerIds.length === 0)) {
			if (currentUser?.id) state.playerIds = [currentUser.id];
		}
		
		this.menuComponent?.hide();
		this.gameOverComponent?.hide();
		this.gameManager.hideBackgroundGame();
		
		if (!this.canvasComponent) {
			if (!this.gameContainer) {
				NotificationManager.showError('Game container not available');
				return;
			}
			this.canvasComponent = new GameCanvasComponent(this.gameContainer);
		}
		
		this.canvasComponent.render();
		
		if (this.canvasComponent) {
			const playerNames = state.playerNames || [playerName];
			const playerColors = state.playerColors || [playerColor];
			
			const playerInfo: any = {
				playerIds: state.playerIds,
				playerNames,
				playerColors
			};
			
			if (state.currentMode === GameMode.TOURNAMENT) {
				const tournamentId = TournamentCache.getTournamentId();
				if (tournamentId) {
					playerInfo.tournamentId = tournamentId;
					playerInfo.isFinal = state.isFinal;
				}
			}
			
			this.canvasComponent.startGame(state.currentMode, playerInfo);
		}
		
		this.startGameStateMonitoring();
	}
	
	/**
	 * Shows the game over screen while keeping the game visible.
	 */
	private showGameOver(): void {
		const cachedResult = MatchCache.getLastMatchResult();
		const gameInfo = MatchCache.getCurrentGameInfo();
		
		if (!cachedResult) {
			NotificationManager.showError('No game result found in cache');
			return;
		}
		
		const gameEngine = this.canvasComponent?.getEngine();
		if (gameEngine && !gameEngine.isGamePaused()) {
			gameEngine.togglePause();
		}
		
		this.gameOverComponent?.showGameResult({
			winner: cachedResult.winner || 'Unknown',
			gameMode: gameInfo.gameMode,
			player1Name: cachedResult.player1Name || 'Player 1',
			player2Name: cachedResult.player2Name || 'Player 2',
			player1Score: cachedResult.player1Score || 0,
			player2Score: cachedResult.player2Score || 0,
			matchId: cachedResult.matchId,
			isTimeout: cachedResult.isTimeout
		});
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================

	/**
	 * Handles mode selection from the menu.
	 * @param mode - The selected game mode
	 */
	private handleModeSelected(mode: GameMode): void {
		if (!appState.isAuthenticated()) {
			NotificationManager.showError('User not authenticated');
			this.updateGameState(GameState.MENU);
			return;
		}
		
		this.updateInternalState({ currentMode: mode });
		this.updateGameState(
			mode === GameMode.SINGLE ? 
			GameState.PLAYING : 
			GameState.PLAYER_REGISTRATION
		);
	}

	/**
	 * Handles play again button from game over screen.
	 */
	private handlePlayAgain(mode: GameMode): void {
		if (this.isTransitioning) return;
		
		this.stopGameStateMonitoring();
		this.gameOverComponent?.hide();
		
		const gameInfo = MatchCache.getCurrentGameInfo();
		this.updateInternalState({ 
			currentMode: mode,
			playerIds: gameInfo.playerIds,
			playerNames: gameInfo.playerNames,
			playerColors: gameInfo.playerColors
		});
		
		const needsCleanup = this.canvasComponent && this.gameManager.isMainGameActive();
		const startSequence = needsCleanup ? this.cleanupCurrentGame() : Promise.resolve();
		
		startSequence
			.then(() => {
				this.gameManager.hideBackgroundGame();
				return this.startNewGame(mode);
			})
			.catch(error => {
				NotificationManager.showError('Error restarting game: ' + error);
				this.updateGameState(GameState.MENU);
			})
			.finally(() => setTimeout(() => this.isTransitioning = false, 500));
	}

	/**
	 * Handles back to menu button from game over screen.
	 */
	private handleBackToMenu(): void {
		if (this.isTransitioning) return;
		
		this.isTransitioning = true;
		this.stopGameStateMonitoring();
		MatchCache.clearCache();
		
		if (this.TournamentComponent) {
			this.TournamentComponent.hide();
			this.TournamentComponent.destroy();
			this.TournamentComponent = null;
		}
		
		if (this.menuComponent) {
			this.menuComponent.destroy();
			this.menuComponent = null;
		}
		
		this.cleanupCurrentGame()
			.then(() => {
				if (this.gameContainer) {
					this.menuComponent = new GameMenuComponent(
						this.gameContainer,
						this.handleModeSelected.bind(this),
						this.handleTournamentRestored.bind(this),
						this.handleShowTournamentSchedule.bind(this)
					);
				}
				
				this.updateInternalState({ currentState: GameState.MENU });
				this.menuComponent?.show();
			})
			.catch(error => {
				NotificationManager.showError('Error returning to menu: ' + error);
				this.forceMenuState();
			})
			.finally(() => this.isTransitioning = false);
	}

	/**
	 * Cleans up the current game state.
	 * @returns Promise that resolves when cleanup is complete
	 */
	private cleanupCurrentGame(): Promise<void> {
		return new Promise<void>((resolve) => {
			this.canvasComponent?.stopGame();
			this.gameOverComponent?.hide();
			setTimeout(resolve, 100);
		});
	}

	/**
	 * Starts a new game with the specified mode.
	 * @param mode - Game mode to start
	 */
	private startNewGame(mode: GameMode): Promise<void> {
		return new Promise<void>((resolve) => {
			this.updateInternalState({ currentMode: mode });
			
			if (!this.canvasComponent && this.gameContainer) {
				this.canvasComponent = new GameCanvasComponent(this.gameContainer);
			}
			
			if (this.canvasComponent) {
				this.canvasComponent.render();
			} else {
				NotificationManager.showError('Failed to create canvas component');
			}
			
			this.updateGameState(GameState.PLAYING);
			this.gameStartTime = Date.now();
			setTimeout(resolve, 200);
		});
	}

	/**
	 * Emergency recovery method to force menu state when other transitions fail.
	 */
	private forceMenuState(): void {
		if (this.canvasComponent) {
			this.canvasComponent.destroy();
			this.canvasComponent = null;
		}
		
		this.gameOverComponent?.hide();
		
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
		
		this.gameManager.showBackgroundGame();
		this.updateInternalState({ currentState: GameState.MENU });
		this.menuComponent?.show();
	}

	// =========================================
	// GAME STATE MONITORING
	// =========================================

	/**
	 * Starts monitoring game state to detect game over with safeguards against premature detection.
	 */
	private startGameStateMonitoring(): void {
		this.stopGameStateMonitoring();
		this.lastGameOverCheck = Date.now();
		
		this.gameStateInterval = window.setInterval(() => {
			if (!this.canvasComponent) return;
			
			const now = Date.now();
			const gameElapsedTime = now - this.gameStartTime;
			
			if (gameElapsedTime < this.MIN_GAME_DURATION_MS || (now - this.lastGameOverCheck) < 1000) {
				return;
			}
			this.lastGameOverCheck = now;
			try {
				if (this.canvasComponent.isGameOver()) {
					this.updateGameState(GameState.GAME_OVER);
				}
			} catch (error) {
				NotificationManager.showError('Error checking game state: ' + error);
				this.stopGameStateMonitoring();
			}
		}, 500);
	}

	/**
	 * Stops monitoring game state.
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
	 * Handles app state changes.
	 * @param newState - The updated state properties
	 */
	private handleStateChange(newState: Partial<any>): void {
		const currentAuth = appState.isAuthenticated();
		if ('auth' in newState && currentAuth !== this.lastAuthState) {
			this.lastAuthState = currentAuth;
			this.renderComponent();
		}
		
		const state = this.getInternalState();
		const engine = this.canvasComponent?.getEngine();
		

		if ('isPlaying' in newState && !newState.isPlaying && 
			state.currentMode === GameMode.TOURNAMENT && engine) {
			if (!engine.isGamePaused()) engine.requestPause();
			return;
		}
		
		if ('accentColor' in newState && this.gameManager.isMainGameActive()) {
			this.gameManager.updateMainGamePlayerColor(appState.getAccentColorHex());
		}
	}

	/**
	 * Public method to reset the game component to menu state.
	 * Called by the router when returning from auth cancellation.
	 */
	public resetToMenu(): void {
		if (this.container) this.container.style.height = "";
		
		if (this.gameContainer) {
			this.gameContainer.style.position = "relative";
			this.gameContainer.style.height = "";
		}
		
		this.initializeComponents();
		this.updateGameState(GameState.MENU);
	}

	// =========================================
	// PLAYER REGISTRATION METHODS
	// =========================================

	/**
	 * Shows the player registration screen.
	 */
	private showPlayerRegistration(): void {
		const state = this.getInternalState();
		
		this.menuComponent?.hide();
		this.gameOverComponent?.destroy();
		
		if (this.playerRegistrationComponent) {
			this.playerRegistrationComponent.destroy();
			this.playerRegistrationComponent = null;
		}
		if (this.gameContainer) {
			this.playerRegistrationComponent = new PlayersRegisterComponent(
				this.gameContainer,
				state.currentMode,
				this.handlePlayersRegistered.bind(this),
				this.handleBackToMenu.bind(this),
				this.handleShowTournamentSchedule.bind(this)
			);
			this.playerRegistrationComponent.render();
		}
	}

	/**
	 * Handles when players are registered.
	 * @param playerIds - The registered player IDs
	 * @param playerNames - The player names
	 * @param playerColors - The player colors
	 */
	private handlePlayersRegistered(playerIds: string[], playerNames: string[], playerColors: string[]): void {
		if (this.isTransitioning) return;
		
		this.isTransitioning = true;
		this.updateInternalState({
			playerIds,
			playerNames,
			playerColors
		});
		
		if (this.playerRegistrationComponent) {
			this.playerRegistrationComponent.destroy();
			this.playerRegistrationComponent = null;
		}
		const state = this.getInternalState();
		if (state.currentMode === GameMode.TOURNAMENT) {
			TournamentCache.initializeTournament(playerIds, playerNames, playerColors);
			this.isTransitioning = false;
		} else {
			setTimeout(() => {
				this.updateGameState(GameState.PLAYING);
				this.isTransitioning = false;
			}, 10);
		}
	}

	// =========================================
	// TOURNAMENT METHODS
	// =========================================

	/**
	 * Handles the tournament transition screen.
	 */
	private showTournamentTransition(): void {
		setTimeout(() => {
			if (!this.TournamentComponent && this.gameContainer) {
				this.TournamentComponent = new TournamentComponent(
					this.gameContainer,
					this.handleTournamentContinue.bind(this),
					this.handleBackToMenu.bind(this)
				);
			}
			
			const phase = TournamentCache.getTournamentPhase();
			if (this.TournamentComponent) {
				if (phase === 'complete') {
					this.TournamentComponent.showTournamentWinner();
				} else {
					this.TournamentComponent.showTournamentSchedule();
				}
			}
			
			this.isTransitioning = false;
		}, 50);
	}

	/**
	 * Handles continue button from tournament screens.
	 */
	private handleTournamentContinue(): void {
		if (!this.TournamentComponent) return;
		
		try {
			const playerInfo = this.TournamentComponent.handleContinue();
			if (!playerInfo) {
				this.handleBackToMenu();
				return;
			}
			
			this.updateInternalState({
				playerIds: playerInfo.playerIds,
				playerNames: playerInfo.playerNames,
				playerColors: playerInfo.playerColors,
				tournamentId: playerInfo.tournamentId,
				isFinal: playerInfo.isFinal
			});
			
			this.updateGameState(GameState.PLAYING);
		} catch (error) {
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

	/**
	 * Handles showing the tournament schedule.
	 */
	private handleShowTournamentSchedule = (): void => {
		this.updateGameState(GameState.TOURNAMENT);
	};

	/**
	 * Handles tournament restoration.
	 */
	private handleTournamentRestored(): void {
		this.updateInternalState({ currentMode: GameMode.TOURNAMENT });
		this.updateGameState(GameState.TOURNAMENT);
	}
}
