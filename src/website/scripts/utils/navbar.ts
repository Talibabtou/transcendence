/**
 * NavbarComponent
 * Utility class for navbar-specific functionality.
 * Handles the ASCII art logo rendering and authentication in the navbar.
 */
import { html, render, ASCII_ART, navigate } from '@website/scripts/utils';
import { AuthComponent } from '@website/scripts/components';

declare global {
	interface DocumentEventMap {
		'user-authenticated': CustomEvent<{
			user: any;
			persistent: boolean;
		}>;
	}
}

export class NavbarComponent {
	private static authButton: HTMLAnchorElement | null = null;
	private static profileButton: HTMLAnchorElement | null = null;
	private static currentAuthComponent: AuthComponent | null = null;
	
	/**
	 * Initializes the navbar by rendering the ASCII art logo and auth buttons.
	 * Should be called once when the application starts.
	 */
	static initialize(): void {
		// Initialize logo
		const navLogo = document.querySelector('.nav-logo');
		if (navLogo) {
			render(html`<pre>${ASCII_ART.TRANSCENDENCE}</pre>`, navLogo as HTMLElement);
		}
		
		// Initialize auth-related UI
		this.initializeAuthUI();
		
		// Listen for authentication events
		document.addEventListener('user-authenticated', this.handleUserAuthenticated.bind(this) as EventListener);
		
		// Listen for navigation events to clean up auth component if needed
		window.addEventListener('popstate', this.handleNavigation.bind(this));
	}
	
	/**
	 * Initializes the auth UI based on stored session
	 */
	private static initializeAuthUI(): void {
		const navRight = document.querySelector('.nav-right');
		if (!navRight) return;
		
		// Clear existing content
		navRight.innerHTML = '';
		
		// Check both storage locations for user data
		const localUser = localStorage.getItem('auth_user');
		const sessionUser = sessionStorage.getItem('auth_user');
		const storedUser = localUser || sessionUser;
		
		if (storedUser) {
			// User is already logged in, show profile button and logout button
			this.showProfileButton(navRight);
		} else {
			// User is not logged in, show auth button
			this.showAuthButton(navRight);
		}
	}
	
	/**
	 * Shows the authentication button
	 */
	private static showAuthButton(container: Element): void {
		// Remove profile button if it exists
		if (this.profileButton && this.profileButton.parentNode) {
			this.profileButton.parentNode.removeChild(this.profileButton);
			this.profileButton = null;
		}
		
		// Create auth button if it doesn't exist
		if (!this.authButton) {
			this.authButton = document.createElement('a');
			this.authButton.className = 'nav-item';
			this.authButton.textContent = 'Login';
			this.authButton.href = '#auth';  // Use a special hash for auth
			
			this.authButton.addEventListener('click', (e) => {
				e.preventDefault();
				
				// Clean up any existing auth component directly
				// Don't rely on Router.cleanupAuthComponent
				if (this.currentAuthComponent) {
					this.currentAuthComponent.destroy();
					this.currentAuthComponent = null;
				}
				
				// Get content container
				const contentContainer = document.querySelector('.content-container');
				if (!contentContainer) return;
				
				// Create a proper container for the auth component
				let authWrapper = document.querySelector('.auth-wrapper') as HTMLElement;
				if (!authWrapper) {
					authWrapper = document.createElement('div');
					authWrapper.className = 'auth-wrapper';
					contentContainer.appendChild(authWrapper);
				} else {
					// Clear existing content
					authWrapper.innerHTML = '';
				}
				
				// Create auth component in this container
				this.currentAuthComponent = new AuthComponent(authWrapper, 'profile', false);
				this.currentAuthComponent.show();
				
				// Mark the current route as special
				window.history.pushState({}, 'Auth', '#auth');
			});
		}
		
		// Add auth button to navbar
		container.appendChild(this.authButton);
	}
	
	/**
	 * Shows the profile button and logout button
	 */
	private static showProfileButton(container: Element): void {
		// Remove auth button if it exists
		if (this.authButton && this.authButton.parentNode) {
			this.authButton.parentNode.removeChild(this.authButton);
			this.authButton = null;
		}
		
		// Create profile button if it doesn't exist
		if (!this.profileButton) {
			this.profileButton = document.createElement('a');
			this.profileButton.className = 'nav-item';
			this.profileButton.textContent = 'Profile';
			this.profileButton.href = '/profile';
		}
		
		// Add profile button to navbar
		container.appendChild(this.profileButton);
		
		// Add logout button
		const logoutButton = document.createElement('button');
		logoutButton.className = 'nav-item logout-button';
		logoutButton.innerHTML = '⏻'; // Power symbol for logout
		logoutButton.title = 'Logout';
		logoutButton.addEventListener('click', () => {
			this.logout();
		});
		
		container.appendChild(logoutButton);
	}
	
	/**
	 * Handles user authentication event
	 */
	private static handleUserAuthenticated(event: Event): void {
		const navRight = document.querySelector('.nav-right');
		if (!navRight) return;
		
		// Cast to CustomEvent to access detail property
		const customEvent = event as CustomEvent;
		const isPersistent = customEvent.detail?.persistent || false;
		
		// Store this setting for later use
		localStorage.setItem('auth_persistent', isPersistent.toString());
		
		// Show profile button
		this.showProfileButton(navRight);
	}
	
	/**
	 * Clean up auth component when navigating away
	 */
	private static handleNavigation(): void {
		if (this.currentAuthComponent) {
			this.currentAuthComponent.destroy();
			this.currentAuthComponent = null;
		}
	}
	
	/**
	 * Handles user logout
	 */
	static logout(): void {
		// Clear user data from both storage types
		localStorage.removeItem('auth_user');
		sessionStorage.removeItem('auth_user');
		localStorage.removeItem('auth_persistent');
		
		// Update navbar
		const navRight = document.querySelector('.nav-right');
		if (navRight) {
			this.showAuthButton(navRight);
		}
		
		// Redirect to home
		navigate('/');
	}
}
