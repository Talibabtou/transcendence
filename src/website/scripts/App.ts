/**
 * Main application entry point that initializes core components of the website.
 * This file handles the setup of navigation, game functionality, and routing.
 */

import { Router, NavbarComponent } from '@website/scripts/utils';
import { GameManager } from '@website/scripts/components';
/**
 * Core application class responsible for initializing and orchestrating
 * the website's components and functionality.
 */
export class App {
	private gameManager!: GameManager;

	/**
	 * Creates a new App instance and triggers the initialization process.
	 */
	constructor() {
		this.initialize();
	}

	/**
	 * Initializes all core components of the application
	 * 
	 * @private
	 */
	private initialize(): void {
		this.initializeNavbar();
		this.initializeGameManager();
		this.initializeRouter();
		this.setupEventListeners();
	}

	private initializeNavbar(): void {
		NavbarComponent.initialize();
	}

	private initializeGameManager(): void {
		try {
			this.gameManager = GameManager.getInstance();
			
			// THIS is the only place that should initialize
			this.gameManager.initialize();
			
			// Start background game ONLY here
			this.gameManager.startBackgroundGame();
			
			window.gameManager = this.gameManager;
		} catch (error) {
			console.error('Failed to initialize game manager:', error);
		}
	}

	private initializeRouter(): void {
		const contentContainer = document.querySelector('.content-container') as HTMLElement;
		if (contentContainer) {
			new Router(contentContainer);
		} else {
			console.error('Could not find content container element');
		}
	}

	private setupEventListeners(): void {
		// Add any app-wide event listeners here
	}
}

/**
 * Bootstrap the application once the DOM is fully loaded.
 * This ensures all HTML elements are available for manipulation.
 */
document.addEventListener('DOMContentLoaded', () => {
	new App();
});
