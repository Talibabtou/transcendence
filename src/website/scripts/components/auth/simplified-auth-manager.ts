/**
 * Simplified version of AuthManager
 * Provides a clean login and registration interface without close buttons
 * and without the "Remember me" option
 */
import { AuthManager } from '@website/scripts/components';
import { AuthState, AuthMethod, UserData } from '@shared/types';
import { DbService } from '@website/scripts/utils';

export class SimplifiedAuthManager extends AuthManager {
	constructor(container: HTMLElement) {
		// Always pass false for persistSession and no redirect
		super(container, undefined, false);
		
		// Add a class to the container for custom styling
		container.classList.add('simplified-auth-container');
	}
	
	/**
	 * Override render method to make specific changes
	 */
	render(): void {
		super.render();
		
		// Hide unnecessary elements and update form handlers
		this.hideUnnecessaryElements();
		this.updateFormHandlers();
	}
	
	/**
	 * Hide unnecessary elements
	 */
	private hideUnnecessaryElements(): void {
		// Hide close button in all cases
		const closeButton = this.container.querySelector('.auth-close-button');
		if (closeButton) {
			(closeButton as HTMLElement).style.display = 'none';
		}
		
		// Add simplified class to form container
		const formContainer = this.container.querySelector('.auth-form-container');
		if (formContainer) {
			formContainer.classList.add('simplified-auth-form-container');
		}
		
		// Hide "Remember me" checkbox in login form
		const rememberMeGroup = this.container.querySelector('.checkbox-group');
		if (rememberMeGroup) {
			(rememberMeGroup as HTMLElement).style.display = 'none';
		}
	}
	
	/**
	 * Update form handlers to use guest authentication
	 */
	private updateFormHandlers(): void {
		const loginForm = this.container.querySelector('form') as HTMLFormElement;
		if (loginForm) {
			loginForm.onsubmit = (e) => {
				e.preventDefault();
				const formData = new FormData(loginForm);
				const email = formData.get('email') as string;
				const password = formData.get('password') as string;
				
				if (email && password) {
					this.handleGuestAuth(email, password);
				}
			};
		}
	}
	
	/**
	 * Handle guest authentication
	 */
	private async handleGuestAuth(email: string, password: string): Promise<void> {
		try {
			this.updateInternalState({ isLoading: true, error: null });
			
			// Verify credentials and get user data
			const response = await DbService.verifyUser(email, password);
			
			if (response.success && response.user) {
				// Extract numeric part from user ID if it's a string with prefix
				const rawId = response.user.id;
				let numericId: number;
				
				if (typeof rawId === 'string' && rawId.includes('_')) {
					// Extract only the numeric part after the underscore
					const parts = rawId.split('_');
					numericId = parseInt(parts[parts.length - 1], 10);
				} else if (typeof rawId === 'string') {
					numericId = parseInt(rawId, 10);
				} else {
					numericId = Number(rawId);
				}
				
				// Ensure we have a valid numeric ID
				if (isNaN(numericId)) {
					console.error('Failed to convert user ID to number:', rawId);
					numericId = Date.now(); // Fallback to timestamp as ID
				}
				
				// Create userData with numeric ID
				const userData = {
					id: numericId,
					username: response.user.username,
					email: response.user.email || '',
					profilePicture: response.user.profilePicture || '/images/default-avatar.svg'
				};
				
				// Update last connection time in DB
				await DbService.updateUserLastConnection(rawId.toString());
				
				// Dispatch guest-authenticated event with numeric ID
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { 
						user: userData
					}
				});
				document.dispatchEvent(authEvent);
				
				// Hide the auth form
				this.hide();
			} else {
				this.updateInternalState({
					error: 'Invalid credentials',
					isLoading: false
				});
			}
		} catch (error) {
			console.error('Guest authentication error:', error);
			this.updateInternalState({
				error: 'Authentication failed. Please try again.',
				isLoading: false
			});
		}
	}
	
	/**
	 * Override handleSuccessfulAuth to prevent redirecting for guest authentication
	 */
	protected handleSuccessfulAuth(): void {
		// Do nothing - this prevents the default behavior of logging in to appState
		// and redirecting to profile/game
		console.log('Simplified auth completed - no redirect');
	}
	
	/**
	 * Override handleStateUpdate to preserve simplified mode
	 */
	protected handleStateUpdate(newState: AuthState): void {
		this.updateInternalState({
			currentState: newState,
			error: null
		});
		
		// Re-apply simplifications after state change
		setTimeout(() => {
			this.hideUnnecessaryElements();
			this.updateFormHandlers();
		}, 150);
	}
}