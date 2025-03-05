import Navigo from 'navigo';
import { GameComponent } from '../components/game';
import { LeaderboardComponent } from '../components/leaderboard';
import { ProfileComponent } from '../components/profile';

export enum Route {
	GAME = 'game',
	LEADERBOARD = 'leaderboard',
	SETTINGS = 'settings',
	PROFILE = 'profile'
}

// Create a single router instance
const router = new Navigo('/');

// Export a navigation function
export function navigate(path: string) {
	router.navigate(path);
}

export class Router {
	private container: HTMLElement;
	private components: Map<Route, any> = new Map();
	private currentRoute: Route | null = null;
	
	constructor(container: HTMLElement) {
		this.container = container;
		
		// Set up routes
		router
			.on('/', () => this.handleRoute(Route.GAME))
			.on('/game', () => this.handleRoute(Route.GAME))
			.on('/leaderboard', () => this.handleRoute(Route.LEADERBOARD))
			.on('/profile', () => this.handleRoute(Route.PROFILE))
			.notFound(() => this.handleRoute(Route.GAME));
		
		// Initialize router
		router.resolve();
		
		// Set up nav click handlers
		this.setupNavClickHandlers();
		this.setupVisibilityHandler();
	}
	
	private handleRoute(route: Route): void {
		// Pause current game if leaving game route
		if (this.currentRoute === Route.GAME && route !== Route.GAME) {
			const gameComponent = this.components.get(Route.GAME);
			if (gameComponent) {
				gameComponent.pause();
			}
		}

		// Hide current component
		if (this.currentRoute) {
			const section = document.getElementById(this.currentRoute);
			if (section) {
				section.style.display = 'none';
			}
		}

		// Show or create new component
		let section = document.getElementById(route);
		if (!section) {
			section = document.createElement('section');
			section.id = route;
			section.className = 'section';
			this.container.appendChild(section);
		}
		section.style.display = 'block';

		// Create component if it doesn't exist
		if (!this.components.has(route)) {
			const ComponentClass = this.getComponentClass(route);
			this.components.set(route, new ComponentClass(section));
			this.components.get(route).render();
		}

		this.currentRoute = route;
		this.updateActiveNavItem(route);
	}
	
	private getComponentClass(route: Route): any {
		switch (route) {
			case Route.GAME: return GameComponent;
			case Route.LEADERBOARD: return LeaderboardComponent;
			case Route.PROFILE: return ProfileComponent;
			default: return GameComponent;
		}
	}
	
	private setupNavClickHandlers(): void {
		document.querySelectorAll('.nav-item').forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
				if (href) router.navigate(href);
			});
		});
	}
	
	private setupVisibilityHandler(): void {
		document.addEventListener('visibilitychange', () => {
			const gameComponent = this.components.get(Route.GAME);
			if (gameComponent) {
				if (document.hidden) {
					gameComponent.pause();
				} else if (this.currentRoute === Route.GAME) {
					gameComponent.resume();
				}
			}
		});
	}
	
	private updateActiveNavItem(route: Route): void {
		document.querySelectorAll('.nav-item').forEach(item => {
			item.classList.toggle('active', item.getAttribute('href') === `/${route}`);
		});
	}
}
