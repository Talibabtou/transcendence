/**
 * NavbarComponent
 * Utility class for navbar-specific functionality.
 * Handles the ASCII art logo rendering and authentication in the navbar.
 */
import { html, render, ASCII_ART, Router, navigate, appState } from '@website/scripts/utils';
import { AuthManager } from '@website/scripts/components';

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
	private static currentAuthComponent: AuthManager | null = null;
	
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
		
		// Subscribe to app state changes
		appState.subscribe((newState) => {
			if ('auth' in newState) {
				this.updateAuthUI();
			}
		});
		
		// Listen for navigation events to clean up auth component if needed
		window.addEventListener('popstate', this.handleNavigation.bind(this));
	}
	
	/**
	 * Initializes the auth UI based on app state
	 */
	private static initializeAuthUI(): void {
		const navRight = document.querySelector('.nav-right');
		if (!navRight) return;
		
		// Clear existing content
		navRight.innerHTML = '';
		
		// Check auth state
		if (appState.isAuthenticated()) {
			// User is logged in, show profile button and logout button
			this.showProfileButton(navRight);
		} else {
			// User is not logged in, show auth button
			this.showAuthButton(navRight);
		}
	}
	
	/**
	 * Updates the auth UI when state changes
	 */
	private static updateAuthUI(): void {
		this.initializeAuthUI();
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
				console.log('Auth button clicked');
				
				// Use the static method from Router
				Router.cleanupAuthComponent();
				console.log('Cleaned up existing auth components');
				
				// Get content container
				const contentContainer = document.querySelector('.content-container');
				if (!contentContainer) {
					console.error('Content container not found');
					return;
				}
				console.log('Found content container:', contentContainer);
				
				// Create a proper container for the auth component
				let authWrapper = document.querySelector('.auth-wrapper') as HTMLElement;
				if (!authWrapper) {
					console.log('Creating new auth wrapper');
					authWrapper = document.createElement('div');
					authWrapper.className = 'auth-wrapper';
					contentContainer.appendChild(authWrapper);
				} else {
					console.log('Clearing existing auth wrapper');
					authWrapper.innerHTML = '';
				}
				
				try {
					console.log('Creating AuthManager instance');
					this.currentAuthComponent = new AuthManager(authWrapper, 'profile', false);
					console.log('AuthManager created successfully');
					this.currentAuthComponent.show();
					console.log('AuthManager show() called');
				} catch (error) {
					console.error('Error creating or showing AuthManager:', error);
				}
				
				// Mark the current route as special
				window.history.pushState({}, 'Auth', '#auth');
				console.log('Updated URL hash to #auth');
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
		// Use AppState to logout
		appState.logout();
		
		// Redirect to home
		navigate('/');
	}
}
