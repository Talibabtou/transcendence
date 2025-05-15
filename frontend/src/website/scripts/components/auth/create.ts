import { html, ASCII_ART, DbService, ApiError, hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { AuthMethod, UserData } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

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
						   onInput=${(e: Event) => this.handlePasswordInput(e)}
						   onFocus=${() => this.initializePasswordStrength()} />
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
	 * Initialize password strength component
	 */
	private initializePasswordStrength(): void {
		if (!this.passwordStrength) {
			const container = document.getElementById('password-strength-container');
			if (container) {
				this.passwordStrength = new PasswordStrengthComponent(container);
			}
		}
	}

	/**
	 * Handle password input to update strength indicator
	 */
	handlePasswordInput(e: Event): void {
		const input = e.target as HTMLInputElement;
		const password = input.value;
		
		// Update password strength indicator
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword(password);
		}
	}

	/**
	 * Reset form and password strength component
	 */
	private resetForm(): void {
		const form = document.querySelector('.auth-form') as HTMLFormElement;
		if (form) {
			form.reset();
		}
		if (this.passwordStrength) {
			this.passwordStrength = null;
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
			const hashedPassword = await hashPassword(password);
			
			const response = await DbService.register({ 
				username, 
				email, 
				password: hashedPassword 
			});
			
			if (response.success && response.user && response.token) {
				const userFromDb = response.user;
				const token = response.token;
				
				// Construct UserData for AuthManager/appState
				const userData: UserData = {
					id: userFromDb.id,
					username: userFromDb.username,
					email: userFromDb.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date()
				};
				
				this.setCurrentUser(userData, token);
				this.resetForm();
				
				this.updateState({ isLoading: false });
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
