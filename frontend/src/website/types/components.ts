import { UserProfile, LeaderboardEntry, PlayerData, AccentColor } from '@website/types';

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

// Define the app state interface
export interface AppState {
	auth: {
			isAuthenticated: boolean;
			user: any | null;
			jwtToken: string | null;
	};
	accentColor: AccentColor;
	accentColors: {
		accent1: string;
		accent2: string;
		accent3: string;
		accent4: string;
	};
	players: {
		[playerId: string]: PlayerData;
	};
}