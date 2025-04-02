/**
 * Guest Authentication Component
 * A standalone component for guest player authentication without affecting the main app state
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService } from '@website/scripts/utils';
import { IAuthComponent, GuestAuthState } from '@shared/types';

export class GuestAuthComponent extends Component<GuestAuthState> implements IAuthComponent {
	constructor(container: HTMLElement) {
		super(container, {
			isLoading: false,
			error: null,
			isRegisterMode: false
		});
		
		// Add custom classes for styling - use existing CSS classes from auth.css
		this.container.classList.add('auth-container', 'simplified-auth-container');
	}
	
	/**
	 * Render the component
	 */
	render(): void {
		// Create basic container structure
		const template = html`
			<div class="auth-form-container simplified-auth-form-container">
				${this.renderContent()}
			</div>
		`;
		
		render(template, this.container);
	}
	
	/**
	 * Render the appropriate content based on state
	 */
	private renderContent(): any {
		const state = this.getInternalState();
		
		if (state.isLoading) {
			return html`<div class="auth-processing">Verifying...</div>`;
		}
		
		if (state.isRegisterMode) {
			return this.renderRegisterForm();
		} else {
			return this.renderLoginForm();
		}
	}
	
	/**
	 * Render the login form for guest authentication
	 */
	private renderLoginForm(): any {
		const state = this.getInternalState();
		
		return html`
			<form class="auth-form guest-auth-form" onsubmit=${this.handleLoginSubmit}>
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required autocomplete="off" />
				</div>
				
				<button type="submit" class="menu-button">Login</button>
			</form>
			
			<div class="auth-social-options">
				<button class="menu-button auth-social-button google-auth" onclick=${this.handleSocialLoginClick}>
					Login with Google
				</button>
				
				<button class="menu-button auth-social-button forty-two-auth" onclick=${this.handleSocialLoginClick}>
					Login with 42
				</button>
			</div>
			
			<div class="auth-links">
				<a href="#" onclick=${this.switchToRegister}>Create account</a>
			</div>
			
			${state.error ? html`<div class="auth-error">${state.error}</div>` : ''}
		`;
	}
	
	/**
	 * Render the register form for guest creation
	 */
	private renderRegisterForm(): any {
		const state = this.getInternalState();
		
		return html`
			<form class="auth-form guest-auth-form" onsubmit=${this.handleRegisterSubmit}>
				<div class="form-group">
					<label for="username">Username:</label>
					<input type="text" id="username" name="username" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required autocomplete="off" />
				</div>
				
				<button type="submit" class="menu-button">Create Account</button>
			</form>
			
			<div class="auth-links">
				<a href="#" onclick=${this.switchToLogin}>Back to login</a>
			</div>
			
			${state.error ? html`<div class="auth-error">${state.error}</div>` : ''}
		`;
	}
	
	/**
	 * Handle login form submission
	 */
	private handleLoginSubmit = (e: Event): void => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (email && password) {
			this.authenticateGuest(email, password);
		}
	}
	
	/**
	 * Handle register form submission
	 */
	private handleRegisterSubmit = (e: Event): void => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (username && email && password) {
			this.registerGuest(username, email, password);
		}
	}
	
	/**
	 * Switch to register mode
	 */
	private switchToRegister = (e: Event): void => {
		e.preventDefault();
		this.updateInternalState({
			isRegisterMode: true,
			error: null
		});
	}
	
	/**
	 * Switch to login mode
	 */
	private switchToLogin = (e: Event): void => {
		e.preventDefault();
		this.updateInternalState({
			isRegisterMode: false,
			error: null
		});
	}
	
	/**
	 * Handle social login button clicks
	 */
	private handleSocialLoginClick = (e: Event): void => {
		e.preventDefault();
		this.updateInternalState({
			error: 'Social login is not available for guest players.'
		});
	}
	
	/**
	 * Authenticate a guest using email/password
	 */
	private async authenticateGuest(email: string, password: string): Promise<void> {
		this.updateInternalState({ 
			isLoading: true,
			error: null
		});
		
		try {
			// Verify user credentials using DbService
			const response = await DbService.verifyUser(email, password);
			
			if (response.success && response.user) {
				const userData = {
					id: response.user.id,
					username: response.user.username,
					email: response.user.email || '',  // Add fallback
					profilePicture: response.user.profilePicture,
					theme: response.user.theme || '#ffffff'
				};
				
				// Update last login - use the original ID format
				await DbService.updateUserLastConnection(String(response.user.id));
				
				// Dispatch event with user data
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData }
				});
				this.container.dispatchEvent(authEvent);
				
				// Show success message
				this.showMessage('Authentication successful!', 'success');
				
				// Hide component
				this.hide();
			} else {
				this.updateInternalState({
					isLoading: false,
					error: 'Invalid email or password'
				});
				this.showMessage('Invalid email or password.', 'error');
			}
		} catch (error) {
			console.error('Guest authentication error:', error);
			this.updateInternalState({
				isLoading: false,
				error: 'Authentication failed. Please try again.'
			});
			this.showMessage('Authentication failed. Please try again.', 'error');
		}
	}
	
	/**
	 * Register a new guest user directly to the database
	 */
	private async registerGuest(username: string, email: string, password: string): Promise<void> {
		this.updateInternalState({
			isLoading: true,
			error: null
		});
		
		try {
			// Create user in the database
			const newUser = await DbService.register({
				username,
				email,
				password
			});
			
			if (newUser.success && newUser.user) {
				// Format user data for the guest-authenticated event
				const userData = {
					id: String(newUser.user.id),
					username: newUser.user.pseudo,
					email: newUser.user.email,
					profilePicture: newUser.user.pfp || `/images/default-avatar.svg`,
					theme: newUser.user.theme || '#ffffff'
				};
				
				// Dispatch event with user data
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData }
				});
				this.container.dispatchEvent(authEvent);
				
				// Hide component
				this.hide();
			}
		} catch (error) {
			console.error('Guest registration error:', error);
			this.updateInternalState({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Registration failed. Please try again.'
			});
			this.showMessage('Registration failed. Please try again.', 'error');
		}
	}
	
	/**
	 * Show the component
	 */
	public show(): void {
		this.container.classList.remove('hidden');
		this.renderComponent();
	}
	
	/**
	 * Hide the component
	 */
	public hide(): void {
		this.container.classList.add('hidden');
	}
	
	/**
	 * Cancel auth and notify listeners
	 */
	public cancel(): void {
		const cancelEvent = new CustomEvent('auth-cancelled', {
			bubbles: true,
			detail: { timestamp: Date.now() }
		});
		this.container.dispatchEvent(cancelEvent);
		
		// Clean up
		this.destroy();
	}
	
	/**
	 * Clean up resources
	 */
	destroy(): void {
		this.container.innerHTML = '';
		this.container.className = '';
		super.destroy();
	}
	
	/**
	 * Show a message within the component
	 * @param message - Message to display
	 * @param type - Message type (success, error, info)
	 */
	private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
		// Clear any existing messages
		const existingMessage = this.container.querySelector('.auth-message');
		if (existingMessage) {
			existingMessage.remove();
		}
		
		// Create and add the message element
		const messageElement = document.createElement('div');
		messageElement.className = `auth-message ${type}-message`;
		messageElement.textContent = message;
		
		// Add to container
		this.container.querySelector('.auth-form-container')?.appendChild(messageElement);
		
		// Auto-remove success messages after a timeout
		if (type === 'success') {
			setTimeout(() => {
				messageElement.remove();
			}, 3000);
		}
	}
} 