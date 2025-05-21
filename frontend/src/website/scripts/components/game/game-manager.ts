import { GameEngine } from '@pong/game/engine';
import { GAME_CONFIG} from '@pong/constants';
import { MatchCache } from '@website/scripts/utils';
import { GameMode } from '@website/types';

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
		window.addEventListener('beforeunload', () => {
			this.cleanup();
		});
		this.setupVisibilityHandling();
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
		if (instance.isActive) {
			this.cleanupGame(instance);
		}
		const canvas = document.createElement('canvas');
		
		if (instance.type === GameInstanceType.MAIN) {
			canvas.id = 'game-canvas';
			if (container) {
				container.innerHTML = '';
				container.appendChild(canvas);
			} else {
				console.error('No container provided for main game');
				return;
			}
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
			console.error(`Could not get canvas context for ${instance.type} game`);
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
		if (instance.type === GameInstanceType.MAIN) {
			gameEngine.initialize(mode);
		} else {
			gameEngine.initialize(GameMode.BACKGROUND_DEMO);
		}
		instance.canvas = canvas;
		instance.engine = gameEngine;
		instance.isActive = true;
		instance.isPaused = false;
		this.startGameLoop(instance);
		this.dispatchEvent(GameEvent.GAME_STARTED, { type: instance.type, mode });
		this.setupGameEventListeners(instance);
	}

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
			if (instance.isActive && instance.engine) {
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
			} else {
				if (instance.animationFrameId !== null) {
					cancelAnimationFrame(instance.animationFrameId);
					instance.animationFrameId = null;
				}
			}
		};
		instance.animationFrameId = requestAnimationFrame(loop);
	}

	private pauseGame(instance: GameInstance): void {
		if (instance.engine && instance.type !== GameInstanceType.BACKGROUND_DEMO) {
			if (!instance.engine.isGamePaused()) {
				instance.engine.togglePause();
				this.dispatchEvent(GameEvent.GAME_PAUSED);
			}
		}
	}

	private cleanupGame(instance: GameInstance): void {
		if (this.isCleaningUp) {
			return;
		}
		this.isCleaningUp = true;
		if (GameManager.isBootstrapping) {
			this.isCleaningUp = false;
			return;
		}
		if (!instance.isActive || !instance.engine) {
			this.isCleaningUp = false;
			return;
		}
		if (instance.engine && !instance.engine.isGamePaused()) {
			this.pauseGame(instance);
		}
		if (instance.eventListeners && instance.eventListeners.length > 0) {
			instance.eventListeners.forEach(listenerInfo => {
				window.removeEventListener(listenerInfo.type, listenerInfo.listener);
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
		if (instance.canvas && instance.canvas.parentNode) {
			instance.canvas.parentNode.removeChild(instance.canvas);
			instance.canvas = null;
		}
		instance.isActive = false;
		instance.isPaused = false;
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
			player1Id: string;
			player2Id: string;
			player1Name: string;
			player2Name: string;
			player1Color: string;
			player2Color: string;
			tournamentId: string;
		}
	): void {
		const playerInfo = {
			playerIds: [matchInfo.player1Id, matchInfo.player2Id],
			playerNames: [matchInfo.player1Name, matchInfo.player2Name],
			playerColors: [matchInfo.player1Color, matchInfo.player2Color],
			tournamentId: matchInfo.tournamentId
		};
		this.startMainGame(GameMode.TOURNAMENT, container, playerInfo);
	}

	public startMainGame(
		mode: GameMode, 
		container: HTMLElement, 
		playerInfo?: { 
			playerName?: string,
			playerColor?: string,
			playerIds?: string[],
			playerNames?: string[],
			playerColors?: string[],
			tournamentId?: string
		}
	): void {
		this.startGame(this.mainGameInstance, mode, container);
		if (mode === GameMode.BACKGROUND_DEMO) {
			return;
		}
		MatchCache.setCurrentGameInfo({
			gameMode: mode,
			playerIds: playerInfo?.playerIds,
			playerNames: playerInfo?.playerNames,
			playerColors: playerInfo?.playerColors
		});
		if (playerInfo) {
			const playerNames = playerInfo.playerNames || [];
			const currentUser = playerInfo.playerName || playerNames[0] || 'Player 1';
			let opponent = 'AI';
			if (mode === GameMode.MULTI || mode === GameMode.TOURNAMENT) {
				opponent = playerNames[1] || 'Player 2';
			}
			if (this.mainGameInstance.engine) {
				this.mainGameInstance.engine.setPlayerNames(currentUser, opponent);
				const playerColors = playerInfo.playerColors || [];
				const p1Color = playerColors[0] || playerInfo.playerColor || '#ffffff';
				let p2Color;
				if (mode === GameMode.SINGLE) {
					p2Color = '#ffffff';
				} else if (playerColors.length > 1 && playerColors[1]) {
					p2Color = playerColors[1];
				} else {
					p2Color = '#ffffff';
				}
				this.mainGameInstance.engine.updatePlayerColors(p1Color, p2Color);
				if (playerInfo.playerIds && playerInfo.playerIds.length > 0) {
					const playerIdsCopy = [...playerInfo.playerIds];
					if (playerInfo.tournamentId) {
						this.mainGameInstance.engine.setPlayerIds(playerIdsCopy, playerInfo.tournamentId);
					} else {
						this.mainGameInstance.engine.setPlayerIds(playerIdsCopy);
					}
				}
			}
		}
		if (this.mainGameInstance.engine) {
			this.mainGameInstance.engine.startMatchTimer();
		}
	}

	public startBackgroundGame(): void {
		if (!GameManager.isInitialized) {
			return;
		}
		if (!this.backgroundGameInstance.isActive) {
			this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
			this.setBackgroundKeyboardActive(false);
		}
	}

	private handleResize(): void {
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


	public cleanup(): void {
		this.cleanupMainGame();
		this.cleanupBackgroundGame();
		window.removeEventListener('resize', this.handleResize.bind(this));
	}

	private setupVisibilityHandling(): void {
		document.addEventListener('visibilitychange', () => {
			const isHidden = document.hidden;
			this.dispatchEvent(GameEvent.VISIBILITY_CHANGED, { isHidden });
			if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
				if (isHidden) {
					this.mainGameInstance.engine.requestPause();
					this.dispatchEvent(GameEvent.GAME_PAUSED);
				}
			}
		});
	}
	
	private handleGameEngineError(error: Error, gameType: 'main' | 'background'): void {
		console.error(`Error in ${gameType} game engine:`, error);
		const errorEvent = new CustomEvent('game-error', {
			detail: {
				gameType,
				message: error.message,
				timestamp: new Date().toISOString()
			}
		});
		document.dispatchEvent(errorEvent);
		if (gameType === 'main') {
			this.cleanupMainGame();
		} else {
			this.cleanupBackgroundGame();
		}
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
			if (!this.backgroundGameInstance.isActive || !this.backgroundGameInstance.engine) {
				this.cleanupGame(this.backgroundGameInstance);
				this.startGame(this.backgroundGameInstance, GameMode.BACKGROUND_DEMO, null);
				if (this.backgroundGameInstance.engine) {
					this.backgroundGameInstance.engine.setKeyboardEnabled(false);
				}
			} else {
				if (this.backgroundGameInstance.canvas) {
					this.backgroundGameInstance.canvas.style.display = 'block';
					this.backgroundGameInstance.canvas.style.opacity = '0.4';
				}
				if (this.backgroundGameInstance.engine.isGamePaused()) {
					this.backgroundGameInstance.engine.togglePause();
				}
				this.startGameLoop(this.backgroundGameInstance);
				if (this.backgroundGameInstance.engine) {
					this.backgroundGameInstance.engine.setKeyboardEnabled(false);
				}
			}
		} catch (error) {
			console.error('Error showing background game:', error);
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
		} catch (error) {
			console.error('Error hiding background game:', error);
		}
	}


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
	 * Updates the color of player paddles in the main game
	 * @param playerColor Color for the player's paddle (hex format)
	 */
	public updateMainGamePlayerColor(playerColor: string): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			try {
				this.mainGameInstance.engine.updatePlayerColors(playerColor);
			} catch (error) {
				console.error('Error updating player color:', error);
			}
		}
	}

	public cleanupInstance(type: GameInstanceType | string): void {
		if (type === GameInstanceType.MAIN || type === 'main') {
			this.cleanupGame(this.mainGameInstance);
		} else if (type === GameInstanceType.BACKGROUND_DEMO || type === 'background_demo') {
			this.hideBackgroundGame();
		}
	}

	////////////////////////////////////////////////////////////
	// Helper methods
	////////////////////////////////////////////////////////////

	public isMainGamePaused(): boolean { return this.mainGameInstance.engine ? this.mainGameInstance.engine.isGamePaused() : false; }
	public isMainGameActive(): boolean { return this.mainGameInstance.isActive; }
	public isBackgroundGameActive(): boolean { return this.backgroundGameInstance.isActive; }
	public cleanupMainGame(): void { this.cleanupGame(this.mainGameInstance); }
	public cleanupBackgroundGame(): void { this.cleanupGame(this.backgroundGameInstance); }
	public resizeGameCanvas(canvas: HTMLCanvasElement): void { this.resizeCanvas(canvas); }
	private dispatchEvent(event: GameEvent, data?: any): void {
		if (this.eventListeners.has(event)) {
			this.eventListeners.get(event)!.forEach(callback => callback(data));
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

	////////////////////////////////////////////////////////////
	// Getters & setters
	////////////////////////////////////////////////////////////

	public getLastGameResult(): any { return this.mainGameInstance.gameResult || null; }
	public getMainGameEngine(): GameEngine | null { return this.mainGameInstance.engine; }
	public setOnGameOverCallback(callback: (result: any) => void): void { this.onGameOverCallback = callback; }
	public static getInstance(): GameManager {
		if (!GameManager.instance) {
				GameManager.instance = new GameManager();
		}
		return GameManager.instance;
	}

	private setBackgroundKeyboardActive(active: boolean): void {
		if (this.backgroundGameInstance.engine) {
			this.backgroundGameInstance.engine.setKeyboardEnabled(active);
		}
	}

	public getMainGameState(): any {
		if (this.mainGameInstance.engine) {
			return this.mainGameInstance.engine.GameState;
		}
		return null;
	}

	private setupGameEventListeners(instance: GameInstance): void {
		if (instance.eventListeners) {
			instance.eventListeners.forEach(listenerInfo => {
				window.removeEventListener(listenerInfo.type, listenerInfo.listener);
			});
			instance.eventListeners = [];
		} else {
			instance.eventListeners = [];
		}
		if (instance.type === GameInstanceType.BACKGROUND_DEMO) {
			return;
		}
	}

	public setMainGamePlayerNames(player1Name: string, player2Name: string): void {
		if (this.mainGameInstance.isActive && this.mainGameInstance.engine) {
			try {
				this.mainGameInstance.engine.setPlayerNames(player1Name, player2Name);
			} catch (error) {
				console.error('Error setting player names:', error);
			}
		}
	}
}
