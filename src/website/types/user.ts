import { GameHistoryEntry } from '@website/types';

// Main user model
export interface User {
	id: string;
	theme?: string;
	pfp?: string;
	pseudo: string;
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
}

// Friend display for UI
export interface FriendProfile {
	id: string;
	username: string;
	avatarUrl: string;
	lastLogin?: Date;
}
