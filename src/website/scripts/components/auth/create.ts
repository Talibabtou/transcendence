/**
 * Create Account Module
 * Handles user registration functionality
 */
import { html, ASCII_ART, DbService } from '@website/scripts/utils';
import { AuthMethod, UserData } from '@shared/types';

export class RegistrationHandler {
	constructor(
		private updateState: (state: any) => void,
		private setCurrentUser: (user: UserData | null) => void,
		private switchToSuccessState: () => void
	) {}

	/**
	 * Renders the registration form
	 */
	renderRegisterForm(switchToLogin: () => void, 
					  initiateGoogleAuth: () => void, initiate42Auth: () => void): any {
		return html`
			<div class="ascii-title-container">
				<pre class="ascii-title">${ASCII_ART.REGISTER}</pre>
			</div>
			
			<form class="auth-form" onSubmit=${(e: Event) => {
				e.preventDefault();
				this.handleRegister(e.target as HTMLFormElement);
			}}>
				<div class="form-group">
					<label for="username">Username:</label>
					<input type="text" id="username" name="username" required />
				</div>
				
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required />
				</div>
				
				<button type="submit" class="menu-button">Create Account</button>
			</form>
			
			<div class="auth-social-options">
				<button 
					class="menu-button auth-social-button google-auth"
					onClick=${() => initiateGoogleAuth()}
				>
					Sign up with Google
				</button>
				
				<button 
					class="menu-button auth-social-button forty-two-auth"
					onClick=${() => initiate42Auth()}
				>
					Sign up with 42
				</button>
			</div>
			
			<div class="auth-links">
				<a href="#" onClick=${(e: Event) => {
					e.preventDefault();
					switchToLogin();
				}}>Back to login</a>
			</div>
		`;
	}

	/**
	 * Handles user registration
	 */
	handleRegister(form: HTMLFormElement): void {
		const formData = new FormData(form);
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (!username || !email || !password) {
			this.updateState({
				error: 'Please fill in all fields'
			});
			return;
		}
		
		// Log registration attempt
		console.log('Auth: Registration attempt', {
			username,
			email
		});
		
		this.updateState({ isLoading: true, error: null });
		
		// Use DbService to simulate API call
		DbService.register({ username, email, password })
			.then(() => {
				// Simulate API call
				setTimeout(() => {
					// Check if email already exists
					const users = JSON.parse(localStorage.getItem('auth_users') || '[]');
					const existingUser = users.find((u: any) => u.email === email);
					
					if (existingUser) {
						console.warn('Auth: Registration failed - Email exists', {
							email
						});
						
						this.updateState({
							isLoading: false,
							error: 'Email already registered'
						});
						return;
					}
					
					// Create new user
					const userId = `user_${Date.now()}`;
					const newUser = {
						id: userId,
						username,
						email,
						password,
						authMethod: AuthMethod.EMAIL,
						createdAt: new Date().toISOString(),
						lastLogin: new Date()
					};
					
					// Save to localStorage (for simulation)
					users.push(newUser);
					localStorage.setItem('auth_users', JSON.stringify(users));
					
					// Log successful registration
					console.log('Auth: Registration successful', {
						userId,
						username,
						email
					});
					
					// Create user in the database
					DbService.createUser({
						id: parseInt(userId),
						pseudo: username,
						human: true,
						created_at: new Date(),
						last_login: new Date()
					});
					
					// Set current user without password
					const userData: UserData = {
						id: newUser.id,
						username: newUser.username,
						email: newUser.email,
						authMethod: AuthMethod.EMAIL,
						lastLogin: new Date()
					};
					
					this.setCurrentUser(userData);
					
					// Update component state
					this.updateState({
						isLoading: false
					});
					
					// Switch to success state
					this.switchToSuccessState();
				}, 100);
			})
			.catch(error => {
				console.error('Auth: Registration error', error);
				this.updateState({
					isLoading: false,
					error: 'Registration failed. Please try again.'
				});
			});
	}
}
