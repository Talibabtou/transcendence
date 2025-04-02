/**
 * Login Module
 * Handles email/password login functionality
 */
import { html, ASCII_ART, DbService } from '@website/scripts/utils';
import { AuthMethod, UserData } from '@shared/types';

export class LoginHandler {
	constructor(
		private _updateState: (state: any) => void,
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
					Login with Google
				</button>
				
				<button 
					class="menu-button auth-social-button forty-two-auth"
					onClick=${() => initiate42Auth()}
				>
					Login with 42
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
		
		// Get reference to existing error element or create one if it doesn't exist
		let errorElement = form.querySelector('.auth-error') as HTMLElement;
		if (!errorElement) {
			errorElement = document.createElement('div');
			errorElement.className = 'auth-error';
			form.appendChild(errorElement);
		}
		
		if (!email || !password) {
			// Show error inline instead of updating state
			errorElement.textContent = 'Please enter both email and password';
			errorElement.style.display = 'block';
			return;
		}
		
		// Track login attempts for security
		this.loginAttempts++;
		this.lastLoginAttempt = new Date();
		
		// Rate limiting for security (3 attempts within 5 minutes)
		if (this.loginAttempts > 5) {
			const fiveMinutesAgo = new Date(Date.now() - 60 * 1000); // 1 minutes
			if (this.lastLoginAttempt && this.lastLoginAttempt > fiveMinutesAgo) {
				// Show error inline instead of updating state
				errorElement.textContent = 'Too many login attempts. Please try again later.';
				errorElement.style.display = 'block';
				
				console.warn('Auth: Rate limited login attempt', {
					email,
					attempts: this.loginAttempts
				});
				
				return;
			} else {
				// Reset counter after 5 minutes
				this.loginAttempts = 1;
			}
		}
		
		// Hide any previous error message
		errorElement.style.display = 'none';
		
		// Add loading indicator directly to form instead of updating state
		let loadingIndicator = form.querySelector('.form-loading-indicator') as HTMLElement;
		if (!loadingIndicator) {
			loadingIndicator = document.createElement('div');
			loadingIndicator.className = 'form-loading-indicator';
			loadingIndicator.innerHTML = 'Verifying...';
			form.appendChild(loadingIndicator);
		} else {
			loadingIndicator.style.display = 'block';
		}
		
		// Disable form buttons during authentication
		const buttons = form.querySelectorAll('button');
		buttons.forEach(button => button.disabled = true);
		
		// Check if "Remember me" is checked
		const rememberMe = form.querySelector('#remember-me') as HTMLInputElement;
		const isPersistent = rememberMe ? rememberMe.checked : false;
		
		// Use updateState to notify parent component of loading state
		this._updateState({ isLoading: true, error: null });
		
		try {
			const response = await DbService.login({
				email,
				password
			});
			
			if (response.success && response.user) {
				const user = response.user;
				// Login successful
				const userData: UserData = {
					id: String(user.id),
					username: user.pseudo,
					email: user.email || '', // Add fallback
					authMethod: AuthMethod.EMAIL,
					lastLogin: user.last_login ? new Date(user.last_login) : new Date(),
					persistent: isPersistent
				};
				
				// Set current user with persistence flag from checkbox
				this.setCurrentUser(userData);
				
				// Update last login in the database - ensure numeric ID
				DbService.updateUser(user.id, {
					last_login: new Date()
				});
				
				// Just switch to success state directly
				this.switchToSuccessState();
			} else {
				this._updateState({ 
					isLoading: false, 
					error: 'Invalid username or password' 
				});
			}
		} catch (error) {
			// Properly handle the rejected promise
			console.error('Auth: Login error', error);
			this._updateState({ 
				isLoading: false, 
				error: error instanceof Error ? error.message : 'Authentication failed'
			});
		} finally {
			// Re-enable form buttons
			buttons.forEach(button => button.disabled = false);
			
			// Hide loading indicator
			if (loadingIndicator) loadingIndicator.style.display = 'none';
		}
	}
}
