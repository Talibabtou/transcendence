import { User, Match, Goal, AuthResponse, LeaderboardEntry } from '@website/types';
import { AppStateManager } from '@website/scripts/utils';
import { NotificationManager, ErrorResponse } from '@website/scripts/services';
import { API_PREFIX, AUTH, GAME, USER, SOCIAL } from '@shared/constants/path.const';
import { ILogin, IAddUser, IReplyUser, IReplyLogin } from '@shared/types/auth.types';
import { IGetPicResponse } from '@shared/types/gateway.types';
import { IReplyGetFriend, IReplyFriendStatus } from '@shared/types/friends.types';
import { ErrorCodes } from '@shared/constants/error.const';


/**
 * Service class for handling database operations
 * Uses API calls to interact with the backend
 */
export class DbService {
	// =========================================
	// CORE API METHODS
	// =========================================
	
	/**
	 * Main method to interact with the API
	 */
	private static async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_PREFIX}${endpoint}`;
		
		// Get token from the correct storage type - use sessionStorage by default
		// This ensures each tab can maintain its own session
		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		
		// Default headers
		const defaultHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
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
				headers: effectiveHeaders
			});

			return this.handleApiResponse<T>(response);
		} catch (error) {
			this.handleFetchError(error);
			throw error;
		}
	}

	/**
	 * Process the API response
	 */
	private static async handleApiResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData: ErrorResponse = await response.json().catch(() => ({
				statusCode: response.status,
				code: 'UNKNOWN_ERROR',
				error: 'Unknown Error',
				message: 'An unknown error occurred processing the response'
			}));
			throw errorData;
		}
		
		const contentType = response.headers.get("content-type");
		
		// Handle 204 No Content responses
		if (response.status === 204) {
			return Promise.resolve(null as unknown as T);
		}

		// Handle JSON responses
		if (contentType && contentType.includes("application/json")) {
			const text = await response.text();
			
			// Handle empty but successful responses
			if (text.length === 0 && response.status === 200) {
				return Promise.resolve({ success: true } as unknown as T);
			}
			
			// Parse JSON response
			try {
				return JSON.parse(text) as T;
			} catch (e) {
				NotificationManager.showError("Invalid JSON response from server");
				throw new Error("Invalid JSON response from server");
			}
		}
		
		return Promise.resolve(null as unknown as T);
	}
	
	/**
	 * Handle errors that occur during fetch
	 */
	private static handleFetchError(error: unknown): void {
		if (error instanceof Error) {
			// Handle token expiration
			if (error.message.includes('expired') || 
				error.message.includes('JWT') || 
				error.message.includes('token')) {
				
				// Clear token and log out
				sessionStorage.removeItem('jwt_token');
				
				// Show appropriate notification
				NotificationManager.handleErrorCode(ErrorCodes.JWT_EXP_TOKEN);
				
				// Log out the user
				import('../utils/app-state').then(({ appState }) => {
					appState.logout();
				});
			} else if (error.message.includes('NetworkError') || 
					  error.message.includes('Failed to fetch')) {
				// Handle network errors
				NotificationManager.handleErrorCode('network_error');
			} else {
				// Handle other errors
				NotificationManager.handleError(error);
			}
		} else {
			// Handle unknown error types
			NotificationManager.showError('An unknown error occurred');
		}
	}
	
	/**
	 * Helper method to standardize API request logging
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

	// =========================================
	// AUTHENTICATION OPERATIONS
	// =========================================
	
	/**
	 * Registers a new user
	 */
	static async register(userData: IAddUser): Promise<AuthResponse> {
		this.logRequest('POST', `${AUTH.REGISTER}`, {
			username: userData.username,
			email: userData.email,
			password: '********',
		});
		
		const userResponse = await this.fetchApi<IReplyUser>(`${AUTH.REGISTER}`, {
			method: 'POST',
			body: JSON.stringify(userData)
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
				theme: '#ffffff'
			},
			token: ''
		};
	}

	/**
	 * Authenticates a user with email and password
	 */
	static async login(credentials: ILogin): Promise<AuthResponse> {
		this.logRequest('POST', `${AUTH.LOGIN}`, {
			email: credentials.email,
			password: '********'
		});
		
		const loginResponse = await this.fetchApi<IReplyLogin>(`${AUTH.LOGIN}`, {
			method: 'POST',
			body: JSON.stringify(credentials)
		});
		
		if (loginResponse.status === 'NEED_2FA') {
			return {
				success: false,
				requires2FA: true,
				user: {
					id: loginResponse.id || '',
					username: loginResponse.username || 'User',
					created_at: new Date(),
					auth_method: 'email'
				},
				token: loginResponse.token
			};
		}
		
		return {
			success: true,
			user: {
				id: loginResponse.id || '',
				username: loginResponse.username || '',
				email: credentials.email,
				created_at: new Date(),
				last_login: new Date(),
				auth_method: 'email',
				theme: '#ffffff'
			},
			token: loginResponse.token
		};
	}
	
	/**
	 * Guest login for tournament/game registration
	 */
	static async guestLogin(credentials: ILogin): Promise<AuthResponse> {
		this.logRequest('POST', `${AUTH.GUEST_LOGIN}`, {
			email: credentials.email,
			password: '********',
			context: 'guest'
		});
		
		const loginResponse = await this.fetchApi<IReplyLogin>(`${AUTH.GUEST_LOGIN}`, {
			method: 'POST',
			body: JSON.stringify(credentials)
		});
		
		if (loginResponse.status === 'NEED_2FA') {
			return {
				success: false,
				requires2FA: true,
				user: {
					id: loginResponse.id || '',
					username: loginResponse.username || 'User',
					created_at: new Date(),
					auth_method: 'email'
				},
				token: loginResponse.token
			};
		}
		
		return {
			success: true,
			user: {
				id: loginResponse.id || '',
				username: loginResponse.username || '',
				email: credentials.email,
				created_at: new Date(),
				last_login: new Date(),
				auth_method: 'email',
				theme: '#ffffff'
			},
			token: ''
		};
	}
	
	/**
	 * Logs out the current user
	 */
	static async logout(userId: string): Promise<void> {
		this.logRequest('POST', `${AUTH.LOGOUT}`, { userId });
		
		try {
			await this.fetchApi<void>(`${AUTH.LOGOUT}`, {
				method: 'POST',
				body: JSON.stringify({ userId })
			});
		} finally {
			AppStateManager.getInstance().logout();
		}
	}
	
	/**
	 * Generate a new 2FA secret and QR code
	 */
	static async generate2FA(): Promise<{ qrcode: string, otpauth: string }> {
		this.logRequest('GET', `${AUTH.TWO_FA.GENERATE}`);
		return this.fetchApi<{ qrcode: string, otpauth: string }>(`${AUTH.TWO_FA.GENERATE}`, {
			method: 'GET'
		});
	}

	/**
	 * Validate a 2FA code
	 */
	static async validate2FA(code: string): Promise<void> {
		this.logRequest('POST', `${AUTH.TWO_FA.VALIDATE}`, { twofaCode: '******' });
		return this.fetchApi<void>(`${AUTH.TWO_FA.VALIDATE}`, {
			method: 'POST',
			body: JSON.stringify({ twofaCode: code })
		});
	}

	/**
	 * Disable 2FA for a user
	 */
	static async disable2FA(): Promise<void> {
		this.logRequest('PATCH', `${AUTH.TWO_FA.DISABLE}`);
		return this.fetchApi<void>(`${AUTH.TWO_FA.DISABLE}`, {
			method: 'PATCH',
			body: JSON.stringify({})
		});
	}

	/**
	 * Verify 2FA code during login
	 */
	static async verify2FALogin(userId: string, code: string, token: string): Promise<void> {
		this.logRequest('POST', `${AUTH.TWO_FA.VALIDATE}`, { userId, twofaCode: '******' });
		
		// Special case: needs custom fetch for token handling
		const response = await fetch(`${API_PREFIX}${AUTH.TWO_FA.VALIDATE}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ 
				twofaCode: code
			})
		});
		
		// Use our standard response handler
		return this.handleApiResponse<void>(response);
	}

	/**
	 * Check if a user has 2FA enabled
	 */
	static async check2FAStatus(): Promise<boolean> {
		this.logRequest('GET', `${AUTH.TWO_FA.STATUS}`);
		
		try {
			const response = await this.fetchApi<{ two_factor_enabled: boolean }>(`${AUTH.TWO_FA.STATUS}`);
			return response.two_factor_enabled || false;
		} catch (error) {
			// Suppress error and default to false
			return false;
		}
	}

	// =========================================
	// USER OPERATIONS
	// =========================================
	
	/**
	 * Retrieves user information by ID
	 */
	static async getUser(id: string): Promise<User> {
		this.logRequest('GET', `${USER.BY_ID(id)}`);
		return this.fetchApi<User>(USER.BY_ID(id));
	}
	
	/**
	 * Retrieves user ID by username
	 */
	static async getIdByUsername(username: string): Promise<string> {
		this.logRequest('GET', `${USER.BY_USERNAME(username)}`);
		const user = await this.fetchApi<User>(USER.BY_USERNAME(username));
		return user.id;
	}

	/**
	 * Updates user information
	 */
	static async updateUser(userId: string, userData: Partial<User>): Promise<User> {
		this.logRequest('PATCH', `${USER.ME_UPDATE} (for user ${userId})`, userData);
		return this.fetchApi<User>(USER.ME_UPDATE, {
			method: 'PATCH',
			body: JSON.stringify(userData)
		});
	}
	
	/**
	 * Get user profile
	 */
	static async getUserProfile(userId: string): Promise<any> {
		this.logRequest('GET', `${USER.PROFILE}/${userId}`);
		const userProfile = await this.fetchApi<any>(`${USER.PROFILE}/${userId}`);
		
		// Normalize profile picture URL if it exists
		if (userProfile?.pics?.link) {
			if (userProfile.pics.link === 'default') {
				userProfile.pics.link = '/images/default-avatar.svg';
			} else {
				const pathParts = userProfile.pics.link.split('/');
				const fileName = pathParts[pathParts.length - 1];
				
				if (fileName === 'default') {
					userProfile.pics.link = '/images/default-avatar.svg';
				}
			}
		}
		
		return userProfile;
	}

	/**
	 * Get user profile history
	 */
	static async getUserHistory(userId: string): Promise<any> {
		this.logRequest('GET', `${USER.PROFILE_HISTORY(userId)}`);
		return this.fetchApi<any>(`${USER.PROFILE_HISTORY(userId)}`);
	}

	/**
	 * Gets the uploaded profile picture link for a user
	 */
	static async getPic(userId: string): Promise<IGetPicResponse> {
		this.logRequest('GET', `${USER.PROFILE_PIC_LINK(userId)}`);
		const response = await this.fetchApi<IGetPicResponse>(USER.PROFILE_PIC_LINK(userId));
		
		if (response?.link) {
			const pathParts = response.link.split('/');
			const fileName = pathParts[pathParts.length - 1];
			
			if (fileName === 'default') {
				response.link = '/images/default-avatar.svg';
			} else {
				response.link = `http://localhost:8085/uploads/${fileName}`;
			}
		}
		
		return response;
	}

	/**
	 * Update user profile picture
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
	
	/**
	 * Gets username for a given user ID
	 */
	static async getUsernameById(id: string): Promise<string> {
		this.logRequest('GET', `/auth/username/${id}`);
		try {
			const response = await this.fetchApi<{username: string}>(`/auth/username/${id}`);
			return response.username;
		} catch (error) {
			return 'Unknown User';
		}
	}

	// =========================================
	// MATCH & GAME OPERATIONS
	// =========================================
	
	/**
	 * Gets all matches for a user
	 */
	static async getUserMatches(userId: string, page?: number, pageSize?: number): Promise<Match[]> {
		const queryParams = new URLSearchParams();
		queryParams.append('player_id', userId);
		queryParams.append('active', 'false');
		
		if (page !== undefined && pageSize !== undefined) {
			queryParams.append('offset', String(page * pageSize));
			queryParams.append('limit', String(pageSize));
		}
		
		this.logRequest('GET', `${GAME.BASE}?${queryParams.toString()}`);
		return this.fetchApi<Match[]>(`${GAME.BASE}?${queryParams.toString()}`);
	}

	/**
	 * Creates a new match between two players
	 */
	static async createMatch(player1Id: string, player2Id: string, tournamentId?: string): Promise<Match> {
		this.logRequest('POST', `${GAME.MATCH.BASE}`, { player1Id, player2Id, tournamentId });
		
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
	 */
	static async recordGoal(matchId: string, playerId: string, duration: number): Promise<Goal> {
		this.logRequest('POST', `${GAME.GOALS.BASE}/${playerId}`, { matchId, duration });
		
		return this.fetchApi<Goal>(`${GAME.GOALS.BASE}/${playerId}`, {
			method: 'POST',
			body: JSON.stringify({
				match_id: matchId,
				duration
			})
		});
	}
	
	/**
	 * Retrieves detailed statistics for a user
	 */
	static async getUserStats(userId: string): Promise<any> {
		this.logRequest('GET', `${GAME.MATCH.STATS(userId)}`);
		return this.fetchApi<any>(`${GAME.MATCH.STATS(userId)}`);
	}

	/**
	 * Retrieves global leaderboard data
	 */
	static async getLeaderboard(): Promise<LeaderboardEntry[]> {
		this.logRequest('GET', `${GAME.LEADERBOARD}`);
		return this.fetchApi<LeaderboardEntry[]>(`${GAME.LEADERBOARD}?limit=100&offset=0`);
	}

	/**
	 * Gets tournament information
	 */
	static async getTournament(tournamentId: string ): Promise<any> {
		this.logRequest('GET', `${GAME.TOURNAMENT.BASE}/${tournamentId}`);
		return this.fetchApi<any>(`${GAME.TOURNAMENT.BASE}/${tournamentId}`);
	}

	/**
	 * Gets a player's ELO rating
	 */
	static async getPlayerElo(playerId: string): Promise<any> {
		this.logRequest('GET', `${GAME.ELO.BY_ID(playerId)}`);
		return this.fetchApi<any>(`${GAME.ELO.BY_ID(playerId)}`);
	}

	// =========================================
	// FRIEND OPERATIONS
	// =========================================

	/**
	 * Get friendship status between two users
	 */
	static async getFriendship(friendId: string): Promise<IReplyFriendStatus | null> {
		this.logRequest('GET', `${SOCIAL.FRIENDS.CHECK(friendId)}`);
		try {
			const response = await this.fetchApi<IReplyFriendStatus>(`${SOCIAL.FRIENDS.CHECK(friendId)}`);
			if (!response || Object.keys(response).length === 0) {
				return null;
			}
			return response;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Get all friends for a user
	 */
	static async getFriendList(userId: string): Promise<IReplyGetFriend[]> {
		this.logRequest('GET', `${SOCIAL.FRIENDS.ALL.BY_ID(userId)}`);
		const friends = await this.fetchApi<IReplyGetFriend[]>(`${SOCIAL.FRIENDS.ALL.BY_ID(userId)}`);
		
		// Normalize profile picture URLs
		if (Array.isArray(friends)) {
			friends.forEach(friend => {
				if (friend.pic === 'default') {
					friend.pic = '/images/default-avatar.svg';
				}
			});
		}
		
		return friends;
	}

	/**
	 * Get current user's friends
	 */
	static async getMyFriends(): Promise<IReplyGetFriend[]> {
		this.logRequest('GET', `${SOCIAL.FRIENDS.ALL.ME}`);
		const friends = await this.fetchApi<IReplyGetFriend[]>(`${SOCIAL.FRIENDS.ALL.ME}`);
		
		// Normalize profile picture URLs
		if (Array.isArray(friends)) {
			friends.forEach(friend => {
				if (friend.pic === 'default') {
					friend.pic = '/images/default-avatar.svg';
				}
			});
		}
		
		return friends;
	}

	/**
	 * Send a friend request to another user
	 */
	static async addFriend(friendId: string): Promise<any> {
		this.logRequest('POST', `${SOCIAL.FRIENDS.CREATE}`, { id: friendId });
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.CREATE}`, {
			method: 'POST',
			body: JSON.stringify({ id: friendId })
		});
	}

	/**
	 * Accept a friend request
	 */
	static async acceptFriendRequest(friendId: string): Promise<any> {
		this.logRequest('PATCH', `${SOCIAL.FRIENDS.ACCEPT}`, { id: friendId });
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.ACCEPT}`, {
			method: 'PATCH',
			body: JSON.stringify({ id: friendId })
		});
	}

	/**
	 * Remove an existing friend
	 */
	static async removeFriend(friendId: string): Promise<any> {
		this.logRequest('DELETE', `${SOCIAL.FRIENDS.DELETE.BY_ID(friendId)}`);
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.DELETE.BY_ID(friendId)}`, {
			method: 'DELETE',
			body: JSON.stringify({})
		});
	}

	/**
	 * Remove all friends
	 */
	static async removeAllFriends(): Promise<any> {
		this.logRequest('DELETE', `${SOCIAL.FRIENDS.DELETE.ALL}`);
		
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.DELETE.ALL}`, {
			method: 'DELETE'
		});
	}
}
