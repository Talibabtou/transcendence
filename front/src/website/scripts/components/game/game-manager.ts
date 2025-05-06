import { GameEngine } from '@pong/game/engine';
import { MatchCache } from '@website/scripts/utils';
import { GameMode } from '@shared/types';
import { GAME_CONFIG } from '@pong/constants';

declare global {
	interface Window {
		gameManager?: GameManager;
	}
}

export enum GameEvent {
	GAME_STARTED = 'game_started',
	GAME_ENDED = 'game_ended',
	GAME_PAUSED = 'game_paused',
	GAME_RESUMED = 'game_resumed',
	VISIBILITY_CHANGED = 'visibility_changed'
}

// Create a new enum for game instance types
enum GameInstanceType {
	MAIN = 'main',
	BACKGROUND_DEMO = 'background_demo'
}

interface GameInstance {
	engine: GameEngine | null;
	canvas: HTMLCanvasElement | null;
	animationFrameId: number | null;
	updateIntervalId: number | null;
	isActive: boolean;
	isPaused: boolean;
	// Change from GameMode to GameInstanceType
	type: GameInstanceType;
	eventListeners?: Array<{
		type: string;
		listener: EventListener;
	}>;
	gameResult?: {
		winner: any;
		player1Score: number;
		player2Score: number;
		player1Name: string;
		player2Name: string;
		gameMode: GameMode;
	};
	cleanupScheduled?: boolean;
}

export class GameManager {
	private static instance: GameManager;
	private static isInitialized: boolean = false;
	
	// This flag prevents actions during the initialization phase
	private static isBootstrapping: boolean = false;
	
	private eventListeners: Map<GameEvent, Function[]> = new Map();
	
	private mainGameInstance: GameInstance;
	private backgroundGameInstance: GameInstance;
	
	// Add a cleanup lock to prevent recursive cleanup calls
	private isCleaningUp: boolean = false;
	
	private onGameOverCallback: ((result: any) => void) | null = null;
	
	private constructor() {
		// Mark that we're in bootstrap phase
		GameManager.isBootstrapping = true;
		
		// Create empty game instances (but don't start them)
		this.mainGameInstance = this.createEmptyGameInstance(GameInstanceType.MAIN);
		this.backgroundGameInstance = this.createEmptyGameInstance(GameInstanceType.BACKGROUND_DEMO);
		
		// Set up event listeners
		window.addEventListener('resize', this.handleResize.bind(this));
		window.addEventListener('beforeunload', () => {
			this.cleanup();
		});
		
		this.setupVisibilityHandling();
		
		// Done with bootstrap
		GameManager.isBootstrapping = false;
	}
	
	/**
	 * Explicitly initialize the GameManager.
	 * This should be called ONLY ONCE by App.ts
	 */
	public initialize(): void {
		if (GameManager.isInitialized) {
			return;
		}
		GameManager.isInitialized = true;

		// Any one-time initialization logic goes here
		// but DON'T start games here - let components request them
	}
	
	private createEmptyGameInstance(type: GameInstanceType): GameInstance {
		return {
			engine: null,
			canvas: null,
			animationFrameId: null,
			updateIntervalId: null,
			isActive: false,
			isPaused: false,
			type
		};
	}
	
	// Generic method to start any game type
	private startGame(instance: GameInstance, mode: GameMode, container: HTMLElement | null): void {
		// Only clean up if the game is already active
		if (instance.isActive) {
			this.cleanupGame(instance);
		}
		
		// Create canvas with appropriate settings
		const canvas = document.createElement('canvas');
		
		// Set the appropriate ID based on game type
		if (instance.type === GameInstanceType.MAIN) {
			canvas.id = 'game-canvas';
			
			// Append to provided container
			if (container) {
				container.innerHTML = '';
				container.appendChild(canvas);
			} else {
				console.error('No container provided for main game');
				return;
			}
		} else {
			canvas.id = 'background-game-canvas';
			
			// Check if background canvas already exists
			const existingBgCanvas = document.getElementById('background-game-canvas');
			if (existingBgCanvas) {
				existingBgCanvas.remove();
			}
			
			// Insert at the beginning of body with absolute positioning
			canvas.style.position = 'absolute';
			canvas.style.zIndex = '-1';
			canvas.style.top = '0';
			canvas.style.left = '0';
			document.body.insertBefore(canvas, document.body.firstChild);
		}
		// Size canvas
		this.resizeCanvas(canvas);
		// Get context and initialize game engine
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error(`Could not get canvas context for ${instance.type} game`);
			return;
		}
		// Create game engine
		const gameEngine = new GameEngine(ctx);
		gameEngine.onGameOver = (detail) => {
			if (instance.isActive && instance.engine) {
				// Directly call callbacks
				this.notifyGameEnded(detail);
				
				// Schedule cleanup
				if (instance.type === GameInstanceType.MAIN && !instance.cleanupScheduled) {
					instance.cleanupScheduled = true;
					setTimeout(() => {
						if (instance.isActive) { 
							this.cleanupGame(instance);
						}
						instance.cleanupScheduled = false;
					}, 500);
				}
			}
		};
		// Initialize proper game mode
		if (instance.type === GameInstanceType.MAIN) {
			switch (mode) {
				case GameMode.SINGLE: gameEngine.initializeSinglePlayer(); break;
				case GameMode.MULTI: gameEngine.initializeMultiPlayer(); break;
				case GameMode.TOURNAMENT: gameEngine.initializeTournament(); break;
			}
		} else {
			gameEngine.initializeBackgroundDemo();
		}
		// Store references
		instance.canvas = canvas;
		instance.engine = gameEngine;
		instance.isActive = true;
		instance.isPaused = false;
		// Start the game loop
		this.startGameLoop(instance);
		this.dispatchEvent(GameEvent.GAME_STARTED, { type: instance.type, mode });
		
		// Set up event listeners for this game instance
		this.setupGameEventListeners(instance);
	}
	
	// Generic method to start game loop
	private startGameLoop(instance: GameInstance): void {
		if (!instance.engine) return;
		// cancel any previous loops
		if (instance.animationFrameId !== null) {
			cancelAnimationFrame(instance.animationFrameId);
			instance.animationFrameId = null;
		}
		if (instance.updateIntervalId !== null) {
			clearInterval(instance.updateIntervalId);
			instance.updateIntervalId = null;
		}

		let lastTime = performance.now();
		let accumulator = 0;

		// unified update+render loop with fixed timestep for updates
		const loop = (currentTime: number) => {
			if (instance.isActive && instance.engine) {
				let deltaTime = currentTime - lastTime;
				lastTime = currentTime;
				// console.log("deltaTime", deltaTime);
				// Prevent spiral of death by capping delta time
				if (deltaTime > GAME_CONFIG.MAX_DELTA_TIME) {
					deltaTime = GAME_CONFIG.MAX_DELTA_TIME; 
					console.log("above");
				}

				accumulator += deltaTime;

				try {
					// Perform fixed updates
					while (accumulator >= GAME_CONFIG.FRAME_TIME) {
						// Pass the fixed delta time (in seconds) to the update function
						instance.engine.update(GAME_CONFIG.FRAME_TIME/1000);
						accumulator -= GAME_CONFIG.FRAME_TIME;
					}

					// Calculate interpolation alpha
					const alpha = accumulator / GAME_CONFIG.FRAME_TIME;

					// Render the latest state with interpolation
					instance.engine.draw(alpha);

				} catch (error) {
					this.handleGameEngineError(
						error as Error,
						instance.type === GameInstanceType.MAIN ? 'main' : 'background'
					);
					// Stop the loop on error to prevent spamming
					instance.isActive = false; 
					return; 
				}
				instance.animationFrameId = requestAnimationFrame(loop);
			} else {
				// Ensure cleanup if instance becomes inactive
				if (instance.animationFrameId !== null) {
					cancelAnimationFrame(instance.animationFrameId);
					instance.animationFrameId = null;
				}
			}
		};
		// Start the loop
		instance.animationFrameId = requestAnimationFrame(loop);
	}

	// Generic method to pause any game
	private pauseGame(instance: GameInstance): void {
		if (instance.engine && instance.type !== GameInstanceType.BACKGROUND_DEMO) {
			if (!instance.engine.isGamePaused()) {
				instance.engine.togglePause();
				this.dispatchEvent(GameEvent.GAME_PAUSED);
			}
		}
	}

	// Generic method to clean up any game
	private cleanupGame(instance: GameInstance): void {
		// Prevent recursive cleanup
		if (this.isCleaningUp) {
			return;
		}
		
		// Set cleanup lock
		this.isCleaningUp = true;
		
		// Skip if we're in bootstrap phase
		if (GameManager.isBootstrapping) {
			this.isCleaningUp = false;
			return;
		}
		
		// Only clean if we have something to clean
		if (!instance.isActive || !instance.engine) {
			this.isCleaningUp = false;
			return;
		}
		
		// First pause the game to avoid any race conditions
		if (instance.engine && !instance.engine.isGamePaused()) {
			this.pauseGame(instance);
		}
		
		// Remove all event listeners FIRST before doing any other cleanup
		if (instance.eventListeners && instance.eventListeners.length > 0) {
			instance.eventListeners.forEach(listenerInfo => {
				window.removeEventListener(listenerInfo.type, listenerInfo.listener);
			});
			instance.eventListeners = [];
		}
		
		// Stop animation frame
		if (instance.animationFrameId !== null) {
			cancelAnimationFrame(instance.animationFrameId);
			instance.animationFrameId = null;
		}
		
		// Clear update interval
		if (instance.updateIntervalId !== null) {
			clearInterval(instance.updateIntervalId);
			instance.updateIntervalId = null;
		}
		
		// Cleanup game engine
		if (instance.engine) {
			instance.engine.cleanup();
			instance.engine = null;
		}
		
		// Remove canvas from DOM
		if (instance.canvas && instance.canvas.parentNode) {
			instance.canvas.parentNode.removeChild(instance.canvas);
			instance.canvas = null;
		}
		
		// Reset state
		instance.isActive = false;
		instance.isPaused = false;
		
		// Release cleanup lock
		this.isCleaningUp = false;
	}

	/**
	 * Starts a tournament match with specific player information
	 * @param container HTML element to render the game in
	 * @param matchInfo Tournament match information
	 */
	public startTournamentMatch(
		container: HTMLElement,
		matchInfo: {
			player1Id: number;
			player2Id: number;
			player1Name: string;
			player2Name: string;
			player1Color: string;
			player2Color: string;
			tournamentId: string;
		}
	): void {
		// Create player info object from tournament match info
		const playerInfo = {
			playerIds: [matchInfo.player1Id, matchInfo.player2Id],
			playerNames: [matchInfo.player1Name, matchInfo.player2Name],
			playerColors: [matchInfo.player1Color, matchInfo.player2Color],
			tournamentId: matchInfo.tournamentId
		};
		
		// Start the game in tournament mode
		this.startMainGame(GameMode.TOURNAMENT, container, playerInfo);
		
		// Additional tournament-specific setup can be done here
	}

	// Extend startMainGame to handle tournamentId
	public startMainGame(
		mode: GameMode, 
		container: HTMLElement, 
		playerInfo?: { 
			playerName?: string,
			playerColor?: string,
			playerIds?: number[],
			playerNames?: string[],
			playerColors?: string[],
			tournamentId?: string // Add this parameter
		}
	): void {
		// Start the game
		this.startGame(this.mainGameInstance, mode, container);
		
		// Skip player info and timers for background demo
		if (mode === GameMode.BACKGROUND_DEMO) {
			return;
		}
		
		// Store game info in MatchCache
		MatchCache.setCurrentGameInfo({
			gameMode: mode,
			playerIds: playerInfo?.playerIds,
			playerNames: playerInfo?.playerNames,
			playerColors: playerInfo?.playerColors
		});
		
		// Set player information if provided
		if (playerInfo) {
			const playerNames = playerInfo.playerNames || [];
			const currentUser = playerInfo.playerName || playerNames[0] || 'Player 1';
			let opponent = 'Computer';
			
			if (mode === GameMode.MULTI || mode === GameMode.TOURNAMENT) {
				opponent = playerNames[1] || 'Player 2';
			}
			
			if (this.mainGameInstance.engine) {
				this.mainGameInstance.engine.setPlayerNames(currentUser, opponent);
				
				const playerColors = playerInfo.playerColors || [];
				const p1Color = playerColors[0] || playerInfo.playerColor || '#3498db';  // Default blue
				
				let p2Color;
				if (mode === GameMode.SINGLE) {
					p2Color = '#ffffff'; // AI is always white in single player
				} else if (playerColors.length > 1 && playerColors[1]) {
					p2Color = playerColors[1]; // Use the color chosen by player 2
				} else {
					p2Color = '#2ecc71'; // Default green if no color provided
				}
				
				// Now update the colors in the game engine
				this.mainGameInstance.engine.updatePlayerColors(p1Color, p2Color);
				
				// Store player IDs last (this triggers match creation)
				if (playerInfo.playerIds && playerInfo.playerIds.length > 0) {
					const playerIdsCopy = [...playerInfo.playerIds];
					
					// If we have a tournament ID, use it when setting player IDs
					if (playerInfo.tournamentId) {
						this.mainGameInstance.engine.setPlayerIds(playerIdsCopy, playerInfo.tournamentId);
					} else {
						this.mainGameInstance.engine.setPlayerIds(playerIdsCopy);
					}
				}
			}
		}
		
		// Start match timer
		if (this.mainGameInstance.engine) {
			this.mainGameInstance.engine.startMatchTimer();
		}
	}

	/**
	 * Sets player names for the main game
	 * @param player1Name Name for player 1
	 * @param player2Name Name for player 2
	 */
	public setMainGamePlayerNames(player1Name: string, player2Name: string): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			try {
				this.mainGameInstance.engine.setPlayerNames(player1Name, player2Name);
			} catch (error) {
				console.error('Error setting player names:', error);
			}
		}
	}

	// Public methods that use the generic methods
	public startBackgroundGame(): void {
		// Skip if not fully initialized
		if (!GameManager.isInitialized) {
			return;
		}

		// Only start if not already active
		if (!this.backgroundGameInstance.isActive) {
			this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
			this.setBackgroundKeyboardActive(false);
		}
	}
	
	public cleanupMainGame(): void {
		this.cleanupGame(this.mainGameInstance);
	}

	public cleanupBackgroundGame(): void {
		this.cleanupGame(this.backgroundGameInstance);
	}

	public static getInstance(): GameManager {
		if (!GameManager.instance) {
				GameManager.instance = new GameManager();
		}
		return GameManager.instance;
	}

	private handleResize(): void {
		// Handle resize for main game
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			const canvas = this.mainGameInstance.canvas;
			if (canvas) {
				this.resizeCanvas(canvas);
				this.mainGameInstance.engine.resize(canvas.width, canvas.height);
			}
		}

		if (this.backgroundGameInstance.isActive && this.backgroundGameInstance.engine) {
			const canvas = this.backgroundGameInstance.canvas;
			if (canvas) {
				this.resizeCanvas(canvas);
				this.backgroundGameInstance.engine.resize(canvas.width, canvas.height);
			}
		}
	}

	private resizeCanvas(canvas: HTMLCanvasElement): void {
		const navbar = document.querySelector('.navbar');
		const footer = document.querySelector('.footer');
		
		if (navbar && footer) {
			const navbarHeight = navbar.getBoundingClientRect().height;
			const footerHeight = footer.getBoundingClientRect().height;
			
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight - navbarHeight - footerHeight;
			
			if (canvas.id === 'background-game-canvas') {
				canvas.style.top = `${navbarHeight}px`;
				canvas.style.height = `${canvas.height}px`;
			}
		} else {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	}

	public isMainGamePaused(): boolean {
		return this.mainGameInstance.engine ? this.mainGameInstance.engine.isGamePaused() : false;
	}

	public isMainGameActive(): boolean {
		return this.mainGameInstance.isActive;
	}

	public getMainGameState(): any {
		if (this.mainGameInstance.engine) {
			return this.mainGameInstance.engine.getGameState();
		}
		return null;
	}

	public isBackgroundGameActive(): boolean {
		return this.backgroundGameInstance.isActive;
	}

	public cleanup(): void {
		this.cleanupMainGame();
		this.cleanupBackgroundGame();
		window.removeEventListener('resize', this.handleResize.bind(this));
	}

	private setupVisibilityHandling(): void {
		document.addEventListener('visibilitychange', () => {
			const isHidden = document.hidden;
			
			// Dispatch event
			this.dispatchEvent(GameEvent.VISIBILITY_CHANGED, { isHidden });
			
			// Handle main game pause
			if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
				if (isHidden) {
					// Use the new method that handles countdown state
					this.mainGameInstance.engine.requestPause();
					this.dispatchEvent(GameEvent.GAME_PAUSED);
				}
			}
		});
	}
	
	private handleGameEngineError(error: Error, gameType: 'main' | 'background'): void {
		console.error(`Error in ${gameType} game engine:`, error);
		
		// Create an error event
		const errorEvent = new CustomEvent('game-error', {
			detail: {
				gameType,
				message: error.message,
				timestamp: new Date().toISOString()
			}
		});
		document.dispatchEvent(errorEvent);
		// Clean up the affected game
		if (gameType === 'main') {
			this.cleanupMainGame();
		} else {
			this.cleanupBackgroundGame();
		}
		// If it's the main game, show an error message to the user
		if (gameType === 'main') {
			const gameContainer = document.querySelector('.game-container');
			if (gameContainer) {
				const errorDiv = document.createElement('div');
				errorDiv.className = 'game-error';
				errorDiv.innerHTML = `
					<div class="error-message">
						<h3>Game Error</h3>
						<p>${error.message}</p>
						<button onclick="window.location.reload()">Restart Game</button>
					</div>
				`;
				gameContainer.appendChild(errorDiv);
			}
		}
	}
	
	/**
	 * Shows the background game
	 */
	public showBackgroundGame(): void {
		try {
			// Start if not active, otherwise just show
			if (!this.backgroundGameInstance.isActive) {
				this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
				
				// Disable keyboard for background game to prevent input conflicts
				if (this.backgroundGameInstance.engine) {
					this.backgroundGameInstance.engine.setKeyboardEnabled(false);
				}
			} else if (this.backgroundGameInstance.canvas) {
				// Make sure the canvas is properly styled
				this.backgroundGameInstance.canvas.style.display = 'block';
				this.backgroundGameInstance.canvas.style.opacity = '0.4';
				
				// Force a redraw of the background game
				if (this.backgroundGameInstance.engine) {
					this.backgroundGameInstance.engine.draw(0);
				}
			}
		} catch (error) {
			console.error('Error showing background game:', error);
			
			// On error, try to create a new background game
			try {
				this.cleanupBackgroundGame();
				this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
				if (this.backgroundGameInstance.engine) {
					this.backgroundGameInstance.engine.setKeyboardEnabled(false);
				}
			} catch (secondError) {
				console.error('Failed to recover background game:', secondError);
			}
		}
	}

	/**
	 * Hides the background game
	 */
	public hideBackgroundGame(): void {
		try {
			if (this.backgroundGameInstance.canvas) {
				// Just hide the canvas rather than cleaning up
				this.backgroundGameInstance.canvas.style.display = 'none';
				this.backgroundGameInstance.canvas.style.opacity = '0';
			}
		} catch (error) {
			console.error('Error hiding background game:', error);
		}
	}

	private setBackgroundKeyboardActive(active: boolean): void {
		if (this.backgroundGameInstance.engine) {
			this.backgroundGameInstance.engine.setKeyboardEnabled(active);
		}
	}

	public resizeGameCanvas(canvas: HTMLCanvasElement): void {
		this.resizeCanvas(canvas);
	}

	// Event system methods
	public addEventListener(event: GameEvent, callback: Function): () => void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}

		this.eventListeners.get(event)!.push(callback);

		// Return unsubscribe function
		return () => {
			if (this.eventListeners.has(event)) {
				const listeners = this.eventListeners.get(event)!;
				this.eventListeners.set(
					event,
					listeners.filter(listener => listener !== callback)
				);
			}
		};
	}

	private dispatchEvent(event: GameEvent, data?: any): void {
		if (this.eventListeners.has(event)) {
			this.eventListeners.get(event)!.forEach(callback => callback(data));
		}
	}

	public getMainGameEngine(): GameEngine | null {
		return this.mainGameInstance.engine;
	}

	/**
	 * Updates the color of player paddles in the main game
	 * @param playerColor Color for the player's paddle (hex format)
	 */
	public updateMainGamePlayerColor(playerColor: string): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			try {
				// The GameEngine has an updatePlayerColors method we can use
				this.mainGameInstance.engine.updatePlayerColors(playerColor);
			} catch (error) {
				console.error('Error updating player color:', error);
			}
		}
	}

	private setupGameEventListeners(instance: GameInstance): void {
		// Clean up any existing listeners
		if (instance.eventListeners) {
			instance.eventListeners.forEach(listenerInfo => {
				window.removeEventListener(listenerInfo.type, listenerInfo.listener);
			});
			instance.eventListeners = [];
		} else {
			instance.eventListeners = [];
		}

		// Skip setting up event listeners for background game
		if (instance.type === GameInstanceType.BACKGROUND_DEMO) {
			return;
		}
		
		// We don't need the gameOver event listener anymore
		// The engine's onGameOver callback will handle this
	}

	public getLastGameResult(): any {
		return this.mainGameInstance.gameResult || null;
	}

	// Add a public method to cleanup a specific instance by type
	public cleanupInstance(type: GameInstanceType | string): void {
		if (type === GameInstanceType.MAIN || type === 'main') {
			this.cleanupGame(this.mainGameInstance);
		} else if (type === GameInstanceType.BACKGROUND_DEMO || type === 'background_demo') {
			// Never completely clean up the background game, just hide it
			this.hideBackgroundGame();
		}
	}

	private notifyGameEnded(data: any): void {
		if (this.eventListeners.has(GameEvent.GAME_ENDED)) {
			this.eventListeners.get(GameEvent.GAME_ENDED)!.forEach(callback => callback(data));
		}
		
		if (this.onGameOverCallback) {
			this.onGameOverCallback(data);
		}
	}

	public setOnGameOverCallback(callback: (result: any) => void): void {
		this.onGameOverCallback = callback;
	}
}
