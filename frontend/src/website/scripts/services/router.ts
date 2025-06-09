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
			.notFound(() => this.handleRoute(Route.GAME));
		Router.routerInstance.resolve();
		Router.activeInstance = this;
	}

	// =========================================
	// PUBLIC METHODS
	// =========================================
	
	/**
	 * Forces the recreation of a component on next render
	 */
	public forceComponentRecreation(route: Route): void {
		this.destroyComponent(route);
	}

	/**
	 * Refreshes the current component and navbar
	 */
	public refreshCurrentComponent(): void {
		if (!this.currentRoute) return;
		
		const navbar = document.querySelector('nav.navbar');
		if (navbar) {
			const navbarComponent = (navbar as any).__component;
			if (navbarComponent?.renderNavbar) navbarComponent.renderNavbar();
		}
		
		const component = this.components.get(this.currentRoute);
		if (!component) return;
		
		if (this.currentRoute === Route.AUTH || this.currentRoute === Route.GAME) {
			if (typeof component.refresh === 'function') component.refresh();
			else if (typeof component.render === 'function') component.render();
		}
	}

	// =========================================
	// ROUTE HANDLING
	// =========================================

	/**
	 * Handles route changes by managing component lifecycle and visibility
	 * Uses a state machine approach for consistent transitions.
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
		
		const urlParams = this.getUrlParams();
		const isProfileChange = route === Route.PROFILE && 
			(urlParams.id !== this.currentParams.id || !this.components.has(route));
		
		const gameManager = GameManager.getInstance();

		// Special handling for game route
		if (route === Route.GAME && this.components.has(Route.GAME) && gameManager.isMainGameActive()) {
			const gameSection = document.getElementById(Route.GAME);
			if (gameSection) gameSection.style.display = 'block';
		} else if (isProfileChange || !this.components.has(route)) {
			this.destroyComponent(route);
			
			const ComponentClass = this.getComponentClass(route);
			const component = new ComponentClass(section);
			this.components.set(route, component);
			component.render();
			
			setTimeout(() => {
				if (component.setupEventListeners) component.setupEventListeners();
			}, 0);
		} else if (route !== Route.GAME) {
			// Just ensure visibility for non-game routes
			const routeSection = document.getElementById(route);
			if (routeSection) routeSection.style.display = 'block';
		}
		
		this.currentParams = { ...urlParams };
		this.currentRoute = route;
		this.updateActiveNavItem(route);
	}

	/**
	 * Gets URL parameters from current location with validation
	 */
	private getUrlParams(): Record<string, string> {
		const url = new URL(window.location.href);
		const params: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			if (value && typeof value === 'string') {
				if (key === 'id') {
					if (/^[a-zA-Z0-9_-]+$/.test(value)) {
						params[key] = value;
					} else {
						console.warn('Invalid ID parameter detected:', value);
						params[key] = '';
					}
				} else {
					params[key] = value;
				}
			}
		});
		return params;
	}

	/**
	 * Handles specific route transition cases
	 */
	private handleRouteTransition(fromRoute: Route | null, toRoute: Route): void {
		const gameManager = GameManager.getInstance();
		
		if (fromRoute && fromRoute !== toRoute) {
			if (fromRoute !== Route.GAME || !gameManager.isMainGameActive()) {
				this.destroyComponent(fromRoute);
			}
			
			if (fromRoute === Route.AUTH) {
				Router.cleanupAuthComponent();
				document.removeEventListener('auth-cancelled', this.handleAuthCancelled);
			} 
			else if (fromRoute === Route.GAME && gameManager.isMainGameActive()) {
				const mainEngine = gameManager.getMainGameEngine();
				if (mainEngine) mainEngine.requestPause();
			}
		}

		// Hide all sections except target route
		this.hideAllSectionsExcept(toRoute);

		if (toRoute === Route.GAME) {
			if (!gameManager.isMainGameActive()) {
				this.components.delete(Route.GAME);
			} else {
				gameManager.hideBackgroundGame();
				const gameSection = document.getElementById(Route.GAME);
				if (gameSection) gameSection.style.display = 'block';
			}
		} else {
			gameManager.showBackgroundGame();
		}
	}

	/**
	 * Hides all sections except the specified route
	 */
	private hideAllSectionsExcept(route: Route): void {
		document.querySelectorAll('.section').forEach(element => {
			if (element.id !== route) {
				(element as HTMLElement).style.display = 'none';
			}
		});
	}

	/**
	 * Destroys a component and removes it from the components map
	 */
	private destroyComponent(route: Route): void {
		const component = this.components.get(route);
		if (component && typeof component.destroy === 'function') {
			component.destroy();
		}
		this.components.delete(route);
	}

	/**
	 * Cleans up the current route's component
	 */
	private cleanupCurrentRoute(): void {
		if (!this.currentRoute) return;
		
		const section = document.getElementById(this.currentRoute);
		if (section) section.style.display = 'none';
		
		if (this.currentRoute === Route.AUTH) {
			this.destroyComponent(this.currentRoute);
			Router.cleanupAuthComponent();
			return;
		}
		
		if (this.currentRoute !== Route.GAME) {
			const component = this.components.get(this.currentRoute);
			if (component?.destroy) this.components.delete(this.currentRoute);
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
		document.addEventListener('user-authenticated', this.handleSuccessfulAuth.bind(this), { once: true });
	}
	
	/**
	 * Handles auth cancellation by returning to the previous route
	 */
	private handleAuthCancelled = (): void => {
		Router.cleanupAuthComponent();
		
		this.currentRoute = null;
		this.components.delete(Route.GAME);
		
		Router.routerInstance.navigate(`/${Route.GAME}`);
		
		setTimeout(() => {
			const gameComponent = this.components.get(Route.GAME) as GameComponent;
			if (gameComponent?.resetToMenu) gameComponent.resetToMenu();
		}, 50);
	};

	/**
	 * Handles successful authentication by refreshing components
	 */
	private handleSuccessfulAuth(): void {
		Array.from(this.components.entries()).forEach(([_route, component]) => {
			if (component.refresh) {
				component.refresh();
			} else if (component.render) {
				component.render();
				if (component.setupEventListeners) {
					setTimeout(() => component.setupEventListeners(), 0);
				}
			}
		});
	}

	// =========================================
	// COMPONENT MANAGEMENT
	// =========================================

	/**
	 * Returns the component class corresponding to the given route
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
	 * Updates the active state of navigation items based on current route
	 * @param route - The current active route
	 */
	private updateActiveNavItem(route: Route): void {
		document.querySelectorAll('.nav-item').forEach(item => {
			const itemHref = item.getAttribute('href');
			if (itemHref) {
				const [baseItemHref] = itemHref.split('?');
				item.classList.toggle('active', baseItemHref === `/${route}`);
			}
		});
		
		const navLogo = document.querySelector('.nav-logo');
		if (navLogo) {
			navLogo.classList.toggle('active', route === Route.GAME && 
				(currentUrl() === '/' || currentUrl() === '/game'));
		}
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
				if (authComponent?.destroy) authComponent.destroy();
				router.components.delete(Route.AUTH);
			}
			
			if (sessionStorage.getItem('auth_2fa_needed') === 'true') {
				['auth_2fa_needed', 'auth_2fa_userid', 'auth_2fa_token', 
				 'auth_username', 'auth_email', 'auth_password'].forEach(
					key => sessionStorage.removeItem(key)
				);
			}
			
			document.querySelectorAll('.auth-container').forEach(container => {
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
			if (authSection) {
				authSection.style.height = '';
				if (authSection.parentElement) {
					authSection.parentElement.removeChild(authSection);
				}
			}
			
			// Remove auth wrappers
			document.querySelectorAll('.auth-wrapper').forEach(wrapper => {
				if (wrapper.parentElement) {
					wrapper.parentElement.removeChild(wrapper);
				}
			});
			
			const gameSection = document.getElementById(Route.GAME);
			if (gameSection) {
				gameSection.style.height = '';
				gameSection.querySelectorAll('.game-container').forEach(container => {
					(container as HTMLElement).style.height = '';
				});
			}
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
			Router.activeInstance.forceComponentRecreation(route);
		}
	}

	/**
	 * Resets the GameComponent to its menu state
	 */
	public static resetGameComponentToMenu(): void {
		if (Router.activeInstance) {
			const gameComponent = Router.activeInstance.components.get(Route.GAME) as GameComponent;
			if (gameComponent?.resetToMenu) gameComponent.resetToMenu();
		}
	}
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Returns the current URL including pathname and search parameters
 * @returns The current URL string
 */
function currentUrl(): string {
  return window.location.pathname + window.location.search;
}

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
	} else if (options) {
		preventReload = options.preventReload !== false;
		if (options.state) state = { ...state, ...options.state };
	}
	
	if (preventReload) {
		const currentFullPath = window.location.pathname + window.location.search;
		if (currentFullPath !== path) {
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
