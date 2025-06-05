import { Component } from '@website/scripts/components';
import { hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { IAuthComponent, GuestAuthState } from '@website/types';
import { DbService, html, render, NotificationManager, VNode } from '@website/scripts/services';
import { ErrorCodes } from '@shared/constants/error.const';

export class GuestAuthComponent extends Component<GuestAuthState> implements IAuthComponent {
	private passwordStrength: PasswordStrengthComponent | null = null;
	private twoFATimeoutId: number | null = null;
	
	constructor(container: HTMLElement) {
		super(container, {
			isRegisterMode: false,
			needsVerification: false
		});
		
		this.container.classList.add('auth-container', 'simplified-auth-container');
	}
	
	// =========================================
	// CORE METHODS
	// =========================================
	
	/**
	 * Renders the component
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
	 * Shows the component
	 */
	public show(): void {
		this.container.classList.remove('hidden');
		this.renderComponent();
	}
	
	/**
	 * Hides the component
	 */
	public hide(): void {
		this.container.classList.add('hidden');
	}
	
	/**
	 * Cancels auth and notifies listeners
	 */
	public cancel(): void {
		const cancelEvent = new CustomEvent('auth-cancelled', {
			bubbles: true,
			detail: { timestamp: Date.now() }
		});
		this.container.dispatchEvent(cancelEvent);
		
		this.destroy();
	}
	
	/**
	 * Cleans up resources
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
	 * Renders the appropriate content based on state
	 */
	private renderContent(): VNode {
		const state = this.getInternalState();

		if (state.needsVerification) {
			return this.render2FAForm();
		} else if (state.isRegisterMode) {
			return this.renderRegisterForm();
		} else {
			return this.renderLoginForm();
		}
	}
	
	// =========================================
	// Form Rendering
	// =========================================
	
	/**
	 * Renders the login form for guest authentication
	 */
	private renderLoginForm(): VNode {
		return html`
			<form class="auth-form guest-auth-form" novalidate onsubmit=${this.handleLoginSubmit}>
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" autocomplete="off" />
				</div>
				
				<button type="submit" class="menu-button">Login</button>
			</form>
			
			<div class="auth-links">
				<a href="#" onclick=${this.switchToRegister}>Create account</a>
			</div>
		`;
	}

	/**
	 * Reset form inputs
	 * 
	 * @param form - The form element to reset
	 */
	private resetForm(form: HTMLFormElement): void {
		form.querySelectorAll('input').forEach(input => input.value = '');
		form.reset();
	}
	
	/**
	 * Renders the register form for guest creation
	 */
	private renderRegisterForm(): VNode {
		const form = html`
			<form class="auth-form guest-auth-form" novalidate onsubmit=${this.handleRegisterSubmit}>
				<div class="form-group">
					<label for="username">Username:</label>
					<input pattern="^[A-Za-z0-9_]{3,}$" minlength="3" type="text" id="username" name="username" autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input 
						type="password" 
						id="password" 
						name="password" 
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

		setTimeout(() => this.initializePasswordStrength(), 0);
		
		return form;
	}
	
	/**
	 * Renders the 2FA verification form
	 */
	private render2FAForm(): VNode {
		return html`
			<form class="auth-form guest-auth-form twofa-form" novalidate onsubmit=${this.handle2FAVerification}>
				<div class="form-group">
					<p>Please enter the 6-digit code from your authenticator app:</p>
					<div class="twofa-input-container">
						<input 
							type="text" 
							id="twofa-code" 
							name="twofa-code" 
							maxlength="6" 
							pattern="[0-9]{6}" 
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
	
	// =========================================
	// Form Submission Handlers
	// =========================================
	
	/**
	 * Handles login form submission
	 */
	private handleLoginSubmit = (e: Event): void => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		this.resetForm(form);
		if (email && password) {
			this.authenticateGuest(email.toLowerCase(), password);
		} else {
			NotificationManager.handleErrorCode('required_field', 'Please enter both email and password');
		}
	}
	
	/**
	 * Handles register form submission
	 */
	private handleRegisterSubmit = (e: Event): void => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		this.resetForm(form);

		if (!username || !email || !password) {
			NotificationManager.handleErrorCode('required_field', 'All fields are required.');
			return;
		}
		if (!emailRegex.test(email)) {
			NotificationManager.handleErrorCode('invalid_email', 'Please enter a valid email address');
			return;
		}
		
		const usernameRegex = /^[A-Za-z0-9_]{3,}$/;
		if (!usernameRegex.test(username)) {
			NotificationManager.handleErrorCode('invalid_username', 'Username must be at least 3 characters long and contain only letters, numbers, and underscores.');
			return;
		}

		if (username && email && password) {
			const passwordValidation = validatePassword(password);
			if (!emailRegex.test(email)) {
				NotificationManager.handleErrorCode('invalid_email', 'Please enter a valid email address');
				return;
			}
			if (!passwordValidation.valid) {
				NotificationManager.showError(passwordValidation.message);
				return;
			}
			this.registerGuest(username.toLowerCase(), email.toLowerCase(), password);
		}
	}
	
	/**
	 * Authenticates a guest using email/password
	 */
	private async authenticateGuest(email: string, password: string): Promise<void> {
		try {
			const hashedPassword = await hashPassword(password);
			const response = await DbService.guestLogin({ 
				email, 
				password: hashedPassword 
			});
			
			if (response.requires2FA) {
				sessionStorage.setItem('guest_2fa_needed', 'true');
				sessionStorage.setItem('guest_2fa_userid', response.user.id);
				sessionStorage.setItem('guest_2fa_token', response.token);
				sessionStorage.setItem('guest_username', response.user.username || '');
				sessionStorage.setItem('guest_email', email);
				sessionStorage.setItem('guest_password', hashedPassword);
				
				this.startTwoFATimeout();
				
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
				
				this.clearFormFields();
				
				this.hide();
			} else {
				NotificationManager.handleErrorCode('login_failure', 'Invalid email or password');
			}
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.LOGIN_FAILURE) {
					NotificationManager.handleErrorCode('login_failure', 'Invalid email or password');
				} else if (errorCode === ErrorCodes.TWOFA_BAD_CODE) {
					NotificationManager.handleErrorCode(errorCode, 'Invalid two-factor authentication code');
				} else {
					NotificationManager.handleErrorCode(errorCode, 'Authentication failed');
				}
			} else {
				NotificationManager.showError('Authentication failed. Please try again.');
				NotificationManager.handleError(error);
			}
		}
	}
	
	/**
	 * Registers a new guest user directly to the database
	 */
	private async registerGuest(username: string, email: string, password: string): Promise<void> {
		try {
			const hashedPassword = await hashPassword(password);
			
			const registerResponse = await DbService.register({
				username,
				email,
				password: hashedPassword
			});
			
			if (registerResponse.success && registerResponse.user) {
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
				
				this.clearFormFields();
				
				this.hide();
			}
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.SQLITE_CONSTRAINT) {
					NotificationManager.handleErrorCode('unique_constraint_email', 'Email already in use');
				} else {
					NotificationManager.handleErrorCode(errorCode, 'Registration failed');
				}
			} else {
				NotificationManager.handleError(error);
			}
		}
	}
	
	// =========================================
	// Two-Factor Authentication
	// =========================================
	
	/**
	 * Handles 2FA verification
	 */
	private handle2FAVerification = async (e: Event): Promise<void> => {
		e.preventDefault();
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const code = formData.get('twofa-code') as string;
		
		if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
			NotificationManager.handleErrorCode('invalid_fields', 'Please enter a valid 6-digit code');
			return;
		}
		
		try {
			const userId = sessionStorage.getItem('guest_2fa_userid') || '';
			const token = sessionStorage.getItem('guest_2fa_token') || '';
			const email = sessionStorage.getItem('guest_email') || '';
			const password = sessionStorage.getItem('guest_password') || '';
			this.resetForm(form);
			await DbService.verify2FALogin(userId, code, token);
			
			const loginResponse = await DbService.guestLogin({ email, password });
			
			if (loginResponse.success && loginResponse.user) {
				this.clearTwoFATimeout();
				
				const userData = {
					id: loginResponse.user.id,
					username: loginResponse.user.username,
					email: loginResponse.user.email || '',
					avatar: loginResponse.user.pfp || `/images/default-avatar.svg`,
					theme: loginResponse.user.theme || '#ffffff'
				};
				
				this.clearTwoFactorSessionData();
				
				const position = this.getPositionFromContainerId();
				
				const authEvent = new CustomEvent('guest-authenticated', {
					bubbles: true,
					detail: { user: userData, position }
				});
				this.container.dispatchEvent(authEvent);
				
				this.clearFormFields();
				
				this.hide();
			} else {
				NotificationManager.handleErrorCode('login_failure', 'Authentication failed after 2FA verification');
			}
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === ErrorCodes.TWOFA_BAD_CODE) {
				NotificationManager.handleErrorCode(ErrorCodes.TWOFA_BAD_CODE, 'Invalid verification code');
			} else {
				NotificationManager.handleError(error);
			}
		}
	}
	
	/**
	 * Starts a timeout that will cancel 2FA verification if not completed within 1 minute
	 */
	private startTwoFATimeout(): void {
		this.clearTwoFATimeout();
		
		this.twoFATimeoutId = window.setTimeout(() => {
			this.cancelTwoFactor();
			NotificationManager.showWarning("2FA verification timed out");
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
	 * Clears 2FA-related session storage data
	 */
	private clearTwoFactorSessionData(): void {
		sessionStorage.removeItem('guest_2fa_needed');
		sessionStorage.removeItem('guest_2fa_userid');
		sessionStorage.removeItem('guest_2fa_token');
		sessionStorage.removeItem('guest_username');
		sessionStorage.removeItem('guest_email');
		sessionStorage.removeItem('guest_password');
	}
	
	/**
	 * Cancels 2FA and goes back to login
	 */
	private cancelTwoFactor = (e?: Event): void => {
		if (e) e.preventDefault();
		
		this.clearTwoFATimeout();
		this.clearTwoFactorSessionData();
		
		this.updateInternalState({
			needsVerification: false
		});
	}
	
	// =========================================
	// UI State Management
	// =========================================
	
	/**
	 * Switches to register mode
	 */
	private switchToRegister = (e: Event): void => {
		e.preventDefault();
		this.updateInternalState({
			isRegisterMode: true,
			needsVerification: false
		});
		
		this.passwordStrength = null;
	}
	
	/**
	 * Switches to login mode
	 */
	private switchToLogin = (e: Event): void => {
		e.preventDefault();
		this.updateInternalState({
			isRegisterMode: false,
			needsVerification: false
		});
		
		this.passwordStrength = null;
	}
	
	/**
	 * Clears form fields
	 */
	private clearFormFields(): void {
		const form = this.container.querySelector('form') as HTMLFormElement;
		if (form) {
			form.querySelectorAll('input').forEach(input => input.value = '');
			form.reset();
		}
		
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword('');
			const container = this.container.querySelector('#password-strength-container');
			if (container) container.innerHTML = '';
			this.passwordStrength = null;
		}
	}
	
	// =========================================
	// Password Strength
	// =========================================
	
	/**
	 * Initializes password strength component
	 */
	private initializePasswordStrength(): void {
		if (this.passwordStrength) return;
		
		const container = this.container.querySelector('#password-strength-container');
		if (container) {
			this.passwordStrength = new PasswordStrengthComponent(container as HTMLElement, true);
		}
	}

	/**
	 * Handles password input to update strength indicator
	 */
	private handlePasswordInput(e: Event): void {
		const input = e.target as HTMLInputElement;
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword(input.value);
		}
	}
	
	// =========================================
	// Utility Methods
	// =========================================
	
	/**
	 * Gets position from container ID
	 */
	private getPositionFromContainerId(): number | undefined {
		const containerId = this.container.id;
		if (!containerId || !containerId.includes('-')) return undefined;
		
		const parts = containerId.split('-');
		const positionStr = parts[parts.length - 1];
		const position = parseInt(positionStr, 10);
		return isNaN(position) ? undefined : position + 1;
	}
}
