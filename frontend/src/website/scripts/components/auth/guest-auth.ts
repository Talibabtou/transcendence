/**
 * Guest Authentication Component
 * A standalone component for guest player authentication without affecting the main app state
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService, ApiError, hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { IAuthComponent, GuestAuthState } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class GuestAuthComponent extends Component<GuestAuthState> implements IAuthComponent {
	private passwordStrength: PasswordStrengthComponent | null = null;
	
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
			
			<div class="auth-links">
				<a href="#" onclick=${this.switchToRegister}>Create account</a>
			</div>
		`;
	}
	
	/**
	 * Render the register form for guest creation
	 */
	private renderRegisterForm(): any {
		const form = html`
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
					<input 
						type="password" 
						id="password" 
						name="password" 
						required 
						autocomplete="off" 
						onInput=${(e: Event) => this.handlePasswordInput(e)}
					/>
					<div id="password-strength-container"></div>
				</div>
				
				<button type="submit" class="menu-button">Create Account</button>
			</form>
			
			<div class="auth-links">
				<a href="#" onclick=${this.switchToLogin}>Back to login</a>
			</div>
		`;

		// Schedule initialization after the form is rendered
		setTimeout(() => this.initializePasswordStrength(), 0);
		
		return form;
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
			// Add password validation
			const passwordValidation = validatePassword(password);
			if (!passwordValidation.valid) {
				this.showError(passwordValidation.message);
				return;
			}
			
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
		
		// Reset password strength when switching modes
		this.passwordStrength = null;
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
		
		// Reset password strength when switching modes
		this.passwordStrength = null;
	}
	
	/**
	 * Authenticate a guest using email/password
	 */
	private async authenticateGuest(email: string, password: string): Promise<void> {
		this.updateInternalState({ error: null });
		
		try {
			// Hash the password before sending to the server
			const hashedPassword = await hashPassword(password);
			
			const response = await DbService.login({ 
				email, 
				password: hashedPassword 
			});
			
			if (response.success && response.user) {
				const userData = {
					id: response.user.id,
					username: response.user.username,
					email: response.user.email || '',
					avatar: response.user.pfp || `/images/default-avatar.svg`,
					theme: response.user.theme || '#ffffff'
				};
				
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
			if (error instanceof ApiError) {
				if (error.isErrorCode(ErrorCodes.LOGIN_FAILURE)) {
					this.showError('Invalid email or password');
				} else if (error.isErrorCode(ErrorCodes.TWOFA_BAD_CODE)) {
					this.showError('Invalid two-factor authentication code');
				} else {
					this.showError(error.message);
				}
			} else {
				console.error('Guest authentication error:', error);
				this.showError('Authentication failed. Please try again.');
			}
		}
	}
	
	/**
	 * Register a new guest user directly to the database
	 */
	private async registerGuest(username: string, email: string, password: string): Promise<void> {
		this.updateInternalState({ error: null });
		
		try {
			// Hash the password before sending to the server
			const hashedPassword = await hashPassword(password);
			
			const newUser = await DbService.register({
				username,
				email,
				password: hashedPassword
			});
			
			if (newUser.success && newUser.user) {
				const userData = {
					id: String(newUser.user.id),
					username: newUser.user.username,
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
				
				// Clear form fields before hiding
				this.clearFormFields();
				
				this.hide();
			}
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.isErrorCode(ErrorCodes.SQLITE_CONSTRAINT)) {
					this.showError('Email already in use');
				} else {
					this.showError(error.message);
				}
			} else {
				console.error('Guest registration error:', error);
				this.showError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
			}
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
		this.passwordStrength = null;
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
	
	/**
	 * Clear form fields
	 */
	private clearFormFields(): void {
		const form = this.container.querySelector('form') as HTMLFormElement;
		if (form) {
			// Manually clear input fields first
			const inputs = form.querySelectorAll('input');
			inputs.forEach(input => {
				input.value = '';
			});
			
			// Reset form
			form.reset();
		}
		
		// Reset password strength component properly
		if (this.passwordStrength) {
			// Update with empty string to reset display to 0%
			this.passwordStrength.updatePassword('');
			
			// Get container and clear its contents
			const container = this.container.querySelector('#password-strength-container');
			if (container) {
				container.innerHTML = '';
			}
			
			// Set to null to allow proper re-initialization
			this.passwordStrength = null;
		}
	}
	
	/**
	 * Initialize password strength component
	 */
	private initializePasswordStrength(): void {
		if (!this.passwordStrength) {
			const container = this.container.querySelector('#password-strength-container');
			if (container) {
				// Use simplified mode (true) to only show strength bar without requirements list
				this.passwordStrength = new PasswordStrengthComponent(container as HTMLElement, true);
			}
		}
	}

	/**
	 * Handle password input to update strength indicator
	 */
	private handlePasswordInput(e: Event): void {
		const input = e.target as HTMLInputElement;
		const password = input.value;
		
		// Update password strength indicator
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword(password);
		}
	}
}
