/**
 * Login Module
 * Handles email/password login functionality
 */
import { html, ASCII_ART, DbService } from '@website/scripts/utils';
import { AuthMethod, UserData } from '@shared/types';

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
	renderLoginForm(persistSession: boolean, onPersistChange: (value: boolean) => void, switchToRegister: () => void, 
				   initiateGoogleAuth: () => void, initiate42Auth: () => void): any {
		return html`
			<div class="ascii-title-container">
				<pre class="ascii-title">${ASCII_ART.AUTH}</pre>
			</div>
			
			<form class="auth-form" onSubmit=${(e: Event) => {
				e.preventDefault();
				this.handleEmailLogin(e.target as HTMLFormElement);
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
	handleEmailLogin(form: HTMLFormElement): void {
		const formData = new FormData(form);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (!email || !password) {
			this.updateState({
				error: 'Please enter both email and password'
			});
			return;
		}
		
		// Track login attempts for security
		this.loginAttempts++;
		this.lastLoginAttempt = new Date();
		
		// Log the login attempt
		console.log('Auth: Login attempt', {
			email,
			attempts: this.loginAttempts,
			timestamp: this.lastLoginAttempt
		});
		
		// Rate limiting for security (3 attempts within 5 minutes)
		if (this.loginAttempts > 3) {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			if (this.lastLoginAttempt && this.lastLoginAttempt > fiveMinutesAgo) {
				this.updateState({
					error: 'Too many login attempts. Please try again later.'
				});
				
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
		
		this.updateState({ isLoading: true, error: null });
		
		// Use DbService to simulate API call
		DbService.login({ email, password })
			.then(() => {
				// Simulate API call
				setTimeout(() => {
					// Check if user exists in localStorage (for simulation)
					const users = JSON.parse(localStorage.getItem('auth_users') || '[]');
					const user = users.find((u: any) => u.email === email);
					
					if (user && user.password === password) {
						// Login successful
						const userData: UserData = {
							id: user.id,
							username: user.username,
							email: user.email,
							authMethod: AuthMethod.EMAIL,
							lastLogin: new Date()
						};
						
						// Set current user
						this.setCurrentUser(userData);
						
						// Log successful login
						console.log('Auth: Login successful', {
							userId: user.id,
							username: user.username,
							email: user.email
						});
						
						// Update last login in the database
						DbService.updateUser(parseInt(user.id), {
							last_login: new Date()
						});
						
						// Update component state
						this.updateState({
							isLoading: false
						});
						
						// Switch to success state
						this.switchToSuccessState();
					} else {
						// Login failed
						console.warn('Auth: Login failed', {
							email,
							reason: user ? 'Invalid password' : 'User not found'
						});
						
						this.updateState({
							isLoading: false,
							error: 'Invalid email or password'
						});
					}
				}, 100);
			})
			.catch(error => {
				console.error('Auth: Login error', error);
				this.updateState({
					isLoading: false,
					error: 'Authentication failed. Please try again.'
				});
			});
	}
}
