/**
 * Login Module
 * Handles email/password login functionality
 */
import { html, ASCII_ART, DbService, ApiError, hashPassword } from '@website/scripts/utils';
import { AuthMethod, UserData } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class LoginHandler {
	constructor(
		private updateState: (state: any) => void,
		private setCurrentUser: (user: UserData | null) => void,
		private switchToSuccessState: () => void
	) {}

	private loginAttempts: number = 0;
	private lastLoginAttempt: Date | null = null;

	/**
	 * Renders the login form
	 */
	renderLoginForm(persistSession: boolean = true, onPersistChange: (value: boolean) => void, switchToRegister: () => void, 
				   initiateGoogleAuth: () => void, initiate42Auth: () => void): any {
		return html`
			<div class="ascii-title-container">
				<pre class="ascii-title">${ASCII_ART.AUTH}</pre>
			</div>
			
			<form class="auth-form" onSubmit=${(e: Event) => {
				e.preventDefault();
				this.handleEmailLogin(e);
			}}>
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required />
				</div>
				
				<div class="form-group checkbox-group">
					<label class="checkbox-label">
						<input type="checkbox" id="remember-me" name="remember-me" 
							   checked=${persistSession}
							   onChange=${(e: Event) => onPersistChange((e.target as HTMLInputElement).checked)} />
						<span>Remember me</span>
					</label>
				</div>
				
				<button type="submit" class="menu-button">Login</button>
			</form>
			
			<div class="auth-social-options">
				<button 
					class="menu-button auth-social-button google-auth"
					onClick=${() => initiateGoogleAuth()}
				>
					G
				</button>
				<button 
					class="menu-button auth-social-button forty-two-auth"
					onClick=${() => initiate42Auth()}
				>
					42
				</button>
			</div>
			
			<div class="auth-links">
				<a href="#" onClick=${(e: Event) => {
					e.preventDefault();
					switchToRegister();
				}}>Create account</a>
			</div>
		`;
	}

	/**
	 * Handles login with email/password
	 */
	handleEmailLogin = async (e: Event): Promise<void> => {
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
			
			// Hash the password before sending to the server
			const hashedPassword = await hashPassword(password);
			
			const response = await DbService.login({ 
				email, 
				password: hashedPassword 
			});
			
			if (response.success && response.user) {
				const user = response.user;
				const rememberMe = form.querySelector('#remember-me') as HTMLInputElement;
				const isPersistent = rememberMe ? rememberMe.checked : false;
				
				const userData: UserData = {
					id: user.id,
					username: user.username,
					email: user.email || '',
					authMethod: AuthMethod.EMAIL,
					lastLogin: user.last_login ? new Date(user.last_login) : new Date(),
					persistent: isPersistent
				};
				
				this.setCurrentUser(userData);
				this.switchToSuccessState();
				this.updateState({ isLoading: false });
			} else if (response.requires2FA) {
				// Handle 2FA flow if implemented
				this.updateState({ 
					isLoading: false,
					requires2FA: true 
				});
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
}
