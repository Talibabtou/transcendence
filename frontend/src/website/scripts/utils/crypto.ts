import { html, render, NotificationManager } from '@website/scripts/services';

/** Password validation criteria */
interface PasswordValidation {
	valid: boolean;
	message: string;
}

/** Password requirement */
interface Requirement {
	label: string;
	valid: boolean;
	test: (password: string) => boolean;
}

// Define password requirements once to avoid duplication
const PASSWORD_REQUIREMENTS: Requirement[] = [
	{
		label: 'Contains uppercase letter',
		test: (password) => /[A-Z]/.test(password),
		valid: false
	},
	{
		label: 'At least 8 characters',
		test: (password) => password.length >= 8,
		valid: false
	},
	{
		label: 'Contains lowercase letter',
		test: (password) => /[a-z]/.test(password),
		valid: false
	},
	{
		label: 'Contains a number',
		test: (password) => /\d/.test(password),
		valid: false
	}
];

/**
 * Hashes a password using SHA-256
 * @param password Plain text password
 * @returns Hashed password (hex string)
 */
export async function hashPassword(password: string): Promise<string> {
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	} catch (error) {
		NotificationManager.handleError(error);
		throw new Error('Password hashing failed');
	}
}

/**
 * Validates password requirements based on schema requirements
 * @param password The password to validate
 * @returns An object with the validity of the password and a message
 */
export function validatePassword(password: string): PasswordValidation {
	if (!password || password.length < 8) {
		return { valid: false, message: 'Password must be at least 8 characters long' };
	}

	if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
	if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter' };
	if (!/\d/.test(password)) return { valid: false, message: 'Password must contain at least one digit' };

	return { valid: true, message: 'Password is valid' };
}

/**
 * Component for visualizing password strength with requirements
 */
export class PasswordStrengthComponent {
	private container: HTMLElement;
	private password: string = '';
	private strengthBar: HTMLElement | null = null;
	private requirementsList: HTMLElement | null = null;
	private simplified: boolean = false;
	
	/**
	 * Creates a new password strength component
	 * @param container HTML element to render the component in
	 * @param simplified Whether to show a simplified version (no requirements list)
	 */
	constructor(container: HTMLElement, simplified: boolean = false) {
		this.container = container;
		this.simplified = simplified;
		this.render();
	}
	
	/**
	 * Renders the component template and initializes DOM references
	 */
	private render(): void {
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
		
		try {
			render(template, this.container);
			this.strengthBar = this.container.querySelector('.password-strength-fill');
			this.requirementsList = this.simplified ? null : this.container.querySelector('.password-requirements');
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Updates the password and refreshes the component
	 * @param password The password to update
	 */
	updatePassword(password: string): void {
		this.password = password;
		this.updateStrengthBar();
		if (!this.simplified) this.updateRequirements();
	}
	
	/**
	 * Updates the strength bar based on password requirements
	 */
	private updateStrengthBar(): void {
		if (!this.strengthBar) return;
		
		try {
			const validCount = PASSWORD_REQUIREMENTS
				.map(req => req.test(this.password))
				.filter(Boolean).length;
			
			const strengthPercentage = Math.min(100, Math.round((validCount / PASSWORD_REQUIREMENTS.length) * 100));
			
			const strengthClass = 
				strengthPercentage < 25 ? 'very-weak' :
				strengthPercentage < 50 ? 'weak' :
				strengthPercentage < 75 ? 'medium' :
				strengthPercentage < 100 ? 'strong' : 'very-strong';
			
			this.strengthBar.className = `password-strength-fill ${strengthClass}`;
			this.strengthBar.style.width = `${strengthPercentage}%`;
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Updates the requirements list with password validation status
	 */
	private updateRequirements(): void {
		if (!this.requirementsList) return;
		
		try {
			const validations = PASSWORD_REQUIREMENTS.map(req => ({
				...req,
				valid: req.test(this.password)
			}));
			
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
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
}

/**
 * Sanitizes a username by removing all special characters except underscore and hyphen
 * @param username The raw username input
 * @returns Sanitized username
 */
export function sanitizeUsername(username: string): string {
	let sanitized = username.toLowerCase();
	sanitized = sanitized.replace(/[^a-z0-9_-]/g, '');
	sanitized = sanitized.substring(0, 20);
	return sanitized;
}

/**
 * Escapes HTML special characters to prevent XSS attacks when displaying user-generated content
 * @param str The string to escape
 * @returns HTML-escaped string safe for rendering
 */
export function escapeHtml(str: string): string {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
