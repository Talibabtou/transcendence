import { AuthMethod, UserData } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import { ASCII_ART, hashPassword, validatePassword, PasswordStrengthComponent } from '@website/scripts/utils';
import { DbService, html, connectAuthenticatedWebSocket, NotificationManager } from '@website/scripts/services';

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
					<input pattern="^[A-Za-z0-9_]{3,}$" minlength="3" type="text" id="username" name="username" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required autocomplete="off" />
					<input type="email" id="email" name="email" required autocomplete="off" />
				</div>
				
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required 
						   autocomplete="new-password" 
						   onInput=${(e: Event) => this.handlePasswordInput(e.target as HTMLInputElement)}
						   onFocus=${(e: Event) => this.initializePasswordStrength(e.target as HTMLInputElement)} />
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
	private initializePasswordStrength(passwordInput: HTMLInputElement): void {
		if (!this.passwordStrength) {
			const form = passwordInput.closest('form');
			if (form) {
				const container = form.querySelector('#password-strength-container');
				if (container) this.passwordStrength = new PasswordStrengthComponent(container as HTMLElement, false); 
			}
		}
	}

	/**
	 * Handle password input to update strength indicator
	 */
	handlePasswordInput(passwordInput: HTMLInputElement): void {
		const password = passwordInput.value;
		if (this.passwordStrength) this.passwordStrength.updatePassword(password);
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
		if (this.passwordStrength) this.passwordStrength.updatePassword('');
		this.passwordStrength = null; 
	}

	/**
	 * Handles user registration
	 */
	async handleRegister(form: HTMLFormElement): Promise<void> {
		const formData = new FormData(form);
		let username = formData.get('username') as string;
		username = username.toLowerCase();
		let email = formData.get('email') as string;
		email = email.toLowerCase();
		const password = formData.get('password') as string;
		const emailRegex = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z]{2,}$/;
		if (!username || !email || !password) {
			NotificationManager.handleErrorCode('required_field', 'Please fill in all fields');
			NotificationManager.handleErrorCode('required_field', 'Please fill in all fields');
			return;
		}
		if (!emailRegex.test(email)) {
				NotificationManager.handleErrorCode('invalid_email', 'Please enter a valid email address');
				return;
		}
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			NotificationManager.handleErrorCode('password_too_short', passwordValidation.message);
			NotificationManager.handleErrorCode('password_too_short', passwordValidation.message);
			return;
		}
		this.updateState({ isLoading: true });
		try {
			const hashedPassword = await hashPassword(password);
			const registerResponse = await DbService.register({ 
				username, 
				email, 
				password: hashedPassword 
			});
			if (!registerResponse.success || !registerResponse.user) {
				this.updateState({ isLoading: false });
				NotificationManager.handleErrorCode('operation_failed', 'Registration failed. Please try again.');
				return;
			}
			const loginResponse = await DbService.login({
				email,
				password: hashedPassword
			});
			if (loginResponse.success && loginResponse.user && loginResponse.token) {
				const userFromDb = loginResponse.user;
				const token = loginResponse.token;
				const userData: UserData = {
					id: userFromDb.id,
					username: userFromDb.username,
					email: userFromDb.email || email,
					authMethod: AuthMethod.EMAIL,
					lastLogin: new Date()
				};
				this.setCurrentUser(userData, token);
				this.resetForm(form);
				connectAuthenticatedWebSocket(token);
				this.updateState({ isLoading: false });
				NotificationManager.showSuccess('Account created successfully');
				NotificationManager.showSuccess('Account created successfully');
				this.switchToSuccessState();
			} else {
				this.updateState({ isLoading: false });
				NotificationManager.showWarning('Account created but login failed. Please try logging in manually.');
				this.updateState({ isLoading: false });
				NotificationManager.showWarning('Account created but login failed. Please try logging in manually.');
			}
		} catch (error) {
			this.updateState({ isLoading: false });
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = error.code as string;
				if (errorCode === ErrorCodes.SQLITE_CONSTRAINT) NotificationManager.handleErrorCode('unique_constraint_email', 'This email is already registered');
				else if (errorCode === ErrorCodes.INVALID_FIELDS) NotificationManager.handleErrorCode('invalid_fields', 'Invalid registration information');
				else NotificationManager.handleErrorCode(errorCode, 'Registration failed');
			} else NotificationManager.handleError(error);
		}
	}
}
