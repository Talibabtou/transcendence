import { ASCII_ART, hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { DbService, html, connectAuthenticatedWebSocket, NotificationManager } from '@website/scripts/services';
import { AuthMethod, UserData } from '@website/types';

export class RegistrationHandler {
	private passwordStrength: PasswordStrengthComponent | null = null;

	constructor(
		private updateState: (state: any) => void,
		private setCurrentUser: (user: UserData | null, token?: string) => void,
		private switchToSuccessState: () => void
	) {}

	/**
	 * Renders the registration form
	 */
	renderRegisterForm(switchToLogin: () => void): any {
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
					<input type="text" id="username" name="username" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required 
						   autocomplete="new-password" 
						   onInput=${(e: Event) => this.handlePasswordInput(e.target as HTMLInputElement)}
						   onFocus=${(e: Event) => this.initializePasswordStrength(e.target as HTMLInputElement)} />
					<div id="password-strength-container"></div>
				</div>
				
				<button type="submit" class="menu-button">Create Account</button>
			</form>
			
			<div class="auth-links">
				<a href="#" onClick=${(e: Event) => {
					e.preventDefault();
					switchToLogin();
				}}>Back to login</a>
			</div>
		`;
	}

	/**
	 * Initialize password strength component
	 */
	private initializePasswordStrength(passwordInput: HTMLInputElement): void {
		if (!this.passwordStrength) {
			const form = passwordInput.closest('form');
			if (form) {
				const container = form.querySelector('#password-strength-container');
				if (container) {
					// false for simplified: show requirements text
					this.passwordStrength = new PasswordStrengthComponent(container as HTMLElement, false); 
				}
			}
		}
	}

	/**
	 * Handle password input to update strength indicator
	 */
	handlePasswordInput(passwordInput: HTMLInputElement): void {
		const password = passwordInput.value;
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword(password);
		}
	}

	/**
	 * Reset form and password strength component
	 */
	private resetForm(form: HTMLFormElement): void {
		const inputs = form.querySelectorAll('input');
		inputs.forEach(input => {
			input.value = '';
		});
		form.reset();
		
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword('');
		}
		this.passwordStrength = null; 
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
			NotificationManager.showError('Please fill in all fields');
			return;
		}
		
		// Validate password requirements
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			NotificationManager.showError(passwordValidation.message);
			return;
		}
		
		this.updateState({ isLoading: true });
		
		try {
			const hashedPassword = await hashPassword(password);
			
			// Step 1: Register the user
			const registerResponse = await DbService.register({ 
				username, 
				email, 
				password: hashedPassword 
			});
			
			if (!registerResponse.success || !registerResponse.user) {
				this.updateState({ isLoading: false });
				NotificationManager.showError('Registration failed. Please try again.');
				return;
			}
			
			// Step 2: Login the user after successful registration
			const loginResponse = await DbService.login({
				email,
				password: hashedPassword
			});
			
			if (loginResponse.success && loginResponse.user && loginResponse.token) {
				const userFromDb = loginResponse.user;
				const token = loginResponse.token;
				
				// Construct UserData for AuthManager/appState
				const userData: UserData = {
					id: userFromDb.id,
					username: userFromDb.username,
					email: userFromDb.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date()
				};
				
				this.setCurrentUser(userData, token);
				this.resetForm(form);
				
				// Initialize WebSocket connection using centralized function
				connectAuthenticatedWebSocket(token);

				this.updateState({ isLoading: false });
				NotificationManager.showSuccess('Account created successfully');
				this.switchToSuccessState();
			} else {
				this.updateState({ isLoading: false });
				NotificationManager.showWarning('Account created but login failed. Please try logging in manually.');
			}
		} catch (error) {
			this.updateState({ isLoading: false });
			NotificationManager.handleError(error);
		}
	}
}
