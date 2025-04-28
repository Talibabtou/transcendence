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
	historyPage: number;
	historyPageSize: number;
	historyIsLoading: boolean;
	tabsLoading: {
		summary: boolean;
		stats: boolean;
		history: boolean;
		friends: boolean;
		settings: boolean;
	};
	matchesCache: Map<number, any>;
}

/**
 * Leaderboard component state interface
 */
export interface LeaderboardState {
	leaderboardData: LeaderboardEntry[];
	isLoading: boolean;
	errorMessage?: string;
}
