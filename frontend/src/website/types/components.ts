import { IReplyGetFriend } from '@shared/types/friends.types';
import { Friend } from '@website/scripts/components/profile/tabs/friends';
import { UserProfile, LeaderboardEntry, PlayerData, AccentColor, GameMode } from '@website/types';

/**
 * Profile component state interface
 */
export interface ProfileState {
	profile: UserProfile | null;
	isLoading: boolean;
	isEditing: boolean;
	activeTab: string;
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
	matchesCache: Map<number, ProcessedMatch>;
	currentProfileId: string | null;
	friendshipStatus?: any;
	pendingFriends: any[];
	isUserOnline?: boolean;
}

/**
 * Profile history component state interface
 */
export interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	allMatches: ProcessedMatch[];
	matches: ProcessedMatch[];
	isLoading: boolean;
	hasMoreMatches: boolean;
	dataLoadInProgress: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}

/**
 * Processed match interface for match history
 */
export interface ProcessedMatch {
	id: string;
	date: Date;
	opponent: string;
	opponentId: string;
	playerScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
	finals: boolean;
}

/**
 * Profile history component state interface
 */
export interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	allMatches: ProcessedMatch[];
	matches: ProcessedMatch[];
	isLoading: boolean;
	hasMoreMatches: boolean;
	dataLoadInProgress: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}

/**
 * Processed match interface for match history
 */
export interface ProcessedMatch {
	id: string;
	date: Date;
	opponent: string;
	opponentId: string;
	playerScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
}

/**
 * Profile history component state interface
 */
export interface ProfileHistoryState {
	profile: UserProfile | null;
	historyPage: number;
	historyPageSize: number;
	allMatches: ProcessedMatch[];
	matches: ProcessedMatch[];
	isLoading: boolean;
	hasMoreMatches: boolean;
	dataLoadInProgress: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}

/**
 * Processed match interface for match history
 */
export interface ProcessedMatch {
	id: string;
	date: Date;
	opponent: string;
	opponentId: string;
	playerScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
}

/**
 * Leaderboard component state interface
 */
export interface LeaderboardState {
	leaderboardData: LeaderboardEntry[];
	isLoading: boolean;
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

export interface ProfileSettingsState {
	profile: UserProfile | null;
	isUploading: boolean;
	uploadSuccess: boolean;
	saveSuccess: boolean;
	noChangesMessage: string | null;
	is2FALoading?: boolean;
	formData: {
		username: string;
		email: string;
		password: string;
		confirmPassword: string;
	};
	formErrors: {
		username?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
		form?: string;
		twoFA?: string;
	};
}