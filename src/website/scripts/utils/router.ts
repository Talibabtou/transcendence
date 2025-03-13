/**
 * Router Module
 * Handles client-side routing and component management for the Single Page Application.
 * Uses Navigo for routing and manages component lifecycle and visibility.
 */
import Navigo from 'navigo';
import { GameComponent, LeaderboardComponent, ProfileComponent } from '@website/scripts/components';
import { GameManager } from '@website/scripts/utils';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Enum defining all available routes in the application.
 * Used for type-safe route handling and component mapping.
 */
export enum Route {
	GAME = 'game',
	LEADERBOARD = 'leaderboard',
	PROFILE = 'profile'
}

// =========================================
// ROUTER CLASS
// =========================================

/**
 * Router class responsible for handling navigation and component lifecycle.
 * Manages the creation, display, and destruction of components based on the current route.
 */
export class Router {
	// =========================================
	// PROPERTIES
	// =========================================
	
	/** Singleton instance of Navigo router */
	public static routerInstance = new Navigo('/');
	/** Main container element where components will be rendered */
	private container: HTMLElement;
	/** Map storing active component instances */
	private components: Map<Route, any> = new Map();
	/** Currently active route */
	private currentRoute: Route | null = null;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	/**
	 * Initializes the router with a container element and sets up route handlers.
	 * @param container - The DOM element where components will be rendered
	 */
	constructor(container: HTMLElement) {
		this.container = container;
		Router.routerInstance
			.on('/', () => this.handleRoute(Route.GAME))
			.on('/game', () => this.handleRoute(Route.GAME))
			.on('/leaderboard', () => this.handleRoute(Route.LEADERBOARD))
			.on('/profile', () => this.handleRoute(Route.PROFILE))
			.notFound(() => {
				console.log("404: Route not found, defaulting to game");
				this.handleRoute(Route.GAME);
			});
		this.setupNavClickHandlers();

		Router.routerInstance.resolve();
	}
	
	// =========================================
	// ROUTE HANDLING
	// =========================================
	
	/**
	 * Handles route changes by managing component lifecycle and visibility.
	 * - Manages background game visibility
	 * - Cleans up old components
	 * - Creates and renders new components
	 * - Updates UI state
	 * 
	 * @param route - The route to handle
	 */
	private handleRoute(route: Route): void {
		const gameManager = GameManager.getInstance();
		
		// Pause the main game when navigating away from the game route
		if (this.currentRoute === Route.GAME && route !== Route.GAME) {
			if (gameManager.isMainGameActive()) {
				const mainEngine = gameManager.getMainGameEngine();
				if (mainEngine) {
					// Use the new method to handle pending pause requests
					mainEngine.requestPause();
				}
			}
		}
		
		// Only change background game visibility if needed
		if (route === Route.GAME) {
			if (gameManager.isMainGameActive()) {
				gameManager.hideBackgroundGame();
			}
		} else {
			gameManager.showBackgroundGame();
		}

		// Clean up current component if exists
		if (this.currentRoute) {
			const section = document.getElementById(this.currentRoute);
			if (section) {
				section.style.display = 'none';
			}

			// Destroy non-game components when leaving their route
			const currentComponent = this.components.get(this.currentRoute);
			if (this.currentRoute !== Route.GAME && currentComponent && typeof currentComponent.destroy === 'function') {
				currentComponent.destroy();
				this.components.delete(this.currentRoute);
			}
		}

		// Create or reuse section for new route
		let section = document.getElementById(route);
		if (!section) {
			section = document.createElement('section');
			section.id = route;
			section.className = 'section';
			this.container.appendChild(section);
		}
		section.style.display = 'block';

		// Create and render new component if needed
		if (!this.components.has(route) || route !== Route.GAME) {
			const ComponentClass = this.getComponentClass(route);
			this.components.set(route, new ComponentClass(section));
			this.components.get(route).render();
		}

		this.currentRoute = route;
		this.updateActiveNavItem(route);
	}

	// =========================================
	// COMPONENT MANAGEMENT
	// =========================================

	/**
	 * Returns the component class corresponding to the given route.
	 * @param route - The route to get the component for
	 * @returns The component class to instantiate
	 */
	private getComponentClass(route: Route): any {
		switch (route) {
			case Route.GAME: return GameComponent;
			case Route.LEADERBOARD: return LeaderboardComponent;
			case Route.PROFILE: return ProfileComponent;
			default: return GameComponent;
		}
	}

	// =========================================
	// UI MANAGEMENT
	// =========================================

	/**
	 * Sets up click handlers for navigation elements.
	 * Prevents default link behavior and uses router navigation instead.
	 */
	private setupNavClickHandlers(): void {
		document.querySelectorAll('.nav-item, .nav-logo').forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
				if (href) Router.routerInstance.navigate(href);
			});
		});
	}

	/**
	 * Updates the active state of navigation items based on current route.
	 * @param route - The current active route
	 */
	private updateActiveNavItem(route: Route): void {
		document.querySelectorAll('.nav-item').forEach(item => {
			item.classList.toggle('active', item.getAttribute('href') === `/${route}`);
		});
	}
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Helper function to programmatically navigate to a different route.
 * @param path - The path to navigate to
 */
export function navigate(path: string) {
	Router.routerInstance.navigate(path);
}
