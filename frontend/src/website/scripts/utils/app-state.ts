import { ApiError, Router } from '@website/scripts/utils';
import { ErrorCodes } from '@shared/constants/error.const';
import { AppState, AccentColor, ACCENT_COLORS } from '@website/types';



// Define state change listener type
type StateChangeListener = (newState: Partial<AppState>, oldState: Partial<AppState>) => void;

export class AppStateManager {
	// Singleton instance
	private static instance: AppStateManager;
	
	// The current state
	private state: AppState = {
		auth: {
			isAuthenticated: false,
			user: null,
			jwtToken: null
		},
		accentColor: 'white',
		accentColors: {
			accent1: '#ffffff',
			accent2: '#ffffff',
			accent3: '#ffffff',
			accent4: '#ffffff'
		},
		players: {}
	};
	
	// Listeners for state changes
	private listeners: StateChangeListener[] = [];
	
	// Private constructor for singleton
	private constructor() {
		// Initialize state from storage
		this.initializeFromStorage();
		
		// Listen for storage events (for multi-tab support)
		window.addEventListener('storage', this.handleStorageChange.bind(this));
		
		// Add event listener to clear non-persistent sessions on page unload/refresh
		window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
	}
	
	/**
	 * Get the singleton instance
	 */
	public static getInstance(): AppStateManager {
		if (!AppStateManager.instance) {
			AppStateManager.instance = new AppStateManager();
		}
		return AppStateManager.instance;
	}
	
	/**
	 * Initialize state from database and localStorage/sessionStorage
	 */
	private initializeFromStorage(): void {
		// First check sessionStorage (tab-specific)
		const sessionUser = sessionStorage.getItem('auth_user');
		const sessionToken = sessionStorage.getItem('jwt_token');
		
		// Then check localStorage (shared across tabs)
		const localUser = localStorage.getItem('auth_user');
		const localToken = localStorage.getItem('jwt_token');
		
		// Prioritize the current tab's session
		const storedUser = sessionUser || localUser;
		const token = sessionToken || localToken;
		
		if (storedUser && token) {
			try {
				const user = JSON.parse(storedUser);
				
				this.state.auth.isAuthenticated = true;
				this.state.auth.user = user;
				this.state.auth.jwtToken = token;
				
				// Get user's theme from the database if possible
				if (user.id) {
					// Import DbService and get fresh user data
					import('./db').then(({ DbService }) => {
						// Try to get the latest user data from the database
						DbService.getUser(user.id)
							.then(dbUser => {
								// If user has a theme in the database, use it
								if (dbUser.theme) {
									// Find corresponding accent color by hex value
									const colorEntry = Object.entries(ACCENT_COLORS).find(
										([_, hexValue]) => hexValue.toLowerCase() === dbUser.theme?.toLowerCase()
									);
									
									if (colorEntry) {
										this.state.accentColor = colorEntry[0] as AccentColor;
										// Also set as accent1 (host accent)
										this.state.accentColors.accent1 = dbUser.theme;
										// Apply immediately
										this.applyAccentColorToCSS();
									}
								}
							})
							.catch(err => {
								if (err instanceof ApiError) {
									if (err.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
										console.warn('User not found in database, using stored value');
										// Fallback to stored theme
										this.applyStoredTheme(user);
									} else {
										console.warn(`API error when fetching user theme: ${err.message}`);
										this.applyStoredTheme(user);
									}
								} else {
									console.warn('Could not fetch user theme from database, using stored value', err);
									// Fallback to stored theme
									this.applyStoredTheme(user);
								}
							});
					});
				} else {
					// Fallback to stored theme
					this.applyStoredTheme(user);
				}
				
				console.log('AppState: Restored auth state from storage', {
					user: user.username || user.pseudo,
					persistent: !!sessionUser,
					theme: user.theme
				});
			} catch (error) {
				console.error('Failed to parse stored user data', error);
				localStorage.removeItem('auth_user');
				sessionStorage.removeItem('auth_user');
			}
		} else {
			// For non-authenticated users, use default white
			this.state.accentColor = 'white';
			this.state.accentColors.accent1 = '#ffffff';
			// Apply immediately
			this.applyAccentColorToCSS();
		}
	}
	
	/**
	 * Apply theme from stored user data (fallback)
	 */
	private applyStoredTheme(user: any): void {
		if (user.theme) {
			// Find corresponding accent color by hex value
			const colorEntry = Object.entries(ACCENT_COLORS).find(
				([_, hexValue]) => hexValue.toLowerCase() === user.theme.toLowerCase()
			);
			
			if (colorEntry) {
				this.state.accentColor = colorEntry[0] as AccentColor;
				// Also set as accent1 (host accent)
				this.state.accentColors.accent1 = user.theme;
				// Apply immediately
				this.applyAccentColorToCSS();
			}
		}
	}
	
	/**
	 * Handle storage events (for multi-tab support)
	 */
	private handleStorageChange(event: StorageEvent): void {
		// Only respond to localStorage changes when using persistent storage
		// This prevents conflicts between tabs using different accounts
		const isPersistent = localStorage.getItem('auth_persistent') === 'true';
		
		if (event.key === 'jwt_token' && isPersistent) {
			// Only update the token if this tab is using persistent storage
			if (isPersistent) {
				this.initializeFromStorage();
				this.notifyListeners({
					auth: { ...this.state.auth }
				}, {});
			}
		} else if (event.key === 'app_accent_color') {
			// Handle theme changes which are not session-specific
			this.initializeFromStorage();
			this.notifyListeners({
				accentColor: this.state.accentColor,
				accentColors: { ...this.state.accentColors }
			}, {});
		}
	}
	
	/**
	 * Get the current state
	 */
	public getState(): AppState {
		return { ...this.state };
	}
	
	/**
	 * Update the state
	 */
	public setState(newState: Partial<AppState>): void {
		const oldState = { ...this.state };
		
		// Update state
		this.state = {
			...this.state,
			...newState,
			// Handle nested objects
			auth: newState.auth ? { ...this.state.auth, ...newState.auth } : this.state.auth,
			accentColors: newState.accentColors ? { ...this.state.accentColors, ...newState.accentColors } : this.state.accentColors,
			players: newState.players ? { ...this.state.players, ...newState.players } : this.state.players
		};
		
		// Notify listeners
		this.notifyListeners(newState, oldState);
		
		// Persist relevant state to storage
		this.persistState();
	}
	
	/**
	 * Persist state to storage
	 */
	private persistState(): void {
		// Persist auth state
		if (this.state.auth.isAuthenticated && this.state.auth.user) {
			// Store the user object with theme
			const user = {
				...this.state.auth.user,
				theme: ACCENT_COLORS[this.state.accentColor]
			};
			
			// Check if we should use persistent storage
			const isPersistent = user.persistent === true;
			
			// Store the persistence preference
			localStorage.setItem('auth_persistent', isPersistent.toString());
			
			if (isPersistent) {
				localStorage.setItem('auth_user', JSON.stringify(user));
				sessionStorage.removeItem('auth_user');
			} else {
				sessionStorage.setItem('auth_user', JSON.stringify(user));
				localStorage.removeItem('auth_user');
			}
			
			// Store token if available
			if (this.state.auth.jwtToken) {
				if (isPersistent) {
					localStorage.setItem('jwt_token', this.state.auth.jwtToken);
					sessionStorage.removeItem('jwt_token');
				} else {
					sessionStorage.setItem('jwt_token', this.state.auth.jwtToken);
					localStorage.removeItem('jwt_token');
				}
			}
		} else {
			// Clear auth data if not authenticated
			localStorage.removeItem('auth_user');
			sessionStorage.removeItem('auth_user');
			localStorage.removeItem('jwt_token');
			sessionStorage.removeItem('jwt_token');
		}
		
		// No need to store app_accent_color separately
		localStorage.removeItem('app_accent_color');
		
		// Apply accent color to CSS variables
		this.applyAccentColorToCSS();
	}
	
	/**
	 * Apply the current accent color to CSS variables
	 */
	private applyAccentColorToCSS(): void {
		// Apply multiple accent colors for players
		document.documentElement.style.setProperty('--accent1-color', this.state.accentColors.accent1);
		document.documentElement.style.setProperty('--accent2-color', this.state.accentColors.accent2);
		document.documentElement.style.setProperty('--accent3-color', this.state.accentColors.accent3);
		document.documentElement.style.setProperty('--accent4-color', this.state.accentColors.accent4);
	}
	
	/**
	 * Subscribe to state changes
	 */
	public subscribe(listener: StateChangeListener): () => void {
		this.listeners.push(listener);
		
		// Return unsubscribe function
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener);
		};
	}
	
	/**
	 * Notify listeners of state changes
	 */
	private notifyListeners(newState: Partial<AppState>, oldState: Partial<AppState>): void {
		this.listeners.forEach(listener => {
			try {
				listener(newState, oldState);
			} catch (error) {
				console.error('Error in state change listener', error);
			}
		});
	}
	
	/**
	 * Login user
	 */
	public login(user: any, token?: string, persistent: boolean = false): void {
		// Store persistence preference
		localStorage.setItem('auth_persistent', persistent.toString());
		
		// Set this user's theme as accent1 (host accent)
		if (user.theme) {
			this.state.accentColors.accent1 = user.theme;
		}
		
		// Update state
		this.setState({
			auth: {
				isAuthenticated: true,
				user,
				jwtToken: token || null
			}
		});
		
		// Dispatch event for backward compatibility
		const authEvent = new CustomEvent('user-authenticated', {
			detail: { 
				user,
				persistent
			}
		});
		document.dispatchEvent(authEvent);
		
		// Refresh components after login
		setTimeout(() => {
			Router.refreshAllComponents();
		}, 100);
	}
	
	/**
	 * Logout user
	 */
	public logout(): void {
		// Update state
		this.setState({
			auth: {
				isAuthenticated: false,
				user: null,
				jwtToken: null
			}
		});
		
		// Clear storage
		localStorage.removeItem('auth_user');
		sessionStorage.removeItem('auth_user');
		localStorage.removeItem('jwt_token');
		sessionStorage.removeItem('jwt_token');
		localStorage.removeItem('auth_persistent');
		
		// Refresh components after logout
		setTimeout(() => {
			Router.refreshAllComponents();
		}, 100);
	}
	
	/**
	 * Check if user is authenticated
	 */
	public isAuthenticated(): boolean {
		return this.state.auth.isAuthenticated;
	}
	
	/**
	 * Get current user
	 */
	public getCurrentUser(): any | null {
		return this.state.auth.user;
	}
	
	/**
	 * Set accent color and update user theme in database
	 */
	public setAccentColor(color: AccentColor): void {
		if (ACCENT_COLORS[color]) {
			// Only update state if color is valid
			const colorHex = ACCENT_COLORS[color];
			
			// Update both accentColor and accent1
			this.setState({ 
				accentColor: color,
				accentColors: {
					...this.state.accentColors,
					accent1: colorHex
				}
			});
			
			// If user is authenticated, update their theme in the database
			if (this.state.auth.isAuthenticated && this.state.auth.user) {
				const userId = this.state.auth.user.id;
				
				// Import DbService dynamically to avoid circular dependencies
				import('./db').then(({ DbService }) => {
					// Update user's theme in the database
					DbService.updateUserTheme(userId, colorHex)
						.then(() => {
							// Also update the user object in memory
							this.state.auth.user.theme = colorHex;
						})
						.catch(error => {
							if (error instanceof ApiError) {
								if (error.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
									console.error('User not found when updating theme');
								} else {
									console.error(`Failed to update user theme: ${error.message}`);
								}
							} else {
								console.error('Failed to update user theme in database:', error);
							}
						});
				});
			}
		}
	}
	
	/**
	 * Set accent color for a specific player (1-4)
	 */
	public setPlayerAccentColor(playerIndex: number, colorHex: string | undefined): void {
		if (playerIndex < 1 || playerIndex > 4) {
			console.error('Invalid player index, must be 1-4');
			return;
		}
		
		// Update the specific accent color
		const accentKey = `accent${playerIndex}` as keyof typeof this.state.accentColors;
		
		this.setState({
			accentColors: {
				...this.state.accentColors,
				[accentKey]: colorHex
			}
		});
		
		// If this is player 1 (host), also update the main accent color
		if (playerIndex === 1) {
			// Find color name from hex
			const colorEntry = Object.entries(ACCENT_COLORS).find(
				([_, hexValue]) => hexValue.toLowerCase() === colorHex?.toLowerCase() || ''
			);
			
			if (colorEntry) {
				this.setState({ accentColor: colorEntry[0] as AccentColor });
			}
		}
	}
	
	/**
	 * Get current accent color
	 */
	public getAccentColor(): AccentColor {
		return this.state.accentColor;
	}
	
	/**
	 * Get accent color hex value
	 */
	public getAccentColorHex(): string {
		return ACCENT_COLORS[this.state.accentColor];
	}
	
	/**
	 * Get player accent color
	 */
	public getPlayerAccentColor(playerIndex: number): string {
		if (playerIndex < 1 || playerIndex > 4) {
			console.error('Invalid player index, must be 1-4');
			return '#ffffff'; // Default white
		}
		
		const accentKey = `accent${playerIndex}` as keyof typeof this.state.accentColors;
		return this.state.accentColors[accentKey];
	}
	
	/**
	 * Get all available accent colors
	 */
	public getAvailableColors(): Record<AccentColor, string> {
		return { ...ACCENT_COLORS };
	}
	
	/**
	 * Handle page unload/refresh - clear non-persistent sessions
	 */
	private handlePageUnload(): void {
		// Check if we're using non-persistent storage
		const isPersistent = localStorage.getItem('auth_persistent') === 'true';
		
		if (!isPersistent && this.state.auth.isAuthenticated) {
			// Clear session storage for non-persistent sessions
			sessionStorage.removeItem('auth_user');
			sessionStorage.removeItem('jwt_token');
		}
	}
	
	/**
	 * Update user data in the app state
	 */
	public updateUserData(userData: Partial<{username: string, email: string, profilePicture: string, password: string}>) {
		const currentUser = this.getCurrentUser();
		if (currentUser) {
			this.setState({
				auth: {
					...this.state.auth,
					user: {
						...currentUser,
						...userData
					}
				}
			});
		}
	}
	
	/**
	 * Set player name in the app state
	 */
	public setPlayerName(playerId: string, username: string): void {
		this.setState({
			players: {
				...this.state.players,
				[playerId]: {
					...this.state.players[playerId],
					username
				}
			}
		});
	}
	
	/**
	 * Set player avatar in the app state
	 */
	public setPlayerAvatar(playerId: string, pfp: string): void {
		this.setState({
			players: {
				...this.state.players,
				[playerId]: {
					...this.state.players[playerId],
					pfp: pfp
				}
			}
		});
	}
	
	/**
	 * Update player theme in the app state and database
	 */
	public updatePlayerTheme(playerId: string, colorHex: string): void {
		// Update player accent color based on position (1-4)
		const position = this.getPlayerPosition(playerId);
		if (position > 0) {
			this.setPlayerAccentColor(position, colorHex);
		}
		
		// If this is the current user, also update in database
		const currentUser = this.getCurrentUser();
		if (currentUser && currentUser.id === playerId) {
			import('./db').then(({ DbService }) => {
				DbService.updateUserTheme(playerId, colorHex)
					.catch(error => {
						console.error('Failed to update user theme in database:', error);
					});
			});
		}
	}
	
// Helper method to get player position from ID
	private getPlayerPosition(playerId: string): number {
		const playerData = this.state.players[playerId];
		return playerData?.position || 0;
	}
}

export const appState = AppStateManager.getInstance();
