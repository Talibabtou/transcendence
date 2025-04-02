/**
 * Game-related data models
 */

// Match record in database
export interface Match {
	id: number;
	player_1: number;
	player_2: number;
	completed?: boolean;
	duration?: number;
	timeout?: boolean;
	tournament_id?: number;
	created_at: Date;
}

// Goal record in database
export interface Goal {
	id: number;
	match_id: number;
	player: number;
	duration: number;
	created_at: Date;
	hash: string;
}

/**
 * Single game history entry
 */
export interface GameHistoryEntry {
	id: string;
	date: Date;
	opponent: string;
	playerScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
}

/**
 * Leaderboard entry for a player's ranking
 */
export interface LeaderboardEntry {
	id: number;
	rank: number;
	username: string;
	elo: number;
	wins: number;
	losses: number;
}

/**
 * Define possible game modes
 */
export enum GameMode {
	SINGLE = 'single',
	MULTI = 'multi',
	TOURNAMENT = 'tournament',
	BACKGROUND_DEMO = 'background_demo'
}

/**
 * Define state interface
 */
export interface GameMenuState {
	visible: boolean;
	isAuthenticated: boolean;
}

/**
 * Player data interface
 */
export interface PlayerData {
	id: number;
	username: string;
	pfp: string;
	isConnected: boolean;
	theme?: string;
	elo?: number;
}

/**
 * Players register component state
 */
export interface PlayersRegisterState {
	gameMode: GameMode;
	host: PlayerData | null;
	guests: PlayerData[];
	isReadyToPlay: boolean;
	error: string | null;
}

/**
 * Game over component state interface
 */
export interface GameOverState {
	visible: boolean;
	winner: string;
	gameMode: GameMode;
	matchId: number | null;
	player1Name: string;
	player2Name: string;
	player1Score: number;
	player2Score: number;
}