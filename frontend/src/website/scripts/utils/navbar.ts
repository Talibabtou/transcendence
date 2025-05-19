/**
 * NavbarComponent
 * Handles the rendering and functionality of the application's navigation bar.
 */
import { html, render, ASCII_ART, navigate, appState } from '@website/scripts/utils';

// Add custom event type
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
	
	/**
	 * Creates a new NavbarComponent
	 * @param container - The container element to render the navbar into
	 */
	constructor(container: HTMLElement) {
		this.container = container;
		
		// Subscribe to app state changes
		appState.subscribe((newState) => {
			if ('auth' in newState) {
				this.renderNavbar();
			}
		});
		
		// Initial render
		this.renderNavbar();
	}
	
	/**
	 * Initializes the navbar
	 * @param targetSelector - Query selector for the container element
	 */
	static initialize(targetSelector: string = 'body'): NavbarComponent {
		// Find target container 
		const targetContainer = document.querySelector(targetSelector);
		
		if (!targetContainer) {
			throw new Error(`Navbar target container "${targetSelector}" not found`);
		}
		
		// Create navbar container if needed
		let navbarContainer = document.querySelector('nav.navbar');
		
		if (!navbarContainer) {
			navbarContainer = document.createElement('nav');
			navbarContainer.className = 'navbar';
			// Insert at the beginning of the target
			targetContainer.insertBefore(navbarContainer, targetContainer.firstChild);
		}
		
		// Create component instance
		return new NavbarComponent(navbarContainer as HTMLElement);
	}
	
	/**
	 * Renders the entire navbar
	 */
	renderNavbar(): void {
		const isAuthenticated = appState.isAuthenticated();
		
		// Create navbar template
		const navbarTemplate = html`
			<a href="/" class="nav-logo">
				<pre>${ASCII_ART.TRANSCENDENCE}</pre>
			</a>
			<div class="nav-center">
				<a href="/game" class="nav-item${location.pathname === '/' || location.pathname === '/game' ? ' active' : ''}">Game</a>
				<a href="/leaderboard" class="nav-item${location.pathname === '/leaderboard' ? ' active' : ''}">Leaderboard</a>
			</div>
			<div class="nav-right">
				${isAuthenticated ? 
					html`
						<a href="/profile" class="nav-item${location.pathname === '/profile' ? ' active' : ''}">Profile</a>
						<button class="nav-item logout-button" title="Log out" onClick=${() => this.handleLogout()}>⏻</button>
					` : 
					html`
						<a href="/auth" class="nav-item${this.authButtonActive ? ' active' : ''}" onClick=${(e: Event) => this.handleAuthClick(e)}>Log in</a>
					`
				}
			</div>
		`;
		
		// Render navbar
		render(navbarTemplate, this.container);
		
		// Add event listeners after rendering
		this.setupNavLinks();
	}
	
	/**
	 * Sets up event listeners for navigation links
	 */
	private setupNavLinks(): void {
		// Find all navigation links
		const navLinks = this.container.querySelectorAll('a.nav-item, a.nav-logo');
		
		// Add click handler to each link
		navLinks.forEach(link => {
			// Remove existing handlers to prevent duplicates
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
		
		// Set auth button active state for UI feedback
		this.authButtonActive = true;
		this.renderNavbar(); // Re-render to show active state
		
		// Navigate to auth route
		// The router will handle cleaning up the current component and loading AuthManager
		navigate('/auth', { 
			state: { returnTo: location.pathname }, // Keep returnTo for post-login redirect
			preventReload: true 
		});
	}
	
	/**
	 * Handles user logout
	 */
	private handleLogout(): void {
		// Use AppState to logout
		appState.logout();
		
		// Dispatch logout event
		const logoutEvent = new CustomEvent('user-logout');
		document.dispatchEvent(logoutEvent);
		
		// Redirect to home
		navigate('/');
	}
	
	/**
	 * Updates the active navigation item
	 * Should be called on route changes
	 */
	updateActiveItem(path: string): void {
		// Reset auth button active state if not on auth page
		if (path !== '/auth') {
			this.authButtonActive = false;
		}
		
		// Re-render with updated active states
		this.renderNavbar();
	}
}
