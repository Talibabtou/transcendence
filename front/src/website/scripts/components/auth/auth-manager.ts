/**
 * Auth Manager
 * Central manager for authentication
 */
import { Component, LoginHandler, RegistrationHandler, GoogleAuthHandler, FortyTwoAuthHandler } from '@website/scripts/components';
import { html, render, navigate } from '@website/scripts/utils';
import { AuthState, AuthMethod, AuthComponentState, UserData, IAuthComponent } from '@shared/types';
import { appState } from '@website/scripts/utils';

export class AuthManager extends Component<AuthComponentState> implements IAuthComponent {
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
	
	// Close button reference
	private closeButton: HTMLButtonElement | null = null;
	
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
			this.handleSuccessfulAuth.bind(this)
		);
		
		this.registrationHandler = new RegistrationHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.handleSuccessfulAuth.bind(this)
		);
		
		this.googleAuthHandler = new GoogleAuthHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.handleSuccessfulAuth.bind(this)
		);
		
		this.fortyTwoAuthHandler = new FortyTwoAuthHandler(
			this.updateInternalState.bind(this),
			this.setCurrentUser.bind(this),
			this.handleSuccessfulAuth.bind(this)
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
			this.updateInternalState({ isLoading: true });
			
			try {
				const stateData = JSON.parse(atob(state));
				const provider = stateData.provider;
				
				if (provider === AuthMethod.GOOGLE) {
					this.googleAuthHandler.simulateOAuthLogin();
				} else if (provider === AuthMethod.FORTY_TWO) {
					this.fortyTwoAuthHandler.simulateOAuthLogin();
				}
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
	 * Cancels the authentication process and dispatches an event
	 */
	private cancelAuth(): void {
		// First clean up to prevent any lingering elements
		this.destroy();
		
		// Then dispatch the event - after cleanup is complete
		const cancelEvent = new CustomEvent('auth-cancelled', {
			bubbles: true,
			detail: { timestamp: Date.now() }
		});
		document.dispatchEvent(cancelEvent);
	}
	
	// =========================================
	// RENDERING
	// =========================================
	
	render(): void {
		this.container.className = 'auth-container';
		
		const template = html`
			<div class="auth-form-container">
				<button class="auth-close-button" onClick=${() => this.cancelAuth()}>✕</button>
				${this.renderAuthContent()}
				${this.getInternalState().error ? html`
					<div class="register-error shake">${this.getInternalState().error}</div>
				` : ''}
			</div>
		`;
		
		render(template, this.container);
		this.closeButton = this.container.querySelector('.auth-close-button');
	}
	
	/**
	 * Renders the appropriate content based on the current auth state
	 */
	private renderAuthContent(): any {
		const state = this.getInternalState();
		
		// For success state, always show success message regardless of loading state
		if (state.currentState === AuthState.SUCCESS) {
			return this.renderSuccessMessage();
		}
		
		// For other states, only show loading indicator if needed
		if (state.isLoading) {
			// We could completely remove this and provide no visual feedback during loading
			// or keep a minimal indication that something is happening
			return html`<div class="auth-processing"></div>`;
		}
		
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
	protected renderSuccessMessage(): any {
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
	protected handleSuccessfulAuth(): void {
		if (!this.currentUser) return;
		
		// Use AppState to login
		appState.login(this.currentUser, undefined, this.persistSession);
		
		// Clean up and redirect immediately
		this.destroy();
		
		// Redirect based on origin using router navigation
		if (this.redirectAfterAuth === 'game') {
			navigate('/game');
		} else {
			navigate('/profile');
		}
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
		// Remove close button event listener if it exists
		if (this.closeButton) {
			this.closeButton.removeEventListener('click', () => this.cancelAuth());
			this.closeButton = null;
		}
		
		// Ensure component is properly removed from DOM
		if (this.container) {
			this.container.innerHTML = '';
			this.container.className = '';
		}
		
		// Clean up event listeners and call parent's destroy
		super.destroy();
	}
}
