import { ErrorCodes } from '@shared/constants/error.const';
import { AuthComponentState, AuthMethod, UserData } from '@website/types';
import { DbService, html, NotificationManager, VNode } from '@website/scripts/services';
import { ASCII_ART, hashPassword, validatePassword, PasswordStrengthComponent, sanitizeUsername } from '@website/scripts/utils';

export class RegistrationHandler {
	private passwordStrength: PasswordStrengthComponent | null = null;

	constructor(
		private updateState: (state: AuthComponentState) => void,
		private setCurrentUser: (user: UserData | null, token?: string) => void,
		private switchToSuccessState: () => void
	) {}

	/**
	 * Renders the registration form
	 */
	renderRegisterForm(switchToLogin: () => void): VNode {
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
					<input type="text" id="username" name="username" required autocomplete="off" maxlength="20" />
					<span class="field-hint">Max 20 characters. "-", "_" and "." are allowed.</span>
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
		if (this.passwordStrength) return;
		
		const form = passwordInput.closest('form');
		if (!form) return;
		
		const container = form.querySelector('#password-strength-container');
		if (container) {
			this.passwordStrength = new PasswordStrengthComponent(container as HTMLElement, false);
		}
	}

	/**
	 * Handle password input to update strength indicator
	 */
	handlePasswordInput(passwordInput: HTMLInputElement): void {
		if (this.passwordStrength) {
			this.passwordStrength.updatePassword(passwordInput.value);
		}
	}

	/**
	 * Reset form and password strength component
	 */
	private resetForm(form: HTMLFormElement): void {
		form.querySelectorAll('input').forEach(input => input.value = '');
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
		const rawUsername = formData.get('username') as string;
		let email = (formData.get('email') as string).toLowerCase();
		const password = formData.get('password') as string;
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		
		if (!rawUsername || !email || !password) {
			NotificationManager.showError('Please fill in all fields');
			return;
		}
		
		if (!emailRegex.test(email)) {
			NotificationManager.showError('Please enter a valid email address');
			return;
		}
		
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			NotificationManager.showError(passwordValidation.message);
			return;
		}
		
		// Sanitize username
		const username = sanitizeUsername(rawUsername);
		
		if (username.length < 3) {
			NotificationManager.showError('Username must be at least 3 characters');
			return;
		}
		
		this.updateState({ isLoading: true });
		
		try {
			const hashedPassword = await hashPassword(password);
			const registerResponse = await DbService.register({ username, email, password: hashedPassword });
			
			if (!registerResponse.success || !registerResponse.user) {
				this.updateState({ isLoading: false });
				NotificationManager.showError('Registration failed. Please try again.');
				return;
			}
			
			const loginResponse = await DbService.login({ email, password: hashedPassword });
			
			if (loginResponse.success && loginResponse.user && loginResponse.token) {
				const userData: UserData = {
					id: loginResponse.user.id,
					username: loginResponse.user.username,
					email: loginResponse.user.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date()
				};
				
				this.setCurrentUser(userData, loginResponse.token);
				this.resetForm(form);
				this.updateState({ isLoading: false });
				NotificationManager.showSuccess('Account created successfully');
				this.switchToSuccessState();
			} else {
				this.updateState({ isLoading: false });
				NotificationManager.showWarning('Account created but login failed. Please try logging in manually.');
			}
		} catch (error) {
			this.updateState({ isLoading: false });
			
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.SQLITE_CONSTRAINT) {
					NotificationManager.showError('This email is already registered');
				} else if (errorCode === ErrorCodes.INVALID_FIELDS) {
					NotificationManager.showError('Invalid registration information');
				} else {
					NotificationManager.handleError(error);
				}
			} else {
				NotificationManager.handleError(error);
			}
		}
	}
}
