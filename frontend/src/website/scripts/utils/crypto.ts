import { html, render } from '@website/scripts/services';

/**
 * Hashes a password using SHA-256
 * @param password Plain text password
 * @returns Hashed password (hex string)
 */
export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates password requirements based on schema requirements
 * @param password The password to validate
 * @returns An object with the validity of the password and a message
 */
export function validatePassword(password: string): {valid: boolean, message: string} {
	if (!password || password.length < 8) return { valid: false, message: 'Password must be at least 8 characters long' };
	const hasUpperCase = /[A-Z]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasDigit = /\d/.test(password);
	if (!hasUpperCase) return { valid: false, message: 'Password must contain at least one uppercase letter' };
	if (!hasLowerCase) return { valid: false, message: 'Password must contain at least one lowercase letter' };
	if (!hasDigit) return { valid: false, message: 'Password must contain at least one digit' };
	return { valid: true, message: 'Password is valid' };
}

export class PasswordStrengthComponent {
	private container: HTMLElement;
	private password: string = '';
	private strengthBar: HTMLElement | null = null;
	private requirementsList: HTMLElement | null = null;
	private simplified: boolean = false;

	constructor(container: HTMLElement, simplified: boolean = false) {
		this.container = container;
		this.simplified = simplified;
		this.initializeStaticStructure();
	}

	/**
	 * Initializes the static structure of the password strength component
	 */
	private initializeStaticStructure(): void {
		const template = html`
			<div class="password-strength">
				<div class="password-strength-bar">
					<div class="password-strength-fill"></div>
				</div>
				${!this.simplified ? html`
				<ul class="password-requirements">
					<li><span>✗</span>An uppercase</li>
					<li><span>✗</span>8 characters</li>
					<li><span>✗</span>A lowercase</li>
					<li><span>✗</span>A number</li>
				</ul>
				` : ''}
			</div>
		`;
		render(template, this.container);
		this.strengthBar = this.container.querySelector('.password-strength-fill');
		this.requirementsList = this.simplified ? null : this.container.querySelector('.password-requirements');
	}
	
	/**
	 * Updates the password and the strength bar
	 * @param password The password to update
	 */
	updatePassword(password: string): void {
		this.password = password;
		this.updateStrengthBar();
		if (!this.simplified) this.updateRequirements();
	}
	
	/**
	 * Updates the strength bar
	 */
	private updateStrengthBar(): void {
		if (!this.strengthBar) return;
		const validations = [
			this.password.length >= 8,
			/[A-Z]/.test(this.password),
			/[a-z]/.test(this.password),
			/[0-9]/.test(this.password)
		];
		const validCount = validations.filter(v => v).length;
		const strengthPercentage = Math.min(100, Math.round((validCount / validations.length) * 100));
		const strengthClass = 
			strengthPercentage < 25 ? 'very-weak' :
			strengthPercentage < 50 ? 'weak' :
			strengthPercentage < 75 ? 'medium' :
			strengthPercentage < 100 ? 'strong' : 'very-strong';
		this.strengthBar.className = `password-strength-fill ${strengthClass}`;
		this.strengthBar.style.width = `${strengthPercentage}%`;
	}
	
	/**
	 * Updates the requirements list
	 */
	private updateRequirements(): void {
		if (!this.requirementsList) return;
		const validations = [
			{ label: 'Contains uppercase letter', valid: /[A-Z]/.test(this.password) },
			{ label: 'At least 8 characters', valid: this.password.length >= 8 },
			{ label: 'Contains lowercase letter', valid: /[a-z]/.test(this.password) },
			{ label: 'Contains a number', valid: /[0-9]/.test(this.password) }
		];
		const items = this.requirementsList.children;
		validations.forEach((validation, index) => {
			const item = items[index] as HTMLElement;
			if (!item) return;
			item.className = validation.valid ? 'valid' : 'invalid';
			const span = item.querySelector('span');
			if (span) {
				span.textContent = validation.valid ? '✓' : '✗';
				span.style.color = validation.valid ? 'var(--win-color)' : 'var(--loss-color)';
			}
		});
	}
}
