// Match record in database
export interface Match {
	id: string;
	player_1: string;
	player_2: string;
	completed?: boolean;
	duration?: number;
	timeout?: boolean;
	tournament_id?: string;
	final?: boolean;
	created_at: Date;
}

// Goal record in database
export interface Goal {
	id: string;
	match_id: string;
	player: string;
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
	player: string;
	rank: number;
	username: string;
	elo: number;
	victories: number;
	defeats: number;
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
	id: string;
	username: string;
	pfp: string;
	isConnected: boolean;
	theme?: string;
	elo?: number;
	position?: number;
}

/**
 * Players register component state
 */
export interface PlayersRegisterState {
	gameMode: GameMode;
	host: PlayerData | null;
	guests: PlayerData[];
	isReadyToPlay: boolean;
}

/**
 * Game over component state interface
 */
export interface GameOverState {
	visible: boolean;
	winner: string;
	gameMode: GameMode;
	matchId: string | null;
	player1Name: string;
	player2Name: string;
	player1Score: number;
	player2Score: number;
	isTimeout: boolean;
}