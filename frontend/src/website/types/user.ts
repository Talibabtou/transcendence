import { GameHistoryEntry } from '@website/types';

// Main user model
export interface User {
	id: string;
	theme?: string;
	pfp?: string;
	username: string;
	last_login?: Date;
	created_at: Date;
	email?: string;
	auth_method?: string;
	password?: string;
	elo?: number;
}

// Friendship relationship
export interface Friend {
	user_id: string;
	friend_id: string;
	created_at: Date;
}

// User profile for frontend display
export interface UserProfile {
	id: string;
	username: string;
	avatarUrl: string;
	totalGames: number;
	wins: number;
	losses: number;
	gameHistory: GameHistoryEntry[];
	friends: FriendProfile[];
	preferences: {
		accentColor: string;
	};
	elo?: number;
	twoFactorEnabled?: boolean;
}

// Friend display for UI
export interface FriendProfile {
	id: string;
	username: string;
	avatarUrl: string;
	lastLogin?: Date;
}

// Define available accent colors
export type AccentColor = 'white' | 'blue' | 'green' | 'purple' | 'pink' | 'orange' | 'yellow' | 'cyan' | 'teal' | 'lime' | 'red';

// Available accent colors with their hex values
export const ACCENT_COLORS: Record<AccentColor, string> = {
	'white': '#ffffff',
	'blue': '#3498db',
	'green': '#2ecc71',
	'purple': '#9b59b6',
	'pink': '#e84393',
	'orange': '#e67e22',
		'yellow': '#f1c40f',
		'cyan': '#00bcd4',
		'teal': '#009688',
		'lime': '#cddc39',
		'red': '#e74c3c'
	};