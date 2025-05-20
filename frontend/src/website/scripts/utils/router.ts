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
<<<<<<< Updated upstream
=======
		private currentParams: Record<string, string> = {};
>>>>>>> Stashed changes

		// Add static reference to active instance
		public static activeInstance: Router | null = null;

		// =========================================
<<<<<<< Updated upstream
=======
		// PUBLIC METHODS
		// =========================================
		
		/**
		 * Forces the recreation of a component on next render
		 * @param route The route component to recreate
		 */
		public forceComponentRecreation(route: Route): void {
			const component = this.components.get(route);
			if (component) {
				if (typeof component.destroy === 'function') {
					component.destroy();
				}
				this.components.delete(route);
			}
		}

		// =========================================
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
		}

		// =========================================
		// ROUTE HANDLING
		// =========================================

		/**
		 * Handles route changes by managing component lifecycle and visibility.
		 * Uses a state machine approach for consistent transitions.
		 * 
		 * @param route - The route to handle
		 */
		private handleRoute(route: Route): void {
			// Handle specific FROM->TO transitions
			this.handleRouteTransition(this.currentRoute, route);
			
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
			if (!this.components.has(route)) {
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

=======
		}

		// =========================================
		// ROUTE HANDLING
		// =========================================

		/**
		 * Handles route changes by managing component lifecycle and visibility.
		 * Uses a state machine approach for consistent transitions.
		 * 
		 * @param route - The route to handle
		 */
		private handleRoute(route: Route): void {
			// Handle specific FROM->TO transitions
			this.handleRouteTransition(this.currentRoute, route);
			
			// Create or reuse section for new route
			let section = document.getElementById(route);
			if (!section) {
				section = document.createElement('section');
				section.id = route;
				section.className = 'section';
				this.container.appendChild(section);
			}
			section.style.display = 'block';
			
			// Get the current URL parameters
			const url = new URL(window.location.href);
			const urlParams: Record<string, string> = {};
			url.searchParams.forEach((value, key) => {
				urlParams[key] = value;
			});
			
			// For Profile route: check if we need to recreate the component
			const isProfileChange = route === Route.PROFILE && 
				(urlParams.id !== this.currentParams.id || 
				 !this.components.has(route));
				
			// Create and render new component if needed
			if (isProfileChange || !this.components.has(route)) {
				// If we're recreating a component, clean up the old one first
				if (this.components.has(route)) {
					const currentComponent = this.components.get(route);
					if (typeof currentComponent.destroy === 'function') {
						currentComponent.destroy();
					}
					this.components.delete(route);
				}
				
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
			
			// Store the current params for future comparison
			this.currentParams = { ...urlParams };
			this.currentRoute = route;
			this.updateActiveNavItem(route);
		}

>>>>>>> Stashed changes
		/**
		 * Handles specific route transition cases
		 * @param fromRoute - The route we're coming from
		 * @param toRoute - The route we're going to
		 */
		private handleRouteTransition(fromRoute: Route | null, toRoute: Route): void {
			const gameManager = GameManager.getInstance();
			
			// Case: Coming from AUTH
			if (fromRoute === Route.AUTH) {
				// Clean up auth fully
				Router.cleanupAuthComponent();
				document.removeEventListener('auth-cancelled', this.handleAuthCancelled);
				
				// Force recreation of destination component
				this.components.delete(toRoute);
			}
			
			// Case: Going to GAME
			if (toRoute === Route.GAME) {
				// Always recreate game component when navigating to it
				this.components.delete(Route.GAME);
				
				// Hide any sections that aren't the game section
				document.querySelectorAll('.section').forEach(element => {
					if (element.id !== Route.GAME) {
						(element as HTMLElement).style.display = 'none';
					}
				});
				
				// Hide background game if main game is active
				if (gameManager.isMainGameActive()) {
					gameManager.hideBackgroundGame();
				}
			}
			// Case: Going to any non-GAME route
			else {
				// Show background game for all non-game routes
				gameManager.showBackgroundGame();
				
				// Hide other sections
				document.querySelectorAll('.section').forEach(element => {
					if (element.id !== toRoute) {
						(element as HTMLElement).style.display = 'none';
					}
				});
			}
			
			// Case: Coming from GAME
			if (fromRoute === Route.GAME && toRoute !== Route.GAME) {
				// Pause the main game when navigating away
				if (gameManager.isMainGameActive()) {
					const mainEngine = gameManager.getMainGameEngine();
					if (mainEngine) {
						mainEngine.requestPause();
					}
				}
			}
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
			
			// Special handling for AUTH route
			if (this.currentRoute === Route.AUTH) {
				// For auth route, always clean up completely
				const authComponent = this.components.get(this.currentRoute);
				if (authComponent && typeof authComponent.destroy === 'function') {
					authComponent.destroy();
				}
				this.components.delete(this.currentRoute);
				Router.cleanupAuthComponent();
				return;
			}
			
			// For non-game components, destroy when leaving route
			const currentComponent = this.components.get(this.currentRoute);
			if (this.currentRoute !== Route.GAME && currentComponent && typeof currentComponent.destroy === 'function') {
				currentComponent.destroy();
				this.components.delete(this.currentRoute);
			}
			
			// Always force recreation of Profile component since it's stateful
			if (this.currentRoute === Route.PROFILE) {
				this.components.delete(this.currentRoute);
			}
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
			const authManager = new AuthManager(section, redirectTarget, true);
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
		private handleAuthCancelled = (): void => {
			// First clean up the auth component
			Router.cleanupAuthComponent();
			
			// Always navigate to the GAME route on cancellation
			const routeToNavigateTo = Route.GAME;
			
			// Reset currentRoute to force full recreation process
			this.currentRoute = null;
			
			// Force game component rebuild
			this.components.delete(Route.GAME);
			
			// Navigate to the game route
			Router.routerInstance.navigate(`/${routeToNavigateTo}`);
			
			// Ensure game menu is reset
			setTimeout(() => {
				const gameComponent = this.components.get(Route.GAME) as GameComponent;
				if (gameComponent && typeof gameComponent.resetToMenu === 'function') {
					gameComponent.resetToMenu();
				}
			}, 50);
		};

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
				const targetRoute = href.startsWith('/') ? href.substring(1) as Route : href as Route;

				// If we're coming from auth, ensure we properly clean up
				if (this.currentRoute === Route.AUTH && targetRoute !== Route.AUTH) {
					// Remove the auth event listeners
					document.removeEventListener('auth-cancelled', this.handleAuthCancelled);
					document.removeEventListener('user-authenticated', this.handleSuccessfulAuth);
					
					// Clean up auth component
					Router.cleanupAuthComponent();

					 // Force recreation of the target component
					this.components.delete(targetRoute);
				}
				
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
			
			// First refresh the navbar since it's a global component
			const navbar = document.querySelector('nav.navbar');
			if (navbar) {
				const navbarComponent = (navbar as any).__component;
				if (navbarComponent && typeof navbarComponent.renderNavbar === 'function') {
					navbarComponent.renderNavbar();
				}
			}
			
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

		/**
		 * Cleans up any auth component that might be displayed
		 * Static method so it can be called from anywhere
		 */
		public static cleanupAuthComponent(): void {
			try {
				// Get Router instance
				const router = Router.activeInstance;
				if (router) {
					// Clean up auth component from components map
					const authComponent = router.components.get(Route.AUTH);
					if (authComponent && typeof authComponent.destroy === 'function') {
						authComponent.destroy();
					}
					router.components.delete(Route.AUTH);
				}
				
				// Clean up DOM elements
				const authContainers = document.querySelectorAll('.auth-container');
				authContainers.forEach(container => {
					const parentElement = container.parentElement;
					if (parentElement) {
						parentElement.removeChild(container);
						
						if (parentElement.classList.contains('content-container')) {
							parentElement.style.display = 'block';
							parentElement.style.height = '';
							parentElement.style.overflow = '';
						}
					}
				});
				
				// Also clean up auth section element
				const authSection = document.getElementById(Route.AUTH);
				if (authSection && authSection.parentElement) {
					authSection.parentElement.removeChild(authSection);
				}
				
				// Clean up auth-wrapper elements
				const authWrappers = document.querySelectorAll('.auth-wrapper');
				authWrappers.forEach(wrapper => {
					if (wrapper.parentElement) {
						wrapper.parentElement.removeChild(wrapper);
					}
				});
			} catch (error) {
				console.error('Error cleaning up auth components:', error);
			}
<<<<<<< Updated upstream
=======
		}
		
		/**
		 * Cleans up and forces recreation of a component
		 * Static method so it can be called from anywhere
		 */
		public static forceRecreateComponent(route: Route): void {
			if (Router.activeInstance) {
				const component = Router.activeInstance.components.get(route);
				if (component) {
					if (typeof component.destroy === 'function') {
						component.destroy();
					}
					Router.activeInstance.components.delete(route);
				}
			}
>>>>>>> Stashed changes
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
