/**
 * Database Service Module
 * Provides interfaces and methods for interacting with the application database.
 * Handles data retrieval, updates, and API communication for persistent storage.
 */

// =========================================
// DATA MODELS & TYPES
// =========================================

/**
 * Database schema interfaces
 */
export interface User {
	id: number;
	theme?: string;
	pfp?: string;
	human: boolean;
	pseudo: string;
	last_login?: Date;
	created_at: Date;
}

export interface Friend {
	user_id: number;
	friend_id: number;
	created_at: Date;
}

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

export interface Goal {
	id: number;
	match_id: number;
	player: number;
	duration: number;
	created_at: Date;
	hash: string;
}

// =========================================
// DATABASE SERVICE
// =========================================

/**
 * Service class for handling database operations
 * Currently mocks API calls for development purposes
 */
export class DbService {
	// =========================================
	// USER OPERATIONS
	// =========================================
	
	/**
	 * Retrieves user information by ID
	 * @param id - The user's ID
	 */
	static getUser(id: number): void {
		this.logRequest('GET', `/api/users/${id}`);
	}

	/**
	 * Updates user information
	 * @param userId - The user's ID
	 * @param userData - Object containing user data to update
	 */
	static updateUser(userId: number, userData: Partial<User>): void {
		this.logRequest('PUT', `/api/users/${userId}`, userData);
	}

	/**
	 * Updates user preferences
	 * @param userId - The user's ID
	 * @param preferences - Object containing user preferences
	 */
	static updateUserPreferences(userId: number, preferences: Record<string, any>): void {
		this.logRequest('PUT', `/api/users/${userId}/preferences`, preferences);
	}

	// =========================================
	// FRIEND OPERATIONS
	// =========================================
	
	/**
	 * Retrieves friend list for a user
	 * @param userId - The user's ID
	 */
	static getUserFriends(userId: number): void {
		this.logRequest('GET', `/api/users/${userId}/friends`);
	}

	// =========================================
	// MATCH OPERATIONS
	// =========================================
	
	/**
	 * Retrieves match history for a specific user
	 * @param userId - The user's ID
	 */
	static getUserMatches(userId: number): void {
		this.logRequest('GET', `/api/users/${userId}/matches`);
	}

	/**
	 * Creates a new match between two players
	 * @param player1Id - First player's ID
	 * @param player2Id - Second player's ID
	 * @param tournamentId - Optional tournament ID
	 */
	static createMatch(player1Id: number, player2Id: number, tournamentId?: number): void {
		const matchData: Partial<Match> = {
			player_1: player1Id,
			player_2: player2Id,
			tournament_id: tournamentId
		};
		this.logRequest('POST', '/api/matches', matchData);
	}

	/**
	 * Records a goal in a match
	 * @param matchId - The match ID
	 * @param playerId - The scoring player's ID
	 * @param duration - Time of goal in seconds from match start
	 * @param hash - The hash of the goal
	 */
	static scoreGoal(matchId: number, playerId: number, duration: number, hash: string): void {
		const goalData: Partial<Goal> = {
			match_id: matchId,
			player: playerId,
			duration,
			hash: hash
		};
		this.logRequest('POST', '/api/goals', goalData);
	}

	/**
	 * Marks a match as completed
	 * @param matchId - The match ID
	 * @param duration - Match duration in seconds
	 */
	static completeMatch(matchId: number, duration: number): void {
		const updateData = {
			completed: true,
			duration
		};
		this.logRequest('PUT', `/api/matches/${matchId}`, updateData);
	}

	/**
	 * Records a goal in a match
	 * @param matchId - The match ID
	 * @param playerId - The scoring player's ID
	 * @param duration - Time of goal in seconds from match start
	 */
	static recordGoal(matchId: number, playerId: number, duration: number): void {
		const goalData: Partial<Goal> = {
			match_id: matchId,
			player: playerId,
			duration,
			created_at: new Date()
		};
		this.logRequest('POST', '/api/goals', goalData);
	}

	// =========================================
	// STATISTICS & LEADERBOARD
	// =========================================
	
	/**
	 * Retrieves statistics for a user
	 * @param userId - The user's ID
	 */
	static getUserStats(userId: number): void {
		this.logRequest('GET', `/api/users/${userId}/stats`);
	}

	/**
	 * Retrieves global leaderboard data
	 */
	static getLeaderboard(): void {
		this.logRequest('GET', '/api/leaderboard');
	}

	// =========================================
	// UTILITY METHODS
	// =========================================
	
	/**
	 * Helper method to standardize API request logging
	 * @param method - HTTP method
	 * @param endpoint - API endpoint
	 * @param body - Optional request body
	 */
	private static logRequest(method: string, endpoint: string, body?: any): void {
		console.log('DB REQUEST: ' + method + ' ' + endpoint, {
			method,
			endpoint,
			...(body && { body })
		});
	}
}
