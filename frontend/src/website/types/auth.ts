import { User } from './user';

/**
 * Define the possible authentication states
 */
export enum AuthState {
	LOGIN = 'login',
	REGISTER = 'register',
	SUCCESS = 'success'
}

/**
 * Authentication methods
 */
export enum AuthMethod {
	EMAIL = 'email',
	GOOGLE = 'google',
	FORTY_TWO = '42'
}

/**
 * Define state interface for the auth component
 */
export interface AuthComponentState {
	currentState: AuthState;
	isLoading: boolean;
	error: string | null;
	redirectTarget: string | null;
}

/**
 * User data model
 */
export interface UserData {
	id: string;
	username: string;
	email: string;
	avatar?: string;
	authMethod?: AuthMethod;
	lastLogin?: Date;
	persistent?: boolean;
}

/**
 * OAuth provider configuration
 */
export interface OAuthConfig {
	clientId: string;
	redirectUri: string;
	authEndpoint: string;
	tokenEndpoint: string;
	scope: string;
	responseType: string;
}

// Auth API response
export interface AuthResponse {
	success: boolean;
	user: User;
	token: string;
	refreshToken?: string;
	requires2FA?: boolean;
}

// OAuth request parameters
export interface OAuthRequest {
	provider: string;
	code: string;
	redirectUri: string;
	state?: string;
}

// OAuth configuration for providers
export const OAUTH_CONFIG: Record<AuthMethod, OAuthConfig> = {
	[AuthMethod.GOOGLE]: {
		clientId: 'google-client-id', // Replace with actual client ID in production
		redirectUri: `${window.location.origin}/auth/callback/google`,
		authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenEndpoint: 'https://oauth2.googleapis.com/token',
		scope: 'email profile',
		responseType: 'code'
	},
	[AuthMethod.FORTY_TWO]: {
		clientId: '42-client-id', // Replace with actual client ID in production
		redirectUri: `${window.location.origin}/auth/callback/42`,
		authEndpoint: 'https://api.intra.42.fr/oauth/authorize',
		tokenEndpoint: 'https://api.intra.42.fr/oauth/token',
		scope: 'public',
		responseType: 'code'
	},
	[AuthMethod.EMAIL]: {
		clientId: '',
		redirectUri: '',
		authEndpoint: '',
		tokenEndpoint: '',
		scope: '',
		responseType: ''
	}
};

/**
 * Common interface for authentication components
 */
export interface IAuthComponent {
	show(): void;
	hide(): void;
	destroy(): void;
}

export interface GuestAuthState {
	error: string | null;
	isRegisterMode: boolean;
}