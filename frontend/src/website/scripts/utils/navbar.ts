import { ASCII_ART, appState } from '@website/scripts/utils';
import { html, render, navigate, DbService, NotificationManager } from '@website/scripts/services';
import { GameManager } from '@website/scripts/components';

/**
 * Custom event declarations for TypeScript
 */
declare global {
	interface DocumentEventMap {
		'user-authenticated': CustomEvent<{
			user: any;
			persistent: boolean;
		}>;
		'user-logout': CustomEvent;
	}
}

export class NavbarComponent {
	private container: HTMLElement;
	private authButtonActive: boolean = false;
	
	constructor(container: HTMLElement) {
		this.container = container;
		appState.subscribe((newState) => {
			if ('auth' in newState) this.renderNavbar();
		});
		this.renderNavbar();
	}
	
	/**
	 * Initializes the navbar in the specified container
	 * @param targetSelector - Query selector for the container element
	 */
	static initialize(targetSelector: string = 'body'): NavbarComponent {
		try {
			const targetContainer = document.querySelector(targetSelector);
			
			if (!targetContainer) {
				throw new Error(`Navbar target container "${targetSelector}" not found`);
			}
			
			let navbarContainer = document.querySelector('nav.navbar');
			if (!navbarContainer) {
				navbarContainer = document.createElement('nav');
				navbarContainer.className = 'navbar';
				targetContainer.insertBefore(navbarContainer, targetContainer.firstChild);
			}
			
			return new NavbarComponent(navbarContainer as HTMLElement);
		} catch (error) {
			NotificationManager.handleError(error);
			throw error;
		}
	}
	
	/**
	 * Renders the navbar based on current application state
	 */
	renderNavbar(): void {
		try {
			const isAuthenticated = appState.isAuthenticated();
			const currentUser = isAuthenticated ? appState.getCurrentUser() : null;
			
			const handleLinkClick = (e: Event, path: string) => {
				e.preventDefault();
				navigate(path);
			};
			
			const navbarTemplate = html`
				<a href="/" class="nav-logo" onClick=${(e: Event) => handleLinkClick(e, "/")}>
					<pre>${ASCII_ART.TRANSCENDENCE}</pre>
				</a>
				<div class="nav-center">
					<a href="/game" class="nav-item${location.pathname === '/' || location.pathname === '/game' ? ' active' : ''}" onClick=${(e: Event) => handleLinkClick(e, "/game")}>Game</a>
					<a href="/leaderboard" class="nav-item${location.pathname === '/leaderboard' ? ' active' : ''}" onClick=${(e: Event) => handleLinkClick(e, "/leaderboard")}>Leaderboard</a>
				</div>
				<div class="nav-right">
					${isAuthenticated && currentUser ? 
						html`
							<a href="/profile?id=${currentUser.id}" class="nav-item${location.pathname === '/profile' ? ' active' : ''}" onClick=${(e: Event) => handleLinkClick(e, `/profile?id=${currentUser.id}`)}>Profile</a>
							<button class="nav-item logout-button" title="Log out" onClick=${() => this.handleLogout()}>⏻</button>
						` : 
						html`
							<a href="/auth" class="nav-item${this.authButtonActive ? ' active' : ''}" onClick=${(e: Event) => this.handleAuthClick(e)}>Log in</a>
						`
					}
				</div>
			`;
			
			render(navbarTemplate, this.container);
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Handles authentication button click
	 * @param e - Click event
	 */
	private handleAuthClick(e: Event): void {
		try {
			e.preventDefault();
			this.authButtonActive = true;
			this.renderNavbar();
			navigate('/auth', { 
				state: { returnTo: location.pathname }
			});
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Handles user logout process
	 */
	private handleLogout(): void {
		try {
			const gameManager = GameManager.getInstance();
			if (gameManager.isMainGameActive()) {
				gameManager.cleanupMainGame();
			}
			
			const currentUser = appState.getCurrentUser();
			if (currentUser && currentUser.id) {
				DbService.logout(currentUser.id)
					.catch(error => NotificationManager.handleError(error));
			}
			
			document.dispatchEvent(new CustomEvent('user-logout'));
			navigate('/');
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Updates the active navigation item
	 * @param path - Current path to set as active
	 */
	updateActiveItem(path: string): void {
		try {
			this.authButtonActive = path === '/auth';
			this.renderNavbar();
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
}
