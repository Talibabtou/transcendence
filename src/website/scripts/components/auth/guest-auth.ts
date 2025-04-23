/**
 * Guest Authentication Component
 * A standalone component for guest player authentication without affecting the main app state
 */
import { Component } from '@website/scripts/components';
import { ASCII_ART, html, render, DbService } from '@website/scripts/utils';
import { IAuthComponent } from '@shared/types';

// Define a simple state interface
interface GuestAuthState {
	isLoading: boolean;
	error: string | null;
	isRegisterMode: boolean;
}

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
			// Verify user credentials directly using DbService
			const response: any = await DbService.verifyUser(email, password);
			
			if (response && response.success && response.user) {
				// Extract numeric ID
				const rawId = response.user.id;
				let numericId: number;
				
				if (typeof rawId === 'string' && rawId.includes('_')) {
					const parts = rawId.split('_');
					numericId = parseInt(parts[parts.length - 1], 10);
				} else if (typeof rawId === 'string') {
					numericId = parseInt(rawId, 10);
				} else {
					numericId = Number(rawId);
				}
				
				if (isNaN(numericId)) {
					console.error('Invalid guest ID format:', rawId);
					numericId = Date.now();
				}
				
				// Create user data - handle possible missing properties with fallbacks
				const userData = {
					id: numericId,
					username: response.user.username || response.user.name || 'Guest',
					email: response.user.email || '',
					profilePicture: response.user.profilePicture || response.user.avatar || '/images/default-avatar.svg'
				};
				
				// Update last connection time
				await DbService.updateUserLastConnection(String(rawId));
				
				// Dispatch custom event with guest user data
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData }
				});
				document.dispatchEvent(authEvent);
				
				// Hide component
				this.hide();
			} else {
				this.updateInternalState({
					isLoading: false,
					error: (response && response.error) ? response.error : 'Invalid email or password'
				});
			}
		} catch (error) {
			console.error('Guest authentication error:', error);
			this.updateInternalState({
				isLoading: false,
				error: 'Authentication failed. Please try again.'
			});
		}
	}
	
	/**
	 * Register a new guest user
	 */
	private async registerGuest(username: string, email: string, password: string): Promise<void> {
		this.updateInternalState({
			isLoading: true,
			error: null
		});
		
		try {
			// Register user
			const response: any = await DbService.register({ username, email, password });
			
			if (response && response.success && response.user) {
				// Format user data
				const userData = {
					id: response.user.id,
					username: response.user.username || response.user.name || username,
					email: response.user.email || email,
					profilePicture: response.user.profilePicture || response.user.avatar || '/images/default-avatar.svg'
				};
				
				// Dispatch event
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData }
				});
				document.dispatchEvent(authEvent);
				
				// Hide component
				this.hide();
			} else {
				this.updateInternalState({
					isLoading: false,
					error: (response && response.error) ? response.error : 'Registration failed'
				});
			}
		} catch (error) {
			console.error('Guest registration error:', error);
			this.updateInternalState({
				isLoading: false,
				error: 'Registration failed. Please try again.'
			});
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
		document.dispatchEvent(cancelEvent);
		
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
} 