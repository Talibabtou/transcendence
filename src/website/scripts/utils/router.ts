/**
 * Router Module
 * Handles client-side routing and component management for the Single Page Application.
 * Uses Navigo for routing and manages component lifecycle and visibility.
 */
import Navigo from 'navigo';
import { GameComponent, GameManager, LeaderboardComponent, ProfileComponent, AuthManager } from '@website/scripts/components';

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
	PROFILE = 'profile',
	AUTH = 'auth'
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

	public static routerInstance = new Navigo('/');
	private container: HTMLElement;
	private components: Map<Route | string, any> = new Map();
	private currentRoute: Route | null = null;
	private previousRoute: Route | null = null;

	// Add static reference to active instance
	public static activeInstance: Router | null = null;

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
			.on('/auth', () => this.handleAuthRoute())
			.notFound(() => {
				this.handleRoute(Route.GAME);
			});
		this.setupNavClickHandlers();

		Router.routerInstance.resolve();

		// Store reference to this instance
		Router.activeInstance = this;
	}

	// =========================================
	// ROUTE HANDLING
	// =========================================

	/**
	 * Handles route changes by managing component lifecycle and visibility.
	 * Also ensures auth component is properly closed when navigating.
	 * 
	 * @param route - The route to handle
	 */
	private handleRoute(route: Route): void {
		const gameManager = GameManager.getInstance();
		
		// Always clean up the auth component when changing routes
		this.cleanupCurrentRoute();
		
		// Remember this route if we're not going to auth
		if (route !== Route.AUTH) {
			this.previousRoute = this.currentRoute;
		}
		
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
		
		// Manage background game visibility correctly
		if (route === Route.GAME) {
			if (gameManager.isMainGameActive()) {
				// Only hide the background game, don't clean it up
				gameManager.hideBackgroundGame();
			}
		} else {
			// Show background game for all non-game routes
			gameManager.showBackgroundGame();
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

			// Setup event listeners after render for all components
			setTimeout(() => {
				const component = this.components.get(route);
				if (component && typeof component.setupEventListeners === 'function') {
					component.setupEventListeners();
				}
			}, 0);
		}

		this.currentRoute = route;
		this.updateActiveNavItem(route);
	}

	/**
	 * Cleans up the current route's component
	 */
	private cleanupCurrentRoute(): void {
		if (!this.currentRoute) return;
		
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

	/**
	 * Cleans up any auth component that might be displayed
	 * Static method so it can be called from anywhere
	 */
	public static cleanupAuthComponent(): void {
		// Find all auth containers in the content area
		const authContainers = document.querySelectorAll('.auth-container');
		
		authContainers.forEach(container => {
			// Find the parent component that might contain the auth component
			const parentElement = container.parentElement;
			if (parentElement) {
				// Remove the auth container
				parentElement.removeChild(container);
				
				// If this was in the content container, restore its state
				if (parentElement.classList.contains('content-container')) {
					// Ensure content container is visible and properly styled
					parentElement.style.display = 'block';
					parentElement.style.height = '';
					parentElement.style.overflow = '';
				}
			}
		});
		
		// Also check for auth-wrapper elements that might be left behind
		const authWrappers = document.querySelectorAll('.auth-wrapper');
		authWrappers.forEach(wrapper => {
			if (wrapper.parentElement) {
				wrapper.parentElement.removeChild(wrapper);
			}
		});
	}

	/**
	 * Handles the auth route with specific redirect target
	 */
	private handleAuthRoute(): void {
		// Clean up any existing components
		this.cleanupCurrentRoute();
		
		// Get the return path from history state
		const returnTo = history.state?.returnTo || '/';
		
		// Get or create auth section
		let section = document.getElementById(Route.AUTH);
		if (!section) {
			section = document.createElement('section');
			section.id = Route.AUTH;
			section.className = 'section auth-section';
			this.container.appendChild(section);
		}
		section.style.display = 'block';
		
		// Create auth component with the correct redirect
		// Determine the redirect target based on return path
		const redirectTarget = returnTo === '/game' ? 'game' : 'profile';
		const authManager = new AuthManager(section, redirectTarget, false);
		this.components.set(Route.AUTH, authManager);
		authManager.show();
		
		// Update current route
		this.currentRoute = Route.AUTH;
		
		// Add event listener for auth cancellation
		document.addEventListener('auth-cancelled', this.handleAuthCancelled.bind(this), { once: true });
		this.setupNavClickHandlers();

		// Add event listener for successful authentication to refresh the current route
		document.addEventListener('user-authenticated', this.handleSuccessfulAuth.bind(this), { once: true });
	}
	
	/**
	 * Handles auth cancellation by returning to the previous route
	 */
	private handleAuthCancelled(): void {
		// First clean up the auth component
		Router.cleanupAuthComponent();
		
		// Determine the route to navigate to
		const routeToNavigateTo = this.previousRoute || Route.GAME;
		
		// Update the current route immediately before navigation
		this.currentRoute = null; // Reset first to force component recreation
		
		// Special case for game component - must completely rebuild it
		if (routeToNavigateTo === Route.GAME) {
			// Remove game component from our components map to force it to rebuild
			this.components.delete(Route.GAME);
			
			// Navigate to game route
			Router.routerInstance.navigate(`/${routeToNavigateTo}`);
			
			// After navigation, check if we need to reset the game component
			setTimeout(() => {
				const gameComponent = this.components.get(Route.GAME) as GameComponent;
				if (gameComponent && typeof gameComponent.resetToMenu === 'function') {
					gameComponent.resetToMenu();
				}
			}, 50);
		} else {
			// For other components, just navigate normally
			Router.routerInstance.navigate(`/${routeToNavigateTo}`);
		}
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
			case Route.AUTH: return AuthManager;
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
			// Remove any existing event listeners first to avoid duplicates
			link.removeEventListener('click', this.navClickHandler);
			
			// Add new event listener
			link.addEventListener('click', this.navClickHandler);
		});
	}

	// Event handler as property to maintain 'this' context
	private navClickHandler = (e: Event) => {
		e.preventDefault();
		const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
		if (href) {
			Router.routerInstance.navigate(href);
		}
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

	// Add a new method to refresh components
	public refreshCurrentComponent(): void {
		if (!this.currentRoute) return;
		
		const component = this.components.get(this.currentRoute);
		if (component) {
			// Call refresh on the component if available
			if (typeof component.refresh === 'function') {
				component.refresh();
			} 
			// Otherwise re-render if refresh not available
			else if (typeof component.render === 'function') {
				component.render();
				
				// For ProfileComponent and LeaderboardComponent, also call setupEventListeners
				// after render completes to ensure proper event binding
				setTimeout(() => {
					if (this.currentRoute === Route.PROFILE && typeof component.setupEventListeners === 'function') {
						component.setupEventListeners();
					} else if (this.currentRoute === Route.LEADERBOARD && typeof component.setupEventListeners === 'function') {
						component.setupEventListeners();
					}
				}, 0);
			}
		}
	}

	// Add handler for successful authentication
	private handleSuccessfulAuth(): void {
		// After successful auth, refresh all components
		Array.from(this.components.entries()).forEach(([_route, component]) => {
			if (typeof component.refresh === 'function') {
				component.refresh();
			} else if (typeof component.render === 'function') {
				component.render();
				
				// Ensure event listeners are set up after render
				setTimeout(() => {
					if (typeof component.setupEventListeners === 'function') {
						component.setupEventListeners();
					}
				}, 0);
			}
		});
	}

	// Add the static method inside the class definition
	public static refreshAllComponents(): void {
		if (Router.activeInstance) {
			Router.activeInstance.refreshCurrentComponent();
		}
	}
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Navigate to a new route without page reload
 * @param path - The path to navigate to
 * @param options - Navigation options or boolean for preventReload
 */
export function navigate(
	path: string, 
	options?: boolean | { state?: any, preventReload?: boolean }
): void {
	// Default options
	let preventReload = true;
	let state: any = { path };
	
	// Parse options
	if (typeof options === 'boolean') {
		preventReload = options;
	} else if (typeof options === 'object') {
		preventReload = options.preventReload !== false; // Default to true
		if (options.state) {
			state = { ...state, ...options.state };
		}
	}
	
	if (preventReload) {
		// Push state to history without reloading
		window.history.pushState(state, '', path);
		
		// Use the router's navigate method which will resolve the route
		Router.routerInstance.navigate(path);
	} else {
		// Regular navigation with page reload
		window.location.href = path;
	}
}
