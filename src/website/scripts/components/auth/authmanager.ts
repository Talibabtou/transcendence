/**
 * Auth Manager
 * Central manager for authentication
 */
import { Component, LoginHandler, RegistrationHandler, GoogleAuthHandler, FortyTwoAuthHandler } from '@website/scripts/components';
import { html, render, navigate } from '@website/scripts/utils';
import { AuthState, AuthMethod, AuthComponentState, UserData } from '@shared/types';
import { appState } from '@website/scripts/utils/app-state';

export class AuthManager extends Component<AuthComponentState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private currentUser: UserData | null = null;
	private redirectAfterAuth: 'game' | 'profile' = 'profile';
	
	// Add debouncing for state changes
	private stateChangeTimeout: number | null = null;
	
	// Add a session persistence option
	private persistSession: boolean = false;
	
	// Module handlers
	private loginHandler: LoginHandler;
	private registrationHandler: RegistrationHandler;
	private googleAuthHandler: GoogleAuthHandler;
	private fortyTwoAuthHandler: FortyTwoAuthHandler;
	
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
		
		// Initialize handlers
		this.loginHandler = new LoginHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.switchToSuccessState.bind(this)
		);
		
		this.registrationHandler = new RegistrationHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.switchToSuccessState.bind(this)
		);
		
		this.googleAuthHandler = new GoogleAuthHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.switchToSuccessState.bind(this)
		);
		
		this.fortyTwoAuthHandler = new FortyTwoAuthHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.switchToSuccessState.bind(this)
		);
		
		// Check if user is already logged in
		this.checkExistingSession();
		
		// Check for OAuth callback in URL
		this.handleOAuthCallback();
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
					// Log the session restoration
					console.log('Auth: Restored session for user', {
						userId: this.currentUser.id,
						username: this.currentUser.username,
						authMethod: this.currentUser.authMethod || 'unknown',
						persistent: this.persistSession
					});
					
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
	
	/**
	 * Handles OAuth callback from external providers
	 */
	private handleOAuthCallback(): void {
		// Check if we have a code parameter in the URL (OAuth callback)
		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get('code');
		const state = urlParams.get('state');
		const error = urlParams.get('error');
		
		if (error) {
			console.error('OAuth Error:', error);
			this.updateInternalState({
				error: `Authentication failed: ${error}`
			});
			return;
		}
		
		if (code && state) {
			// We have an OAuth callback
			this.updateInternalState({ isLoading: true });
			
			// Parse the state to determine the provider
			try {
				const stateData = JSON.parse(atob(state));
				const provider = stateData.provider;
				
				console.log('Auth: Processing OAuth callback', {
					provider,
					code: code.substring(0, 10) + '...' // Log partial code for debugging
				});
				
				// In a real app, we would exchange the code for a token
				// For simulation, we'll create a fake user based on the provider
				setTimeout(() => {
					if (provider === AuthMethod.GOOGLE) {
						this.googleAuthHandler.simulateOAuthLogin();
					} else if (provider === AuthMethod.FORTY_TWO) {
						this.fortyTwoAuthHandler.simulateOAuthLogin();
					}
				}, 500);
			} catch (e) {
				console.error('Failed to parse OAuth state', e);
				this.updateInternalState({
					isLoading: false,
					error: 'Invalid authentication response'
				});
			}
		}
	}
	
	// =========================================
	// STATE MANAGEMENT
	// =========================================
	
	/**
	 * Sets the current user
	 */
	private setCurrentUser(user: UserData | null): void {
		this.currentUser = user;
	}
	
	/**
	 * Switches to the success state
	 */
	private switchToSuccessState(): void {
		console.log('Switching to success state');
		this.switchState(AuthState.SUCCESS);
		
		// Ensure redirection happens after a delay
		setTimeout(() => {
			console.log('Success state timeout triggered');
			this.handleSuccessfulAuth();
		}, 2000); // Slightly longer delay to ensure the success message is seen
	}
	
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
	
	// =========================================
	// RENDERING
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
				return this.loginHandler.renderLoginForm(
					this.persistSession,
					(value) => this.persistSession = value,
					() => this.switchState(AuthState.REGISTER),
					() => this.googleAuthHandler.initiateOAuthLogin(),
					() => this.fortyTwoAuthHandler.initiateOAuthLogin()
				);
			case AuthState.REGISTER:
				return this.registrationHandler.renderRegisterForm(
					() => this.switchState(AuthState.LOGIN),
					() => this.googleAuthHandler.initiateOAuthLogin(),
					() => this.fortyTwoAuthHandler.initiateOAuthLogin()
				);
			case AuthState.SUCCESS:
				return this.renderSuccessMessage();
			default:
				return this.loginHandler.renderLoginForm(
					this.persistSession,
					(value) => this.persistSession = value,
					() => this.switchState(AuthState.REGISTER),
					() => this.googleAuthHandler.initiateOAuthLogin(),
					() => this.fortyTwoAuthHandler.initiateOAuthLogin()
				);
		}
	}
	
	/**
	 * Renders a success message after authentication
	 */
	private renderSuccessMessage(): any {
		console.log('Rendering success message');
		
		// Set a timeout to trigger redirection
		setTimeout(() => {
			console.log('Success message timeout triggered, calling handleSuccessfulAuth');
			this.handleSuccessfulAuth();
		}, 1500);
		
		return html`
			<div class="auth-success">
				<h2>Authentication Successful</h2>
				<p>Welcome back, ${this.currentUser?.username || 'User'}!</p>
				<p>Redirecting you...</p>
			</div>
		`;
	}
	
	/**
	 * Handles successful authentication
	 */
	private handleSuccessfulAuth(): void {
		if (!this.currentUser) return;
		
		// Use AppState to login
		appState.login(this.currentUser, undefined, this.persistSession);
		
		// Clean up the auth component
		setTimeout(() => {
			this.destroy();
			
			// Redirect based on origin using router navigation
			console.log('Redirecting to', this.redirectAfterAuth === 'game' ? '/game' : '/profile');
			if (this.redirectAfterAuth === 'game') {
				navigate('/game');
			} else {
				navigate('/profile');
			}
		}, 1500);
	}
	
	// =========================================
	// PUBLIC METHODS
	// =========================================
	
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
	
	destroy(): void {
		// Ensure component is properly removed from DOM
		if (this.container) {
			this.container.innerHTML = '';
			this.container.className = '';
		}
		
		// Clean up event listeners and call parent's destroy
		super.destroy();
	}
}

