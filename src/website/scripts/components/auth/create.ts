import { html, ASCII_ART, DbService, ApiError, hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { AuthMethod, UserData } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class RegistrationHandler {
	private passwordStrength: PasswordStrengthComponent | null = null;

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
					<input type="password" id="password" name="password" required 
						   onInput=${(e: Event) => this.handlePasswordInput(e)} />
					<div id="password-strength-container"></div>
				</div>
				
				<button type="submit" class="menu-button">Create Account</button>
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
					switchToLogin();
				}}>Back to login</a>
			</div>
		`;
	}

	/**
	 * Handle password input to update strength indicator
	 */
	handlePasswordInput(e: Event): void {
		const input = e.target as HTMLInputElement;
		const password = input.value;
		
		// Initialize password strength component if needed
		if (!this.passwordStrength) {
			const container = document.getElementById('password-strength-container');
			if (container) {
				this.passwordStrength = new PasswordStrengthComponent(container);
			}
		}
		
		// Update password strength indicator
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword(password);
		}
	}

	/**
	 * Handles user registration
	 */
	async handleRegister(form: HTMLFormElement): Promise<void> {
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
		
		// Validate password requirements
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			this.updateState({
				error: passwordValidation.message
			});
			return;
		}
		
		this.updateState({ isLoading: true, error: null });
		
		try {
			// Hash the password before sending to the server
			const hashedPassword = await hashPassword(password);
			
			// Use DbService with hashed password
			const response = await DbService.register({ 
				username, 
				email, 
				password: hashedPassword 
			});
			
			if (response.success && response.user) {
				const user = response.user;
				
				// Set current user without password
				const userData: UserData = {
					id: user.id,
					username: user.pseudo, 
					email: user.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: user.last_login ? new Date(user.last_login) : new Date()
				};
				
				this.setCurrentUser(userData);
				
				// Update component state
				this.updateState({
					isLoading: false
				});
				
				// Switch to success state
				this.switchToSuccessState();
			} else {
				this.updateState({
					isLoading: false,
					error: 'Registration failed. Please try again.'
				});
			}
		} catch (error: unknown) {
			console.error('Auth: Registration error', error);
			
			if (error instanceof ApiError) {
				// Handle specific API errors
				if (error.isErrorCode(ErrorCodes.SQLITE_CONSTRAINT)) {
					this.updateState({
						isLoading: false,
						error: 'Email or username already in use'
					});
				} else if (error.isErrorCode(ErrorCodes.INVALID_FIELDS)) {
					this.updateState({
						isLoading: false,
						error: 'Invalid registration information provided'
					});
				} else {
					this.updateState({
						isLoading: false,
						error: error.message || 'Registration failed. Please try again.'
					});
				}
			} else {
				this.updateState({
					isLoading: false,
					error: 'Registration failed. Please try again.'
				});
			}
		}
	}
}
