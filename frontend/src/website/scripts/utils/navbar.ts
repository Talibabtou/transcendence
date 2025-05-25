import { ASCII_ART, appState } from '@website/scripts/utils';
import { html, render, navigate, DbService } from '@website/scripts/services';

declare global {
	interface DocumentEventMap {
		'user-authenticated': CustomEvent<{
			user: any;
			persistent: boolean;
		}>;
		'user-logout': CustomEvent;
	}
}

/**
 * NavbarComponent
 * 
 * This component is responsible for rendering the navbar and handling navigation.
 * It is used to display the navbar on the website.
 * 
 */
export class NavbarComponent {
	private container: HTMLElement;
	private authButtonActive: boolean = false;
	
	/**
	 * Creates a new NavbarComponent
	 * @param container - The container element to render the navbar into
	 */
	constructor(container: HTMLElement) {
		this.container = container;
		
		appState.subscribe((newState) => {
			if ('auth' in newState) {
				this.renderNavbar();
			}
		});
		
		this.renderNavbar();
	}
	
	/**
	 * Initializes the navbar
	 * @param targetSelector - Query selector for the container element
	 */
	static initialize(targetSelector: string = 'body'): NavbarComponent {
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
	}
	
	/**
	 * Renders the entire navbar
	 */
	renderNavbar(): void {
		const isAuthenticated = appState.isAuthenticated();
		const currentUser = appState.isAuthenticated() ? appState.getCurrentUser() : null;
		
		const navbarTemplate = html`
			<a href="/" class="nav-logo">
				<pre>${ASCII_ART.TRANSCENDENCE}</pre>
			</a>
			<div class="nav-center">
				<a href="/game" class="nav-item${location.pathname === '/' || location.pathname === '/game' ? ' active' : ''}">Game</a>
				<a href="/leaderboard" class="nav-item${location.pathname === '/leaderboard' ? ' active' : ''}">Leaderboard</a>
			</div>
			<div class="nav-right">
				${isAuthenticated && currentUser ? 
					html`
						<a href="/profile?id=${currentUser.id}" class="nav-item${location.pathname === '/profile' ? ' active' : ''}">Profile</a>
						<button class="nav-item logout-button" title="Log out" onClick=${() => this.handleLogout()}>⏻</button>
					` : 
					html`
						<a href="/auth" class="nav-item${this.authButtonActive ? ' active' : ''}" onClick=${(e: Event) => this.handleAuthClick(e)}>Log in</a>
					`
				}
			</div>
		`;
		
		render(navbarTemplate, this.container);
		
		this.setupNavLinks();
	}
	
	/**
	 * Sets up event listeners for navigation links
	 */
	private setupNavLinks(): void {
		const navLinks = this.container.querySelectorAll('a.nav-item, a.nav-logo');
		
		navLinks.forEach(link => {
			link.removeEventListener('click', this.handleNavLinkClick);
			link.addEventListener('click', this.handleNavLinkClick);
		});
	}
	
	/**
	 * Handle click on navigation links
	 */
	private handleNavLinkClick = (e: Event): void => {
		e.preventDefault();
		const link = e.currentTarget as HTMLAnchorElement;
		const href = link.getAttribute('href');
		
		if (href) {
			navigate(href);
		}
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
		if (path !== '/auth') {
			this.authButtonActive = false;
		}
		
		this.renderNavbar();
	}
}
