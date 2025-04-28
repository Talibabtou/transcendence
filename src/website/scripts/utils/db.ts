/**
 * Database Service Module
 * Provides interfaces and methods for interacting with the application database.
 * Handles data retrieval, updates, and API communication for persistent storage.
 */

import { User, Friend, Match, Goal, AuthCredentials, RegisterData, AuthResponse, OAuthRequest, LeaderboardEntry } from '@shared/types';
import dbTemplate from '@shared/db.json';

// =========================================
// DATABASE INITIALIZATION
// =========================================

// Database storage key in localStorage
const DB_STORAGE_KEY = 'pong_db';

// Set up the initial database structure
let db: {
	users: Array<any>;
	matches: Array<any>;
	goals: Array<any>;
	friends: Array<any>;
	meta: {
		user_id_sequence: number;
		match_id_sequence: number;
		goal_id_sequence: number;
	};
};

// Function to load the database from localStorage or initialize from template
const loadDb = () => {
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
const persistDb = () => {
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
 */
export class DbService {
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
					reject(new Error('Wrong email or password'));
				}
			} catch (error) {
				reject(error);
			}
		});
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
	}

	/**
	 * Authenticates a user with an OAuth provider
	 * @param oauthData - OAuth authentication data
	 */
	static oauthLogin(oauthData: OAuthRequest): Promise<AuthResponse> {
		this.logRequest('POST', '/api/auth/oauth', {
			provider: oauthData.provider,
			code: oauthData.code.substring(0, 10) + '...', // Don't log full code
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
	}
	
	/**
	 * Logs out the current user
	 * @param userId - The ID of the user to log out
	 */
	static logout(userId: number): Promise<void> {
		this.logRequest('POST', '/api/auth/logout', { userId });
		return Promise.resolve();
	}
	
	/**
	 * Refreshes an authentication token
	 * @param refreshToken - The refresh token
	 */
	static refreshToken(refreshToken: string): Promise<{ token: string, refreshToken: string }> {
		this.logRequest('POST', '/api/auth/refresh', { 
			refreshToken: refreshToken.substring(0, 10) + '...' // Don't log full token
		});
		
		return Promise.resolve({
			token: 'new-mock-jwt-token',
			refreshToken: 'new-mock-refresh-token'
		});
	}
	
	/**
	 * Verifies if a token is valid
	 * @param token - The token to verify
	 */
	static verifyToken(token: string): Promise<boolean> {
		this.logRequest('POST', '/api/auth/verify', { 
			token: token.substring(0, 10) + '...' // Don't log full token
		});
		
		return Promise.resolve(true);
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
	}

	/**
	 * Updates user information including theme
	 * @param userId - The user's ID
	 * @param userData - Object containing user data to update
	 */
	static updateUser(userId: number, userData: Partial<User>): Promise<User> {
		this.logRequest('PUT', `/api/users/${userId}`, userData);
		
		return new Promise((resolve, reject) => {
			try {
				// Find user by ID
				const userIndex = db.users.findIndex(u => u.id === userId);
				
				if (userIndex !== -1) {
					// Update user
					db.users[userIndex] = {
						...db.users[userIndex],
						...userData
					};
					
					// Persist changes
					persistDb();
					
					// Sync to legacy storage
					this.syncLegacyStorage();
					
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
	}

	/**
	 * Updates user preferences
	 * @param userId - The user's ID
	 * @param preferences - Object containing user preferences
	 */
	static updateUserPreferences(userId: number, preferences: Record<string, any>): Promise<void> {
		this.logRequest('PUT', `/api/users/${userId}/preferences`, preferences);
		return Promise.resolve();
	}
	
	/**
	 * Creates a new user
	 * @param userData - User data to create
	 */
	static createUser(userData: Partial<User>): Promise<User> {
		this.logRequest('POST', '/api/users', userData);
		
		return new Promise((resolve, reject) => {
			try {
				// Get next user ID from sequence
				const userId = userData.id || db.meta.user_id_sequence++;
				const now = new Date();
				
				// Create new user
				const newUser = {
					id: userId,
					pseudo: userData.pseudo || 'NewUser',
					created_at: (userData.created_at || now).toISOString(),
					last_login: (userData.last_login || now).toISOString(),
					theme: userData.theme || '#ffffff',
					...userData
				};
				
				// Add to users array - but don't add duplicates
				const existingUserIndex = db.users.findIndex(u => u.id === userId);
				if (existingUserIndex !== -1) {
					// Update existing user
					db.users[existingUserIndex] = {
						...db.users[existingUserIndex],
						...newUser
					};
				} else {
					// Add new user
					db.users.push(newUser);
				}
				
				// Persist changes
				persistDb();
				
				// Sync to legacy storage
				this.syncLegacyStorage();
				
				// Return response
				resolve({
					id: userId,
					pseudo: userData.pseudo || 'NewUser',
					created_at: userData.created_at || now,
					last_login: userData.last_login || now,
					theme: userData.theme || '#ffffff',
					...userData
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	// =========================================
	// FRIEND OPERATIONS
	// =========================================
	
	/**
	 * Retrieves friend list for a user
	 * @param userId - The user's ID
	 */
	static getUserFriends(userId: number): Promise<Friend[]> {
		this.logRequest('GET', `/api/users/${userId}/friends`);
		
		return new Promise((resolve, reject) => {
			try {
				// Filter friends where the user is user_id
				const userFriends = db.friends.filter(friend => 
					friend.user_id === userId
				);
				
				// Return friend data with properly formatted dates
				const friends = userFriends.map(friend => ({
					...friend,
					created_at: new Date(friend.created_at)
				}));
				resolve(friends);
			} catch (error) {
				console.error('Error fetching user friends:', error);
				reject(error);
			}
		});
	}

	// =========================================
	// MATCH OPERATIONS
	// =========================================
	
	/**
	 * Retrieves match history for a specific user
	 * @param userId - The user's ID
	 */
	static getUserMatches(userId: number): Promise<Match[]> {
		this.logRequest('GET', `/api/users/${userId}/matches`);
		
		return new Promise((resolve, reject) => {
			try {
				// Filter matches where the user is player_1 or player_2
				const userMatches = db.matches.filter(match => 
					match.player_1 === userId || match.player_2 === userId
				);
				
				// Return match data with properly formatted dates
				const matches = userMatches.map(match => ({
					...match,
					created_at: new Date(match.created_at)
				}));
				resolve(matches);
			} catch (error) {
				console.error('Error fetching user matches:', error);
				reject(error);
			}
		});
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
						completed: false,
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
				
				// Create a unique hash to prevent duplicate goals
				const hash = `goal_${matchId}_${playerId}_${Date.now()}`;
				
				// Check if this goal already exists to prevent duplicates
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
					hash
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
	}

	/**
	 * Retrieves global leaderboard data
	 */
	static getLeaderboard(): Promise<LeaderboardEntry[]> {
		this.logRequest('GET', '/api/leaderboard');
		
		return new Promise((resolve, reject) => {
			try {
				const userStats: Record<number, {
					id: number,
					username: string,
					elo: number,
					wins: number,
					losses: number
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
				
				// Now calculate wins and losses from completed matches
				db.matches.forEach(match => {
					if (!match.completed) return; // Skip incomplete matches
					
					// Count goals for each player
					const player1Goals = db.goals.filter(goal => 
						goal.match_id === match.id && goal.player === match.player_1
					).length;
					
					const player2Goals = db.goals.filter(goal => 
						goal.match_id === match.id && goal.player === match.player_2
					).length;
					
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
					// If tied, no wins/losses counted
				});
				
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
	 * Specialized method for updating user theme/paddle color
	 * @param userId - The user's ID
	 * @param theme - Color value for the theme/paddle
	 */
	static updateUserTheme(userId: number | string, theme: string): Promise<void> {
		// Convert string ID to number if needed
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
					
					resolve();
				} else {
					reject(new Error(`User with ID ${numericId} not found`));
				}
			} catch (error) {
				reject(error);
			}
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

	// Call this in the constructor or as a static initialization
	static {
		DbService.initializeAuthUsers();
		// Ensure initial sync
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
	
	// =========================================
	// DATABASE EXPORT UTILITIES
	// =========================================
	
	/**
	 * Exports current database state as a formatted JSON string
	 * This can be copied and saved as db.json
	 */
	static exportDatabaseAsJson(): string {
		return JSON.stringify(db, null, 2);
	}

	/**
	 * Creates a downloadable file with the current database state
	 */
	static downloadDatabaseAsJson(filename = 'db.json'): void {
		const jsonString = this.exportDatabaseAsJson();
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		
		// Cleanup
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
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
	}

	/**
	 * Gets all database data - could be used by your API endpoints
	 */
	static getDatabaseSnapshot(): any {
		return JSON.parse(JSON.stringify(db)); // Return deep copy
	}

	/**
	 * Mock implementation of user verification that uses the JSON database
	 * Finds existing users by email and password
	 */
	static verifyUser(email: string, password: string): Promise<{
		success: boolean;
		user?: {
			id: string;
			username: string;
			email: string;
			profilePicture?: string;
			theme?: string;
		};
		token?: string;
	}> {
		this.logRequest('POST', '/api/auth/verify', { 
			email, 
			password: '********' 
		});

		return new Promise((resolve) => {
			try {
				// Find user by email and password - uses the JSON database
				const user = db.users.find(u => 
					u.email === email && u.password === password);

				if (user) {
					// Return success with user data
					resolve({
						success: true,
						user: {
							id: user.id,
							username: user.pseudo,
							email: user.email,
							profilePicture: user.pfp || '/images/default-avatar.svg',
							theme: user.theme
						},
						token: 'mock-jwt-token'
					});
				} else {
					// Return failure
					resolve({ success: false });
				}
			} catch (error) {
				console.error('Auth: Verification error', error);
				resolve({ success: false });
			}
		});
	}

	/**
	 * Updates user's last connection timestamp in the JSON database
	 * @param userId - The user's ID
	 */
	static updateUserLastConnection(userId: string): Promise<void> {
		const numericId = parseInt(userId.replace(/\D/g, ''));
		
		return new Promise((resolve, reject) => {
			try {
				// Find user by ID in the JSON database
				const userIndex = db.users.findIndex(u => u.id === numericId);
				
				if (userIndex !== -1) {
					// Update last login
					db.users[userIndex].last_login = new Date().toISOString();
					
					// Persist changes
					persistDb();
					
					// Sync to legacy storage
					this.syncLegacyStorage();
					
					resolve();
				} else {
					reject(new Error(`User with ID ${numericId} not found`));
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Gets all goals for a specific match from the JSON database
	 * @param matchId - ID of the match to get goals for
	 */
	static getMatchGoals(matchId: number): Promise<any[]> {
		this.logRequest('GET', `/api/matches/${matchId}/goals`);
		
		return new Promise((resolve, reject) => {
			try {
				// Filter goals from the JSON database
				const goals = db.goals.filter((goal: any) => goal.match_id === matchId);
				
				resolve(goals);
			} catch (error) {
				console.error('Error fetching match goals:', error);
				reject(error);
			}
		});
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
				created_at: new Date(match.created_at)
			}));
			
			resolve(matches);
		});
	}
}
