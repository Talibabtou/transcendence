import { User, Match, Goal, AuthResponse, LeaderboardEntry } from '@website/types';
import { AppStateManager } from '@website/scripts/utils';
import { NotificationManager, ErrorResponse, navigate } from '@website/scripts/services';
import { GameManager } from '@website/scripts/components/game';
import { API_PREFIX, AUTH, GAME, USER, SOCIAL } from '@shared/constants/path.const';
import { ILogin, IAddUser, IReplyUser, IReplyLogin } from '@shared/types/auth.types';
import { IGetPicResponse } from '@shared/types/gateway.types';
import { IReplyGetFriend, IReplyFriendStatus } from '@shared/types/friends.types';
import { ErrorCodes } from '@shared/constants/error.const';

export class DbService {
	// =========================================
	// CORE API UTILITIES
	// =========================================

	/**
	 * Makes an API request to the backend with proper authentication and error handling
	 * @param endpoint - The API endpoint to call
	 * @param options - Optional fetch request configuration
	 * @returns Promise resolving to the response data of type T
	 */
	private static async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_PREFIX}${endpoint}`;
		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		const defaultHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (token) {
			defaultHeaders['Authorization'] = `Bearer ${token}`;
		}

		let effectiveHeaders: HeadersInit = { ...defaultHeaders, ...options.headers };

		if (options.body instanceof FormData) {
			const headersForFormData: Record<string, string> = {};
			if (token) {
				headersForFormData['Authorization'] = `Bearer ${token}`;
			}
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
	 * Processes and validates API responses, handling different content types and status codes
	 * @param response - The fetch Response object to process
	 * @returns Promise resolving to the parsed response data of type T
	 */
	private static async handleApiResponse<T>(response: Response): Promise<T> {
		if (response.status >= 400) {
			if (response.status === 403) {
				const { appState } = await import('../utils/app-state');
				appState.logout();
			}
			const gameManager = GameManager.getInstance();
			if (gameManager.isMainGameActive()) {
				gameManager.cleanupMainGame();
				gameManager.showBackgroundGame();
				navigate('/');
			}
			if (response.status >= 500) {
				throw new Error(response.statusText);
			}
			else {
				const errorData = await response.json();
				throw new Error(errorData.message);
			}
		}
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
				NotificationManager.showError("Invalid JSON response from server");
				throw new Error("Invalid JSON response from server");
			}
		}
		
		return Promise.resolve(null as unknown as T);
	}
	
	/**
	 * Handles fetch errors, including token expiration and network issues
	 * @param error - The error that occurred during the fetch operation
	 */
	private static handleFetchError(error: unknown): void {
		if (error instanceof Error) {
			if (error.message.includes('expired') || 
				error.message.includes('JWT') || 
				error.message.includes('token')) {
				sessionStorage.removeItem('jwt_token');
				NotificationManager.handleErrorCode(ErrorCodes.JWT_EXP_TOKEN);
				import('../utils/app-state').then(({ appState }) => {
					appState.logout();
				});
			} else if (error.message.includes('NetworkError') || 
						error.message.includes('Failed to fetch')) {
				NotificationManager.handleErrorCode('network_error');
			} else {
				NotificationManager.handleError(error);
			}
		} else {
			NotificationManager.showError('An unknown error occurred');
		}
	}

	// =========================================
	// AUTHENTICATION OPERATIONS
	// =========================================

	/**
	 * Registers a new user in the system
	 * @param userData - User registration data including username, email and password
	 * @returns Promise resolving to authentication response with user data and token
	 */
	static async register(userData: IAddUser): Promise<AuthResponse> {
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
	 * @param credentials - Login credentials including email and password
	 * @returns Promise resolving to authentication response with user data and token
	 */
	static async login(credentials: ILogin): Promise<AuthResponse> {
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
	 * Authenticates a guest user for tournament/game registration
	 * @param credentials - Guest login credentials
	 * @returns Promise resolving to authentication response with guest user data
	 */
	static async guestLogin(credentials: ILogin): Promise<AuthResponse> {
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
	 * Logs out the current user by invalidating their session and clearing local state
	 * @param userId - The ID of the user to log out
	 * @returns Promise that resolves when logout is complete
	 */
	static async logout(userId: string): Promise<void> {
		try {
			await this.fetchApi<void>(`${AUTH.LOGOUT}`, {
				method: 'POST',
				body: JSON.stringify({ userId })
			});
		} finally {
			AppStateManager.getInstance().logout();
		}
	}
	
	// =========================================
	// TWO-FACTOR AUTHENTICATION
	// =========================================
	
	/**
	 * Generates a new 2FA secret and QR code for setting up two-factor authentication
	 * @returns Promise resolving to an object containing the QR code and OTP auth URL
	 */
	static async generate2FA(): Promise<{ qrcode: string, otpauth: string }> {
		return this.fetchApi<{ qrcode: string, otpauth: string }>(`${AUTH.TWO_FA.GENERATE}`, {
			method: 'GET'
		});
	}

	/**
	 * Validates a 2FA code for the current user
	 * @param code - The 2FA code to validate
	 * @returns Promise that resolves when validation is complete
	 */
	static async validate2FA(code: string): Promise<void> {
		return this.fetchApi<void>(`${AUTH.TWO_FA.VALIDATE_GENERATE}`, {
			method: 'POST',
			body: JSON.stringify({ twofaCode: code })
		});
	}

	/**
	 * Disables two-factor authentication for the current user
	 * @returns Promise that resolves when 2FA is disabled
	 */
	static async disable2FA(): Promise<void> {
		return this.fetchApi<void>(`${AUTH.TWO_FA.DISABLE}`, {
			method: 'PATCH',
			body: JSON.stringify({})
		});
	}

	/**
	 * Verifies a 2FA code during the login process
	 * @param userId - The ID of the user attempting to log in
	 * @param code - The 2FA code to verify
	 * @param token - The temporary authentication token
	 * @returns Promise that resolves when verification is complete
	 */
	static async verify2FALogin(_userId: string, code: string, token: string): Promise<void> {
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

		return this.handleApiResponse<void>(response);
	}

	/**
	 * Checks if two-factor authentication is enabled for the current user
	 * @returns Promise resolving to true if 2FA is enabled, false otherwise
	 */
	static async check2FAStatus(): Promise<boolean> {
		try {
			const response = await this.fetchApi<{ two_factor_enabled: boolean }>(`${AUTH.TWO_FA.STATUS}`);
			return response.two_factor_enabled || false;
		} catch (error) {
			return false;
		}
	}

	// =========================================
	// USER OPERATIONS
	// =========================================
	
	/**
	 * Retrieves detailed user information by ID
	 * @param id - The user ID to look up
	 * @returns Promise resolving to the user object
	 */
	static async getUser(id: string): Promise<User> {
		const encodedId = encodeURIComponent(id);
		return this.fetchApi<User>(USER.BY_ID(encodedId));
	}
	
	/**
	 * Retrieves a user's ID by their username
	 * @param username - The username to look up
	 * @returns Promise resolving to the user's ID
	 */
	static async getIdByUsername(username: string): Promise<string> {
		const encodedUsername = encodeURIComponent(username);
		const user = await this.fetchApi<User>(USER.BY_USERNAME(encodedUsername));
		return user.id;
	}

	/**
	 * Updates a user's information
	 * @param userId - The ID of the user to update
	 * @param userData - Partial user object containing fields to update
	 * @returns Promise resolving to the updated user object
	 */
	static async updateUser(_userId: string, userData: Partial<User>): Promise<User> {
		return this.fetchApi<User>(USER.ME_UPDATE, {
			method: 'PATCH',
			body: JSON.stringify(userData)
		});
	}
	
	/**
	 * Retrieves a user's complete profile information
	 * @param userId - The ID of the user whose profile to retrieve
	 * @returns Promise resolving to the user's profile data
	 */
	static async getUserProfile(userId: string): Promise<any> {
		const encodedUserId = encodeURIComponent(userId);
		
		try {
			const userProfile = await this.fetchApi<any>(`${USER.PROFILE}/${encodedUserId}`);

			if (userProfile?.pics?.link) {
				if (userProfile.pics.link === 'default') {
					userProfile.pics.link = '/images/default-avatar.svg';
				} else {
					userProfile.pics.link = `https://localhost:$HTTPS_PORT${userProfile.pics.link}`;
				}
			}
			return userProfile;
		} catch (error) {
			if (error instanceof Error) {
				const errorMessage = error.message.toLowerCase();
				if (errorMessage.includes('404') || errorMessage.includes('not found')) {
					NotificationManager.showError('User profile not found');
					navigate('/');
					return null;
				}
				if (errorMessage.includes('400') || errorMessage.includes('pattern')) {
					NotificationManager.showError('Invalid profile ID format');
					navigate('/');
					return null;
				}
			}
			throw error;
		}
	}

	/**
	 * Retrieves a user's profile history
	 * @param userId - The ID of the user whose history to retrieve
	 * @returns Promise resolving to the user's profile history data
	 */
	static async getUserHistory(userId: string): Promise<any> {
		const encodedUserId = encodeURIComponent(userId);
		return this.fetchApi<any>(`${USER.PROFILE_HISTORY(encodedUserId)}`);
	}

	/**
	 * Gets the URL for a user's profile picture
	 * @param userId - The ID of the user whose picture to retrieve
	 * @returns Promise resolving to an object containing the picture URL
	 */
	static async getPic(userId: string): Promise<IGetPicResponse> {
		const encodedUserId = encodeURIComponent(userId);
		const response = await this.fetchApi<IGetPicResponse>(USER.PROFILE_PIC_LINK(encodedUserId));
		
		if (response?.link) {
			const pathParts = response.link.split('/');
			const fileName = pathParts[pathParts.length - 1];
			
			if (fileName === 'default') {
				response.link = '/images/default-avatar.svg';
			} else {
				response.link = `https://localhost:$HTTPS_PORT/uploads/${fileName}`;
			}
		}
		
		return response;
	}

	/**
	 * Updates a user's profile picture
	 * @param imageData - Either a base64 string or File object containing the image data
	 * @returns Promise resolving to the upload response
	 */
	static async updateProfilePicture(imageData: string | File): Promise<any> {
		try {
			if (typeof imageData === 'string') {
				return this.fetchApi<any>(`${USER.UPLOADS}`, {
					method: 'POST',
					body: JSON.stringify({ file: imageData }),
				});
			} else {
				const formData = new FormData();
				formData.append('file', imageData);
				
				const response = await this.fetchApi<any>(`${USER.UPLOADS}`, {
					method: 'POST',
					body: formData,
					headers: {}
				});
				
				return response || { success: true };
			}
		} catch (error) {
			if (error instanceof TypeError && error.message.includes('null')) {
				return { success: true };
			}
			throw error;
		}
	}
	
	/**
	 * Retrieves a username by user ID
	 * @param id - The user ID to look up
	 * @returns Promise resolving to the username
	 */
	static async getUsernameById(id: string): Promise<string> {
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
	 * Creates a new match between two players, optionally within a tournament
	 * @param player1Id - The ID of the first player
	 * @param player2Id - The ID of the second player
	 * @param tournamentId - Optional ID of the tournament this match belongs to
	 * @returns Promise resolving to the created Match object
	 */
	static async createMatch(player1Id: string, player2Id: string, tournamentId?: string, isFinal: boolean = false): Promise<Match> {
		return this.fetchApi<Match>(`${GAME.MATCH.BASE}`, {
			method: 'POST',
			body: JSON.stringify({
				player_1: player1Id,
				player_2: player2Id,
				tournament_id: tournamentId || null,
				final: isFinal
			})
		});
	}

	/**
	 * Records a goal scored during a match
	 * @param matchId - The ID of the match where the goal was scored
	 * @param playerId - The ID of the player who scored the goal
	 * @param duration - The time in seconds when the goal was scored
	 * @returns Promise resolving to the created Goal object
	 */
	static async recordGoal(matchId: string, playerId: string, duration: number): Promise<Goal> {
		return this.fetchApi<Goal>(`${GAME.GOALS.BASE}/${playerId}`, {
			method: 'POST',
			body: JSON.stringify({
				match_id: matchId,
				duration
			})
		});
	}
	
	/**
	 * Retrieves detailed game statistics for a specific user
	 * @param userId - The ID of the user whose statistics to retrieve
	 * @returns Promise resolving to an object containing user statistics
	 */
	static async getUserStats(userId: string): Promise<any> {
		return this.fetchApi<any>(`${GAME.MATCH.STATS(userId)}`);
	}

	/**
	 * Retrieves the global leaderboard data
	 * @returns Promise resolving to an array of LeaderboardEntry objects, limited to top 100 players
	 */
	static async getLeaderboard(): Promise<LeaderboardEntry[]> {
		return this.fetchApi<LeaderboardEntry[]>(`${GAME.LEADERBOARD}?limit=100&offset=0`);
	}

	/**
	 * Retrieves detailed information about a specific tournament
	 * @param tournamentId - The ID of the tournament to retrieve
	 * @returns Promise resolving to tournament information
	 */
	static async getTournament(tournamentId: string): Promise<any> {
		return this.fetchApi<any>(`${GAME.TOURNAMENT.BASE}/${tournamentId}`);
	}

	/**
	 * Retrieves the finalists for a tournament based on server-side logic
	 * @param tournamentId - The ID of the tournament to retrieve finalists for
	 * @returns Promise resolving to FinalResultObject containing finalist player IDs
	 */
	static async getTournamentFinalists(tournamentId: string): Promise<any> {
		return this.fetchApi<any>(`${GAME.TOURNAMENT.FINALS(tournamentId)}`);
	}

	/**
	 * Retrieves the current ELO rating for a specific player
	 * @param playerId - The ID of the player whose ELO rating to retrieve
	 * @returns Promise resolving to the player's ELO rating information
	 */
	static async getPlayerElo(playerId: string): Promise<any> {
		const encodedPlayerId = encodeURIComponent(playerId);
		return this.fetchApi<any>(`${GAME.ELO.BY_ID(encodedPlayerId)}`);
	}

	// =========================================
	// FRIEND OPERATIONS
	// =========================================

	/**
	 * Retrieves the friendship status between the current user and another user
	 * @param friendId - The ID of the user to check friendship status with
	 * @returns Promise resolving to IReplyFriendStatus object or null if no relationship exists
	 */
	static async getFriendship(friendId: string): Promise<IReplyFriendStatus | null> {
		const encodedFriendId = encodeURIComponent(friendId);
		try {
			const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}
			
			const url = `${API_PREFIX}${SOCIAL.FRIENDS.CHECK(encodedFriendId)}`;
			const response = await fetch(url, { headers });
			
			if (response.status === 404) {
				return null;
			}
			
			return this.handleApiResponse<IReplyFriendStatus>(response);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Retrieves the complete friend list for a specific user
	 * @param userId - The ID of the user whose friends to retrieve
	 * @returns Promise resolving to an array of IReplyGetFriend objects
	 */
	static async getFriendList(userId: string): Promise<IReplyGetFriend[]> {
		const encodedUserId = encodeURIComponent(userId);
		const friends = await this.fetchApi<IReplyGetFriend[]>(`${SOCIAL.FRIENDS.ALL.BY_ID(encodedUserId)}`);
		
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
	 * Retrieves the complete friend list for the currently authenticated user
	 * @returns Promise resolving to an array of IReplyGetFriend objects
	 */
	static async getMyFriends(): Promise<IReplyGetFriend[]> {
		const friends = await this.fetchApi<IReplyGetFriend[]>(`${SOCIAL.FRIENDS.ALL.ME}`);
		
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
	 * Sends a friend request to another user
	 * @param friendId - The ID of the user to send the friend request to
	 * @returns Promise resolving to the API response
	 */
	static async addFriend(friendId: string): Promise<any> {
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.CREATE}`, {
			method: 'POST',
			body: JSON.stringify({ id: friendId })
		});
	}

	/**
	 * Accepts a pending friend request from another user
	 * @param friendId - The ID of the user whose friend request to accept
	 * @returns Promise resolving to the API response
	 */
	static async acceptFriendRequest(friendId: string): Promise<any> {
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.ACCEPT}`, {
			method: 'PATCH',
			body: JSON.stringify({ id: friendId })
		});
	}

	/**
	 * Removes a specific user from the current user's friend list
	 * @param friendId - The ID of the friend to remove
	 * @returns Promise resolving to the API response
	 */
	static async removeFriend(friendId: string): Promise<any> {
		const encodedFriendId = encodeURIComponent(friendId);
		return this.fetchApi<any>(`${SOCIAL.FRIENDS.DELETE.BY_ID(encodedFriendId)}`, {
			method: 'DELETE',
			body: JSON.stringify({})
		});
	}
}
