import { Component } from '@website/scripts/components';
import { hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { IAuthComponent, GuestAuthState } from '@website/types';
import { DbService, html, render, NotificationManager } from '@website/scripts/services';
import { ErrorCodes } from '@shared/constants/error.const';

export class GuestAuthComponent extends Component<GuestAuthState> implements IAuthComponent {
	private passwordStrength: PasswordStrengthComponent | null = null;
	private twoFATimeoutId: number | null = null;
	
	constructor(container: HTMLElement) {
		super(container, {
			isRegisterMode: false,
			needsVerification: false
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
			</div>
		`;
		
		render(template, this.container);
	}
	
	/**
	 * Render the appropriate content based on state
	 */
	private renderContent(): any {
		const state = this.getInternalState();

		if (state.needsVerification) {
			return this.render2FAForm();
		} else if (state.isRegisterMode) {
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
	 * Render the 2FA verification form
	 */
	private render2FAForm(): any {
		return html`
			<form class="auth-form guest-auth-form twofa-form" onsubmit=${this.handle2FAVerification}>
				<div class="form-group">
					<p>Please enter the 6-digit code from your authenticator app:</p>
					<div class="twofa-input-container">
						<input 
							type="text" 
							id="twofa-code" 
							name="twofa-code" 
							maxlength="6" 
							pattern="[0-9]{6}" 
							required 
							placeholder="000000"
							autocomplete="one-time-code"
							autofocus
							class="twofa-input"
						/>
					</div>
				</div>
				
				<div class="twofa-button-container">
					<button type="submit" class="menu-button twofa-verify-button">Verify</button>
				</div>
				
				<div class="auth-links twofa-cancel-container">
					<a href="#" onclick=${this.cancelTwoFactor}>Cancel</a>
				</div>
			</form>
		`;
	}
	
	/**
	 * Starts a timeout that will cancel 2FA verification if not completed within 1 minute
	 */
	private startTwoFATimeout(): void {
		// Clear any existing timeout
		this.clearTwoFATimeout();
		
		// Set a new timeout (1 minute = 60000 milliseconds)
		this.twoFATimeoutId = window.setTimeout(() => {
			this.cancelTwoFactor();
		}, 60000);
	}
	
	/**
	 * Clears the 2FA timeout if it exists
	 */
	private clearTwoFATimeout(): void {
		if (this.twoFATimeoutId !== null) {
			window.clearTimeout(this.twoFATimeoutId);
			this.twoFATimeoutId = null;
		}
	}
	
	/**
	 * Clear 2FA-related session storage data
	 */
	private clearTwoFactorSessionData(): void {
		// Use a prefix specific to guest auth to avoid conflicts with main login
		sessionStorage.removeItem('guest_2fa_needed');
		sessionStorage.removeItem('guest_2fa_userid');
		sessionStorage.removeItem('guest_2fa_token');
		sessionStorage.removeItem('guest_username');
		sessionStorage.removeItem('guest_email');
		sessionStorage.removeItem('guest_password');
	}
	
	/**
	 * Cancel 2FA and go back to login
	 */
	private cancelTwoFactor = (e?: Event): void => {
		if (e) e.preventDefault();
		
		// Clear the timeout
		this.clearTwoFATimeout();
		
		// Clear 2FA session data
		this.clearTwoFactorSessionData();
		
		// Return to login form
		this.updateInternalState({
			needsVerification: false
		});
	}
	
	/**
	 * Handle 2FA verification
	 */
	private handle2FAVerification = async (e: Event): Promise<void> => {
		e.preventDefault();
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const code = formData.get('twofa-code') as string;
		
		if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
			NotificationManager.showError('Please enter a valid 6-digit code');
			return;
		}
		
		try {
			// Get data from session storage
			const userId = sessionStorage.getItem('guest_2fa_userid') || '';
			const token = sessionStorage.getItem('guest_2fa_token') || '';
			const email = sessionStorage.getItem('guest_email') || '';
			const password = sessionStorage.getItem('guest_password') || '';
			
			// Step 1: Verify 2FA code using the temporary token
			await DbService.verify2FALogin(userId, code, token);
			
			// Step 2: After successful 2FA validation, perform a guest login with saved credentials
			const loginResponse = await DbService.guestLogin({ email, password });
			
			if (loginResponse.success && loginResponse.user) {
				// Clear the timeout since verification was successful
				this.clearTwoFATimeout();
				
				const userData = {
					id: loginResponse.user.id,
					username: loginResponse.user.username,
					email: loginResponse.user.email || '',
					avatar: loginResponse.user.pfp || `/images/default-avatar.svg`,
					theme: loginResponse.user.theme || '#ffffff'
				};
				
				// Clear 2FA session data
				this.clearTwoFactorSessionData();
				
				// Get position from container ID for tournament player position
				const position = this.getPositionFromContainerId();
				
				// Dispatch guest-authenticated event
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData, position }
				});
				this.container.dispatchEvent(authEvent);
				
				// Clear the form fields
				this.clearFormFields();
				
				this.hide();
			} else {
				NotificationManager.showError('Authentication failed after 2FA verification');
			}
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === ErrorCodes.TWOFA_BAD_CODE) {
				NotificationManager.showError('Invalid verification code');
			} else {
				NotificationManager.handleError(error);
			}
		}
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
				NotificationManager.showError(passwordValidation.message);
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
			needsVerification: false
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
			needsVerification: false
		});
		
		// Reset password strength when switching modes
		this.passwordStrength = null;
	}
	
	/**
	 * Authenticate a guest using email/password
	 */
	private async authenticateGuest(email: string, password: string): Promise<void> {
		try {
			// Hash the password before sending to the server
			const hashedPassword = await hashPassword(password);
			
			// Use dedicated guestLogin function instead of general login
			const response = await DbService.guestLogin({ 
				email, 
				password: hashedPassword 
			});
			
			if (response.requires2FA) {
				// Store 2FA info in session storage (using guest_ prefix to avoid conflicts)
				sessionStorage.setItem('guest_2fa_needed', 'true');
				sessionStorage.setItem('guest_2fa_userid', response.user.id);
				sessionStorage.setItem('guest_2fa_token', response.token);
				sessionStorage.setItem('guest_username', response.user.username || '');
				sessionStorage.setItem('guest_email', email);
				sessionStorage.setItem('guest_password', hashedPassword);
				
				// Start the timeout for 2FA verification
				this.startTwoFATimeout();
				
				// Update UI to show 2FA form
				this.updateInternalState({ 
					needsVerification: true
				});
			} else if (response.success && response.user) {
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
				NotificationManager.showError('Invalid email or password');
			}
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.LOGIN_FAILURE) {
					NotificationManager.showError('Invalid email or password');
				} else if (errorCode === ErrorCodes.TWOFA_BAD_CODE) {
					NotificationManager.showError('Invalid two-factor authentication code');
				} else {
					NotificationManager.showError('Authentication failed');
				}
			} else {
				NotificationManager.showError('Authentication failed. Please try again.');
				NotificationManager.handleError(error);
			}
		}
	}
	
	/**
	 * Register a new guest user directly to the database
	 */
	private async registerGuest(username: string, email: string, password: string): Promise<void> {
		try {
			// Hash the password before sending to the server
			const hashedPassword = await hashPassword(password);
			
			// Use dedicated registerGuest function
			const registerResponse = await DbService.register({
				username,
				email,
				password: hashedPassword
			});
			
			if (registerResponse.success && registerResponse.user) {
				// After successful registration, do a login to get the auth token
				const loginResponse = await DbService.guestLogin({
					email,
					password: hashedPassword
				});
				
				if (!loginResponse.success) {
					NotificationManager.showError('Account created but login failed. Please try logging in manually.');
					return;
				}
				
				const userData = {
					id: registerResponse.user.id,
					username: registerResponse.user.username,
					email: registerResponse.user.email,
					profilePicture: registerResponse.user.pfp || `/images/default-avatar.svg`,
					theme: registerResponse.user.theme || '#ffffff'
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
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.SQLITE_CONSTRAINT) {
					NotificationManager.showError('Email already in use');
				} else {
					NotificationManager.showError('Registration failed');
				}
			} else {
				NotificationManager.handleError(error);
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
			return isNaN(position) ? undefined : position + 1;
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
		this.clearTwoFATimeout();
		this.clearTwoFactorSessionData();
		this.container.innerHTML = '';
		this.container.className = '';
		super.destroy();
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
