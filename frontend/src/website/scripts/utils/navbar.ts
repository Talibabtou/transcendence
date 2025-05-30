import { ASCII_ART, appState } from '@website/scripts/utils';
import { html, render, navigate, DbService } from '@website/scripts/services';
import { GameManager } from '../components/game/game-manager';

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
	 * Initializes the navbar
	 * @param targetSelector - Query selector for the container element
	 */
	static initialize(targetSelector: string = 'body'): NavbarComponent {
		const targetContainer = document.querySelector(targetSelector);
		
		if (!targetContainer) throw new Error(`Navbar target container "${targetSelector}" not found`);
		let navbarContainer = document.querySelector('nav.navbar');
		if (!navbarContainer) {
			navbarContainer = document.createElement('nav');
			navbarContainer.className = 'navbar';
			targetContainer.insertBefore(navbarContainer, targetContainer.firstChild);
		}
		return new NavbarComponent(navbarContainer as HTMLElement);
	}
	
	/**
	 * Renders the entire navbar
	 */
	renderNavbar(): void {
		const isAuthenticated = appState.isAuthenticated();
		const currentUser = appState.isAuthenticated() ? appState.getCurrentUser() : null;
		
		const handleLinkClick = (e: Event, path: string) => {
			e.preventDefault();
			navigate(path, { preventReload: true });
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
	}
	
	/**
	 * Handles authentication button click
	 */
	private handleAuthClick(e: Event): void {
		e.preventDefault();
		this.authButtonActive = true;
		this.renderNavbar();
		navigate('/auth', { 
			state: { returnTo: location.pathname },
			preventReload: true 
		});
	}
	
	/**
	 * Handles user logout
	 */
	private handleLogout(): void {
		const gameManager = GameManager.getInstance();
		if (gameManager.isMainGameActive()) {
			gameManager.cleanupMainGame();
		}
		DbService.logout(appState.getCurrentUser().id);
		const logoutEvent = new CustomEvent('user-logout');
		document.dispatchEvent(logoutEvent);
		navigate('/');
	}
	
	/**
	 * Updates the active navigation item
	 * Should be called on route changes
	 */
	updateActiveItem(path: string): void {
		if (path !== '/auth') this.authButtonActive = false;
		this.renderNavbar();
	}
}
