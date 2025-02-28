import { Router } from './router';
import { initializeAsciiArt } from './ascii-art';
import { GameEngine } from '@pong/game/engine';
import { GAME_CONFIG } from '@pong/constants';

// Extend Window interface to add our custom property
declare global {
  interface Window {
    backgroundPong?: BackgroundPongGame;
  }
}

/**
 * Background Pong game class to run on all pages
 * except when an actual game is being played
 */
class BackgroundPongGame {
  private canvas: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private gameEngine!: GameEngine;
  private animationFrameId: number | null = null;
  private updateInterval: number | null = null;
  private isActive: boolean = true;
  
  constructor() {
    // Create a canvas element for the background game
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'background-game-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = 'var(--navbar-height)';  // Position below navbar
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = 'calc(100% - var(--navbar-height) - var(--footer-height))';  // Adjust height
    this.canvas.style.zIndex = '-1';  // Behind everything
    this.canvas.style.opacity = '0.3'; // Semi-transparent
    
    // Size canvas to fill window
    this.resizeCanvas();
    
    // Get context and initialize game engine
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    this.context = ctx;
    this.gameEngine = new GameEngine(this.context);
    this.gameEngine.initializeBackgroundMode();
    
    // Add canvas to body
    document.body.insertBefore(this.canvas, document.body.firstChild);
    
    // Set up event listeners
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Listen for route changes (to disable when in game page)
    document.addEventListener('route-changed', ((e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.route === 'game') {
        this.pause();
      } else {
        this.resume();
      }
    }) as EventListener);
    
    // Start the game loop
    this.startGameLoop();
    
    console.log('Background Pong AI initialized');
  }
  
  private resizeCanvas(): void {
    const navbar = document.querySelector('.navbar');
    const footer = document.querySelector('.footer');
    
    if (navbar && footer) {
      const navbarHeight = navbar.getBoundingClientRect().height;
      const footerHeight = footer.getBoundingClientRect().height;
      
      // Set canvas dimensions to fit between navbar and footer
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight - navbarHeight - footerHeight;
      
      // Update canvas position
      this.canvas.style.top = `${navbarHeight}px`;
      this.canvas.style.height = `${this.canvas.height}px`;
    } else {
      // Fallback if elements aren't found
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }
  
  private handleResize(): void {
    this.resizeCanvas();
    if (this.gameEngine) {
      this.gameEngine.resize(this.canvas.width, this.canvas.height);
    }
  }
  
  private startGameLoop(): void {
    // Set up update interval
    this.updateInterval = window.setInterval(() => {
      if (this.isActive && this.gameEngine) {
        this.gameEngine.update();
      }
    }, 1000 / GAME_CONFIG.FPS);
    
    // Set up render loop
    const render = () => {
      if (this.isActive && this.gameEngine) {
        this.gameEngine.draw();
      }
      this.animationFrameId = requestAnimationFrame(render);
    };
    
    this.animationFrameId = requestAnimationFrame(render);
  }
  
  public pause(): void {
    this.isActive = false;
    this.canvas.style.display = 'none';
  }
  
  public resume(): void {
    this.isActive = true;
    this.canvas.style.display = 'block';
  }
  
  public cleanup(): void {
    this.isActive = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    if (this.gameEngine) {
      this.gameEngine.cleanup();
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize ASCII art in the header
  initializeAsciiArt();
  
  // Initialize the background Pong game
  window.backgroundPong = new BackgroundPongGame();
  
  // Initialize the router with the main content container
  const contentContainer = document.querySelector('.content-container') as HTMLElement;
  if (contentContainer) {
    new Router(contentContainer);
  } else {
    console.error('Could not find content container element');
  }
}); 
