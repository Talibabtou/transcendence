import Navigo from 'navigo';
import { GameComponent, GameManager, LeaderboardComponent, ProfileComponent, AuthManager } from '@website/scripts/components';
import { NotificationManager } from './notification-manager';
import { Route } from '@website/types';

export class Router {
	public static routerInstance = new Navigo('/');
	private container: HTMLElement;
	private components: Map<Route | string, any> = new Map();
	private currentRoute: Route | null = null;
	private currentParams: Record<string, string> = {};
	public static activeInstance: Router | null = null;
	
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
		
		window.addEventListener('popstate', this.handlePopState.bind(this));
		
		Router.routerInstance.resolve();

		Router.activeInstance = this;
	}

	// =========================================
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

	/**
	 * Refreshes the current component and navbar
	 */
	public refreshCurrentComponent(): void {
		if (!this.currentRoute) return;
		
		const navbar = document.querySelector('nav.navbar');
		if (navbar) {
			const navbarComponent = (navbar as any).__component;
			if (navbarComponent && typeof navbarComponent.renderNavbar === 'function') {
				navbarComponent.renderNavbar();
			}
		}
		
		const component = this.components.get(this.currentRoute);
		if (component) {
			if (typeof component.refresh === 'function') {
				component.refresh();
			} 
			else if (typeof component.render === 'function') {
				component.render();
				
				setTimeout(() => {
					if (this.currentRoute === Route.PROFILE && typeof component.setupEventListeners === 'function') {
						component.setupEventListeners();
					}
				}, 0);
			}
		}
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
		this.handleRouteTransition(this.currentRoute, route);
		
		let section = document.getElementById(route);
		if (!section) {
			section = document.createElement('section');
			section.id = route;
			section.className = 'section';
			this.container.appendChild(section);
		}
		section.style.display = 'block';
		
		const url = new URL(window.location.href);
		const urlParams: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			urlParams[key] = value;
		});
		
		const isProfileChange = route === Route.PROFILE && 
			(urlParams.id !== this.currentParams.id || 
				!this.components.has(route));
			
		if (isProfileChange || !this.components.has(route)) {
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
			
			setTimeout(() => {
				const component = this.components.get(route);
				if (component && typeof component.setupEventListeners === 'function') {
					component.setupEventListeners();
				}
			}, 0);
		}
		
		this.currentParams = { ...urlParams };
		this.currentRoute = route;
		this.updateActiveNavItem(route);
	}

	/**
	 * Handles specific route transition cases
	 * @param fromRoute - The route we're coming from
	 * @param toRoute - The route we're going to
	 */
	private handleRouteTransition(fromRoute: Route | null, toRoute: Route): void {
		const gameManager = GameManager.getInstance();
		
		// Clean up the component of the route we're leaving
		if (fromRoute && fromRoute !== toRoute) {
			// Special case for AUTH route
			if (fromRoute === Route.AUTH) {
				Router.cleanupAuthComponent();
				document.removeEventListener('auth-cancelled', this.handleAuthCancelled);
			} 
			// For Leaderboard - always destroy when navigating away
			else if (fromRoute === Route.LEADERBOARD) {
				const component = this.components.get(fromRoute);
				if (component && typeof component.destroy === 'function') {
					component.destroy();
				}
				this.components.delete(fromRoute);
			}
			// For Profile - always destroy when navigating away
			else if (fromRoute === Route.PROFILE) {
				const component = this.components.get(fromRoute);
				if (component && typeof component.destroy === 'function') {
					component.destroy();
				}
				this.components.delete(fromRoute);
			}
		}

		if (toRoute === Route.GAME) {
			if (!gameManager.isMainGameActive()) {
				this.components.delete(Route.GAME);
			}
			
			document.querySelectorAll('.section').forEach(element => {
				if (element.id !== Route.GAME) {
					(element as HTMLElement).style.display = 'none';
				}
			});
			
			if (gameManager.isMainGameActive()) {
				gameManager.hideBackgroundGame();
			}
		}
		else {
			gameManager.showBackgroundGame();
			
			document.querySelectorAll('.section').forEach(element => {
				if (element.id !== toRoute) {
					(element as HTMLElement).style.display = 'none';
				}
			});
		}
		
		if (fromRoute === Route.GAME && toRoute !== Route.GAME) {
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
		
		if (this.currentRoute === Route.AUTH) {
			const authComponent = this.components.get(this.currentRoute);
			if (authComponent && typeof authComponent.destroy === 'function') {
				authComponent.destroy();
			}
			this.components.delete(this.currentRoute);
			Router.cleanupAuthComponent();
			return;
		}
		
		const currentComponent = this.components.get(this.currentRoute);
		if (this.currentRoute !== Route.GAME && currentComponent && typeof currentComponent.destroy === 'function') {
			currentComponent.destroy();
			this.components.delete(this.currentRoute);
		}
		
		if (this.currentRoute === Route.PROFILE) {
			this.components.delete(this.currentRoute);
		}
	}

	/**
	 * Handles the auth route with specific redirect target
	 */
	private handleAuthRoute(): void {
		this.cleanupCurrentRoute();
		
		const returnTo = history.state?.returnTo || '/';
		
		let section = document.getElementById(Route.AUTH);
		if (!section) {
			section = document.createElement('section');
			section.id = Route.AUTH;
			section.className = 'section auth-section';
			this.container.appendChild(section);
		}
		section.style.display = 'block';
		
		const redirectTarget = returnTo === '/game' ? 'game' : 'profile';
		const authManager = new AuthManager(section, redirectTarget, true);
		this.components.set(Route.AUTH, authManager);
		authManager.show();
		
		this.currentRoute = Route.AUTH;
		
		document.addEventListener('auth-cancelled', this.handleAuthCancelled.bind(this), { once: true });
		this.setupNavClickHandlers();

		document.addEventListener('user-authenticated', this.handleSuccessfulAuth.bind(this), { once: true });
	}
	
	/**
	 * Handles auth cancellation by returning to the previous route
	 */
	private handleAuthCancelled = (): void => {
		Router.cleanupAuthComponent();
		
		const routeToNavigateTo = Route.GAME;
		
		this.currentRoute = null;
		
		this.components.delete(Route.GAME);
		
		Router.routerInstance.navigate(`/${routeToNavigateTo}`);
		
		setTimeout(() => {
			const gameComponent = this.components.get(Route.GAME) as GameComponent;
			if (gameComponent && typeof gameComponent.resetToMenu === 'function') {
				gameComponent.resetToMenu();
			}
		}, 50);
	};

	/**
	 * Handles successful authentication by refreshing components
	 */
	private handleSuccessfulAuth(): void {
		Array.from(this.components.entries()).forEach(([_route, component]) => {
			if (typeof component.refresh === 'function') {
				component.refresh();
			} else if (typeof component.render === 'function') {
				component.render();
				
				setTimeout(() => {
					if (typeof component.setupEventListeners === 'function') {
						component.setupEventListeners();
					}
				}, 0);
			}
		});
	}

	/**
	 * Handles browser back/forward navigation
	 * @param event - The PopStateEvent
	 */
	private handlePopState(event: PopStateEvent): void {
		const state = event.state || {};
		
		const path = window.location.pathname;
		
		let route: Route;
		switch (path) {
			case '/':
			case '/game':
				route = Route.GAME;
				break;
			case '/leaderboard':
				route = Route.LEADERBOARD;
				break;
			case '/profile':
				route = Route.PROFILE;
				break;
			case '/auth':
				route = Route.AUTH;
				break;
			default:
				route = Route.GAME;
		}
		
		if (state.id && route === Route.PROFILE) {
			const urlParams: Record<string, string> = { id: state.id };
			this.currentParams = urlParams;
		}
		
		this.forceComponentRecreation(route);
		
		if (route === Route.AUTH) {
			this.handleAuthRoute();
		} else {
			this.handleRoute(route);
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
			link.removeEventListener('click', this.navClickHandler);
			
			link.addEventListener('click', this.navClickHandler);
		});
	}

	/**
	 * Event handler for navigation clicks
	 */
	private navClickHandler = (e: Event) => {
		e.preventDefault();
		const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
		if (href) {
			const currentPath = window.location.pathname;
			const targetRoute = href.startsWith('/') ? href.substring(1) as Route : href as Route;

			if (this.currentRoute === Route.AUTH && targetRoute !== Route.AUTH) {
				document.removeEventListener('auth-cancelled', this.handleAuthCancelled);
				document.removeEventListener('user-authenticated', this.handleSuccessfulAuth);
				
				Router.cleanupAuthComponent();

				this.components.delete(targetRoute);
			}
			
			if (currentPath !== href) {
				window.history.pushState({ path: href }, '', href);
				
				Router.routerInstance.navigate(href, { 
					historyAPIMethod: 'replaceState',
					updateBrowserURL: false
				});
			} else {
				this.handleRoute(targetRoute);
			}
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

	// =========================================
	// STATIC METHODS
	// =========================================

	/**
	 * Refreshes all components in the active router instance
	 */
	public static refreshAllComponents(): void {
		if (Router.activeInstance) {
			Router.activeInstance.refreshCurrentComponent();
		}
	}

	/**
	 * Cleans up any auth component that might be displayed
	 */
	public static cleanupAuthComponent(): void {
		try {
			const router = Router.activeInstance;
			if (router) {
				const authComponent = router.components.get(Route.AUTH);
				if (authComponent && typeof authComponent.destroy === 'function') {
					authComponent.destroy();
				}
				router.components.delete(Route.AUTH);
			}
			
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
			
			const authSection = document.getElementById(Route.AUTH);
			if (authSection && authSection.parentElement) {
				authSection.parentElement.removeChild(authSection);
			}
			
			const authWrappers = document.querySelectorAll('.auth-wrapper');
			authWrappers.forEach(wrapper => {
				if (wrapper.parentElement) {
					wrapper.parentElement.removeChild(wrapper);
				}
			});
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Cleans up and forces recreation of a component
	 * @param route - The route component to recreate
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
	let preventReload = true;
	let state: any = { path };
	
	if (typeof options === 'boolean') {
		preventReload = options;
	} else if (typeof options === 'object') {
		preventReload = options.preventReload !== false;
		if (options.state) {
			state = { ...state, ...options.state };
		}
	}
	
	if (preventReload) {
		const currentPath = window.location.pathname;
		
		if (currentPath !== path) {
			window.history.pushState(state, '', path);
			
			Router.routerInstance.navigate(path, { 
				historyAPIMethod: 'replaceState', 
				updateBrowserURL: false 
			});
		} else {
			Router.routerInstance.resolve(path);
		}
	} else {
		window.location.href = path;
	}
}
