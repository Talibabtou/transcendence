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

// Function to persist DB to localStorage
const persistDb = () => {
	try {
		localStorage.setItem('pong_db', JSON.stringify(db));
		console.log('Database persisted to localStorage');
	} catch (error) {
		console.error('Error persisting database:', error);
	}
};

// Function to load the database
const loadDb = () => {
	try {
		const storedDb = localStorage.getItem('pong_db');
		if (storedDb) {
			db = JSON.parse(storedDb);
			console.log('Database loaded from localStorage');
		} else {
			// First time, initialize with template
			db = JSON.parse(JSON.stringify(dbTemplate));
			// If there's no template data, create a default structure
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
			persistDb();
			console.log('Initialized database with default data');
		}
	} catch (error) {
		console.error('Error loading database:', error);
		// Fallback to default structure
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
		persistDb();
	}
};

// Initialize the database
loadDb();

// =========================================
// DATABASE SERVICE
// =========================================

/**
 * Service class for handling database operations
 * Currently mocks API calls for development purposes
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
			password: '********' // Don't log actual password
		});
		
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					// Find user by email - real SQL-like behavior
					const user = db.users.find(u => u.email === credentials.email);
					
					if (user && user.password === credentials.password) {
						// Successful login
						const now = new Date();
						
						// Update last login
						user.last_login = now.toISOString();
						persistDb();
						
						// Return user without password
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
						
						// Also update auth_user in localStorage for backward compatibility
						this.syncLegacyStorage();
						
						resolve(userResponse);
					} else {
						// Important: Reject with error instead of creating user
						reject(new Error('Invalid credentials'));
					}
				} catch (error) {
					reject(error);
				}
			}, 300); // Simulate network delay
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
			setTimeout(() => {
				try {
					// Check if email already exists - SQL-like behavior
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
					
					// Also update auth_users in localStorage for backward compatibility
					this.syncLegacyStorage();
					
					// Return response with success property
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
			}, 300);
		});
	}
	
	/**
	 * Helper method to sync data between JSON DB and localStorage for legacy code
	 */
	private static syncLegacyStorage(): void {
		try {
			// Sync auth_users for backward compatibility
			const authUsers = db.users.map(user => ({
				id: user.id,
				username: user.pseudo,
				email: user.email,
				password: user.password,
				authMethod: user.auth_method,
				createdAt: user.created_at,
				lastLogin: user.last_login,
				theme: user.theme
			}));
			
			localStorage.setItem('auth_users', JSON.stringify(authUsers));
			console.log('Synced DB to legacy storage');
		} catch (error) {
			console.error('Error syncing with legacy storage:', error);
		}
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
			setTimeout(() => {
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
				
				// Update legacy storage
				this.syncLegacyStorage();
			}, 300);
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
		this.logRequest('GET', `/api/users/${id}`);
		
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
		
		// Log this update for debugging
		if (userData.theme) {
			console.log(`Updating user ${userId} theme to:`, userData.theme);
		}
		
		return new Promise((resolve, reject) => {
			setTimeout(() => {
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
			}, 200);
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
			setTimeout(() => {
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
			}, 200);
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
				
				console.log(`Retrieved ${friends.length} friends for user ${userId}`);
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
				
				console.log(`Retrieved ${matches.length} matches for user ${userId}`);
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
	static createMatch(player1Id: number, player2Id: number, tournamentId?: number): Promise<Match> {
		const matchData = {
			player_1: player1Id,
			player_2: player2Id,
			tournament_id: tournamentId
		};
		
		this.logRequest('POST', '/api/matches', matchData);
		
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					// Get next match ID from sequence
					const matchId = db.meta.match_id_sequence++;
					const now = new Date();
					
					// Create new match
					const newMatch = {
						id: matchId,
						player_1: player1Id,
						player_2: player2Id,
						completed: false,
						timeout: false,
						tournament_id: tournamentId,
						created_at: now.toISOString()
					};
					
					// Add to matches array
					db.matches.push(newMatch);
					
					// Persist changes
					persistDb();
					
					// Return response
					resolve({
						id: matchId,
						player_1: player1Id,
						player_2: player2Id,
						completed: false,
						timeout: false,
						tournament_id: tournamentId,
						created_at: now
					});
				} catch (error) {
					reject(error);
				}
			}, 200);
		});
	}

	/**
	 * Records a goal in a match
	 * @param matchId - The match ID
	 * @param playerId - The scoring player's ID
	 * @param duration - Time of goal in seconds from match start
	 */
	static recordGoal(matchId: number, playerId: number, duration: number): Promise<Goal> {
		this.logRequest('POST', '/api/goals', {
			match_id: matchId,
			player: playerId,
			duration
		});
		
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					// Get next goal ID from sequence
					const goalId = db.meta.goal_id_sequence++;
					const now = new Date();
					
					// Create goal hash for consistency with db format
					const hash = `goal_${matchId}_${playerId}_${duration.toFixed(1)}`;
					
					// Create new goal
					const newGoal = {
						id: goalId,
						match_id: matchId,
						player: playerId,
						duration,
						created_at: now.toISOString(),
						hash: hash
					};
					
					// Add to goals array
					db.goals.push(newGoal);
					
					// Persist changes
					persistDb();
					
					// Return response
					resolve({
						id: goalId,
						match_id: matchId,
						player: playerId,
						duration,
						created_at: now,
						hash
					});
				} catch (error) {
					reject(error);
				}
			}, 200);
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
		
		console.log('DB content when getLeaderboard is called:', {
			users: db.users.length,
			matches: db.matches.length,
			goals: db.goals.length,
			friends: db.friends.length,
			meta: db.meta
		});
		
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
				
				console.log(`Retrieved leaderboard with ${leaderboardData.length} entries`);
				
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
			setTimeout(() => {
				try {
					// Find user by ID
					const userIndex = db.users.findIndex(u => u.id === numericId);
					
					if (userIndex !== -1) {
						// Update theme
						db.users[userIndex].theme = theme;
						
						// Persist changes
						persistDb();
						
						// Update localStorage auth_user if this is the current user
						const currentUserStr = localStorage.getItem('auth_user');
						if (currentUserStr) {
							const currentUser = JSON.parse(currentUserStr);
							
							if (parseInt(String(currentUser.id).replace(/\D/g, '')) === numericId) {
								currentUser.theme = theme;
								localStorage.setItem('auth_user', JSON.stringify(currentUser));
							}
						}
						
						// Also update auth_users in localStorage for backward compatibility
						this.syncLegacyStorage();
						
						resolve();
					} else {
						reject(new Error(`User with ID ${numericId} not found`));
					}
				} catch (error) {
					reject(error);
				}
			}, 200);
		});
	}

	/**
	 * Helper method to sync user data between auth_user and auth_users
	 * Ensures we maintain a single source of truth for users
	 * @param userData - The user data to sync
	 */
	static syncUserData(userData: any): void {
		if (!userData || !userData.id) {
			console.error('Cannot sync user data: Missing user ID');
			return;
		}
		
		try {
			// Get existing users array
			const usersStr = localStorage.getItem('auth_users') || '[]';
			let users = JSON.parse(usersStr);
			
			// Extract the numeric part if ID is in format "user_12345"
			let numericId: number | null = null;
			
			if (typeof userData.id === 'string' && userData.id.includes('_')) {
				const parts = userData.id.split('_');
				numericId = parseInt(parts[parts.length - 1], 10);
			} else if (typeof userData.id === 'string') {
				numericId = parseInt(userData.id, 10);
			} else {
				numericId = Number(userData.id);
			}
			
			// Find if user already exists in array - check ALL possible ID formats
			const userIndex = users.findIndex((u: any) => {
				// Compare direct IDs
				if (u.id === userData.id) return true;
				
				// Extract and compare numeric parts of IDs
				let uNumericId: number | null = null;
				
				if (typeof u.id === 'string' && u.id.includes('_')) {
					const parts = u.id.split('_');
					uNumericId = parseInt(parts[parts.length - 1], 10);
				} else if (typeof u.id === 'string') {
					uNumericId = parseInt(u.id, 10);
				} else {
					uNumericId = Number(u.id);
				}
				
				return numericId === uNumericId;
			});
			
			// Prepare normalized user data with consistent property names
			const normalizedUser = {
				...userData,
				// Ensure consistent property names
				id: userData.id, // Keep original ID format
				username: userData.username || userData.pseudo || userData.name,
				pseudo: userData.pseudo || userData.username || userData.name,
				// Make sure we preserve the theme
				theme: userData.theme || (userIndex !== -1 ? users[userIndex].theme : '#ffffff')
			};
			
			if (userIndex !== -1) {
				// Update existing user while preserving existing fields
				users[userIndex] = {
					...users[userIndex],
					...normalizedUser,
					// Important: preserve the existing ID format to avoid duplicates
					id: users[userIndex].id
				};
				console.log(`Updated existing user ${userData.id} in auth_users array`);
			} else {
				// Add new user to array
				users.push(normalizedUser);
				console.log(`Added new user ${userData.id} to auth_users array`);
			}
			
			// Save back to localStorage
			localStorage.setItem('auth_users', JSON.stringify(users));
		} catch (error) {
			console.error('Error syncing user data:', error);
		}
	}

	/**
	 * API-Ready Helper: Prepares service for future API integration
	 * This structure will make it easy to switch from mock to real implementation
	 */
	static createApiClient() {
		// This is a scaffold for future API client implementation
		// When transitioning to real API, replace the implementation while keeping
		// the same method signatures and return types
		
		// const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		// 	// In future implementation, this would handle auth tokens
		// 	// For now, it's just a placeholder
		// 	return fetch(url, options);
		// };
		
		return {
			// Example of how real API methods would be structured
			async get<T>(endpoint: string): Promise<T> {
				// In mock mode, we use localStorage
				// In real mode, this would use the fetch API
				console.log(`[API-READY] GET ${endpoint}`);
				// Implementation would change, but interface stays the same
				return Promise.resolve({} as T);
			},
			
			async post<T>(endpoint: string, data: any): Promise<T> {
				console.log(`[API-READY] POST ${endpoint}`, data);
				return Promise.resolve({} as T);
			},
			
			async put<T>(endpoint: string, data: any): Promise<T> {
				console.log(`[API-READY] PUT ${endpoint}`, data);
				return Promise.resolve({} as T);
			},
			
			async delete<T>(endpoint: string): Promise<T> {
				console.log(`[API-READY] DELETE ${endpoint}`);
				return Promise.resolve({} as T);
			}
		};
	}

	/**
	 * Mock implementation of user verification that doesn't create new users
	 * Finds existing users by ID or email
	 */
	public static verifyUser(email: string, password: string): Promise<{
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
			setTimeout(() => {
				try {
					// Find user by email and password
					const user = db.users.find(u => 
						u.email === email && u.password === password);

					if (user) {
						// Return success with user data
						resolve({
							success: true,
							user: {
								id: String(user.id),
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
			}, 300);
		});
	}

	/**
	 * Updates user's last connection timestamp
	 * @param userId - The user's ID
	 */
	public static updateUserLastConnection(userId: string): Promise<void> {
		const numericId = parseInt(userId.replace(/\D/g, ''));
		this.logRequest('PUT', `/api/users/${numericId}/last-connection`);
		
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					// Find user by ID
					const userIndex = db.users.findIndex(u => u.id === numericId);
					
					if (userIndex !== -1) {
						// Update last login
						db.users[userIndex].last_login = new Date().toISOString();
						
						// Persist changes
						persistDb();
						
						resolve();
					} else {
						reject(new Error(`User with ID ${numericId} not found`));
					}
				} catch (error) {
					reject(error);
				}
			}, 200);
		});
	}

	/**
	 * Helper method to ensure auth_users exists in localStorage
	 */
	private static initializeAuthUsers(): void {
		if (!localStorage.getItem('auth_users')) {
			localStorage.setItem('auth_users', '[]');
		}
	}

	// Call this in the constructor or as a static initialization
	static {
		DbService.initializeAuthUsers();
	}

	// Add a method to reset the database (useful for testing)
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
		persistDb();
		console.log('Database reset to initial state');
		
		// Also clear legacy storage
		localStorage.removeItem('auth_users');
		localStorage.removeItem('auth_user');
	}
	
	// Add a method to export the current database state (useful for debugging)
	static exportDatabase(): any {
		return JSON.parse(JSON.stringify(db));
	}

	/**
	 * Helper to ensure ID is always a string for UI operations
	 */
	public static ensureStringId(id: number | string): string {
		return typeof id === 'number' ? String(id) : id;
	}

	/**
	 * Helper to ensure ID is always a number for database operations
	 */
	public static ensureNumericId(id: number | string): number {
		if (typeof id === 'number') return id;
		
		// Handle 'user_12345' or string numeric formats
		if (id.includes('_')) {
			const parts = id.split('_');
			return parseInt(parts[parts.length - 1], 10);
		}
		return parseInt(id, 10);
	}

	/**
	 * Helper to check if a user is logged in
	 * Returns undefined if no user is logged in
	 */
	public static getCurrentUser(): any | undefined {
		try {
			const userStr = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
			if (!userStr) return undefined;
			
			return JSON.parse(userStr);
		} catch (error) {
			console.error('Error getting current user:', error);
			return undefined;
		}
	}

	/**
	 * Gets all goals for a specific match
	 * @param matchId - ID of the match to get goals for
	 */
	static getMatchGoals(matchId: number): Promise<any[]> {
		this.logRequest('GET', `/api/matches/${matchId}/goals`);
		
		return new Promise((resolve, reject) => {
			try {
				// We need to access the db variable directly, not through this.loadDb()
				// since loadDb is a module function, not a class method
				const goals = db.goals.filter((goal: any) => goal.match_id === matchId);
				
				console.log(`Retrieved ${goals.length} goals for match ${matchId}`);
				resolve(goals);
			} catch (error) {
				console.error('Error fetching match goals:', error);
				reject(error);
			}
		});
	}

	/**
	 * Gets goals scored by a specific player in a specific match
	 * @param matchId - ID of the match
	 * @param playerId - ID of the player
	 */
	static getPlayerMatchGoals(matchId: number, playerId: number): Promise<any[]> {
		this.logRequest('GET', `/api/matches/${matchId}/players/${playerId}/goals`);
		
		return new Promise((resolve, reject) => {
			try {
				// Access the db variable directly
				// Note: We need to use player property, not player_id
				const playerGoals = db.goals.filter((goal: any) => 
					goal.match_id === matchId && goal.player === playerId
				);
				
				console.log(`Retrieved ${playerGoals.length} goals for player ${playerId} in match ${matchId}`);
				resolve(playerGoals);
			} catch (error) {
				console.error('Error fetching player match goals:', error);
				reject(error);
			}
		});
	}

	/**
	 * Reinitializes the database from the JSON template
	 * This is useful when you've updated the source JSON file and want to reload it
	 */
	static reinitializeFromJson(): Promise<void> {
		this.logRequest('POST', '/api/admin/reinitialize-from-json');
		
		return new Promise((resolve) => {
			try {
				console.log('Reinitializing database from JSON template...');
				
				// Clear existing data in localStorage
				localStorage.removeItem('pong_db');
				
				// Reload from JSON template
				db = JSON.parse(JSON.stringify(dbTemplate));
				
				// Ensure meta data is present
				if (!db.meta) {
					db.meta = {
						user_id_sequence: 5, // Assuming we have 4 users
						match_id_sequence: 8, // Assuming we have 7 matches
						goal_id_sequence: 27 // Assuming we have 26 goals
					};
				}
				
				// Persist to localStorage
				persistDb();
				
				// Also update legacy storage
				this.syncLegacyStorage();
				
				console.log('Database reinitialized successfully from JSON template');
				resolve();
			} catch (error) {
				console.error('Error reinitializing database:', error);
				resolve(); // Resolve anyway to prevent hanging
			}
		});
	}

	/**
	 * Marks a match as completed
	 * @param matchId - The match ID
	 * @param duration - Match duration in seconds
	 * @param timeout - Whether the match ended due to timeout
	 */
	static completeMatch(matchId: number, duration: number, timeout: boolean = false): Promise<Match> {
		this.logRequest('PUT', `/api/matches/${matchId}`, {
			completed: true,
			duration,
			timeout
		});
		
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					// Find match by ID
					const matchIndex = db.matches.findIndex(m => m.id === matchId);
					
					if (matchIndex !== -1) {
						// Update match
						db.matches[matchIndex].completed = true;
						db.matches[matchIndex].duration = duration;
						db.matches[matchIndex].timeout = timeout;
						
						// Persist changes
						persistDb();
						
						// Return updated match
						resolve({
							...db.matches[matchIndex],
							created_at: new Date(db.matches[matchIndex].created_at)
						});
					} else {
						reject(new Error(`Match with ID ${matchId} not found`));
					}
				} catch (error: any) {
					reject(error);
				}
			}, 200);
		});
	}
}
