import { ASCII_ART, hashPassword } from '@website/scripts/utils';
import { DbService, html, ApiError, connectAuthenticatedWebSocket } from '@website/scripts/services';
import { AuthMethod, UserData } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class LoginHandler {
	private persistSession: boolean = false;
	private twoFATimeoutId: number | null = null;
	
	constructor(
		private updateState: (state: any) => void,
		private setCurrentUser: (user: UserData | null, token?: string) => void,
		private switchToSuccessState: () => void
	) {}

	private loginAttempts: number = 0;
	private lastLoginAttempt: Date | null = null;

	/**
	 * Renders the login form
	 */
	renderLoginForm(persistSession: boolean = true, onPersistChange: (value: boolean) => void, switchToRegister: () => void): any {
		this.persistSession = persistSession;
		
		// Check if we're in 2FA mode from session storage
		const needsVerification = sessionStorage.getItem('auth_2fa_needed') === 'true';
		
		if (needsVerification) {
			console.log("Showing 2FA form from session storage");
			// Set a timeout to cancel 2FA if not completed within 1 minute
			this.startTwoFATimeout();
			return this.render2FAForm();
		}
		
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
	 * Starts a timeout that will cancel 2FA verification if not completed within 1 minute
	 */
	private startTwoFATimeout(): void {
		// Clear any existing timeout
		this.clearTwoFATimeout();
		
		// Set a new timeout (1 minute = 60000 milliseconds)
		this.twoFATimeoutId = window.setTimeout(() => {
			console.log("2FA verification timed out after 1 minute");
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
	 * Renders the 2FA verification form
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
	
	/**
	 * Handle 2FA verification
	 */
	private async handle2FAVerification(e: Event): Promise<void> {
		e.preventDefault();
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const code = formData.get('twofa-code') as string;
		
		if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
			this.updateState({ error: 'Please enter a valid 6-digit code' });
			return;
		}
		
		try {
			this.updateState({ isLoading: true, error: null });
			
			// Get data from session storage
			const userId = sessionStorage.getItem('auth_2fa_userid') || '';
			const token = sessionStorage.getItem('auth_2fa_token') || '';
			const email = sessionStorage.getItem('auth_email') || '';
			const password = sessionStorage.getItem('auth_password') || '';
			
			// Step 1: Verify 2FA code using the temporary token
			await DbService.verify2FALogin(userId, code, token);
			
			// Step 2: After successful 2FA validation, perform a regular login with saved credentials
			const loginResponse = await DbService.login({ email, password });
			
			if (loginResponse.success && loginResponse.user && loginResponse.token) {
				// Clear the timeout since verification was successful
				this.clearTwoFATimeout();
				
				// Login successful after 2FA verification
				const userData: UserData = {
					id: loginResponse.user.id,
					username: loginResponse.user.username,
					email: loginResponse.user.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date(),
					persistent: this.persistSession
				};
				
				this.setCurrentUser(userData, loginResponse.token);
				
				// Initialize WebSocket connection using centralized function
				// Pass the token directly to ensure immediate connection
				connectAuthenticatedWebSocket(loginResponse.token);
				
				// Clear 2FA session data
				this.clearTwoFactorSessionData();
				
				this.switchToSuccessState();
			} else {
				this.updateState({ 
					isLoading: false,
					error: 'Authentication failed after 2FA verification'
				});
			}
		} catch (error) {
			console.error('2FA verification error:', error);
			this.updateState({ 
				isLoading: false,
				error: error instanceof ApiError && error.isErrorCode(ErrorCodes.TWOFA_BAD_CODE) ?
					'Invalid verification code' : 'Verification failed. Please try again.'
			});
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
	}
	
	/**
	 * Cancel 2FA and go back to login
	 */
	private cancelTwoFactor(): void {
		// Clear the timeout
		this.clearTwoFATimeout();
		
		// Clear 2FA session data
		this.clearTwoFactorSessionData();
		
		this.updateState({});
	}

	/**
	 * Handles login with email/password
	 */
	handleLogin = async (e: Event): Promise<void> => {
		e.preventDefault();
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (!email || !password) {
			this.updateState({ error: 'Please enter both email and password' });
			return;
		}
		
		// Track login attempts for security
		this.loginAttempts++;
		this.lastLoginAttempt = new Date();
		
		if (this.loginAttempts > 5) {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			if (this.lastLoginAttempt && this.lastLoginAttempt > fiveMinutesAgo) {
				this.updateState({ error: 'Too many login attempts. Please try again later.' });
				return;
			} else {
				this.loginAttempts = 1;
			}
		}
		
		try {
			this.updateState({ isLoading: true, error: null });
			
			const hashedPassword = await hashPassword(password);
			
			const response = await DbService.login({ 
				email, 
				password: hashedPassword 
			});
			
			if (response.requires2FA) {
				console.log("2FA required for user:", response.user.id);
				
				// Store 2FA info in session storage
				sessionStorage.setItem('auth_2fa_needed', 'true');
				sessionStorage.setItem('auth_2fa_userid', response.user.id);
				sessionStorage.setItem('auth_2fa_token', response.token);
				sessionStorage.setItem('auth_username', response.user.username || '');
				sessionStorage.setItem('auth_email', email);
				sessionStorage.setItem('auth_password', hashedPassword);
				
				// Update UI state
				this.updateState({ isLoading: false, error: null });
				
				// Start the timeout for 2FA verification
				this.startTwoFATimeout();
				
				// Force re-render to show 2FA form
				this.updateState({});
			} else if (response.success && response.user && response.token) {
				// Standard login success - no 2FA required
				const userData: UserData = {
					id: response.user.id,
					username: response.user.username,
					email: response.user.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date(),
					persistent: this.persistSession
				};
				
				this.setCurrentUser(userData, response.token);
				
				// Initialize WebSocket connection using centralized function
				// Pass the token directly to ensure immediate connection
				connectAuthenticatedWebSocket(response.token);
				
				this.switchToSuccessState();
				this.resetForm(form);
			} else {
				this.updateState({ 
					isLoading: false,
					error: 'Invalid username or password' 
				});
			}
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.isErrorCode(ErrorCodes.LOGIN_FAILURE)) {
					this.updateState({ 
						isLoading: false,
						error: 'Invalid username or password' 
					});
				} else if (error.isErrorCode(ErrorCodes.TWOFA_BAD_CODE)) {
					this.updateState({ 
						isLoading: false,
						error: 'Invalid two-factor authentication code' 
					});
				} else {
					this.updateState({ 
						isLoading: false,
						error: error.message 
					});
				}
			} else {
				console.error('Auth: Login error', error);
				this.updateState({ 
					isLoading: false,
					error: error instanceof Error ? error.message : 'Authentication failed'
				});
			}
		}
	}

	/**
	 * Reset form
	 */
	private resetForm(form: HTMLFormElement): void {
		const inputs = form.querySelectorAll('input');
		inputs.forEach(input => {
			input.value = '';
		});
		form.reset();
	}
}
