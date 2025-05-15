import { User, Match, Goal, AuthResponse, OAuthRequest, LeaderboardEntry } from '@website/types';
import { ApiError, ErrorResponse } from '@website/scripts/utils';
import { API_PREFIX, AUTH, GAME, USER } from '@shared/constants/path.const';
import { ILogin, IAddUser, IReplyUser, IReplyLogin } from '@shared/types/auth.types';
import { IGetPicResponse } from '@shared/types/gateway.types';

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
		
		// Get token from the correct storage type - use sessionStorage by default
		// This ensures each tab can maintain its own session
		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		
		const headers = {
			'Content-Type': 'application/json',
			...(token && { 'Authorization': `Bearer ${token}` }),
			...options.headers
		};

		try {
			const response = await fetch(url, {
				...options,
				headers
			});

			return this.handleApiResponse<T>(response);
		} catch (error) {
			// Handle token-related errors
			if (error instanceof ApiError) {
				// Only clear the token from the current tab's session
				sessionStorage.removeItem('jwt_token');
				
				// Import dynamically to avoid circular dependencies
				const { appState } = await import('./app-state');
				appState.logout();
				throw new Error('Your session has expired. Please log in again.');
			}
			throw error;
		}
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
			const userResponse = await this.fetchApi<IReplyUser>(`${AUTH.REGISTER}`, {
				method: 'POST',
				body: JSON.stringify(userData)
			});
			
			const loginResponse = await this.fetchApi<IReplyLogin>(`${AUTH.LOGIN}`, {
				method: 'POST',
				body: JSON.stringify({
					email: userData.email,
					password: userData.password
				})
			});
			
			return {
				success: true,
				user: {
					id: userResponse.id,
					username: userResponse.username,
					email: userResponse.email,
					created_at: new Date(),
					last_login: new Date(),
					auth_method: 'email',
					theme: '#ffffff' // Default theme, appState will initialize/override
				},
				token: loginResponse.token // Ensure token is returned
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
			const loginResponse = await this.fetchApi<IReplyLogin>(`${AUTH.LOGIN}`, {
				method: 'POST',
				body: JSON.stringify(credentials)
			});
			
			if (loginResponse.status === '2fa') {
				return {
					success: false,
					requires2FA: true,
					user: {
						id: loginResponse.id || '',
						username: loginResponse.username || 'User',
						created_at: new Date(),
						auth_method: 'email'
					},
					token: loginResponse.token // Pass token even for 2FA start
				};
			}
			
			return {
				success: true,
				user: {
					id: loginResponse.id || '',
					username: loginResponse.username || '',
					email: credentials.email, // Use email from input as loginResponse might not have it
					created_at: new Date(), // Or from loginResponse if available
					last_login: new Date(), // Or from loginResponse if available
					auth_method: 'email',
					theme: '#ffffff' // Default theme, appState will initialize/override
				},
				token: loginResponse.token // Ensure token is returned
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
		this.logRequest('POST', `${AUTH.LOGOUT}`, { userId });
		
		try {
			await this.fetchApi<void>(`${AUTH.LOGOUT}`, {
				method: 'POST'
			});
		} finally {
			// Always clear tokens on logout regardless of API response
			localStorage.removeItem('jwt_token');
			sessionStorage.removeItem('jwt_token');
		}
	}

	// =========================================
	// USER OPERATIONS
	// =========================================
	
	/**
	 * Retrieves user information by ID
	 * @param id - The user's ID
	 */
	static async getUser(id: string): Promise<User> {
		this.logRequest('GET', `${API_PREFIX}${USER.BY_ID(id)}`);
		return this.fetchApi<User>(USER.BY_ID(id));
	}
	
	/**
	 * Retrieves user information by ID
	 * @param id - The user's ID
	 */
	static async getIdByUsername(username: string): Promise<string> {
		this.logRequest('GET', `${API_PREFIX}${USER.BY_USERNAME(username)}`);
		const user = await this.fetchApi<User>(USER.BY_USERNAME(username));
		return user.id;
	}

	/**
	 * Updates user information
	 * @param userId - The user's ID
	 * @param userData - Object containing user data to update
	 * @returns Promise with updated user data
	 */
	static async updateUser(userId: string, userData: Partial<User>): Promise<User> {
		this.logRequest('PATCH', `${API_PREFIX}${USER.BY_ID(userId)}`, userData);
		
		return this.fetchApi<User>(USER.BY_ID(userId), {
			method: 'PATCH',
			body: JSON.stringify(userData)
		});
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
		queryParams.append('active', 'false');
		
		if (page !== undefined && pageSize !== undefined) {
			queryParams.append('offset', String(page * pageSize));
			queryParams.append('limit', String(pageSize));
		}
		
		this.logRequest('GET', `${API_PREFIX}${GAME.BASE}?${queryParams.toString()}`);
		return this.fetchApi<Match[]>(`${GAME.BASE}?${queryParams.toString()}`);
	}

	/**
	 * Creates a new match between two players
	 * @param player1Id - First player's ID
	 * @param player2Id - Second player's ID
	 * @param tournamentId - Optional tournament ID
	 */
	static async createMatch(player1Id: string, player2Id: string, tournamentId?: string): Promise<Match> {
		this.logRequest('POST', `${API_PREFIX}${GAME.MATCH.BASE}`, { player1Id, player2Id, tournamentId });
		
		return this.fetchApi<Match>(`${GAME.MATCH.BASE}`, {
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
		this.logRequest('POST', `${API_PREFIX}${GAME.GOALS.BASE}/${playerId}`, { matchId, duration });
		
		return this.fetchApi<Goal>(`${GAME.GOALS.BASE}/${playerId}`, {
			method: 'POST',
			body: JSON.stringify({
				match_id: matchId,
				duration
			})
		});
	}

	// =========================================
	// STATISTICS & LEADERBOARD
	// =========================================
	
	/**
	 * Retrieves detailed statistics for a user
	 * @param userId - The user's ID
	 */
	static async getUserStats(userId: string): Promise<any> {
		this.logRequest('GET', `${API_PREFIX}${GAME.MATCH.STATS(userId)}`);
		return this.fetchApi<any>(`${GAME.MATCH.STATS(userId)}`);
	}

	/**
	 * Retrieves global leaderboard data
	 */
	static async getLeaderboard(): Promise<LeaderboardEntry[]> {
		this.logRequest('GET', `${API_PREFIX}${GAME.LEADERBOARD}`);
		return this.fetchApi<LeaderboardEntry[]>(`${GAME.LEADERBOARD}?limit=100&offset=0`);
	}

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
		this.logRequest('GET', `${API_PREFIX}${GAME.ELO.BY_ID(playerId)}`);
		return this.fetchApi<any>(`${GAME.ELO.BY_ID(playerId)}`);
	}

	/**
	 * Get user profile
	 * @param userId - The UUID of the user
	 */
	static async getUserProfile(userId: string): Promise<any> {
		this.logRequest('GET', `${API_PREFIX}${USER.PROFILE}/${userId}`);
		return this.fetchApi<any>(`${USER.PROFILE}/${userId}`);
	}

	/**
	 * Gets the uploaded profile picture link for a user.
	 * The endpoint is /profile/pics/:id, served by the profile service.
	 * @param userId - The user's ID
	 * @returns Promise with the picture link object e.g. { link: "/uploads/picture.jpg" }
	 */
	static async getPic(userId: string): Promise<IGetPicResponse> {
		this.logRequest('GET', `${API_PREFIX}${USER.PROFILE_PIC_LINK(userId)}`);
		return this.fetchApi<IGetPicResponse>(USER.PROFILE_PIC_LINK(userId));
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
				headers: {}
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
}