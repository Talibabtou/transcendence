import { ASCII_ART, hashPassword } from '@website/scripts/utils';
import { DbService, html, connectAuthenticatedWebSocket, NotificationManager } from '@website/scripts/services';
import { AuthMethod, UserData } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class LoginHandler {
	private persistSession: boolean = false;
	private twoFATimeoutId: number | null = null;
	private loginAttempts: number = 0;
	private lastLoginAttempt: Date | null = null;

	constructor(
		private updateState: (state: any) => void,
		private setCurrentUser: (user: UserData | null, token?: string) => void,
		private switchToSuccessState: () => void
	) {}

	// =========================================
	// RENDERING
	// =========================================

	/**
	 * Renders the login form or 2FA form based on current state
	 * 
	 * @param persistSession - Whether to persist the session by default
	 * @param onPersistChange - Callback for when persistence option changes
	 * @param switchToRegister - Callback to switch to registration form
	 * @returns HTML template for the login form
	 */
	renderLoginForm(persistSession: boolean = true, onPersistChange: (value: boolean) => void, switchToRegister: () => void): any {
		this.persistSession = persistSession;
		
		const needsVerification = sessionStorage.getItem('auth_2fa_needed') === 'true';
		
		if (needsVerification)
			return this.render2FAForm();
		
		return html`
			<div class="ascii-title-container">
				<pre class="ascii-title">${ASCII_ART.AUTH}</pre>
			</div>
			
			<form class="auth-form" onSubmit=${(e: Event) => {
				e.preventDefault();
				this.handleLogin(e);
			}}>
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required/>
				</div>
				
				<div class="form-group checkbox-group">
					<label class="checkbox-label">
						<input type="checkbox" id="remember-me" name="remember-me" 
							 checked=${persistSession}
							 onChange=${(e: Event) => {
								this.persistSession = (e.target as HTMLInputElement).checked;
								onPersistChange((e.target as HTMLInputElement).checked);
							 }} />
						<span>Remember me</span>
					</label>
				</div>
				
				<button type="submit" class="menu-button">Login</button>
			</form>
			
			<div class="auth-links">
				<a href="#" onClick=${(e: Event) => {
					e.preventDefault();
					switchToRegister();
				}}>Create account</a>
			</div>
		`;
	}
	
	/**
	 * Renders the 2FA verification form
	 * 
	 * @returns HTML template for the 2FA verification form
	 */
	private render2FAForm(): any {
		return html`
			<div class="ascii-title-container">
				<pre class="ascii-title">${ASCII_ART.AUTH}</pre>
			</div>
			
			<div class="auth-form twofa-form">
				<p>Please enter the 6-digit code from your authenticator app:</p>
				
				<form onSubmit=${(e: Event) => {
					e.preventDefault();
					this.handle2FAVerification(e);
				}}>
					<div class="form-group twofa-input-container">
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
					
					<div class="twofa-button-container">
						<button type="submit" class="menu-button twofa-verify-button">Verify</button>
					</div>
				</form>
				
				<div class="auth-links twofa-cancel-container">
					<a href="#" onClick=${(e: Event) => {
						e.preventDefault();
						this.cancelTwoFactor();
					}}>Cancel</a>
				</div>
			</div>
		`;
	}

	// =========================================
	// LOGIN METHODS
	// =========================================
	
	/**
	 * Handles login with email/password
	 * 
	 * @param e - Form submission event
	 */
		handleLogin = async (e: Event): Promise<void> => {
		e.preventDefault();
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		let email = formData.get('email') as string;
		email = email.toLowerCase();
		const password = formData.get('password') as string;
		const emailRegex = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z]{2,}$/;
		if (!emailRegex.test(email)) {
				NotificationManager.handleErrorCode('invalid_email', 'Please enter a valid email address');
				return;
		}
		if (!email || !password) {
			NotificationManager.handleErrorCode('required_field', 'Please enter both email and password');
			return;
		}

		
		this.loginAttempts++;
		this.lastLoginAttempt = new Date();
		
		if (this.loginAttempts > 5) {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			if (this.lastLoginAttempt && this.lastLoginAttempt > fiveMinutesAgo) {
				NotificationManager.handleErrorCode('account_locked', 'Too many login attempts. Please try again later.');
				return;
			} else {
				this.loginAttempts = 1;
			}
		}

		try {
			this.updateState({ isLoading: true });
			
			const hashedPassword = await hashPassword(password);
			
			const response = await DbService.login({ 
				email, 
				password: hashedPassword 
			});
			
			if (response.requires2FA) {
				sessionStorage.setItem('auth_2fa_needed', 'true');
				sessionStorage.setItem('auth_2fa_userid', response.user.id);
				sessionStorage.setItem('auth_2fa_token', response.token);
				sessionStorage.setItem('auth_username', response.user.username || '');
				sessionStorage.setItem('auth_email', email);
				sessionStorage.setItem('auth_password', hashedPassword);
				
				this.updateState({ isLoading: false });
				
				this.startTwoFATimeout();
				
				NotificationManager.showInfo('Please enter your 2FA verification code');
			} else if (response.success && response.user && response.token) {
				const userData: UserData = {
					id: response.user.id,
					username: response.user.username,
					email: response.user.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date(),
					persistent: this.persistSession
				};
				
				this.setCurrentUser(userData, response.token);
				
				connectAuthenticatedWebSocket(response.token);
				
				this.switchToSuccessState();
				this.resetForm(form);
				NotificationManager.showSuccess('Login successful');
			}
		} catch (error) {
			this.updateState({ isLoading: false });
			if (error && typeof error === 'object' && 'code' in error) {
				NotificationManager.handleErrorCode(error.code as string);
			} else {
				NotificationManager.handleError(error);
			}
		}
	}

	/**
	 * Reset form inputs
	 * 
	 * @param form - The form element to reset
	 */
	private resetForm(form: HTMLFormElement): void {
		const inputs = form.querySelectorAll('input');
		inputs.forEach(input => {
			input.value = '';
		});
		form.reset();
	}

	// =========================================
	// TWO-FACTOR AUTHENTICATION
	// =========================================
	
	/**
	 * Starts a timeout that will cancel 2FA verification if not completed within 1 minute
	 */
	private startTwoFATimeout(): void {
		console.log('Starting 2FA timeout');
		this.twoFATimeoutId = window.setTimeout(() => {
			if (sessionStorage.getItem('auth_2fa_needed') === 'true') {
				this.cancelTwoFactor();
				NotificationManager.showWarning("2FA verification timed out");
			}
		}, 60000);
	}
	
	/**
	 * Clears the 2FA timeout if it exists
	 */
	private clearTwoFATimeout(): void {
		console.log('Clearing 2FA timeout');
		if (this.twoFATimeoutId !== null) {
			window.clearTimeout(this.twoFATimeoutId);
			this.twoFATimeoutId = null;
		}
	}
	
	/**
	 * Handles 2FA verification code submission
	 * @param e - Form submission event
	 */
	private async handle2FAVerification(e: Event): Promise<void> {
		e.preventDefault();
		
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const code = formData.get('twofa-code') as string;
		
		if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
			NotificationManager.handleErrorCode('invalid_fields', 'Please enter a valid 6-digit code');
			if (sessionStorage.getItem('auth_2fa_needed') === 'true') {
				this.startTwoFATimeout();
			}
			return;
		}
		
		try {
			this.updateState({ isLoading: true });
			
			const userId = sessionStorage.getItem('auth_2fa_userid') || '';
			const token = sessionStorage.getItem('auth_2fa_token') || '';
			const email = sessionStorage.getItem('auth_email') || '';
			const password = sessionStorage.getItem('auth_password') || '';
			
			await DbService.verify2FALogin(userId, code, token);
			
			const loginResponse = await DbService.login({ email, password });
			
			if (loginResponse.success && loginResponse.user && loginResponse.token) {
				this.clearTwoFactorSessionData();
				
				const userData: UserData = {
					id: loginResponse.user.id,
					username: loginResponse.user.username,
					email: loginResponse.user.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date(),
					persistent: this.persistSession
				};
				
				this.setCurrentUser(userData, loginResponse.token);
				
				connectAuthenticatedWebSocket(loginResponse.token);
				
				this.switchToSuccessState();
				NotificationManager.showSuccess('Login successful');
			}
		} catch (error) {
			this.updateState({ isLoading: false });
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.TWOFA_BAD_CODE) {
					NotificationManager.handleErrorCode(ErrorCodes.TWOFA_BAD_CODE, 'Invalid verification code');
				} else {
					NotificationManager.handleErrorCode(errorCode);
				}
			} else {
				NotificationManager.handleError(error);
			}
			
			if (sessionStorage.getItem('auth_2fa_needed') === 'true') {
				this.startTwoFATimeout();
			}
		}
	}
	
	/**
	 * Clear 2FA-related session storage data
	 */
	private clearTwoFactorSessionData(): void {
		sessionStorage.removeItem('auth_2fa_needed');
		sessionStorage.removeItem('auth_2fa_userid');
		sessionStorage.removeItem('auth_2fa_token');
		sessionStorage.removeItem('auth_username');
		sessionStorage.removeItem('auth_email');
		sessionStorage.removeItem('auth_password');
		this.clearTwoFATimeout();
	}
	
	/**
	 * Cancel 2FA and go back to login
	 */
	private cancelTwoFactor(): void {
		this.clearTwoFactorSessionData();
		this.updateState({});
	}
}
