import { Component, LoginHandler, RegistrationHandler } from '@website/scripts/components';
import { html, render, navigate } from '@website/scripts/services';
import { AuthState, AuthComponentState, UserData, IAuthComponent } from '@website/types';
import { appState } from '@website/scripts/utils';

export class AuthManager extends Component<AuthComponentState> implements IAuthComponent {
	// =========================================
	// PROPERTIES
	// =========================================
	
	private currentUser: UserData | null = null;
	private activeToken?: string;
	private stateChangeTimeout: number | null = null;
	private persistSession: boolean = true;
	private closeButton: HTMLButtonElement | null = null;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement, redirectTarget?: 'game' | 'profile', persistSession: boolean = false) {
		super(container, {
			currentState: AuthState.LOGIN,
			isLoading: false,
			error: null,
			redirectTarget: redirectTarget || 'profile'
		});
		
		this.updateInternalState({ redirectTarget: redirectTarget || 'profile' });
		
		this.persistSession = persistSession;
		
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
	// STATE MANAGEMENT
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
			// No need to call specific cleanupComponents on handlers if they are recreated
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
		
		// Dispatch the event - after cleanup is complete
		const cancelEvent = new CustomEvent('auth-cancelled', {
			bubbles: true,
			detail: { timestamp: Date.now() }
		});
		
		// Dispatch with a small delay to ensure proper event handling
		setTimeout(() => {
			document.dispatchEvent(cancelEvent);
		}, 10);
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
			return html`<div class="auth-processing"></div>`;
		}
		
		const setUserAndTokenCallback = (user: UserData | null, token?: string) => {
			this.currentUser = user;
			this.activeToken = token;
			if (!user) {
				this.activeToken = undefined;
			}
		};

		switch (state.currentState) {
			case AuthState.LOGIN:
				// The updateInternalState callback will trigger a full re-render
				return new LoginHandler(
					(newState) => {
						this.updateInternalState({...newState});
						// Force a re-render when state changes
						setTimeout(() => this.render(), 0);
					},
					setUserAndTokenCallback,
					this.handleSuccessfulAuth.bind(this)
				).renderLoginForm(
					this.persistSession,
					(value) => this.persistSession = value,
					() => this.switchState(AuthState.REGISTER)
				);
			case AuthState.REGISTER:
				return new RegistrationHandler(
					this.updateInternalState.bind(this),
					setUserAndTokenCallback,
					this.handleSuccessfulAuth.bind(this)
				).renderRegisterForm(
					() => this.switchState(AuthState.LOGIN)
				);
			default:
				// Fallback to login, create a new LoginHandler instance
				return new LoginHandler(
					this.updateInternalState.bind(this),
					setUserAndTokenCallback,
					this.handleSuccessfulAuth.bind(this)
				).renderLoginForm(
					this.persistSession,
					(value) => this.persistSession = value,
					() => this.switchState(AuthState.REGISTER)
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
		if (!this.currentUser) {
			console.error("AuthManager: handleSuccessfulAuth called with no currentUser.");
			return;
		}
		if (!this.activeToken) {
			// This case should ideally not happen for email/password or new OAuth flows if token is always passed.
			// Could happen if checkExistingSession calls this without a token.
			// For now, let's log if it's missing during an active auth flow.
			console.warn("AuthManager: handleSuccessfulAuth called with no activeToken. User might not be fully logged into appState.");
		}
		
		// Prepare the user object for appState.login.
		// appState.login expects a simpler user object (id, username, etc.)
		// and will enrich it with theme from localStorage.
		const userForAppState = {
			id: this.currentUser.id,
			username: this.currentUser.username,
			email: this.currentUser.email
			// Any other fields appState's `login` method's `user` parameter expects
		};

		appState.login(userForAppState, this.activeToken, this.persistSession);
		
		this.destroy();
		
		const targetPath = this.getInternalState().redirectTarget === 'game' ? '/game' : '/profile';
		navigate(targetPath);
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
		if (this.closeButton) {
			this.closeButton.removeEventListener('click', () => this.cancelAuth());
			this.closeButton = null;
		}
		if (this.container) {
			this.container.innerHTML = '';
			this.container.className = '';
		}
		super.destroy();
	}
}
