import { NavbarComponent } from '@website/scripts/utils';
import { Router, NotificationManager, WebSocketClient } from '@website/scripts/services';
import { GameManager } from '@website/scripts/components';

// Extend the Window interface to include global properties
declare global {
	interface Window {
		gameManager?: GameManager;
		webSocketClient?: WebSocketClient;
	}
}

/**
 * Core application class responsible for initializing and orchestrating
 * the website's components and functionality.
 */
export class App {
	private gameManager!: GameManager;
	private webSocketClient!: WebSocketClient;

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
		this.initializeNotificationManager();
		this.initializeNavbar();
		this.initializeGameManager();
		this.initializeWebSocketClient();
		this.initializeRouter();
		this.setupEventListeners();
	}

	private initializeNotificationManager(): void {
		try {
			NotificationManager;
		} catch (error) {
			console.error('Failed to initialize notification manager:', error);
		}
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

	private initializeWebSocketClient(): void {
		try {
			// Replace with your actual WebSocket server URL
			const token = localStorage.getItem('jwt_token') || ''; // Example: get token
			const websocketUrl = `wss://localhost:8080/ws/status?token=${token}`; 
			this.webSocketClient = WebSocketClient.getInstance(websocketUrl);
			this.webSocketClient.connect();
			window.webSocketClient = this.webSocketClient;
		} catch (error) {
			console.error('Failed to initialize WebSocket client:', error);
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

// TODO:
/*
Code Organization & Architecture:
- Refactor Profile Component into multiple files (stats, history, friends, settings)
- Improve Game Architecture by refactoring large game files (game.ts and game-manager.ts)

UI & Styling:
- Game menu buttons all the same size
- Verify everything works fine on 4k screens
// - Return to menu button in multiplayer and tournament lobbies
//- Add fav color to user profiles
// - Chose color directly in lobbies

Features & Functionality:
- Implement the real AI for the game, and keep the current one for the background demo mode
- Implement different difficulty for AI depending on player's ELO

- Create a structured tournament system with pool visualization (4 players per pool, best 2 out of 3 games go to finals and then best 2 out of 3 games to decide the winner)
// - Separate Host and Guest connection methods
// - Add the process of logging a second user, just to connect results to db, meaning the main logged in is current user and the second one is guest player (same for tournament).
- Remove the setting tab when visiting someone else's profile.

- Implement tournament history and stats
- Implement friend requests/management system
- Implement a poke feature to notify a friend (you send them a ping, they replys a pong)
- Notifications for friend requests, pings, etc.
- Add user preferences for UI themes, in db and query it with the rest of infos for customisation in lobby and in game
- Create a dashboard view showing recent activity

// - Game should send mock API requests to POST matches, POST goals, and PUT matches when over
// - Refine connect/disconnect routing flow

Performance & Security:
- Implement code splitting for faster initial load
- Add caching strategies for frequently accessed data
- Audit and improve authentication security
- Implement proper input validation throughout
- Implement better state management (consider Redux or Context API)
- Optimize database queries
- Refactor to the component pool pattern
- Password enforcement for account creation (8 characters, one uppercase, one number, one special character)
- Manage the backward history click in the navigator (save only if changing / )
- Check routing flow
- Check if the user is logged in when visiting a page
- Set a timeout on games, and duration for match is the total time, play + pauses

Documentation:
- Add JSDoc comments to all main functions
- Add README for the pong and the website

Deployment & DevOps:
// - Vite configurations
- Set up proper environment-specific builds
- Implement full error managing and tracking

- clean le db.ts post plug
- verify app-state.ts that is compatible to plug (ask with jwt)
- 

*/