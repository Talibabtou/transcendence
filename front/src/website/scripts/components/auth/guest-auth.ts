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
		const template = html`
			<div class="auth-form-container simplified-auth-form-container">
				${this.renderContent()}
				${this.getInternalState().error ? html`
					<div class="register-error shake">${this.getInternalState().error}</div>
				` : ''}
			</div>
		`;
		
		render(template, this.container);
	}
	
	/**
	 * Render the appropriate content based on state
	 */
	private renderContent(): any {
		const state = this.getInternalState();

		
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
					G
				</button>
				
				<button class="menu-button auth-social-button forty-two-auth" onclick=${this.handleSocialLoginClick}>
					42
				</button>
			</div>
			
			<div class="auth-links">
				<a href="#" onclick=${this.switchToRegister}>Create account</a>
			</div>
		`;
	}
	
	/**
	 * Render the register form for guest creation
	 */
	private renderRegisterForm(): any {
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
		this.showError('Social login is not available for guest players.');
	}
	
	/**
	 * Authenticate a guest using email/password
	 */
	private async authenticateGuest(email: string, password: string): Promise<void> {
		this.updateInternalState({ error: null });
		
		try {
			const response = await DbService.verifyUser(email, password);
			
			if (response.success && response.user) {
				const userData = {
					id: response.user.id,
					username: response.user.username,
					email: response.user.email || '',
					profilePicture: response.user.profilePicture,
					theme: response.user.theme || '#ffffff'
				};
				
				await DbService.updateUserLastConnection(String(response.user.id));
				
				const position = this.getPositionFromContainerId();
				
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData, position }
				});
				this.container.dispatchEvent(authEvent);
				
				// Clear the form fields
				this.clearFormFields();
				
				this.hide();
			} else {
				this.showError('Invalid email or password');
			}
		} catch (error) {
			console.error('Guest authentication error:', error);
			this.showError('Authentication failed. Please try again.');
		}
	}
	
	/**
	 * Register a new guest user directly to the database
	 */
	private async registerGuest(username: string, email: string, password: string): Promise<void> {
		this.updateInternalState({ error: null });
		
		try {
			const newUser = await DbService.register({
				username,
				email,
				password
			});
			
			if (newUser.success && newUser.user) {
				const userData = {
					id: String(newUser.user.id),
					username: newUser.user.pseudo,
					email: newUser.user.email,
					profilePicture: newUser.user.pfp || `/images/default-avatar.svg`,
					theme: newUser.user.theme || '#ffffff'
				};
				
				const position = this.getPositionFromContainerId();
				
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData, position }
				});
				this.container.dispatchEvent(authEvent);
				
				this.hide();
			}
		} catch (error) {
			console.error('Guest registration error:', error);
			this.showError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
		}
	}
	
	/**
	 * Get position from container ID
	 */
	private getPositionFromContainerId(): number | undefined {
		const containerId = this.container.id;
		if (containerId && containerId.includes('-')) {
			const parts = containerId.split('-');
			const positionStr = parts[parts.length - 1];
			const position = parseInt(positionStr, 10);
			return isNaN(position) ? undefined : position + 1; // Convert to 1-based index
		}
		return undefined;
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
	 * Add a method to handle error display with animation
	 */
	private showError(message: string): void {
		this.updateInternalState({ error: message });
		
		requestAnimationFrame(() => {
			const errorElement = this.container.querySelector('.register-error') as HTMLElement;
			if (errorElement) {
				errorElement.classList.remove('shake');
				void errorElement.offsetWidth;
				errorElement.classList.add('shake');
			}
		});
	}
	
	// Add a new method to clear form fields
	private clearFormFields(): void {
		const form = this.container.querySelector('form') as HTMLFormElement;
		if (form) {
			form.reset();
		}
	}
}
