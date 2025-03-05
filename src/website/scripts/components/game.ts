import { Component } from './component';
import { GameEngine } from '@pong/game/engine';
import { ASCII_ART, DbService, html, render } from '../utils';

// Game modes enum
enum GameMode {
	SINGLE = 'single',
	MULTI = 'multi',
	TOURNAMENT = 'tournament'
}

export class GameComponent extends Component {
	private canvas: HTMLCanvasElement | null = null;
	private menu: HTMLElement | null = null;
	private gameStarted: boolean = false;
	private gameEngine: GameEngine | null = null;
	private animationFrameId: number | null = null;
	private gameState: {
		player1Name: string;
		player2Name: string;
		gameMode: GameMode;
		isPlaying: boolean;
		isGameOver: boolean;
	};
	// private matchId: number | null = null;
	// private recoveryTimeout: number = 10 * 60 * 1000;

	constructor(container: HTMLElement) {
		super(container);
		this.gameState = {
			player1Name: 'Player 1',
			player2Name: 'Player 2',
			gameMode: GameMode.SINGLE,
			isPlaying: false,
			isGameOver: false
		};
	}

	render(): void {
		// Render the initial game structure
		const gameContent = html`
			<div class="game-container">
				${this.renderGameMenu()}
				<canvas id="game-canvas" style="display: none;"></canvas>
			</div>
		`;
		render(gameContent, this.container);
		this.initializeElements();
		this.initializeEventListeners();
	}

	private renderGameMenu() {
		return html`
			<div id="game-menu" class="game-menu">
				<div class="ascii-title">
					<pre class="pong-title">${ASCII_ART.PONG}</pre>
				</div>
				<div class="menu-buttons">
					<button class="menu-button" data-mode="single" onclick=${() => this.startGame(GameMode.SINGLE)}>
						Single Player
					</button>
					<button class="menu-button" data-mode="multi" onclick=${() => this.startGame(GameMode.MULTI)}>
						Multiplayer
					</button>
					<button class="menu-button" data-mode="tournament" onclick=${() => this.startGame(GameMode.TOURNAMENT)}>
						Tournament
					</button>
				</div>
			</div>
		`;
	}

	private initializeElements(): void {
		this.canvas = this.container.querySelector('#game-canvas') as HTMLCanvasElement;
		this.menu = this.container.querySelector('#game-menu') as HTMLElement;
		if (this.canvas) {
			this.resizeCanvas();
		}
	}

	private initializeEventListeners(): void {
		// Game menu buttons
		const buttons = this.container.querySelectorAll('.menu-button');
		buttons.forEach(button => {
			button.addEventListener('click', (e) => {
				const mode = (e.target as HTMLElement).getAttribute('data-mode') as GameMode;
				this.startGame(mode);
			});
		});
		// Handle window resize
		window.addEventListener('resize', () => this.resizeCanvas());
		// Add game over listener
		window.addEventListener('gameOver', ((e: Event) => {
			const customEvent = e as CustomEvent;
			const gameResult = customEvent.detail;
			// Stop the game loop
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
			// Show game over screen
			this.showGameOver(gameResult);
			// Record match completion
			if (gameResult.matchId) {
				DbService.completeMatch(gameResult.matchId, gameResult.duration);
			}
		}) as EventListener);
	}

	private resizeCanvas(): void {
		if (!this.canvas) return;
		const navbar = document.querySelector('.navbar');
		const footer = document.querySelector('.footer');
		if (navbar && footer) {
			const navbarHeight = navbar.getBoundingClientRect().height;
			const footerHeight = footer.getBoundingClientRect().height;
			// Set canvas dimensions to match window size
			this.canvas.width = window.innerWidth;
			this.canvas.height = window.innerHeight - navbarHeight - footerHeight;
			// Update game engine if it exists
			if (this.gameEngine) {
				this.gameEngine.resize(this.canvas.width, this.canvas.height);
			}
		}
	}

	public pause(): void {
		if (this.gameEngine) {
			this.gameEngine.togglePause();
		}
	}

	public resume(): void {
		if (this.gameEngine && this.gameEngine.isGamePaused()) {
			this.gameEngine.togglePause();
		}
	}

	private startGame(mode: GameMode): void {
		this.gameStarted = true;
		this.gameState = {
			player1Name: 'Player 1',
			player2Name: mode === GameMode.SINGLE ? 'AI' : 'Player 2',
			gameMode: mode,
			isPlaying: true,
			isGameOver: false
		};

		if (window.backgroundPong) {
			window.backgroundPong.pause();
		}

		// Update visibility
		if (this.menu) this.menu.style.display = 'none';
		if (this.canvas) {
			this.canvas.style.display = 'block';
			const ctx = this.canvas.getContext('2d');
			if (ctx) {
				this.gameEngine = new GameEngine(ctx);
				// Initialize proper game mode
				switch (mode) {
					case GameMode.SINGLE:
						this.gameEngine.initializeSinglePlayer();
						break;
					case GameMode.MULTI:
						this.gameEngine.initializeMultiPlayer();
						break;
					case GameMode.TOURNAMENT:
						this.gameEngine.initializeTournament();
						break;
				}
				// Start the game loop after initialization
				this.startGameLoop();
			}
		}
	}

	private startGameLoop(): void {
		if (!this.gameEngine) return;
		const gameLoop = () => {
			if (this.gameEngine && this.gameStarted) {
				this.gameEngine.update();
				this.gameEngine.draw();
				this.animationFrameId = requestAnimationFrame(gameLoop);
			}
		};
		this.animationFrameId = requestAnimationFrame(gameLoop);
	}

	private showMenu(): void {
		// Reset game state
		this.gameState.isPlaying = false;
		this.gameState.isGameOver = false;
		// Clean up existing game
		if (this.gameEngine) {
			this.gameEngine.cleanup();
			this.gameEngine = null;
		}
		// Reset canvas
		if (this.canvas) {
			this.canvas.style.display = 'none';
		}
		// Render menu using htm
		const menuContent = this.renderGameMenu();
		render(menuContent, this.container);
		// Reinitialize elements and listeners
		this.initializeElements();
		this.initializeEventListeners();
		// Resume the background game when returning to menu
		if (window.backgroundPong) {
			window.backgroundPong.resume();
		}
		// Update classes
		const contentContainer = document.querySelector('.content-container');
		if (contentContainer) {
			contentContainer.classList.remove('game-active');
		}
		const gameContainer = this.container.querySelector('.game-container');
		if (gameContainer) {
			gameContainer.classList.remove('fullscreen');
		}
	}

	private showGameOver(result: any): void {
		// Stop the game engine
		if (this.gameEngine) {
			this.gameEngine.cleanup();
			this.gameEngine = null;
		}
		// Hide canvas
		if (this.canvas) {
			this.canvas.style.display = 'none';
		}
		// Render game over screen using htm
		const gameOverContent = html`
			<div class="game-container">
				<div class="game-menu">
					<div class="ascii-title">
						<pre class="game-over-title">${ASCII_ART.GAME_OVER}</pre>
					</div>
					<div class="game-result">
						<div class="winner">${result.winner.name} Wins!</div>
						<div class="score-display">
							<div class="score-line">
								<span class="player-name">${result.player1Name}</span>
								<span class="score-numbers">
									<span class="score-value">${result.player1Score}</span>
									<span class="score-separator">-</span>
									<span class="score-value">${result.player2Score}</span>
								</span>
								<span class="player-name">${result.player2Name}</span>
							</div>
						</div>
					</div>
					<div class="menu-buttons">
						<button class="menu-button" onclick=${() => this.startGame(this.gameState.gameMode)}>
							Play Again
						</button>
						<button class="menu-button" onclick=${() => this.showMenu()}>
							Back to Menu
						</button>
					</div>
				</div>
			</div>
		`;
		render(gameOverContent, this.container);
	}

	destroy(): void {
		// Cancel animation frame if active
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		// Clean up event listeners
		window.removeEventListener('resize', () => this.resizeCanvas());
		// Reset game state
		this.gameStarted = false;
		this.gameEngine = null;
		// Resume the background game when component is destroyed
		if (window.backgroundPong) {
			window.backgroundPong.resume();
		}
		super.destroy();
	}
}
