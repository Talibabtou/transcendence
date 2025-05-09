import { html, render } from '@website/scripts/utils';

/**
 * Hashes a password using SHA-256
 * @param password Plain text password
 * @returns Hashed password (hex string)
 */
export async function hashPassword(password: string): Promise<string> {
	// Convert password string to array buffer
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	
	// Hash the password using SHA-256
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	
	// Convert hash to hex string
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	
	return hashHex;
}

/**
 * Validates password requirements based on schema requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * @param password Plain text password
 * @returns Validation result {valid: boolean, message: string}
 */
export function validatePassword(password: string): {valid: boolean, message: string} {
	if (!password || password.length < 8) {
		return {
			valid: false,
			message: 'Password must be at least 8 characters long'
		};
	}

	const hasUpperCase = /[A-Z]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasDigit = /\d/.test(password);

	if (!hasUpperCase) {
		return {
			valid: false,
			message: 'Password must contain at least one uppercase letter'
		};
	}

	if (!hasLowerCase) {
		return {
			valid: false,
			message: 'Password must contain at least one lowercase letter'
		};
	}

	if (!hasDigit) {
		return {
			valid: false,
			message: 'Password must contain at least one digit'
		};
	}

	return {
		valid: true,
		message: 'Password is valid'
	};
}

export class PasswordStrengthComponent {
	private container: HTMLElement;
	private password: string = '';
	private strengthBar: HTMLDivElement | null = null;
	private requirementsList: HTMLUListElement | null = null;
	
	constructor(container: HTMLElement) {
		this.container = container;
		this.initializeDOM();
	}
	
	/**
	 * Creates the initial DOM structure
	 */
	private initializeDOM(): void {
		// Create the basic structure once
		const strengthContainer = document.createElement('div');
		strengthContainer.className = 'password-strength';
		
		const barContainer = document.createElement('div');
		barContainer.className = 'password-strength-bar';
		
		this.strengthBar = document.createElement('div');
		this.strengthBar.className = 'password-strength-fill';
		barContainer.appendChild(this.strengthBar);
		
		this.requirementsList = document.createElement('ul');
		this.requirementsList.className = 'password-requirements';
		
		strengthContainer.appendChild(barContainer);
		strengthContainer.appendChild(this.requirementsList);
		
		// Clear and add to container
		this.container.innerHTML = '';
		this.container.appendChild(strengthContainer);
		
		// Initial render
		this.updateUI();
	}
	
	/**
	 * Updates the password value and re-renders
	 */
	updatePassword(password: string): void {
		this.password = password;
		this.updateUI();
	}
	
	/**
	 * Updates just the UI components without replacing the entire DOM
	 */
	private updateUI(): void {
		if (!this.strengthBar || !this.requirementsList) return;
		
		const validations = [
			{
				label: 'At least 8 characters',
				valid: this.password.length >= 8
			},
			{
				label: 'Contains uppercase letter',
				valid: /[A-Z]/.test(this.password)
			},
			{
				label: 'Contains lowercase letter',
				valid: /[a-z]/.test(this.password)
			},
			{
				label: 'Contains a number',
				valid: /[0-9]/.test(this.password)
			}
		];
		
		// Calculate strength percentage
		const validCount = validations.filter(v => v.valid).length;
		const strengthPercentage = Math.min(100, Math.round((validCount / validations.length) * 100));
		
		const strengthClass = 
			strengthPercentage < 25 ? 'very-weak' :
			strengthPercentage < 50 ? 'weak' :
			strengthPercentage < 75 ? 'medium' :
			strengthPercentage < 100 ? 'strong' : 'very-strong';
		
		// Update strength bar - this will transition smoothly
		this.strengthBar.style.width = `${strengthPercentage}%`;
		
		// Update class but preserve existing classes
		this.strengthBar.className = 'password-strength-fill';
		this.strengthBar.classList.add(strengthClass);
		
		// Update requirements list
		this.requirementsList.innerHTML = '';
		validations.forEach(v => {
			const li = document.createElement('li');
			li.className = v.valid ? 'valid' : 'invalid';
			
			const indicator = document.createElement('span');
			indicator.style.color = v.valid ? 'var(--win-color)' : 'var(--loss-color)';
			indicator.textContent = v.valid ? '✓' : '✗';
			
			li.appendChild(indicator);
			li.append(` ${v.label}`);
			
			if (this.requirementsList) {
				this.requirementsList.appendChild(li);
			}
		});
	}
}
