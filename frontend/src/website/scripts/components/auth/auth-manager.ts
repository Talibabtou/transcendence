import { appState } from '@website/scripts/utils';
import { html, render, navigate, NotificationManager } from '@website/scripts/services';
import { AuthState, AuthComponentState, UserData, IAuthComponent } from '@website/types';
import { Component, LoginHandler, RegistrationHandler } from '@website/scripts/components';

export class AuthManager extends Component<AuthComponentState> implements IAuthComponent {
	private currentUser: UserData | null = null;
	private activeToken?: string;
	private stateChangeTimeout: number | null = null;
	private persistSession: boolean = true;
	private closeButton: HTMLButtonElement | null = null;
	
	/**
	 * Creates a new authentication manager component
	 * @param container - The HTML element to render the component into
	 * @param redirectTarget - Where to redirect after successful authentication
	 * @param persistSession - Whether to persist the session across browser restarts
	 */
	constructor(container: HTMLElement, redirectTarget?: 'game' | 'profile', persistSession: boolean = false) {
		super(container, {
			currentState: AuthState.LOGIN,
			isLoading: false,
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
		const storedUser = this.persistSession 
			? localStorage.getItem('auth_user') 
			: sessionStorage.getItem('auth_user');
		if (storedUser) {
			try {
				this.currentUser = JSON.parse(storedUser);
				if (this.currentUser) {
					this.handleSuccessfulAuth();
					return;
				}
			} catch (error) {
				NotificationManager.showError('Failed to parse stored user data: ' + error);
				localStorage.removeItem('auth_user');
				sessionStorage.removeItem('auth_user');
			}
		}
	}
	
	// =========================================
	// RENDERING
	// =========================================
	
	/**
	 * Renders the auth component into its container
	 */
	render(): void {
		this.container.className = 'auth-container';
		const template = html`
			<div class="auth-form-container">
				<button class="auth-close-button" onClick=${() => this.cancelAuth()}>✕</button>
				${this.renderAuthContent()}
			</div>
		`;
		render(template, this.container);
		this.closeButton = this.container.querySelector('.auth-close-button');
	}
	
	/**
	 * Renders the appropriate content based on the current auth state
	 * @returns The HTML template for the current auth state
	 */
	private renderAuthContent(): any {
		const state = this.getInternalState();
		if (state.currentState === AuthState.SUCCESS) return this.renderSuccessMessage();
		if (state.isLoading) return html`<div class="auth-processing"></div>`;
		const setUserAndTokenCallback = (user: UserData | null, token?: string) => {
			this.currentUser = user;
			this.activeToken = token;
			if (!user) this.activeToken = undefined;
		};
		switch (state.currentState) {
			case AuthState.LOGIN:
				return new LoginHandler(
					(newState) => {
						this.updateInternalState({...newState});
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
	 * @returns The HTML template for the success message
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
	
	// =========================================
	// STATE MANAGEMENT
	// =========================================
	
	/**
	 * Switches to a different auth state with debouncing
	 * @param newState - The auth state to switch to
	 */
	private switchState(newState: AuthState): void {
		if (this.stateChangeTimeout !== null) clearTimeout(this.stateChangeTimeout);
		this.stateChangeTimeout = window.setTimeout(() => {
			this.updateInternalState({
				currentState: newState
			});
			this.stateChangeTimeout = null;
		}, 100);
	}
	
	/**
	 * Handles successful authentication
	 */
	protected handleSuccessfulAuth(): void {
		if (!this.currentUser) {
			NotificationManager.showError("AuthManager: handleSuccessfulAuth called with no currentUser.");
			return;
		}
		if (!this.activeToken) NotificationManager.showError("Authentication may be incomplete. Token is missing.");
		const userForAppState = {
			id: this.currentUser.id,
			username: this.currentUser.username,
			email: this.currentUser.email
		};
		appState.login(userForAppState, this.activeToken, this.persistSession);
		this.destroy();
		const targetPath = this.getInternalState().redirectTarget === 'game' ? '/game' : '/profile';
		navigate(targetPath);
	}
	
	/**
	 * Cancels the authentication process and dispatches an event
	 */
	private cancelAuth(): void {
		this.destroy();
		const cancelEvent = new CustomEvent('auth-cancelled', {
			bubbles: true,
			detail: { timestamp: Date.now() }
		});
		setTimeout(() => {
			document.dispatchEvent(cancelEvent);
		}, 10);
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
	
	/**
	 * Cleans up resources used by this component
	 */
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
