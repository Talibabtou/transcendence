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
		// Log OAuth initiation
		console.log('Auth: Initiating Google OAuth flow');
		
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
		
		// Log the OAuth URL (for debugging)
		console.log('Auth: Google OAuth URL', {
			url: authUrl.toString()
		});
		
		// Use DbService to simulate API call
		DbService.oauthLogin({
			provider: method,
			code: 'simulated_code',
			redirectUri: config.redirectUri,
			state
		})
		.then(() => {
			// For simulation, we'll skip the actual redirect and simulate the callback
			this.updateState({ isLoading: true });
			
			// Simulate OAuth flow completion after a delay
			setTimeout(() => {
				this.simulateOAuthLogin();
			}, 2000);
		})
		.catch(error => {
			console.error('Auth: Google OAuth initiation error', error);
			this.updateState({
				isLoading: false,
				error: 'Failed to connect with Google. Please try again.'
			});
		});
	}

	/**
	 * Simulates a successful Google OAuth login (for development)
	 */
	simulateOAuthLogin(): void {
		// Google user details
		const username = 'GoogleUser';
		const email = 'google.user@example.com';
		const provider = 'Google';
		const avatar = 'https://ui-avatars.com/api/?name=Google+User&background=random';
		
		// Generate a unique ID for this user
		const userId = `${provider.toLowerCase()}_user_${Date.now()}`;
		
		// Create user object
		const userData: UserData = {
			id: userId,
			username,
			email,
			avatar,
			authMethod: AuthMethod.GOOGLE,
			lastLogin: new Date()
		};
		
		// Set current user
		this.setCurrentUser(userData);
		
		// Log successful OAuth login
		console.log('Auth: Google OAuth login successful', {
			userId,
			username,
			email
		});
		
		// Check if this OAuth user already exists
		const users = JSON.parse(localStorage.getItem('auth_users') || '[]');
		const existingUser = users.find((u: any) => 
			u.email === email && u.authMethod === AuthMethod.GOOGLE
		);
		
		if (!existingUser) {
			// This is a new OAuth user, create them
			const newUser = {
				id: userId,
				username,
				email,
				avatar,
				authMethod: AuthMethod.GOOGLE,
				createdAt: new Date().toISOString(),
				lastLogin: new Date()
			};
			
			// Save to localStorage (for simulation)
			users.push(newUser);
			localStorage.setItem('auth_users', JSON.stringify(users));
			
			// Create user in the database
			DbService.createUser({
				id: parseInt(userId),
				pseudo: username,
				pfp: avatar,
				human: true,
				created_at: new Date(),
				last_login: new Date()
			});
			
			console.log('Auth: Created new Google OAuth user', {
				userId,
				username
			});
		} else {
			// Update existing user's last login
			DbService.updateUser(parseInt(existingUser.id), {
				last_login: new Date()
			});
			
			console.log('Auth: Updated existing Google OAuth user', {
				userId: existingUser.id,
				username: existingUser.username
			});
		}
		
		// Update component state
		this.updateState({
			isLoading: false
		});
		
		// Switch to success state
		this.switchToSuccessState();
	}
}
