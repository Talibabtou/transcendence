/**
 * Game-related data models
 */

// Match record in database
export interface Match {
	id: number;
	player_1: number;
	player_2: number;
	completed: boolean;
	duration?: number;
	timeout: boolean;
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
	rank: number;
	username: string;
	elo: number;
	wins: number;
	losses: number;
}
