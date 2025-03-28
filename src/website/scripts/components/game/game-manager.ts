import { GameEngine } from '@pong/game/engine';
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

enum GameMode {
	MAIN = 'main',
	SINGLE = 'single',
	MULTI = 'multi',
	TOURNAMENT = 'tournament',
	BACKGROUND_DEMO = 'background_demo'
}

interface GameInstance {
	engine: GameEngine | null;
	canvas: HTMLCanvasElement | null;
	animationFrameId: number | null;
	updateIntervalId: number | null;
	isActive: boolean;
	isPaused: boolean;
	type: GameMode;
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
	
	private constructor() {
		// Mark that we're in bootstrap phase
		GameManager.isBootstrapping = true;
		
		// Create empty game instances (but don't start them)
		this.mainGameInstance = this.createEmptyGameInstance(GameMode.MAIN);
		this.backgroundGameInstance = this.createEmptyGameInstance(GameMode.BACKGROUND_DEMO);
		
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
	
	private createEmptyGameInstance(type: GameMode.MAIN | GameMode.BACKGROUND_DEMO): GameInstance {
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
		if (instance.type === 'main') {
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
		// Initialize proper game mode
		if (instance.type === 'main') {
			switch (mode) {
				case 'single': gameEngine.initializeSinglePlayer(); break;
				case 'multi': gameEngine.initializeMultiPlayer(); break;
				case 'tournament': gameEngine.initializeTournament(); break;
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

		// Setup update interval
		instance.updateIntervalId = window.setInterval(() => {
			if (instance.isActive && !instance.isPaused && instance.engine) {
				try {
					instance.engine.update();
				} catch (error) {
					this.handleGameEngineError(error as Error, instance.type === GameMode.MAIN ? 'main' : 'background');
				}
			}
		}, 1000 / GAME_CONFIG.FPS);

		// Setup render loop
		const render = () => {
			if (instance.isActive && instance.engine) {
				try {
					instance.engine.draw();
				} catch (error) {
					this.handleGameEngineError(error as Error, instance.type === GameMode.MAIN ? 'main' : 'background');
				}
			}
			instance.animationFrameId = requestAnimationFrame(render);
		};
		
		instance.animationFrameId = requestAnimationFrame(render);
	}

	// Generic method to pause any game
	private pauseGame(instance: GameInstance): void {
		if (instance.engine && instance.type !== GameMode.BACKGROUND_DEMO) {
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
			console.log('Cleanup already in progress, ignoring redundant cleanup request');
			return;
		}
		
		// Set cleanup lock
		this.isCleaningUp = true;
		
		console.log(`Starting cleanup for game instance: ${instance.type}`);
		
		// Skip if we're in bootstrap phase
		if (GameManager.isBootstrapping) {
			this.isCleaningUp = false;
			return;
		}
		
		// Only clean if we have something to clean
		if (!instance.isActive || !instance.engine) {
			console.log(`Game instance ${instance.type} is not active, skipping cleanup`);
			this.isCleaningUp = false;
			return;
		}
		
		// First pause the game to avoid any race conditions
		if (instance.engine && !instance.engine.isGamePaused()) {
			this.pauseGame(instance);
		}
		
		// Remove all event listeners FIRST before doing any other cleanup
		if (instance.eventListeners && instance.eventListeners.length > 0) {
			console.log(`Removing ${instance.eventListeners.length} event listeners for ${instance.type}`);
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
		
		console.log(`Cleanup completed for game instance: ${instance.type}`);
		
		// Release cleanup lock
		this.isCleaningUp = false;
	}

	/**
	 * Starts the main game with player information
	 * @param mode Game mode to start
	 * @param container HTML element to render the game in
	 * @param playerInfo Optional player information
	 */
	public startMainGame(
		mode: GameMode, 
		container: HTMLElement, 
		playerInfo?: { 
			playerName?: string,
			playerColor?: string,
			playerIds?: number[],
			playerNames?: string[],
			playerColors?: string[]
		}
	): void {
		// Start the game
		this.startGame(this.mainGameInstance, mode, container);
		
		// Skip player info and timers for background demo
		if (mode === GameMode.BACKGROUND_DEMO) {
			console.log('Background demo mode - skipping player info and timers');
			return;
		}
		
		// Set player information if provided
		if (playerInfo) {
			// Use provided player names array or fallback to single name
			const playerNames = playerInfo.playerNames || [];
			const currentUser = playerInfo.playerName || playerNames[0] || 'Player 1';
			let opponent = 'Computer';
			
			// If multiplayer, set appropriate names
			if (mode === GameMode.MULTI || mode === GameMode.TOURNAMENT) {
				opponent = playerNames[1] || 'Player 2';
			}
			
			// Set player names first
			if (this.mainGameInstance.engine) {
				this.mainGameInstance.engine.setPlayerNames(currentUser, opponent);
				
				// Get player colors with proper fallbacks
				const playerColors = playerInfo.playerColors || [];
				console.log('Player colors array:', playerColors);
				
				const p1Color = playerColors[0] || playerInfo.playerColor || '#3498db';  // Default blue
				
				// For player 2, use their color from the array, or white for AI in single player
				let p2Color;
				if (mode === GameMode.SINGLE) {
					p2Color = '#ffffff'; // AI is always white in single player
				} else if (playerColors.length > 1 && playerColors[1]) {
					p2Color = playerColors[1]; // Use the color chosen by player 2
				} else {
					p2Color = '#2ecc71'; // Default green if no color provided
				}
				
				console.log('Setting player colors:', {
					p1: p1Color,
					p2: p2Color,
					playerColors: playerColors
				});
				
				// Now update the colors in the game engine
				this.mainGameInstance.engine.updatePlayerColors(p1Color, p2Color);
				
				// Store player IDs last (this triggers match creation)
				if (playerInfo.playerIds && playerInfo.playerIds.length > 0) {
					// Make a copy to avoid referencing the original array
					const playerIdsCopy = [...playerInfo.playerIds];
					console.log('Setting player IDs in game manager:', playerIdsCopy);
					this.mainGameInstance.engine.setPlayerIds(playerIdsCopy);
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
	
	public showBackgroundGame(): void {
		// Start if not active, otherwise just show
		if (!this.backgroundGameInstance.isActive) {
			console.log('Starting new background game');
			this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
			this.setBackgroundKeyboardActive(false);
		} else if (this.backgroundGameInstance.canvas) {
			console.log('Showing existing background game');
			this.backgroundGameInstance.canvas.style.display = 'block';
			this.backgroundGameInstance.canvas.style.opacity = '0.4';
		}
	}

	public hideBackgroundGame(): void {
		if (this.backgroundGameInstance.canvas) {
			// Just hide the canvas rather than cleaning up
			this.backgroundGameInstance.canvas.style.display = 'none';
			this.backgroundGameInstance.canvas.style.opacity = '0';
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
				console.log('Updated player color to:', playerColor);
			} catch (error) {
				console.error('Error updating player color:', error);
			}
		}
	}

	private setupGameEventListeners(instance: GameInstance): void {
		// Clean up any existing listeners first
		if (instance.eventListeners) {
			instance.eventListeners.forEach(listenerInfo => {
				window.removeEventListener(listenerInfo.type, listenerInfo.listener);
			});
			instance.eventListeners = [];
		} else {
			instance.eventListeners = [];
		}

		// Create a named listener function that we can reference for cleanup
		const gameOverListenerFunction = function(event: Event) {
			const customEvent = event as CustomEvent;
			if (instance.isActive && instance.engine) {
				console.log(`Game over event received for ${instance.type}`, customEvent.detail);
				
				// Store the game result
				instance.gameResult = customEvent.detail;
				
				// Dispatch the game ended event
				const gameManager = GameManager.getInstance();
				gameManager.dispatchEvent(GameEvent.GAME_ENDED, customEvent.detail);
				
				// Only schedule cleanup for the main game, not background
				if (instance.type === GameMode.MAIN && !instance.cleanupScheduled) {
					instance.cleanupScheduled = true;
					console.log(`Scheduling cleanup for main game`);
					
					setTimeout(() => {
						if (instance.isActive) {
							// Only clean up the main game, never the background
							gameManager.cleanupGame(gameManager.mainGameInstance);
						}
					}, 300);
				}
			}
		};
		
		// Store the function reference for proper removal later
		const boundListener = gameOverListenerFunction.bind(this) as EventListener;
		
		// Add the listener
		window.addEventListener('gameOver', boundListener);
		
		instance.eventListeners.push({
			type: 'gameOver',
			listener: boundListener
		});
		
		console.log(`Game event listeners set up for ${instance.type}`);
	}

	public getLastGameResult(): any {
		return this.mainGameInstance.gameResult || null;
	}

	// Add a public method to cleanup a specific instance by type
	public cleanupInstance(type: GameMode | string): void {
		console.log(`Cleaning up instance type: ${type}`);
		
		// Handle both enum values and string types for backward compatibility
		if (type === GameMode.MAIN || type === 'main') {
			this.cleanupGame(this.mainGameInstance);
		} else if (type === GameMode.BACKGROUND_DEMO || type === 'background_demo') {
			// Never completely clean up the background game, just hide it
			this.hideBackgroundGame();
		}
	}
}
