import { GameHistoryEntry } from '@shared/types';

/**
 * User-related data models
 */

// Main user model
export interface User {
	id: number;
	theme?: string;
	pfp?: string;
	human: boolean;
	pseudo: string;
	last_login?: Date;
	created_at: Date;
	email?: string;
	auth_method?: string;
}

// Friendship relationship
export interface Friend {
	user_id: number;
	friend_id: number;
	created_at: Date;
}

// User profile for frontend display (can extend User if needed)
export interface UserProfile {
	id: string;
	username: string;
	avatarUrl: string;
	level: number;
	experience: number;
	totalGames: number;
	wins: number;
	losses: number;
	gameHistory: GameHistoryEntry[];
	friends: FriendProfile[];
	preferences: {
		accentColor: string;
	};
}

// Friend display for UI
export interface FriendProfile {
	id: number;
	username: string;
	avatarUrl: string;
	lastLogin?: Date;
}
