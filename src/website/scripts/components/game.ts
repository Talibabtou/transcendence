import { Component } from './component';
import { GameEngine } from '@pong/game/engine';
import { GAME_CONFIG } from '@pong/constants';
import { initializeAsciiArt } from '../ascii-art';
import { ASCII_ART } from '../ascii-art';

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
  private isBackgroundMode: boolean = false;
  private gameState: {
    player1Name: string;
    player2Name: string;
    gameMode: GameMode;
    isPlaying: boolean;
    isGameOver: boolean;
  };
  
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
    // Template is already in the HTML, just init and show
    this.initializeElements();
    this.initializeEventListeners();
    
    // Initialize ASCII art
    initializeAsciiArt();
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
    }) as EventListener);
  }
  
  private resizeCanvas(): void {
    if (!this.canvas) return;
    
    // Get navbar and footer elements
    const navbar = document.querySelector('.navbar');
    const footer = document.querySelector('.footer');
    
    if (navbar && footer) {
      const navbarHeight = navbar.getBoundingClientRect().height;
      const footerHeight = footer.getBoundingClientRect().height;
      
      // Match the background canvas positioning
      this.canvas.style.position = 'absolute';
      this.canvas.style.width = '100%';
      this.canvas.style.height = `calc(100vh - ${navbarHeight}px - ${footerHeight}px)`;
      
      // Set canvas dimensions
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight - navbarHeight - footerHeight;
      this.canvas.width = availableWidth;
      this.canvas.height = availableHeight;
      
      // Update game engine if it exists
      if (this.gameEngine) {
        this.gameEngine.resize(availableWidth, availableHeight);
      }
    }
  }
  
  private startGame(mode: GameMode): void {
    // When starting a real game, pause the background game
    if (window.backgroundPong) {
      window.backgroundPong.pause();
    }

    // Reset any existing game
    if (this.gameEngine) {
      this.gameEngine.cleanup();
      this.gameEngine = null;
    }

    // Update game state
    this.gameState.gameMode = mode;
    this.gameState.isPlaying = true;
    this.gameState.isGameOver = false;

    // Hide menu
    if (this.menu) {
      this.menu.style.display = 'none';
    }

    // Add game-active class to content container
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.classList.add('game-active');
    }

    // Get the game container
    const gameContainer = this.container.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.classList.add('fullscreen');
    }

    // Show and setup canvas
    if (this.canvas) {
      this.canvas.style.display = 'block';
      this.canvas.style.opacity = '1';
      this.resizeCanvas();
    }

    // Initialize game engine
    const context = this.canvas?.getContext('2d');
    if (!context) return;

    this.gameEngine = new GameEngine(context);
    
    // Set player names based on mode
    this.gameEngine.setPlayerNames(
      this.gameState.player1Name,
      mode === GameMode.SINGLE ? 'AI Player' : this.gameState.player2Name
    );

    // Initialize appropriate game mode
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

    this.gameStarted = true;
    this.isBackgroundMode = false;
    
    // Start game loop
    this.startGameLoop();
  }
  
  private startGameLoop(): void {
    if (!this.gameEngine) return;
    
    // Set up update interval
    const updateInterval = setInterval(() => {
      if (this.gameEngine && this.gameStarted) {
        this.gameEngine.update();
      } else {
        clearInterval(updateInterval);
      }
    }, 1000 / GAME_CONFIG.FPS);
    
    // Set up render loop using requestAnimationFrame
    const render = () => {
      if (this.gameEngine && this.gameStarted) {
        this.gameEngine.draw();
        this.animationFrameId = requestAnimationFrame(render);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(render);
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

    // Show menu
    this.container.innerHTML = `
      <div id="game-menu" class="game-menu">
        <div class="ascii-title">
          <pre class="pong-title"></pre>
        </div>
        <div class="menu-buttons">
          <button class="menu-button" data-mode="single">Single Player</button>
          <button class="menu-button" data-mode="multi">Multiplayer</button>
          <button class="menu-button" data-mode="tournament">Tournament</button>
        </div>
      </div>
    `;

    // Reinitialize elements and listeners
    this.initializeElements();
    this.initializeEventListeners();
    initializeAsciiArt();

    // Resume the background game
    if (window.backgroundPong) {
      window.backgroundPong.resume();
    }

    // Remove game-active class from content container
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.classList.remove('game-active');
    }

    // Remove fullscreen class
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

    // Show game over screen with matching menu styling
    const gameOverHTML = `
        <div class="game-container">
            <div class="game-menu">
                <div class="ascii-title">
                    <pre class="game-over-title"></pre>
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
                    <button class="menu-button" data-action="restart">Play Again</button>
                    <button class="menu-button" data-action="menu">Back to Menu</button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = gameOverHTML;

    // Initialize ASCII art
    const gameOverTitle = this.container.querySelector('.game-over-title');
    if (gameOverTitle) {
        gameOverTitle.textContent = ASCII_ART.GAME_OVER;
    }

    // Add event listeners for buttons
    this.container.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = (e.target as HTMLElement).dataset.action;
            if (action === 'restart') {
                this.startGame(this.gameState.gameMode);
            } else if (action === 'menu') {
                this.showMenu();
            }
        });
    });
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