/**
 * Auth Component
 * Handles user authentication interface and interactions
 * Supports email/password, Google and 42 authentication
 */
import { Component } from '@website/scripts/components';
import { html, render, navigate, ASCII_ART } from '@website/scripts/utils';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Define the possible authentication states
 */
enum AuthState {
	LOGIN = 'login',
	REGISTER = 'register',
	SUCCESS = 'success'
}

/**
 * Authentication methods
 */
enum AuthMethod {
	EMAIL = 'email',
	GOOGLE = 'google',
	FORTY_TWO = '42'
}

/**
 * Define state interface for the auth component
 */
interface AuthComponentState {
	currentState: AuthState;
	isLoading: boolean;
	error: string | null;
	redirectTarget: string | null; // Where to redirect after successful auth
}

/**
 * User data model
 */
interface UserData {
	id: string;
	username: string;
	email: string;
	avatar?: string;
}

// =========================================
// AUTH COMPONENT
// =========================================

export class AuthComponent extends Component<AuthComponentState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private currentUser: UserData | null = null;
	private redirectAfterAuth: 'game' | 'profile' = 'profile';
	
	// Add debouncing for state changes
	private stateChangeTimeout: number | null = null;
	
	// Add a session persistence option
	private persistSession: boolean = false;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement, redirectTarget?: 'game' | 'profile', persistSession: boolean = false) {
		super(container, {
			currentState: AuthState.LOGIN,
			isLoading: false,
			error: null,
			redirectTarget: null
		});
		
		if (redirectTarget) {
			this.redirectAfterAuth = redirectTarget;
		}
		
		this.persistSession = persistSession;
		
		// Check if user is already logged in
		this.checkExistingSession();
	}
	
	/**
	 * Checks localStorage for existing session
	 */
	private checkExistingSession(): void {
		// Check both storage types
		const storedUser = this.persistSession 
			? localStorage.getItem('auth_user') 
			: sessionStorage.getItem('auth_user');
		
		if (storedUser) {
			try {
				this.currentUser = JSON.parse(storedUser);
				
				// If already logged in, redirect immediately
				if (this.currentUser) {
					this.handleSuccessfulAuth();
					return;
				}
			} catch (error) {
				console.error('Failed to parse stored user data', error);
				localStorage.removeItem('auth_user');
				sessionStorage.removeItem('auth_user');
			}
		}
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	render(): void {
		// Add auth-container class to the container
		this.container.className = 'auth-container';
		
		const state = this.getInternalState();
		
		// Create the template based on the current state
		let template;
		
		// Create auth form container wrapper
		template = html`
			<div class="auth-form-container">
				${this.renderAuthContent()}
				${state.error ? html`<div class="auth-error">${state.error}</div>` : ''}
			</div>
		`;
		
		// Render the template
		render(template, this.container);
	}
	
	/**
	 * Renders the appropriate content based on the current auth state
	 */
	private renderAuthContent(): any {
		const state = this.getInternalState();
		
		switch (state.currentState) {
			case AuthState.LOGIN:
				return this.renderLoginForm();
			case AuthState.REGISTER:
				return this.renderRegisterForm();
			case AuthState.SUCCESS:
				return this.renderSuccessMessage();
			default:
				return this.renderLoginForm();
		}
	}
	
	destroy(): void {
		// Ensure component is properly removed from DOM
		if (this.container) {
			this.container.innerHTML = '';
			this.container.className = '';
		}
		
		// Clean up event listeners and call parent's destroy
		super.destroy();
	}
	
	// =========================================
	// FORM RENDERING
	// =========================================
	
	/**
	 * Renders the login form
	 */
	private renderLoginForm(): any {
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
							   onChange=${(e: Event) => this.persistSession = (e.target as HTMLInputElement).checked} />
						<span>Remember me</span>
					</label>
				</div>
				
				<button type="submit" class="menu-button">Login</button>
			</form>
			
			<div class="auth-social-options">
				<button 
					class="menu-button auth-social-button google-auth"
					onClick=${() => this.handleSocialLogin(AuthMethod.GOOGLE)}
				>
					Login with Google
				</button>
				
				<button 
					class="menu-button auth-social-button forty-two-auth"
					onClick=${() => this.handleSocialLogin(AuthMethod.FORTY_TWO)}
				>
					Login with 42
				</button>
			</div>
			
			<div class="auth-links">
				<a href="#" onClick=${(e: Event) => {
					e.preventDefault();
					this.switchState(AuthState.REGISTER);
				}}>Create account</a>
			</div>
		`;
	}
	
	/**
	 * Renders the register form
	 */
	private renderRegisterForm(): any {
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
					onClick=${() => this.handleSocialLogin(AuthMethod.GOOGLE)}
				>
					Sign up with Google
				</button>
				
				<button 
					class="menu-button auth-social-button forty-two-auth"
					onClick=${() => this.handleSocialLogin(AuthMethod.FORTY_TWO)}
				>
					Sign up with 42
				</button>
			</div>
			
			<div class="auth-links">
				<a href="#" onClick=${(e: Event) => {
					e.preventDefault();
					this.switchState(AuthState.LOGIN);
				}}>Back to login</a>
			</div>
		`;
	}
	
	/**
	 * Renders a success message after authentication
	 */
	private renderSuccessMessage(): any {
		return html`
			<div class="auth-success">
				<h2>Authentication Successful</h2>
				<p>Welcome back, ${this.currentUser?.username || 'User'}!</p>
				<p>Redirecting you...</p>
			</div>
		`;
	}
	
	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Switches to a different auth state with debouncing
	 */
	private switchState(newState: AuthState): void {
		// Clear any pending state change
		if (this.stateChangeTimeout !== null) {
			clearTimeout(this.stateChangeTimeout);
		}
		
		// Debounce state changes to prevent rapid UI updates
		this.stateChangeTimeout = window.setTimeout(() => {
			this.updateInternalState({
				currentState: newState,
				error: null
			});
			this.stateChangeTimeout = null;
		}, 100);
	}
	
	/**
	 * Handles login with email/password
	 */
	private handleEmailLogin(form: HTMLFormElement): void {
		const formData = new FormData(form);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (!email || !password) {
			this.updateInternalState({
				error: 'Please enter both email and password'
			});
			return;
		}
		
		this.updateInternalState({ isLoading: true, error: null });
		
		// Simulate API call
		setTimeout(() => {
			// Check if user exists in localStorage (for simulation)
			const users = JSON.parse(localStorage.getItem('auth_users') || '[]');
			const user = users.find((u: any) => u.email === email);
			
			if (user && user.password === password) {
				// Login successful
				this.currentUser = {
					id: user.id,
					username: user.username,
					email: user.email
				};
				
				// Store in session
				localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
				
				// Update component state
				this.updateInternalState({
					isLoading: false,
					currentState: AuthState.SUCCESS
				});
				
				// Simulate redirect after a short delay
				setTimeout(() => {
					this.handleSuccessfulAuth();
				}, 1500);
			} else {
				// Login failed
				this.updateInternalState({
					isLoading: false,
					error: 'Invalid email or password'
				});
			}
		}, 1000);
	}
	
	/**
	 * Handles user registration
	 */
	private handleRegister(form: HTMLFormElement): void {
		const formData = new FormData(form);
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		
		if (!username || !email || !password) {
			this.updateInternalState({
				error: 'Please fill in all fields'
			});
			return;
		}
		
		this.updateInternalState({ isLoading: true, error: null });
		
		// Simulate API call
		setTimeout(() => {
			// Check if email already exists
			const users = JSON.parse(localStorage.getItem('auth_users') || '[]');
			const existingUser = users.find((u: any) => u.email === email);
			
			if (existingUser) {
				this.updateInternalState({
					isLoading: false,
					error: 'Email already registered'
				});
				return;
			}
			
			// Create new user
			const newUser = {
				id: `user_${Date.now()}`,
				username,
				email,
				password,
				createdAt: new Date().toISOString()
			};
			
			// Save to localStorage (for simulation)
			users.push(newUser);
			localStorage.setItem('auth_users', JSON.stringify(users));
			
			// Set current user without password
			this.currentUser = {
				id: newUser.id,
				username: newUser.username,
				email: newUser.email
			};
			
			// Store in session
			localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
			
			// Update component state
			this.updateInternalState({
				isLoading: false,
				currentState: AuthState.SUCCESS
			});
			
			// Simulate redirect after a short delay
			setTimeout(() => {
				this.handleSuccessfulAuth();
			}, 1500);
		}, 1000);
	}
	
	/**
	 * Handles social login (Google or 42)
	 */
	private handleSocialLogin(method: AuthMethod): void {
		this.updateInternalState({ isLoading: true, error: null });
		
		// In a real implementation, this would open the OAuth flow
		// For simulation, we'll just create a fake user
		
		setTimeout(() => {
			let username, email, provider;
			
			switch (method) {
				case AuthMethod.GOOGLE:
					username = 'GoogleUser';
					email = 'google.user@example.com';
					provider = 'Google';
					break;
				case AuthMethod.FORTY_TWO:
					username = '42Student';
					email = '42.student@example.com';
					provider = '42';
					break;
				default:
					username = 'User';
					email = 'user@example.com';
					provider = 'Unknown';
			}
			
			// Create user object
			this.currentUser = {
				id: `${provider.toLowerCase()}_user_${Date.now()}`,
				username,
				email,
				avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
			};
			
			// Store in session
			localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
			
			// Update component state
			this.updateInternalState({
				isLoading: false,
				currentState: AuthState.SUCCESS
			});
			
			// Simulate redirect after a short delay
			setTimeout(() => {
				this.handleSuccessfulAuth();
			}, 1500);
		}, 1500);
	}
	
	/**
	 * Handles successful authentication
	 */
	private handleSuccessfulAuth(): void {
		// Dispatch authenticated event
		const authEvent = new CustomEvent('user-authenticated', {
			detail: { 
				user: this.currentUser,
				persistent: this.persistSession
			}
		});
		document.dispatchEvent(authEvent);
		
		// Store in session or localStorage based on persistence setting
		if (this.persistSession) {
			localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
			// Remove from sessionStorage to avoid confusion
			sessionStorage.removeItem('auth_user');
		} else {
			// Use sessionStorage instead which is cleared when the browser is closed
			sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
			// Remove from localStorage to ensure it doesn't persist
			localStorage.removeItem('auth_user');
		}
		
		// Redirect based on origin using router navigation
		if (this.redirectAfterAuth === 'game') {
			navigate('/game');
		} else {
			navigate('/profile');
		}
	}
	
	/**
	 * Shows the auth component
	 */
	public show(): void {
		this.container.classList.remove('hidden');
		this.renderComponent();
	}
	
	/**
	 * Hides the auth component
	 */
	public hide(): void {
		this.container.classList.add('hidden');
	}
}
