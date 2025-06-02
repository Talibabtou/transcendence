import { IReplyGetFriend } from '@shared/types/friends.types';
import { UserProfile, LeaderboardEntry, PlayerData, AccentColor, GameMode } from '@website/types';
import { Friend } from '@website/scripts/components/profile/tabs/friends';

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
	final: boolean;
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

/**
 * Profile stats component state interface
 */
export interface ProfileStatsState {
	isLoading: boolean;
	eloChartRendered: boolean;
	matchDurationChartRendered: boolean;
	dailyActivityChartRendered: boolean;
	goalDurationChartRendered: boolean;
	profile?: any;
	playerStats?: any;
	cleanup?: {
		eloChart?: () => void;
		matchDurationChart?: () => void;
		dailyActivityChart?: () => void;
		goalDurationChart?: () => void;
	};
	dataLoadInProgress: boolean;
}

export interface GameCanvasState {
	visible: boolean;
	isPlaying: boolean;
	isPaused: boolean;
}

export enum GameState {
	MENU = 'menu',
	PLAYER_REGISTRATION = 'player_registration',
	TOURNAMENT = 'tournament',
	PLAYING = 'playing',
	GAME_OVER = 'game_over'
}

export interface GameComponentState {
	currentState: GameState;
	currentMode: GameMode;
	playerIds?: string[];
	playerNames?: string[];
	playerColors?: string[];
	tournamentId?: string;
	isFinal?: boolean;
}

export enum Route {
	GAME = 'game',
	LEADERBOARD = 'leaderboard',
	PROFILE = 'profile',
	AUTH = 'auth'
}

export interface TournamentTransitionsState {
	visible: boolean;
	phase: TournamentPhase;
	currentScreen: 'schedule' | 'winner';
}

export interface TournamentPlayer {
	id: string;
	name: string;
	color: string;
	wins: number;
	gamesWon: number;
	gamesLost: number;
}

export interface TournamentMatch {
	player1Index: number;
	player2Index: number;
	gamesPlayed: number;
	games: {
		winner: number;
		player1Score: number;
		player2Score: number;
		matchId?: string;
	}[];
	winner?: number;
	completed: boolean;
	isCurrent?: boolean;
	isFinals: boolean;
}

export type TournamentPhase = 'pool' | 'finals' | 'complete';

export interface ProfileFriendsState {
	profile: UserProfile | null;
	friends: IReplyGetFriend[];
	pendingFriends: Friend[];
	acceptedFriends: IReplyGetFriend[];
	isLoading: boolean;
	isCurrentUser: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
		onFriendRequestAccepted?: () => void;
		onFriendRequestRefused?: () => void;
	};
	dataLoadInProgress: boolean;
	currentUserId: string;
}
