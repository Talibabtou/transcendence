import { User, Match, Goal, AuthResponse, OAuthRequest, LeaderboardEntry } from '@website/types';
import { ApiError, ErrorResponse } from '@website/scripts/utils';
import { API_PREFIX, AUTH, GAME, USER, SOCIAL } from '@shared/constants/path.const';
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
		
		// Default headers
		const defaultHeaders: Record<string, string> = {
			'Content-Type': 'application/json', // Default, will be omitted for FormData
		};
		if (token) {
			defaultHeaders['Authorization'] = `Bearer ${token}`;
		}

		let effectiveHeaders: HeadersInit = { ...defaultHeaders, ...options.headers };

		// If the body is FormData, DO NOT set Content-Type manually.
		// The browser will set it correctly with the boundary.
		if (options.body instanceof FormData) {
			// Create new headers object, omitting Content-Type if it was the default one
			const headersForFormData: Record<string, string> = {};
			if (token) {
				headersForFormData['Authorization'] = `Bearer ${token}`;
			}
			// Add any custom headers from options.headers, *except* Content-Type
			if (options.headers) {
				for (const [key, value] of Object.entries(options.headers)) {
					if (key.toLowerCase() !== 'content-type') {
						headersForFormData[key] = value as string;
					}
				}
			}
			effectiveHeaders = headersForFormData;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers: effectiveHeaders // Use the potentially modified headers
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
			console.log('Received error data from server (status ' + response.status + '):', JSON.stringify(errorData, null, 2));
			throw new ApiError(errorData as ErrorResponse);
		}
		const contentType = response.headers.get("content-type");
		if (response.status === 204) {
			return Promise.resolve(null as unknown as T);
		}

		if (contentType && contentType.includes("application/json")) {
			const text = await response.text();
			if (text.length === 0 && response.status === 200) {
				return Promise.resolve({ success: true } as unknown as T);
			}
			try {
				return JSON.parse(text) as T;
			} catch (e) {
				console.error("Failed to parse JSON response even though Content-Type was application/json", text);
				throw new Error("Invalid JSON response from server.");
			}
		}
		return Promise.resolve(null as unknown as T);
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
		this.logRequest('PATCH', `${API_PREFIX}${USER.ME_UPDATE} (for user ${userId})`, userData);
		
		return this.fetchApi<User>(USER.ME_UPDATE, {
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
	 * Get user profile history
	 * @param userId - The UUID of the user
	 */
	static async getUserHistory(userId: string): Promise<any> {
		this.logRequest('GET', `${API_PREFIX}${USER.PROFILE_HISTORY(userId)}`);
		return this.fetchApi<any>(`${USER.PROFILE_HISTORY(userId)}`);
	}

	/**
	 * Gets the uploaded profile picture link for a user.
	 * The endpoint is /profile/pics/:id, served by the profile service.
	 * @param userId - The user's ID
	 * @returns Promise with the picture link object with a fully qualified path
	 */
	static async getPic(userId: string): Promise<IGetPicResponse> {
		this.logRequest('GET', `${API_PREFIX}${USER.PROFILE_PIC_LINK(userId)}`);
		const response = await this.fetchApi<IGetPicResponse>(USER.PROFILE_PIC_LINK(userId));
		
		if (response && response.link) {
			const pathParts = response.link.split('/');
			const fileName = pathParts[pathParts.length - 1];
			
			if (fileName === 'default') {
				response.link = '/public/images/default-avatar.svg';
			} else {
				response.link = `http://localhost:8085/uploads/${fileName}`;
			}
		}
		
		return response;
	}

	/**
	 * Update user profile picture
	 * @param imageData - Base64 encoded image data or File object
	 */
	static async updateProfilePicture(imageData: string | File): Promise<any> {
		this.logRequest('POST', `${USER.UPLOADS}`, { imageData: '...[truncated]' });
		
		// Handle different types of image data
		if (typeof imageData === 'string') {
			return this.fetchApi<any>(`${USER.UPLOADS}`, {
				method: 'POST',
				body: JSON.stringify({ file: imageData }),
			});
		} else {
			// File object
			const formData = new FormData();
			formData.append('file', imageData);
			
			return this.fetchApi<any>(`${USER.UPLOADS}`, {
				method: 'POST',
				body: formData,
				headers: {}
			});
		}
	}

	// =========================================
	// FRIEND OPERATIONS
	// =========================================

	/**
	 * Get friendship status between two users
	 * @param friendId - Friend's UUID to check
	 * @returns Promise with friendship status:
	 * - null: no friendship exists
	 * - { status: false }: pending friendship
	 * - { status: true }: accepted friendship
	 */
	static async getFriendship(friendId: string): Promise<{ status: boolean } | null> {
		this.logRequest('GET', `${API_PREFIX}${SOCIAL.FRIENDS.CHECK(friendId)}`);
		try {
			const response = await this.fetchApi<any>(`${SOCIAL.FRIENDS.CHECK(friendId)}`);
			if (!response || Object.keys(response).length === 0) {
				console.log("Friendship doesn't exist");
				
				return null;
			}
			console.log("Friendship exists");
			console.log(response);
			return { status: response.status === true };
		} catch (error) {
			console.log("Friendship check error:", error);
			return null;
		}
	}

	/**
	 * Get all friends for a user
	 * @param userId - User's UUID
	 * @returns Promise with list of friends
	 */
	static async getFriendList(userId: string): Promise<any> {
		this.logRequest('GET', `${API_PREFIX}${SOCIAL.FRIENDS.ALL.BY_ID(userId)}`);
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.ALL.BY_ID(userId)}`);
	}

	/**
	 * Get current user's friends
	 * @returns Promise with list of the current user's friends
	 */
	static async getMyFriends(): Promise<any> {
		this.logRequest('GET', `${API_PREFIX}${SOCIAL.FRIENDS.ALL.ME}`);
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.ALL.ME}`);
	}

	/**
	 * Send a friend request to another user
	 * @param userId - Current user UUID
	 * @param friendId - Friend's UUID
	 * @returns Promise with request status
	 */
	static async addFriend(friendId: string): Promise<any> {
		this.logRequest('POST', `${API_PREFIX}${SOCIAL.FRIENDS.CREATE}`, { 
			friend_id: friendId 
		});
		
		// Try both parameter formats since we're getting errors
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.CREATE}`, {
			method: 'POST',
			body: JSON.stringify({ 
				id: friendId
			})
		});
	}

	/**
	 * Accept a friend request
	 * @param userId - User accepting the request
	 * @param friendId - User who sent the request
	 * @returns Promise with acceptance status
	 */
	static async acceptFriendRequest(userId: string, friendId: string): Promise<any> {
		this.logRequest('PATCH', `${API_PREFIX}${SOCIAL.FRIENDS.ACCEPT}`, { user_id: userId, friend_id: friendId });
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.ACCEPT}`, {
			method: 'PATCH',
			body: JSON.stringify({ user_id: userId, friend_id: friendId })
		});
	}

	/**
	 * Remove an existing friend
	 * @param friendId - Friend's UUID to remove
	 * @returns Promise with removal status
	 */
	static async removeFriend(friendId: string): Promise<any> {
		this.logRequest('DELETE', `${API_PREFIX}${SOCIAL.FRIENDS.DELETE.BY_ID(friendId)}`);
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.DELETE.BY_ID(friendId)}`, {
			method: 'DELETE',
			body: JSON.stringify({})
		});
	}

	/**
	 * Remove all friends
	 * @returns Promise with removal status
	 */
	static async removeAllFriends(): Promise<any> {
		this.logRequest('DELETE', `${API_PREFIX}${SOCIAL.FRIENDS.DELETE.ALL}`);
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.DELETE.ALL}`, {
			method: 'DELETE'
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
