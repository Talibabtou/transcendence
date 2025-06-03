import { GameEngine } from '@pong/game/engine';
import { GAME_CONFIG} from '@pong/constants';
import { MatchCache } from '@website/scripts/utils';
import { GameMode } from '@website/types';
import { NotificationManager } from '@website/scripts/services';

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
	private static isBootstrapping: boolean = false;
	private eventListeners: Map<GameEvent, Function[]> = new Map();
	private mainGameInstance: GameInstance;
	private backgroundGameInstance: GameInstance;
	private isCleaningUp: boolean = false;
	private onGameOverCallback: ((result: any) => void) | null = null;

	private constructor() {
		GameManager.isBootstrapping = true;
		this.mainGameInstance = this.createEmptyGameInstance(GameInstanceType.MAIN);
		this.backgroundGameInstance = this.createEmptyGameInstance(GameInstanceType.BACKGROUND_DEMO);
		window.addEventListener('resize', this.handleResize.bind(this));
		window.addEventListener('beforeunload', () => this.cleanup());
		this.setupVisibilityHandling();
		GameManager.isBootstrapping = false;
	}

	/**
	 * Explicitly initialize the GameManager.
	 * This should be called ONLY ONCE by App.ts
	 */
	public initialize(): void {
		if (!GameManager.isInitialized) {
			GameManager.isInitialized = true;
		}
	}

	/**
	 * Creates an empty game instance with the specified type.
	 * @param type The type of game instance to create.
	 * @returns A new GameInstance object.
	 */
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

	/**
	 * Generic method to start any game type.
	 * @param instance The game instance to start.
	 * @param mode The game mode to start.
	 * @param container The HTML element to render the game in.
	 */
	private startGame(instance: GameInstance, mode: GameMode, container: HTMLElement | null): void {
		if (instance.isActive) {
			this.cleanupGame(instance);
		}
		
		const canvas = document.createElement('canvas');
		
		if (instance.type === GameInstanceType.MAIN) {
			canvas.id = 'game-canvas';
			if (!container) {
				NotificationManager.showError('No container provided for main game');
				return;
			}
			container.innerHTML = '';
			container.appendChild(canvas);
		} else {
			canvas.id = 'background-game-canvas';
			const existingBgCanvas = document.getElementById('background-game-canvas');
			if (existingBgCanvas) {
				existingBgCanvas.remove();
			}
			canvas.style.position = 'absolute';
			canvas.style.zIndex = '-1';
			canvas.style.top = '0';
			canvas.style.left = '0';
			document.body.insertBefore(canvas, document.body.firstChild);
		}
		
		this.resizeCanvas(canvas);
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			NotificationManager.showError(`Could not get canvas context for ${instance.type} game`);
			return;
		}

		const gameEngine = new GameEngine(ctx);
		gameEngine.onGameOver = (detail) => {
			if (instance.isActive && instance.engine) {
				this.notifyGameEnded(detail);
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
		
		gameEngine.initialize(instance.type === GameInstanceType.MAIN ? mode : GameMode.BACKGROUND_DEMO);
		instance.canvas = canvas;
		instance.engine = gameEngine;
		instance.isActive = true;
		instance.isPaused = false;
		
		this.startGameLoop(instance);
		this.dispatchEvent(GameEvent.GAME_STARTED, { type: instance.type, mode });
		this.setupGameEventListeners(instance);
	}

	/**
	 * Starts the game loop for the specified game instance.
	 * @param instance The game instance to start the loop for.
	 */
	private startGameLoop(instance: GameInstance): void {
		if (!instance.engine) return;
		
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
		
		const loop = (currentTime: number) => {
			if (!instance.isActive || !instance.engine) {
				if (instance.animationFrameId !== null) {
					cancelAnimationFrame(instance.animationFrameId);
					instance.animationFrameId = null;
				}
				return;
			}
			
			let deltaTime = currentTime - lastTime;
			lastTime = currentTime;
			
			if (deltaTime > GAME_CONFIG.MAX_DELTA_TIME) {
				deltaTime = GAME_CONFIG.MAX_DELTA_TIME;
			}
			
			accumulator += deltaTime;
			
			try {
				let steps = 0;
				while (accumulator >= GAME_CONFIG.FRAME_TIME && steps < GAME_CONFIG.MAX_STEPS_PER_FRAME) {
					instance.engine.update(GAME_CONFIG.FRAME_TIME/1000);
					accumulator -= GAME_CONFIG.FRAME_TIME;
					steps++;
				}
				
				if (steps === GAME_CONFIG.MAX_STEPS_PER_FRAME) {
					accumulator = 0;
				}
				
				const alpha = accumulator / GAME_CONFIG.FRAME_TIME;
				instance.engine.draw(alpha);
			} catch (error) {
				this.handleGameEngineError(
					error as Error,
					instance.type === GameInstanceType.MAIN ? 'main' : 'background'
				);
				instance.isActive = false; 
				return; 
			}
			
			instance.animationFrameId = requestAnimationFrame(loop);
		};
		
		instance.animationFrameId = requestAnimationFrame(loop);
	}

	/**
	 * Pauses the game for the specified game instance.
	 * @param instance The game instance to pause.
	 */
	private pauseGame(instance: GameInstance): void {
		if (instance.engine && instance.type !== GameInstanceType.BACKGROUND_DEMO && !instance.engine.isGamePaused()) {
			instance.engine.togglePause();
			this.dispatchEvent(GameEvent.GAME_PAUSED);
		}
	}

	/**
	 * Cleans up the specified game instance.
	 * @param instance The game instance to clean up.
	 */
	private cleanupGame(instance: GameInstance): void {
		if (this.isCleaningUp || GameManager.isBootstrapping || !instance.isActive || !instance.engine) {
			if (!this.isCleaningUp && !GameManager.isBootstrapping) {
				this.isCleaningUp = false;
			}
			return;
		}
		
		this.isCleaningUp = true;
		
		if (instance.engine && !instance.engine.isGamePaused()) {
			this.pauseGame(instance);
		}
		
		if (instance.eventListeners?.length) {
			instance.eventListeners.forEach(({ type, listener }) => {
				window.removeEventListener(type, listener);
			});
			instance.eventListeners = [];
		}
		
		if (instance.animationFrameId !== null) {
			cancelAnimationFrame(instance.animationFrameId);
			instance.animationFrameId = null;
		}
		
		if (instance.updateIntervalId !== null) {
			clearInterval(instance.updateIntervalId);
			instance.updateIntervalId = null;
		}
		
		if (instance.engine) {
			instance.engine.cleanup();
			instance.engine = null;
		}
		
		if (instance.canvas?.parentNode) {
			instance.canvas.parentNode.removeChild(instance.canvas);
			instance.canvas = null;
		}
		
		instance.isActive = false;
		instance.isPaused = false;
		this.isCleaningUp = false;
	}

	/**
	 * Starts a tournament match with specific player information.
	 * @param container HTML element to render the game in.
	 * @param matchInfo Tournament match information.
	 */
	public startTournamentMatch(
		container: HTMLElement,
		matchInfo: {
			player1Id: string;
			player2Id: string;
			player1Name: string;
			player2Name: string;
			player1Color: string;
			player2Color: string;
			tournamentId: string;
			isFinal?: boolean;
		}
	): void {
		const playerInfo = {
			playerIds: [matchInfo.player1Id, matchInfo.player2Id],
			playerNames: [matchInfo.player1Name, matchInfo.player2Name],
			playerColors: [matchInfo.player1Color, matchInfo.player2Color],
			tournamentId: matchInfo.tournamentId,
			isFinal: matchInfo.isFinal || false
		};
		
		this.startMainGame(GameMode.TOURNAMENT, container, playerInfo);
	}

	/**
	 * Starts the main game with the specified mode and player information.
	 * @param mode The game mode to start.
	 * @param container The HTML element to render the game in.
	 * @param playerInfo Optional player information.
	 */
	public startMainGame(
		mode: GameMode, 
		container: HTMLElement, 
		playerInfo?: { 
			playerName?: string,
			playerColor?: string,
			playerIds?: string[],
			playerNames?: string[],
			playerColors?: string[],
			tournamentId?: string,
			isFinal?: boolean
		}
	): void {
		this.startGame(this.mainGameInstance, mode, container);
		if (mode === GameMode.BACKGROUND_DEMO) return;
		
		MatchCache.setCurrentGameInfo({
			gameMode: mode,
			playerIds: playerInfo?.playerIds,
			playerNames: playerInfo?.playerNames,
			playerColors: playerInfo?.playerColors,
			isFinal: playerInfo?.isFinal
		});
		
		if (playerInfo && this.mainGameInstance.engine) {
			const playerNames = playerInfo.playerNames || [];
			const currentUser = playerInfo.playerName || playerNames[0] || 'Player 1';
			const opponent = (mode === GameMode.MULTI || mode === GameMode.TOURNAMENT) 
				? (playerNames[1] || 'Player 2') 
				: 'AI';
			
			this.mainGameInstance.engine.setPlayerNames(currentUser, opponent);
			
			const playerColors = playerInfo.playerColors || [];
			const p1Color = playerColors[0] || playerInfo.playerColor || '#ffffff';
			const p2Color = mode === GameMode.SINGLE 
				? '#ffffff' 
				: (playerColors.length > 1 && playerColors[1]) ? playerColors[1] : '#ffffff';
			
			this.mainGameInstance.engine.updatePlayerColors(p1Color, p2Color);
			
			if (playerInfo.playerIds?.length) {
				const playerIdsCopy = [...playerInfo.playerIds];
				if (playerInfo.tournamentId) {
					this.mainGameInstance.engine.setPlayerIds(playerIdsCopy, playerInfo.tournamentId, playerInfo.isFinal || false);
				} else {
					this.mainGameInstance.engine.setPlayerIds(playerIdsCopy);
				}
			}
		}
		
		if (this.mainGameInstance.engine) {
			this.mainGameInstance.engine.startMatchTimer();
		}
	}

	/**
	 * Starts the background game.
	 */
	public startBackgroundGame(): void {
		if (!GameManager.isInitialized || this.backgroundGameInstance.isActive) return;
		
		this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
		this.setBackgroundKeyboardActive(false);
	}

	/**
	 * Handles the window resize event.
	 */
	private handleResize(): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine && this.mainGameInstance.canvas) {
			this.resizeCanvas(this.mainGameInstance.canvas);
			this.mainGameInstance.engine.resize(this.mainGameInstance.canvas.width, this.mainGameInstance.canvas.height);
		}
		
		if (this.backgroundGameInstance.isActive && this.backgroundGameInstance.engine && this.backgroundGameInstance.canvas) {
			this.resizeCanvas(this.backgroundGameInstance.canvas);
			this.backgroundGameInstance.engine.resize(this.backgroundGameInstance.canvas.width, this.backgroundGameInstance.canvas.height);
		}
	}

	/**
	 * Resizes the canvas to fit the window.
	 * @param canvas The canvas to resize.
	 */
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

	/**
	 * Cleans up the game manager.
	 */
	public cleanup(): void {
		this.cleanupMainGame();
		this.cleanupBackgroundGame();
		window.removeEventListener('resize', this.handleResize.bind(this));
	}

	/**
	 * Sets up visibility handling for the game.
	 */
	private setupVisibilityHandling(): void {
		document.addEventListener('visibilitychange', () => {
			const isHidden = document.hidden;
			this.dispatchEvent(GameEvent.VISIBILITY_CHANGED, { isHidden });
			
			if (this.mainGameInstance.isActive && this.mainGameInstance.engine && isHidden) {
				this.mainGameInstance.engine.requestPause();
				this.dispatchEvent(GameEvent.GAME_PAUSED);
			}
		});
	}
	
	/**
	 * Handles game engine errors.
	 * @param error The error that occurred.
	 * @param gameType The type of game that encountered the error.
	 */
	private handleGameEngineError(error: Error, gameType: 'main' | 'background'): void {
		const errorEvent = new CustomEvent('game-error', {
			detail: {
				gameType,
				message: error.message,
				timestamp: new Date().toISOString()
			}
		});
		
		document.dispatchEvent(errorEvent);
		gameType === 'main' ? this.cleanupMainGame() : this.cleanupBackgroundGame();
		
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
	 * Shows the background game.
	 */
	public showBackgroundGame(): void {
		try {
			if (!this.backgroundGameInstance.isActive || !this.backgroundGameInstance.engine) {
				this.cleanupGame(this.backgroundGameInstance);
				this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
				this.backgroundGameInstance.engine?.setKeyboardEnabled(false);
				return;
			}
			
			if (this.backgroundGameInstance.canvas) {
				this.backgroundGameInstance.canvas.style.display = 'block';
				this.backgroundGameInstance.canvas.style.opacity = '0.4';
			}
			
			if (this.backgroundGameInstance.engine.isGamePaused()) {
				this.backgroundGameInstance.engine.togglePause();
			}
			
			this.startGameLoop(this.backgroundGameInstance);
			this.backgroundGameInstance.engine.setKeyboardEnabled(false);
		} catch (error) {
			NotificationManager.showError('Error showing background game');
			this.cleanupBackgroundGame();
			this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
			this.backgroundGameInstance.engine?.setKeyboardEnabled(false);
		}
	}

	/**
	 * Hides the background game.
	 */
	public hideBackgroundGame(): void {
		if (this.backgroundGameInstance.animationFrameId !== null) {
			cancelAnimationFrame(this.backgroundGameInstance.animationFrameId);
			this.backgroundGameInstance.animationFrameId = null;
		}
		
		if (this.backgroundGameInstance.updateIntervalId !== null) {
			clearInterval(this.backgroundGameInstance.updateIntervalId);
			this.backgroundGameInstance.updateIntervalId = null;
		}

		if (this.backgroundGameInstance.canvas) {
			this.backgroundGameInstance.canvas.style.display = 'none';
			this.backgroundGameInstance.canvas.style.opacity = '0';
		}
	}

	/**
	 * Adds an event listener for the specified game event.
	 * @param event The game event to listen for.
	 * @param callback The callback function to execute when the event occurs.
	 * @returns A function to remove the event listener.
	 */
	public addEventListener(event: GameEvent, callback: Function): () => void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		
		this.eventListeners.get(event)!.push(callback);
		
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

	/**
	 * Updates the color of player paddles in the main game.
	 * @param playerColor Color for the player's paddle (hex format).
	 */
	public updateMainGamePlayerColor(playerColor: string): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			try {
				this.mainGameInstance.engine.updatePlayerColors(playerColor);
			} catch (error) {
				NotificationManager.showError("Error updating player color");
			}
		}
	}

	/**
	 * Cleans up the specified game instance.
	 * @param type The type of game instance to clean up.
	 */
	public cleanupInstance(type: GameInstanceType | string): void {
		if (type === GameInstanceType.MAIN || type === 'main') {
			this.cleanupGame(this.mainGameInstance);
		} else if (type === GameInstanceType.BACKGROUND_DEMO || type === 'background_demo') {
			this.hideBackgroundGame();
		}
	}

	/**
	 * Checks if the main game is paused.
	 * @returns True if the main game is paused, false otherwise.
	 */
	public isMainGamePaused(): boolean { 
		return this.mainGameInstance.engine?.isGamePaused() || false; 
	}

	/**
	 * Checks if the main game is active.
	 * @returns True if the main game is active, false otherwise.
	 */
	public isMainGameActive(): boolean { 
		return this.mainGameInstance.isActive; 
	}

	/**
	 * Checks if the background game is active.
	 * @returns True if the background game is active, false otherwise.
	 */
	public isBackgroundGameActive(): boolean { 
		return this.backgroundGameInstance.isActive; 
	}

	/**
	 * Cleans up the main game.
	 */
	public cleanupMainGame(): void { 
		this.cleanupGame(this.mainGameInstance); 
	}

	/**
	 * Cleans up the background game.
	 */
	public cleanupBackgroundGame(): void { 
		this.cleanupGame(this.backgroundGameInstance); 
	}

	/**
	 * Resizes the game canvas.
	 * @param canvas The canvas to resize.
	 */
	public resizeGameCanvas(canvas: HTMLCanvasElement): void { 
		this.resizeCanvas(canvas); 
	}

	/**
	 * Dispatches a game event with optional data.
	 * @param event The game event to dispatch.
	 * @param data Optional data to pass with the event.
	 */
	private dispatchEvent(event: GameEvent, data?: any): void {
		if (this.eventListeners.has(event)) {
			this.eventListeners.get(event)!.forEach(callback => callback(data));
		}
	}

	/**
	 * Notifies that the game has ended.
	 * @param data The data to pass with the notification.
	 */
	private notifyGameEnded(data: any): void {
		if (this.eventListeners.has(GameEvent.GAME_ENDED)) {
			this.eventListeners.get(GameEvent.GAME_ENDED)!.forEach(callback => callback(data));
		}
		
		if (this.onGameOverCallback) {
			this.onGameOverCallback(data);
		}
	}

	/**
	 * Gets the last game result.
	 * @returns The last game result, or null if there is no result.
	 */
	public getLastGameResult(): any { 
		return this.mainGameInstance.gameResult || null; 
	}

	/**
	 * Gets the main game engine.
	 * @returns The main game engine, or null if it is not active.
	 */
	public getMainGameEngine(): GameEngine | null { 
		return this.mainGameInstance.engine; 
	}

	/**
	 * Sets the callback to be executed when the game is over.
	 * @param callback The callback function to execute.
	 */
	public setOnGameOverCallback(callback: (result: any) => void): void { 
		this.onGameOverCallback = callback; 
	}

	/**
	 * Gets the singleton instance of the GameManager.
	 * @returns The GameManager instance.
	 */
	public static getInstance(): GameManager {
		if (!GameManager.instance) {
			GameManager.instance = new GameManager();
		}
		return GameManager.instance;
	}

	/**
	 * Sets the background keyboard active state.
	 * @param active Whether the keyboard should be active.
	 */
	private setBackgroundKeyboardActive(active: boolean): void {
		this.backgroundGameInstance.engine?.setKeyboardEnabled(active);
	}

	/**
	 * Gets the main game state.
	 * @returns The main game state, or null if it is not active.
	 */
	public getMainGameState(): any {
		return this.mainGameInstance.engine?.GameState || null;
	}

	/**
	 * Sets up game event listeners for the specified game instance.
	 * @param instance The game instance to set up listeners for.
	 */
	private setupGameEventListeners(instance: GameInstance): void {
		if (instance.eventListeners) {
			instance.eventListeners.forEach(({ type, listener }) => {
				window.removeEventListener(type, listener);
			});
		}
		
		instance.eventListeners = [];
	}

	/**
	 * Sets the player names for the main game.
	 * @param player1Name The name of the first player.
	 * @param player2Name The name of the second player.
	 */
	public setMainGamePlayerNames(player1Name: string, player2Name: string): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			try {
				this.mainGameInstance.engine.setPlayerNames(player1Name, player2Name);
			} catch (error) {
				NotificationManager.showError('Error setting player names');
			}
		}
	}
}
