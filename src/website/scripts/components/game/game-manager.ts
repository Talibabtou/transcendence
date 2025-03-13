import { GameEngine } from '@pong/game/engine';

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
}

export class GameManager {
	private static instance: GameManager;
	private static isInitialized: boolean = false;
	
	// This flag prevents actions during the initialization phase
	private static isBootstrapping: boolean = false;
	
	private eventListeners: Map<GameEvent, Function[]> = new Map();
	
	private mainGameInstance: GameInstance;
	private backgroundGameInstance: GameInstance;
	
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
		try {
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
					container.innerHTML = ''; // Clear container first
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
		} catch (error) {
			this.handleGameEngineError(
				error instanceof Error ? error : new Error(String(error)),
				instance.type === GameMode.MAIN ? 'main' : 'background'
			);
		}
	}
	
	// Generic method to start game loop
	private startGameLoop(instance: GameInstance): void {
		if (!instance.engine || !instance.canvas) return;
		
		let lastFrameTime = 0;
		
		// Stop any existing animation loop
		if (instance.animationFrameId !== null) {
			cancelAnimationFrame(instance.animationFrameId);
			instance.animationFrameId = null;
		}
		
		// Initialize performance tracking
		performance.mark('gameStart');
		
		// Create an optimized render function
		const render = (timestamp: number) => {
			if (!instance.isActive) return;
			
			try {
				// Calculate frame time for debug purposes
				const frameTime = timestamp - lastFrameTime;
				lastFrameTime = timestamp;
				
				// Skip update if game is paused
				if (!instance.isPaused && instance.engine) {
					instance.engine.update();
				}
				
				// Always draw (even when paused)
				if (instance.engine) {
					instance.engine.draw();
				}
				
				// Schedule next frame
				instance.animationFrameId = requestAnimationFrame(render);
				
				// Check performance (log slow frames)
				if (frameTime > 50) { // More than 50ms = less than 20fps
					console.warn(`Slow frame detected: ${frameTime.toFixed(2)}ms`);
				}
			} catch (error) {
				// Handle any error in the game loop
				this.handleGameEngineError(
					error instanceof Error ? error : new Error(String(error)),
					instance.type === GameMode.MAIN ? 'main' : 'background'
				);
			}
		};
		
		// Start the render loop
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
		// Skip if we're in bootstrap phase
		if (GameManager.isBootstrapping) {
			return;
		}
		// Only clean if we have something to clean
		if (!instance.isActive && !instance.engine && !instance.canvas) {
			return;
		}
		// First pause the game to avoid any race conditions
		if (instance.engine && !instance.engine.isGamePaused()) {
			this.pauseGame(instance);
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
	}

	// Public methods that use the generic methods
	public startMainGame(mode: GameMode, container: HTMLElement): void {
		this.startGame(this.mainGameInstance, mode, container);
	}

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
		try {
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
		} catch (error) {
			// Determine which game instance caused the error
			const gameType = this.determineErrorSource(error);
			this.handleGameEngineError(
				error instanceof Error ? error : new Error(String(error)),
				gameType
			);
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
		if (!this.backgroundGameInstance.isActive) {
			this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
		}
		
		if (this.backgroundGameInstance.canvas) {
			this.backgroundGameInstance.canvas.style.display = 'block';
			this.backgroundGameInstance.canvas.style.opacity = '0.4';
		}
	}

	public hideBackgroundGame(): void {
		if (this.backgroundGameInstance.canvas) {
			this.backgroundGameInstance.canvas.style.display = 'none';
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

	// Helper method to determine error source
	private determineErrorSource(error: any): 'main' | 'background' {
		// This is a simple heuristic - you might want to improve it
		const errorStr = String(error);
		if (errorStr.includes('background')) {
			return 'background';
		}
		return 'main'; // Default to main game for most errors
	}
}
