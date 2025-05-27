import { User } from './user';

/**
 * Define the possible authentication states
 */
export enum AuthState {
	LOGIN = 'login',
	REGISTER = 'register',
	SUCCESS = 'success',
	TWOFA = 'twofa'
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

// Auth API response
export interface AuthResponse {
	success: boolean;
	user: User;
	token: string;
	refreshToken?: string;
	requires2FA?: boolean;
}

/**
 * Common interface for authentication components
 */
export interface IAuthComponent {
	show(): void;
	hide(): void;
	destroy(): void;
	showError?(message: string): void;
}

export interface GuestAuthState {
	isRegisterMode: boolean;
	needsVerification: boolean;
}