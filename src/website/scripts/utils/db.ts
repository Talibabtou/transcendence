/**
 * Database Service Module
 * Provides interfaces and methods for interacting with the application database.
 * Handles data retrieval, updates, and API communication for persistent storage.
 */

import { User, Match, Goal, AuthCredentials, RegisterData, AuthResponse, OAuthRequest, LeaderboardEntry } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import dbTemplate from '@shared/db.json';
import { ApiError, ErrorResponse, createErrorResponse } from '@website/scripts/utils';

// =========================================
// DATABASE INITIALIZATION
// =========================================

// Database storage key in localStorage
const DB_STORAGE_KEY = 'pong_db';

// API Base URL - uncomment and adjust when switching to real backend
// const API_BASE_URL = '/api'; // or process.env.API_URL if using environment variables

// Set up the initial database structure
interface DbStructure {
	users: Array<any>;
	matches: Array<any>;
	goals: Array<any>;
	friends: Array<any>;
	meta: {
		user_id_sequence: number;
		match_id_sequence: number;
		goal_id_sequence: number;
	};
}

// Initialize the database with a defined type
let db: DbStructure;

// Function to load the database from localStorage or initialize from template
const loadDb = (): DbStructure => {
	// Try to load from localStorage first
	const storedDb = localStorage.getItem(DB_STORAGE_KEY);
	
	if (storedDb) {
		try {
			// Parse stored data
			const parsedDb = JSON.parse(storedDb);
			
			// Validate that it has the expected structure
			if (parsedDb && parsedDb.users && parsedDb.matches && parsedDb.goals && parsedDb.meta)
				return parsedDb;
		} catch (error) {
			console.error('Failed to parse stored database, reverting to template', error);
		}
	}

	return JSON.parse(JSON.stringify(dbTemplate));
};

// Initialize the database
db = loadDb();

// Function to persist the database to localStorage
const persistDb = (): void => {
	try {
		// Store the current database state to localStorage
		localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
		
		// Dispatch event with current DB state
		const event = new CustomEvent('db:updated', {
			detail: { db: JSON.parse(JSON.stringify(db)) }
		});
		window.dispatchEvent(event);
	} catch (error) {
		console.error('Failed to persist database to localStorage', error);
	}
};

// =========================================
// DATABASE SERVICE
// =========================================

/**
 * Service class for handling database operations
 * Currently uses localStorage for persistence
 * Will transition to API calls to backend
 */
export class DbService {
	// Helper method for API requests - will be used with real backend
	/*
	private static async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_BASE_URL}${endpoint}`;
		const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
		
		const headers = {
			'Content-Type': 'application/json',
			...(token ? { 'Authorization': `Bearer ${token}` } : {}),
			...options.headers
		};

		const response = await fetch(url, {
			...options,
			headers
		});

		return this.handleApiResponse<T>(response);
	}

	private static async handleApiResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData: ErrorResponse = await response.json();
			throw new ApiError(errorData);
		}
		return response.json();
	}
	*/

	// =========================================
	// AUTHENTICATION OPERATIONS
	// =========================================
	
	/**
	 * Authenticates a user with email and password
	 * @param credentials - User credentials
	 */
	static login(credentials: AuthCredentials): Promise<AuthResponse> {
		this.logRequest('POST', '/api/auth/login', {
			email: credentials.email,
			password: '********'
		});
		
		return new Promise((resolve, reject) => {
			try {
				const user = db.users.find(u => u.email === credentials.email);
				
				if (user && user.password === credentials.password) {
					const now = new Date();
					user.last_login = now.toISOString();
					persistDb();
					
					const userResponse: AuthResponse = {
						success: true,
						user: {
							id: user.id,
							pseudo: user.pseudo,
							email: user.email,
							created_at: new Date(user.created_at),
							last_login: now,
							auth_method: user.auth_method,
							theme: user.theme || '#ffffff'
						},
						token: 'mock-jwt-token'
					};
					
					resolve(userResponse);
				} else {
					reject(new ApiError(createErrorResponse(401, ErrorCodes.LOGIN_FAILURE, 'Wrong email or password')));
				}
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi<AuthResponse>('/auth/login', {
			method: 'POST',
			body: JSON.stringify(credentials)
		});

		Don't forget that there is the 2FA response case
		*/
	}

	/**
	 * Registers a new user
	 * @param userData - User registration data
	 */
	static register(userData: RegisterData): Promise<AuthResponse> {
		this.logRequest('POST', '/api/auth/register', {
			username: userData.username,
			email: userData.email,
			password: '********'
		});
		
		return new Promise((resolve, reject) => {
			try {
				// Check if email already exists
				const existingUser = db.users.find(u => u.email === userData.email);
				
				if (existingUser) {
					reject(new Error('Email already registered'));
					return;
				}
				
				// Get next user ID from sequence
				const userId = db.meta.user_id_sequence++;
				
				// Create new user
				const now = new Date();
				const newUser = {
					id: userId,
					pseudo: userData.username,
					email: userData.email,
					password: userData.password,
					auth_method: 'email',
					created_at: now.toISOString(),
					last_login: now.toISOString(),
					theme: '#ffffff'
				};
				
				// Add to users array
				db.users.push(newUser);
				
				// Persist changes
				persistDb();
				
				// Sync to legacy storage
				this.syncLegacyStorage();
				
				// Return response
				resolve({
					success: true,
					user: {
						id: userId,
						pseudo: userData.username,
						email: userData.email,
						created_at: now,
						last_login: now,
						auth_method: 'email',
						theme: '#ffffff'
					},
					token: 'mock-jwt-token'
				});
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi('/auth/register', {
			method: 'POST',
			body: JSON.stringify(userData)
		});
		*/
	}

	/**
	 * Authenticates a user with an OAuth provider
	 * @param oauthData - OAuth authentication data
	 */
	static oauthLogin(oauthData: OAuthRequest): Promise<AuthResponse> {
		this.logRequest('POST', '/api/auth/oauth', {
			provider: oauthData.provider,
			code: oauthData.code.substring(0, 10) + '...',
			redirectUri: oauthData.redirectUri
		});
		
		return new Promise((resolve) => {
			try {
				// Mock successful OAuth login
				const userId = db.meta.user_id_sequence++;
				const now = new Date();
				
				// Create a new user or find existing one
				const userEmail = `${oauthData.provider.toLowerCase()}_user_${userId}@example.com`;
				const existingUser = db.users.find(u => u.email === userEmail);
				
				if (existingUser) {
					// Update existing user's last login
					existingUser.last_login = now.toISOString();
					persistDb();
					
					// Sync to legacy storage
					this.syncLegacyStorage();
					
					resolve({
						success: true,
						user: {
							id: existingUser.id,
							pseudo: existingUser.pseudo,
							email: existingUser.email,
							created_at: new Date(existingUser.created_at),
							last_login: now,
							auth_method: existingUser.auth_method,
							pfp: existingUser.pfp || `https://ui-avatars.com/api/?name=${existingUser.pseudo}&background=random`
						},
						token: 'mock-jwt-token'
					});
				} else {
					// Create new user
					const newUser = {
						id: userId,
						pseudo: `${oauthData.provider}User${userId}`,
						email: userEmail,
						auth_method: oauthData.provider,
						created_at: now.toISOString(),
						last_login: now.toISOString(),
						pfp: `https://ui-avatars.com/api/?name=${oauthData.provider}+User&background=random`,
						theme: '#ffffff'
					};
					
					db.users.push(newUser);
					persistDb();
					
					// Sync to legacy storage
					this.syncLegacyStorage();
					
					resolve({
						success: true,
						user: {
							id: userId,
							pseudo: newUser.pseudo,
							email: newUser.email,
							created_at: now,
							last_login: now,
							auth_method: oauthData.provider,
							pfp: newUser.pfp
						},
						token: 'mock-jwt-token'
					});
				}
			} catch (error) {
				console.error('Error in oauthLogin:', error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi('/auth/oauth', {
			method: 'POST',
			body: JSON.stringify(oauthData)
		});
		*/
	}
	
	/**
	 * Logs out the current user
	 * @param userId - The ID of the user to log out
	 */
	static logout(userId: number): Promise<void> {
		this.logRequest('POST', '/api/auth/logout', { userId });
		return Promise.resolve();
		
		/* Real backend implementation:
		return this.fetchApi('/auth/logout', {
			method: 'POST'
		});
		*/
	}

	// =========================================
	// USER OPERATIONS
	// =========================================
	
	/**
	 * Retrieves user information by ID
	 * @param id - The user's ID
	 */
	static getUser(id: number): Promise<User> {
		return new Promise((resolve, reject) => {
			try {
				// Find the user in the database
				const user = db.users.find(u => u.id === id);
				
				if (user) {
					// Return user data with proper date formatting
					resolve({
						...user,
						created_at: new Date(user.created_at),
						last_login: user.last_login ? new Date(user.last_login) : undefined
					});
				} else {
					reject(new Error(`User with ID ${id} not found`));
				}
			} catch (error) {
				console.error(`Error fetching user with ID ${id}:`, error);
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, id will be a UUID string
		return this.fetchApi(`/users/${id}`);
		*/
	}

	/**
	 * Updates user information
	 * @param userId - The user's ID
	 * @param userData - Object containing user data to update
	 * @returns Promise with updated user data
	 */
	static updateUser(userId: number, userData: Partial<User>): Promise<User> {
		this.logRequest('PUT', `/api/users/${userId}`, userData);
		
		return new Promise((resolve, reject) => {
			try {
				// Find user by ID
				const userIndex = db.users.findIndex(u => u.id === userId);
				
				if (userIndex !== -1) {
					// Update user with new data
					db.users[userIndex] = {
						...db.users[userIndex],
						...userData
					};
					
					// Persist changes
					persistDb();
					
					// Sync to legacy storage
					this.syncLegacyStorage();
					
					// Notify app of user data changes
					const event = new CustomEvent('user:updated', {
						detail: { userId, userData }
					});
					window.dispatchEvent(event);
					
					// Return updated user
					resolve({
						...db.users[userIndex],
						created_at: new Date(db.users[userIndex].created_at),
						last_login: db.users[userIndex].last_login ? new Date(db.users[userIndex].last_login) : undefined
					});
				} else {
					reject(new Error(`User with ID ${userId} not found`));
				}
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, userId will be a UUID string
		return this.fetchApi(`/users/${userId}`, {
			method: 'PUT',
			body: JSON.stringify(userData)
		});
		*/
	}

	/**
	 * Updates user theme/paddle color
	 * @param userId - The user's ID
	 * @param theme - Color value for the theme/paddle
	 */
	static updateUserTheme(userId: number | string, theme: string): Promise<void> {
		// Convert string ID to number if needed for mock DB
		const numericId = typeof userId === 'string' ? 
			parseInt(userId.replace(/\D/g, '')) : userId;
		
		this.logRequest('PUT', `/api/users/${numericId}/theme`, { theme });
		
		return new Promise((resolve, reject) => {
			try {
				// Find user by ID
				const userIndex = db.users.findIndex(u => u.id === numericId);
				
				if (userIndex !== -1) {
					// Update theme
					db.users[userIndex].theme = theme;
					
					// Persist changes
					persistDb();
					
					// Sync to legacy storage
					this.syncLegacyStorage();
					
					// Dispatch theme update event for app state synchronization
					const event = new CustomEvent('user:theme-updated', {
						detail: { userId: numericId, theme }
					});
					window.dispatchEvent(event);
					
					resolve();
				} else {
					reject(new Error(`User with ID ${numericId} not found`));
				}
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, userId will be a UUID string
		return this.fetchApi(`/users/${userId}/theme`, {
			method: 'PUT',
			body: JSON.stringify({ theme })
		});
		*/
	}

	// =========================================
	// MATCH OPERATIONS
	// =========================================
	
	/**
	 * Gets all matches for a user
	 * @param userId - The user's ID
	 * @param page - The page number to fetch (0-indexed)
	 * @param pageSize - The number of items per page
	 */
	static getUserMatches(userId: number, page?: number, pageSize?: number): Promise<Match[]> {
		const pageQuery = page !== undefined && pageSize !== undefined 
			? `?page=${page}&pageSize=${pageSize}` 
			: '';
		this.logRequest('GET', `/api/users/${userId}/matches${pageQuery}`);
		
		return new Promise((resolve, reject) => {
			try {
				// Filter matches where the user is player_1 or player_2
				const userMatches = db.matches.filter(match => 
					match.player_1 === userId || match.player_2 === userId
				);
				
				// Apply pagination if requested
				let paginatedMatches = userMatches;
				if (page !== undefined && pageSize !== undefined) {
					const start = page * pageSize;
					paginatedMatches = userMatches.slice(start, start + pageSize);
				}
				
				// Return match data with properly formatted dates
				const matches = paginatedMatches.map(match => ({
					...match,
					// Add active field for real backend compatibility (opposite of completed)
					active: match.completed === undefined ? true : !match.completed,
					created_at: new Date(match.created_at)
				}));
				resolve(matches);
			} catch (error) {
				console.error('Error fetching user matches:', error);
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, userId will be a UUID string
		const queryParams = new URLSearchParams();
		queryParams.append('player_id', userId);
		
		if (page !== undefined && pageSize !== undefined) {
			queryParams.append('offset', String(page * pageSize));
			queryParams.append('limit', String(pageSize));
		}
		
		return this.fetchApi(`/matches?${queryParams.toString()}`);
		*/
	}

	/**
	 * Creates a new match between two players
	 * @param player1Id - First player's ID
	 * @param player2Id - Second player's ID
	 * @param tournamentId - Optional tournament ID
	 */
	static createMatch(player1Id: number, player2Id: number, tournamentId?: string): Promise<Match> {
		this.logRequest('POST', '/api/matches');
		
		// Generate match ID
		const matchId = db.meta.match_id_sequence || 1;
		
		// Create match object
		const match = {
			id: matchId,
			player_1: player1Id,
			player_2: player2Id,
			completed: false, // For mock DB
			active: true,     // For real backend compatibility
			duration: 0,
			tournament_id: tournamentId,
			timeout: false,
			created_at: new Date().toISOString()
		};
		
		// Add to database
		db.matches.push(match);
		
		// Update sequence
		db.meta.match_id_sequence = matchId + 1;
		persistDb();
		// Return a properly formatted match object for the API
		return Promise.resolve({
			...match,
			created_at: new Date(match.created_at)
		} as Match);
		
		/* Real backend implementation:
		// Note: With real backend, player IDs will be UUID strings
		return this.fetchApi('/matches', {
			method: 'POST',
			body: JSON.stringify({
				player_1: player1Id,
				player_2: player2Id,
				tournament_id: tournamentId || null
			})
		});
		*/
	}

	/**
	 * Records a goal in a match
	 * @param matchId - The match ID
	 * @param playerId - The scoring player's ID
	 * @param duration - Time of goal in seconds from match start
	 */
	static recordGoal(matchId: number, playerId: number, duration: number): Promise<Goal> {
		this.logRequest('POST', '/api/goals');
		
		return new Promise((resolve, reject) => {
			try {
				// Verify the match exists and is not completed
				const match = db.matches.find((m: any) => m.id === matchId);
				if (!match) {
					throw new Error(`Match ${matchId} not found`);
				}
				
				if (match.completed) {
					console.warn(`Attempt to record goal for completed match ${matchId}`);
					throw new Error(`Match ${matchId} is already completed`);
				}
				
				// Create a unique hash to prevent duplicate goals (only for mock DB)
				const hash = `goal_${matchId}_${playerId}_${Date.now()}`;
				
				// Check if this goal already exists to prevent duplicates (only needed in mock DB)
				if (db.goals.some((g: any) => g.hash === hash)) {
					console.warn(`Duplicate goal detected, hash: ${hash}`);
					throw new Error('Duplicate goal');
				}
				
				// Generate goal ID
				const goalId = db.meta.goal_id_sequence || 1;
				
				// Create the goal object
				const goal = {
					id: goalId,
					match_id: matchId,
					player: playerId,
					duration: parseFloat(duration.toFixed(3)),
					created_at: new Date().toISOString(),
					hash // Only used in mock DB, will be removed in real backend
				};
				
				// Add to database
				db.goals.push(goal);
				
				// Update sequence
				db.meta.goal_id_sequence = goalId + 1;
						
				// Persist changes
				persistDb();
				
				// Return a properly formatted goal object for the API
				resolve({
					...goal,
					created_at: new Date(goal.created_at)
				} as Goal);
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, matchId and playerId will be UUID strings, and no hash field is needed
		return this.fetchApi('/goals', {
			method: 'POST',
			body: JSON.stringify({
				match_id: matchId,
				player: playerId,
				duration
			})
		});
		*/
	}

	// =========================================
	// STATISTICS & LEADERBOARD
	// =========================================
	
	/**
	 * Retrieves statistics for a user
	 * @param userId - The user's ID
	 */
	static getUserStats(userId: number): Promise<any> {
		this.logRequest('GET', `/api/users/${userId}/stats`);
		
		// Mock user stats
		return Promise.resolve({
			totalGames: 10,
			wins: 5,
			losses: 5,
			winRate: 0.5,
			averageScore: 3.2
		});
		
		/* Real backend implementation:
		// Note: With real backend, userId will be a UUID string
		return this.fetchApi(`/matches/stats/${userId}`);
		*/
	}

	/**
	 * Retrieves global leaderboard data
	 */
	static getLeaderboard(): Promise<LeaderboardEntry[]> {
		this.logRequest('GET', '/api/leaderboard');
		
		return new Promise((resolve, reject) => {
			try {
				const userStats: Record<number, {
					id: number;
					username: string;
					elo: number;
					wins: number;
					losses: number;
				}> = {};
				
				// First collect all users with their basic info and elo
				db.users.forEach(user => {
					userStats[user.id] = {
						id: user.id,
						username: user.pseudo,
						elo: user.elo || 1000, // Default ELO if not set
						wins: 0,
						losses: 0
					};
				});
				
				// Process all matches to calculate wins and losses
				for (const match of db.matches) {
					// Get goals for this match
					const goals = db.goals.filter(goal => goal.match_id === match.id);
					
					// Calculate scores for each player
					const player1Goals = goals.filter(goal => goal.player === match.player_1).length;
					const player2Goals = goals.filter(goal => goal.player === match.player_2).length;
					
					// Only count matches where at least one player has 3+ points
					if (player1Goals >= 3 || player2Goals >= 3) {
						// Determine winner
						if (player1Goals > player2Goals) {
							// Player 1 won
							if (userStats[match.player_1]) userStats[match.player_1].wins++;
							if (userStats[match.player_2]) userStats[match.player_2].losses++;
						} else if (player2Goals > player1Goals) {
							// Player 2 won
							if (userStats[match.player_2]) userStats[match.player_2].wins++;
							if (userStats[match.player_1]) userStats[match.player_1].losses++;
						}
						// Ties don't count for either
					}
				}
				
				// Convert to array and sort by ELO (descending)
				const leaderboardData = Object.values(userStats)
					.sort((a, b) => b.elo - a.elo)
					.map((stat, index) => ({
						id: stat.id,
						rank: index + 1,
						username: stat.username,
						elo: stat.elo,
						wins: stat.wins,
						losses: stat.losses
					}));
				
				// Simulate network delay
				setTimeout(() => {
					resolve(leaderboardData);
				}, 300);
			} catch (error) {
				console.error('Error generating leaderboard:', error);
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi('/leaderboard?limit=10&offset=0'); // Customize as needed
		*/
	}

	/**
	 * Gets a match by ID with detailed information
	 * @param matchId The match ID to retrieve
	 * @returns Promise with the match details
	 */
	static getMatchDetails(matchId: number): Promise<any> {
		this.logRequest('GET', `/api/matches/${matchId}`);
		
		return new Promise((resolve, reject) => {
			try {
				const match = db.matches.find((m: any) => m.id === matchId);
				
				if (!match) {
					return reject(new Error(`Match ${matchId} not found`));
				}
				
				// For player 1
				let player1 = db.users.find((u: any) => u.id === match.player_1);
				if (!player1) {
					player1 = { id: match.player_1, pseudo: 'Player 1' };
				}
				
				// For player 2 - ensure we handle the AI player (ID 0)
				let player2;
				if (match.player_2 === 0) {
					player2 = db.users.find((u: any) => u.id === 0) || { 
						id: 0, 
						pseudo: 'Computer',
						theme: '#ffffff',
						isAI: true
					};
				} else {
					player2 = db.users.find((u: any) => u.id === match.player_2);
					if (!player2) {
						player2 = { id: match.player_2, pseudo: 'Player 2' };
					}
				}
				
				// Get goals for this match
				const goals = db.goals.filter((g: any) => g.match_id === matchId);
				
				// Calculate scores
				const player1Score = goals.filter((g: any) => g.player === match.player_1).length;
				const player2Score = goals.filter((g: any) => g.player === match.player_2).length;
				
				// Create result object directly with all needed properties
				const result = {
					id: match.id,
					player_1: match.player_1,
					player_2: match.player_2,
					completed: match.completed,
					active: match.active !== undefined ? match.active : !match.completed, // Add active for real DB compatibility
					duration: match.duration,
					timeout: match.timeout,
					created_at: match.created_at,
					
					// Important: Add explicitly constructed objects
					player1: {
						id: player1.id,
						pseudo: player1.pseudo,
						// Other properties as needed
					},
					player2: {
						id: player2.id,
						pseudo: player2.pseudo,
						// Other properties as needed
					},
					player1Score: player1Score,
					player2Score: player2Score,
					goals: goals
				};
				resolve(result);
			} catch (error) {
				console.error('Error in getMatchDetails:', error);
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, matchId will be a UUID string
		return this.fetchApi(`/matches/${matchId}`);
		*/
	}

	/**
	 * Gets all goals for a specific match
	 * @param matchId - ID of the match to get goals for
	 */
	static getMatchGoals(matchId: number): Promise<any[]> {
		this.logRequest('GET', `/api/matches/${matchId}/goals`);
		
		return new Promise((resolve, reject) => {
			try {
				// Filter goals from the JSON database
				const goals = db.goals.filter((goal: any) => goal.match_id === matchId)
					.map(goal => ({
						...goal,
						// Remove hash field for real backend compatibility
						// hash field is kept in the mock database for deduplication
					}));
				
				resolve(goals);
			} catch (error) {
				console.error('Error fetching match goals:', error);
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, matchId will be a UUID string
		return this.fetchApi(`/goals?match_id=${matchId}`);
		*/
	}

	/**
	 * Gets all matches for a tournament
	 * @param tournamentId - The tournament ID
	 */
	static getTournamentMatches(tournamentId: string): Promise<Match[]> {
		this.logRequest('GET', `/api/tournaments/${tournamentId}/matches`);
		
		return new Promise((resolve) => {
			// Filter matches by tournament ID
			const matches = db.matches.filter((match: any) => 
				match.tournament_id === tournamentId
			).map((match: any) => ({
				...match,
				// Add active field for real backend compatibility
				active: match.active !== undefined ? match.active : !match.completed,
				created_at: new Date(match.created_at)
			}));
			
			resolve(matches);
		});
		
		/* Real backend implementation:
		return this.fetchApi(`/matches?tournament_id=${tournamentId}`);
		*/
	}

	/**
	 * Updates match status (active/completed)
	 * @param matchId - The match ID
	 * @param active - Whether the match is active 
	 * @param duration - Duration of the match in seconds
	 */
	static updateMatchStatus(matchId: number, active: boolean, duration: number): Promise<Match> {
		this.logRequest('PUT', `/api/matches/${matchId}`, { active, duration });
		
		return new Promise((resolve, reject) => {
			try {
				const matchIndex = db.matches.findIndex((m: any) => m.id === matchId);
				
				if (matchIndex === -1) {
					reject(new Error(`Match with ID ${matchId} not found`));
					return;
				}
				
				// Update match
				db.matches[matchIndex] = {
					...db.matches[matchIndex],
					active,
					completed: !active, // For backward compatibility
					duration
				};
				
				// Persist changes
				persistDb();
				
				// Return updated match
				resolve({
					...db.matches[matchIndex],
					created_at: new Date(db.matches[matchIndex].created_at)
				} as Match);
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// Note: With real backend, matchId will be a UUID string
		return this.fetchApi(`/matches/${matchId}`, {
			method: 'PUT',
			body: JSON.stringify({ active, duration })
		});
		*/
	}

	// =========================================
	// Helper methods for future transition
	// =========================================

	/**
	 * Adapt a local ID to a UUID format for compatibility with real backend
	 * This is a helper for transition - local IDs can be converted to UUID-like strings
	 * @param localId - The local numeric ID
	 */
	static adaptLocalIdToUuid(localId: number): string {
		// This is a temporary function to help with the transition
		// In your real implementation, you won't need this as the backend will generate real UUIDs
		
		// Convert the number to a string and pad with zeros
		const paddedId = String(localId).padStart(8, '0');
		// Create a UUID-like string (this is NOT a real UUID)
		return `${paddedId}-0000-0000-0000-000000000000`;
	}

	/**
	 * Helper method to standardize API request logging
	 * @param method - HTTP method
	 * @param endpoint - API endpoint
	 * @param body - Optional request body
	 */
	public static logRequest(method: string, endpoint: string, body?: any): void {
		const timestamp = new Date().toISOString();
		const requestId = Math.random().toString(36).substring(2, 10);
		
		console.log(`[${timestamp}] [${requestId}] DB REQUEST: ${method} ${endpoint}`, {
			method,
			endpoint,
			...(body && { body }),
			timestamp,
			requestId
		});
	}

	/**
	 * Initialize auth_users if it doesn't exist in localStorage
	 */
	private static initializeAuthUsers(): void {
		if (!localStorage.getItem('auth_users')) {
			localStorage.setItem('auth_users', '[]');
		}
	}

	/**
	 * Sync the database state to legacy localStorage for backward compatibility
	 */
	private static syncLegacyStorage(): void {
		// Ensure legacy structure exists
		this.initializeAuthUsers();
		
		// Store users in auth_users for legacy support
		try {
			const authUsers = db.users.map(user => ({
				id: user.id,
				username: user.pseudo,
				email: user.email,
				theme: user.theme || '#ffffff'
			}));
			localStorage.setItem('auth_users', JSON.stringify(authUsers));
		} catch (error) {
			console.error('Failed to sync to legacy storage:', error);
		}
	}

	static {
		DbService.initializeAuthUsers();
		DbService.syncLegacyStorage();
	}

	/**
	 * Reset the database to its initial template state
	 */
	static resetDatabase(): void {
		// Reset to initial template
		db = JSON.parse(JSON.stringify(dbTemplate));
		if (!db || !db.users) {
			db = {
				users: [],
				matches: [],
				goals: [],
				friends: [],
				meta: {
					user_id_sequence: 1,
					match_id_sequence: 1,
					goal_id_sequence: 1
				}
			};
		}
		
		// Persist changes
		persistDb();
		
		// Sync to legacy storage
		this.syncLegacyStorage();
		
		// Also clear the specific auth items
		localStorage.removeItem('auth_user');
		sessionStorage.removeItem('auth_user');
		localStorage.removeItem('auth_token');
		sessionStorage.removeItem('auth_token');
	}

	/**
	 * ADDITIONAL METHODS TO MATCH BACKEND API
	 */


	/**
	 * Gets tournament information
	 * @param tournamentId - Tournament UUID
	 */
	static getTournament(tournamentId: string): Promise<any> {
		this.logRequest('GET', `/api/tournaments/${tournamentId}`);
		
		return new Promise((resolve, reject) => {
			try {
				// Find all matches with this tournament ID
				const matches = db.matches.filter(m => m.tournament_id === tournamentId);
				
				if (matches.length === 0) {
					// Format error like the backend would
					const error: ErrorResponse = {
						statusCode: 404,
						code: ErrorCodes.TOURNAMENT_NOT_FOUND,
						error: 'Not Found',
						message: 'Tournament not found'
					};
					reject(error);
					return;
				}
				
				// Get unique player IDs from matches
				const playerIds = Array.from(new Set(
					matches.flatMap(m => [m.player_1, m.player_2])
				));
				
				resolve({
					id: tournamentId,
					players: playerIds,
					matches: matches.map(m => m.id),
					created_at: matches[0].created_at
				});
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi(`/tournaments/${tournamentId}`);
		*/
	}

	/**
	 * Gets a player's ELO rating
	 * @param playerId - Player's UUID
	 */
	static getPlayerElo(playerId: number | string): Promise<any> {
		this.logRequest('GET', `/api/elo?player=${playerId}`);
		
		return new Promise((resolve, reject) => {
			try {
				// Find user
				const user = db.users.find(u => u.id === playerId);
				
				if (!user) {
					const error: ErrorResponse = {
						statusCode: 404,
						code: ErrorCodes.PLAYER_NOT_FOUND,
						error: 'Not Found',
						message: 'Player not found'
					};
					reject(error);
					return;
				}
				
				resolve({
					player: playerId,
					elo: user.elo || 1000, // Default ELO
					created_at: new Date().toISOString()
				});
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi(`/elo?player=${playerId}`);
		*/
	}

	/**
	 * Get user profile
	 * @param userId - The UUID of the user
	 */
	static getUserProfile(userId: number | string): Promise<any> {
		this.logRequest('GET', `/api/profile/${userId}`);
		
		return new Promise((resolve, reject) => {
			try {
				// Find user
				const user = db.users.find(u => u.id === userId);
				
				if (!user) {
					const error: ErrorResponse = {
						statusCode: 404,
						code: ErrorCodes.PLAYER_NOT_FOUND,
						error: 'Not Found', 
						message: 'Player not found'
					};
					reject(error);
					return;
				}
				
				// Get user matches
				const matches = db.matches.filter(
					m => m.player_1 === userId || m.player_2 === userId
				);
				
				// Get user stats
				const wins = matches.filter(m => {
					const goals = db.goals.filter(g => g.match_id === m.id);
					const userGoals = goals.filter(g => g.player === userId).length;
					const opponentGoals = goals.filter(g => g.player !== userId).length;
					return userGoals > opponentGoals;
				}).length;
				
				// Create profile response
				resolve({
					id: user.id,
					pseudo: user.pseudo,
					email: user.email,
					pfp: user.pfp || `https://ui-avatars.com/api/?name=${user.pseudo}`,
					theme: user.theme || '#ffffff',
					elo: user.elo || 1000,
					matches_played: matches.length,
					matches_won: wins
				});
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi(`/profile/${userId}`);
		*/
	}

	/**
	 * Update user profile picture
	 * @param userId - The UUID of the user
	 * @param imageData - Base64 encoded image data
	 */
	static updateProfilePicture(userId: number | string, imageData: string): Promise<any> {
		this.logRequest('PUT', `/api/profile/${userId}/picture`, { imageData: '...[truncated]' });
		
		return new Promise((resolve, reject) => {
			try {
				// Find user
				const userIndex = db.users.findIndex(u => u.id === userId);
				
				if (userIndex === -1) {
					const error: ErrorResponse = {
						statusCode: 404,
						code: ErrorCodes.PLAYER_NOT_FOUND,
						error: 'Not Found',
						message: 'Player not found'
					};
					reject(error);
					return;
				}
				
				// Update profile picture
				db.users[userIndex].pfp = imageData;
				
				// Persist changes
				persistDb();
				
				resolve({ success: true });
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		// This would likely use FormData for the image upload
		const formData = new FormData();
		formData.append('image', imageData);
		
		return this.fetchApi(`/profile/${userId}/picture`, {
			method: 'PUT',
			body: formData,
			headers: {} // Let browser set proper content-type for form data
		});
		*/
	}

	/**
	 * Get friendship status
	 * @param userId - Current user UUID
	 * @param friendId - Friend's UUID
	 */
	static getFriendship(userId: number | string, friendId: number | string): Promise<any> {
		this.logRequest('GET', `/api/friends/${userId}/${friendId}`);
		
		return new Promise((resolve, reject) => {
			try {
				// Find friendship
				const friendship = db.friends.find(f => 
					(f.user_id === userId && f.friend_id === friendId) ||
					(f.user_id === friendId && f.friend_id === userId)
				);
				
				if (!friendship) {
					resolve({ exists: false });
					return;
				}
				
				resolve({
					exists: true,
					created_at: new Date(friendship.created_at),
					user_id: friendship.user_id,
					friend_id: friendship.friend_id
				});
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi(`/friends/${userId}/${friendId}`);
		*/
	}

	/**
	 * Add a friend
	 * @param userId - Current user UUID
	 * @param friendId - Friend's UUID
	 */
	static addFriend(userId: number | string, friendId: number | string): Promise<any> {
		this.logRequest('POST', `/api/friends`, { user_id: userId, friend_id: friendId });
		
		return new Promise((resolve, reject) => {
			try {
				// Check if friendship already exists
				const existingFriendship = db.friends.find(f => 
					(f.user_id === userId && f.friend_id === friendId) ||
					(f.user_id === friendId && f.friend_id === userId)
				);
				
				if (existingFriendship) {
					const error: ErrorResponse = {
						statusCode: 409,
						code: ErrorCodes.FRIENDSHIP_EXISTS,
						error: 'Conflict',
						message: 'Friendship already exists'
					};
					reject(error);
					return;
				}
				
				// Create new friendship
				const friendship = {
					user_id: userId,
					friend_id: friendId,
					created_at: new Date().toISOString()
				};
				
				// Add to database
				db.friends.push(friendship);
				
				// Persist changes
				persistDb();
				
				resolve({
					user_id: userId,
					friend_id: friendId,
					created_at: new Date(friendship.created_at)
				});
			} catch (error) {
				reject(error);
			}
		});
		
		/* Real backend implementation:
		return this.fetchApi('/friends', {
			method: 'POST',
			body: JSON.stringify({ user_id: userId, friend_id: friendId })
		});
		*/
	}
}
