/**
 * Google Auth Module
 * Handles Google OAuth authentication
 */
import { DbService } from '@website/scripts/utils';
import { AuthMethod, OAUTH_CONFIG, UserData } from '@shared/types';

export class GoogleAuthHandler {
	constructor(
		private updateState: (state: any) => void,
		private setCurrentUser: (user: UserData | null) => void,
		private switchToSuccessState: () => void
	) {}

	/**
	 * Initiates Google OAuth flow
	 */
	initiateOAuthLogin(): void {
		this.initiateGenericOAuth(AuthMethod.GOOGLE);
	}

	/**
	 * Generic OAuth flow for Google
	 */
	private initiateGenericOAuth(method: AuthMethod): void {
		// Get provider config
		const config = OAUTH_CONFIG[method];
		
		// Generate a state parameter for security (prevents CSRF)
		const state = btoa(JSON.stringify({
			provider: method,
			timestamp: Date.now(),
			nonce: Math.random().toString(36).substring(2)
		}));
		
		// In a real implementation, we would redirect to the OAuth provider
		// For simulation, we'll just log the URL and simulate the flow
		const authUrl = new URL(config.authEndpoint);
		authUrl.searchParams.append('client_id', config.clientId);
		authUrl.searchParams.append('redirect_uri', config.redirectUri);
		authUrl.searchParams.append('response_type', config.responseType);
		authUrl.searchParams.append('scope', config.scope);
		authUrl.searchParams.append('state', state);
		
		// Use DbService to simulate API call
		DbService.oauthLogin({
			provider: method,
			code: 'simulated_code',
			redirectUri: config.redirectUri,
			state
		})
		.then(() => {
			this.updateState({ isLoading: true });
			this.simulateOAuthLogin();
		})
		.catch(error => {
			console.error('Auth: OAuth initiation error', error);
			this.updateState({
				isLoading: false,
				error: `Failed to connect with ${method}. Please try again.`
			});
		});
	}

	/**
	 * Simulates a successful Google OAuth login (for development)
	 */
	simulateOAuthLogin(): void {
		// Simulate API call with the provider
		DbService.oauthLogin({
			provider: 'google',
			code: 'simulated-google-code',
			redirectUri: window.location.origin
		})
		.then(response => {
			if (response.success && response.user) {
				const user = response.user;
				
				// Create user data
				const userData: UserData = {
					id: String(user.id),
					username: user.pseudo || `GoogleUser_${user.id}`,
					email: user.email || `google_user_${user.id}@example.com`,
					avatar: user.pfp,
					authMethod: AuthMethod.GOOGLE,
					lastLogin: user.last_login ? new Date(user.last_login) : new Date()
				};
				
				// Set the current user
				this.setCurrentUser(userData);
				
				// Switch to success state
				this.switchToSuccessState();
			} else {
				this.updateState({
					isLoading: false,
					error: 'Google authentication failed'
				});
			}
		})
		.catch(error => {
			console.error('OAuth Error:', error);
			this.updateState({
				isLoading: false,
				error: 'Google authentication failed'
			});
		});
	}
}
