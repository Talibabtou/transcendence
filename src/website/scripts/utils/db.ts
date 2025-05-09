import { User, Match, Goal, AuthResponse, OAuthRequest, LeaderboardEntry } from '@website/types';
import { ApiError, ErrorResponse, createErrorResponse } from '@website/scripts/utils';
import { ErrorCodes } from '@shared/constants/error.const';
import { API_PREFIX, GAME, USER, AUTH, SOCIAL } from '@shared/constants/path.const';
import { ILogin, IAddUser, IReplyUser, IReplyLogin } from '@shared/types/auth.types';

// =========================================
// DATABASE SERVICE
// =========================================

/**
 * Service class for handling database operations
 * Uses API calls to interact with the backend
 */
export class DbService {
	private static async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_PREFIX}${endpoint}`;
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

	// =========================================
	// AUTHENTICATION OPERATIONS
	// =========================================
	
	/**
	 * Registers a new user
	 * @param userData - User registration data
	 */
	static async register(userData: IAddUser): Promise<AuthResponse> {
		this.logRequest('POST', `${AUTH.REGISTER}`, {
			username: userData.username,
			email: userData.email,
			password: '********',
		});
		
		try {
			// Call the backend register endpoint
			const userResponse = await this.fetchApi<IReplyUser>(`${AUTH.REGISTER}`, {
				method: 'POST',
				body: JSON.stringify({
					username: userData.username,
					email: userData.email,
					password: userData.password
				})
			});
			
			// Login to get the token
			const loginResponse = await this.fetchApi<IReplyLogin>(`${AUTH.LOGIN}`, {
				method: 'POST',
				body: JSON.stringify({
					email: userData.email,
					password: userData.password
				})
			});
			
			// Return properly formatted AuthResponse
			return {
				success: true,
				user: {
					id: userResponse.id,
					pseudo: userResponse.username,
					email: userResponse.email,
					created_at: new Date(),
					last_login: new Date(),
					auth_method: 'email',
					theme: '#ffffff'
				},
				token: loginResponse.token
			};
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Authenticates a user with email and password
	 * @param credentials - User credentials
	 */
	static async login(credentials: ILogin): Promise<AuthResponse> {
		this.logRequest('POST', `${AUTH.LOGIN}`, {
			email: credentials.email,
			password: '********'
		});
		
		try {
			// Call the backend login endpoint
			const loginResponse = await this.fetchApi<IReplyLogin>(`${AUTH.LOGIN}`, {
				method: 'POST',
				body: JSON.stringify(credentials)
			});
			
			// Handle 2FA if needed
			if (loginResponse.status === '2fa') {
				return {
					success: false,
					requires2FA: true,
					user: {
						id: loginResponse.id || '',
						pseudo: loginResponse.username || 'User',
						created_at: new Date(),
						auth_method: 'email'
					},
					token: loginResponse.token
				};
			}
			
			// Get user details
			const userResponse = await this.fetchApi<IReplyUser>(`${AUTH}/user/${loginResponse.id}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${loginResponse.token}`
				}
			});
			
			// Return properly formatted AuthResponse
			return {
				success: true,
				user: {
					id: userResponse.id,
					pseudo: userResponse.username,
					email: userResponse.email,
					created_at: new Date(),
					last_login: new Date(),
					auth_method: 'email',
					theme: '#ffffff'
				},
				token: loginResponse.token
			};
		} catch (error) {
			console.error('Login failed:', error);
			throw error;
		}
	}

	/**
	 * Authenticates a user with an OAuth provider
	 * @param oauthData - OAuth authentication data
	 */
	static async oauthLogin(oauthData: OAuthRequest): Promise<AuthResponse> {
		this.logRequest('POST', '/api/auth/oauth', {
			provider: oauthData.provider,
			code: oauthData.code.substring(0, 10) + '...',
			redirectUri: oauthData.redirectUri
		});
		
		return this.fetchApi<AuthResponse>('/auth/oauth', {
			method: 'POST',
			body: JSON.stringify(oauthData)
		});
	}
	
	/**
	 * Logs out the current user
	 * @param userId - The ID of the user to log out
	 */
	static async logout(userId: string): Promise<void> {
		this.logRequest('POST', '/api/auth/logout', { userId });
		
		return this.fetchApi<void>('/auth/logout', {
			method: 'POST'
		});
	}

	// =========================================
	// USER OPERATIONS
	// =========================================
	
	/**
	 * Retrieves user information by ID
	 * @param id - The user's ID
	 */
	static async getUser(id: string): Promise<User> {
		this.logRequest('GET', `/api/users/${id}`);
		return this.fetchApi<User>(`/users/${id}`);
	}

	/**
	 * Updates user information
	 * @param userId - The user's ID
	 * @param userData - Object containing user data to update
	 * @returns Promise with updated user data
	 */
	static async updateUser(userId: string, userData: Partial<User>): Promise<User> {
		this.logRequest('PUT', `/api/users/${userId}`, userData);
		
		return this.fetchApi<User>(`/users/${userId}`, {
			method: 'PUT',
			body: JSON.stringify(userData)
		});
	}

	/**
	 * Updates user theme/paddle color
	 * @param userId - The user's ID
	 * @param theme - Color value for the theme/paddle
	 */
	static async updateUserTheme(userId: string, theme: string): Promise<void> {
		this.logRequest('PUT', `/api/users/${userId}/theme`, { theme });
		
		await this.fetchApi<void>(`/users/${userId}/theme`, {
			method: 'PUT',
			body: JSON.stringify({ theme })
		});
		
		// Dispatch theme update event for app state synchronization
		const event = new CustomEvent('user:theme-updated', {
			detail: { userId, theme }
		});
		window.dispatchEvent(event);
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
	static async getUserMatches(userId: string, page?: number, pageSize?: number): Promise<Match[]> {
		const queryParams = new URLSearchParams();
		queryParams.append('player_id', userId);
		
		if (page !== undefined && pageSize !== undefined) {
			queryParams.append('offset', String(page * pageSize));
			queryParams.append('limit', String(pageSize));
		}
		
		this.logRequest('GET', `/api/users/${userId}/matches?${queryParams.toString()}`);
		return this.fetchApi<Match[]>(`/matches?${queryParams.toString()}`);
	}

	/**
	 * Creates a new match between two players
	 * @param player1Id - First player's ID
	 * @param player2Id - Second player's ID
	 * @param tournamentId - Optional tournament ID
	 */
	static async createMatch(player1Id: string, player2Id: string, tournamentId?: string): Promise<Match> {
		this.logRequest('POST', '/api/matches', { player1Id, player2Id, tournamentId });
		
		return this.fetchApi<Match>('/matches', {
			method: 'POST',
			body: JSON.stringify({
				player_1: player1Id,
				player_2: player2Id,
				tournament_id: tournamentId || null
			})
		});
	}

	/**
	 * Records a goal in a match
	 * @param matchId - The match ID
	 * @param playerId - The scoring player's ID
	 * @param duration - Time of goal in seconds from match start
	 */
	static async recordGoal(matchId: string, playerId: string, duration: number): Promise<Goal> {
		this.logRequest('POST', '/api/goals', { matchId, playerId, duration });
		
		return this.fetchApi<Goal>('/goals', {
			method: 'POST',
			body: JSON.stringify({
				match_id: matchId,
				player: playerId,
				duration
			})
		});
	}

	// =========================================
	// STATISTICS & LEADERBOARD
	// =========================================
	
	/**
	 * Retrieves statistics for a user
	 * @param userId - The user's ID
	 */
	static async getUserStats(userId: string): Promise<any> {
		this.logRequest('GET', `/api/users/${userId}/stats`);
		return this.fetchApi<any>(`/matches/stats/${userId}`);
	}

	/**
	 * Retrieves global leaderboard data
	 */
	static async getLeaderboard(): Promise<LeaderboardEntry[]> {
		this.logRequest('GET', '/api/leaderboard');
		return this.fetchApi<LeaderboardEntry[]>('/leaderboard?limit=100&offset=0');
	}

	/**
	 * Gets a match by ID with detailed information
	 * @param matchId The match ID to retrieve
	 * @returns Promise with the match details
	 */
	static async getMatchDetails(matchId: string): Promise<any> {
		this.logRequest('GET', `/api/matches/${matchId}`);
		return this.fetchApi<any>(`/matches/${matchId}`);
	}

	/**
	 * Gets all goals for a specific match
	 * @param matchId - ID of the match to get goals for
	 */
	static async getMatchGoals(matchId: string): Promise<any[]> {
		this.logRequest('GET', `/api/matches/${matchId}/goals`);
		return this.fetchApi<any[]>(`/goals?match_id=${matchId}`);
	}

	/**
	 * Gets all matches for a tournament
	 * @param tournamentId - The tournament ID
	 */
	static async getTournamentMatches(tournamentId: string): Promise<Match[]> {
		this.logRequest('GET', `/api/tournaments/${tournamentId}/matches`);
		return this.fetchApi<Match[]>(`/matches?tournament_id=${tournamentId}`);
	}

	/**
	 * Updates match status (active/completed)
	 * @param matchId - The match ID
	 * @param active - Whether the match is active 
	 * @param duration - Duration of the match in seconds
	 */
	static async updateMatchStatus(matchId: string, active: boolean, duration: number): Promise<Match> {
		this.logRequest('PUT', `/api/matches/${matchId}`, { active, duration });
		
		return this.fetchApi<Match>(`/matches/${matchId}`, {
			method: 'PUT',
			body: JSON.stringify({ active, duration })
		});
	}

	// =========================================
	// Helper methods
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
	 * ADDITIONAL API METHODS
	 */

	/**
	 * Gets tournament information
	 * @param tournamentId - Tournament UUID
	 */
	static async getTournament(tournamentId: string): Promise<any> {
		this.logRequest('GET', `/api/tournaments/${tournamentId}`);
		return this.fetchApi<any>(`/tournaments/${tournamentId}`);
	}

	/**
	 * Gets a player's ELO rating
	 * @param playerId - Player's UUID
	 */
	static async getPlayerElo(playerId: string): Promise<any> {
		this.logRequest('GET', `/api/elo?player=${playerId}`);
		return this.fetchApi<any>(`/elo?player=${playerId}`);
	}

	/**
	 * Get user profile
	 * @param userId - The UUID of the user
	 */
	static async getUserProfile(userId: string): Promise<any> {
		this.logRequest('GET', `/api/profile/${userId}`);
		return this.fetchApi<any>(`/profile/${userId}`);
	}

	/**
	 * Update user profile picture
	 * @param userId - The UUID of the user
	 * @param imageData - Base64 encoded image data or File object
	 */
	static async updateProfilePicture(userId: string, imageData: string | File): Promise<any> {
		this.logRequest('PUT', `/api/profile/${userId}/picture`, { imageData: '...[truncated]' });
		
		// Handle different types of image data
		if (typeof imageData === 'string') {
			// Base64 encoded string
			return this.fetchApi<any>(`/profile/${userId}/picture`, {
				method: 'PUT',
				body: JSON.stringify({ image: imageData }),
			});
		} else {
			// File object
			const formData = new FormData();
			formData.append('image', imageData);
			
			return this.fetchApi<any>(`/profile/${userId}/picture`, {
				method: 'PUT',
				body: formData,
				headers: {} // Let browser set proper content-type for form data
			});
		}
	}

	/**
	 * Get friendship status
	 * @param userId - Current user UUID
	 * @param friendId - Friend's UUID
	 */
	static async getFriendship(userId: string, friendId: string): Promise<any> {
		this.logRequest('GET', `/api/friends/${userId}/${friendId}`);
		return this.fetchApi<any>(`/friends/${userId}/${friendId}`);
	}

	/**
	 * Add a friend
	 * @param userId - Current user UUID
	 * @param friendId - Friend's UUID
	 */
	static async addFriend(userId: string, friendId: string): Promise<any> {
		this.logRequest('POST', `/api/friends`, { user_id: userId, friend_id: friendId });
		
		return this.fetchApi<any>('/friends', {
			method: 'POST',
			body: JSON.stringify({ user_id: userId, friend_id: friendId })
		});
	}
}
