import { UserProfile, LeaderboardEntry } from '@shared/types';

/**
 * Profile component state interface
 */
export interface ProfileState {
	profile: UserProfile | null;
	isLoading: boolean;
	isEditing: boolean;
	activeTab: string;
	errorMessage?: string;
	initialized: boolean;
}

/**
 * Leaderboard component state interface
 */
export interface LeaderboardState {
	leaderboardData: LeaderboardEntry[];
	isLoading: boolean;
	errorMessage?: string;
}
