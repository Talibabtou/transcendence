import { Router } from '@website/scripts/utils';
import { AppState, AccentColor, ACCENT_COLORS } from '@website/types';

// Define state change listener type
type StateChangeListener = (newState: Partial<AppState>, oldState: Partial<AppState>) => void;

export class AppStateManager {
	// Singleton instance
	private static instance: AppStateManager;
	
	// --- Accent Color LocalStorage Constants ---
	private static ACCENT_COLOR_STORAGE_KEY = 'playerAccentColors';
	private static DEFAULT_ACCENT_COLOR = '#ffffff';
	
	// The current state
	private state: AppState = {
		auth: {
			isAuthenticated: false,
			user: null,
			jwtToken: null
		},
		accentColor: 'white',
		accentColors: {
			accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent2: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent3: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent4: AppStateManager.DEFAULT_ACCENT_COLOR
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
		window.addEventListener('beforeunload', this.handlePageUnload);

		// Listen for our custom theme update event to keep state in sync
		window.addEventListener('user:theme-updated', this.handleUserThemeUpdatedEvent);
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
	 * Handles storage changes from other tabs/windows.
	 */
	private handleStorageChange = (event: StorageEvent): void => {
		const oldStateSnapshot = JSON.parse(JSON.stringify(this.state)); // Deep copy for accurate old state

		const reinitializeAndNotify = () => {
			this.initializeFromStorage(); // Updates this.state and calls applyAccentColorToCSS
			const changedParts: Partial<AppState> = {
				auth: this.state.auth,
				accentColor: this.state.accentColor,
				accentColors: this.state.accentColors,
			};
			this.notifyListeners(changedParts, oldStateSnapshot);
			if (oldStateSnapshot.auth.isAuthenticated !== this.state.auth.isAuthenticated ||
				(oldStateSnapshot.auth.user?.id !== this.state.auth.user?.id)) {
				Router.refreshAllComponents();
			}
		};
	
		if (!event.key) { // Storage.clear() was called in another tab
			console.log('AppStateManager: Detected storage.clear() event.');
			reinitializeAndNotify();
			return;
		}
	
		switch (event.key) {
			case 'auth_user':
			case 'jwt_token':
			case 'auth_persistent':
				console.log('AppStateManager: Storage change for auth key:', event.key);
				reinitializeAndNotify();
				break;
	
			case AppStateManager.ACCENT_COLOR_STORAGE_KEY:
				console.log('AppStateManager: Storage change for accent colors.');
				// This key stores themes for ALL users.
				// Check if the CURRENT logged-in user's theme changed.
				if (this.state.auth.isAuthenticated && this.state.auth.user) {
					const userId = this.state.auth.user.id;
					const newStoredTheme = AppStateManager.getUserAccentColor(userId); // Fresh from localStorage
	
					if (this.state.auth.user.theme !== newStoredTheme) {
						// The current user's theme preference changed in localStorage. Update app state.
						const newAccentColorName = (Object.keys(ACCENT_COLORS) as AccentColor[]).find(
							key => ACCENT_COLORS[key].toLowerCase() === newStoredTheme.toLowerCase()
						) || 'white';
						
						// Use setState to update, which handles notifications and persistence.
						this.setState({
							auth: {
								...this.state.auth,
								user: {
									...this.state.auth.user,
									theme: newStoredTheme,
								},
							},
							accentColor: newAccentColorName,
							accentColors: { // Also update accent1 if current user is player 1
								...this.state.accentColors,
								accent1: newStoredTheme,
							},
						});
						// setState calls persistState which calls applyAccentColorToCSS.
					} else {
						// User's theme didn't change, but the storage key did.
						// This might be for another user or a general update.
						// Re-apply CSS in case other player accent colors (accent2-4) are affected,
						// though currently they are not directly tied to this storage event in a reactive way.
						this.applyAccentColorToCSS();
					}
				} else {
					// No user logged in, but playerAccentColors changed.
					// This shouldn't affect current app state's accentColor or auth.
					// Just re-apply CSS.
					this.applyAccentColorToCSS();
				}
				break;
			default:
				// Not a key we're actively tracking for multi-tab sync in this specific way
				break; 
		}
	};
	
	/**
	 * Handles the 'user:theme-updated' event dispatched by setUserAccentColor.
	 * This ensures that if one component changes a user's color, other parts of appState
	 * (like the current user's theme or positional colors) are updated.
	 */
	private handleUserThemeUpdatedEvent = (event: Event): void => {
		const customEvent = event as CustomEvent<{ userId: string, theme: string }>;
		if (!customEvent.detail) return;

		const { userId, theme } = customEvent.detail;

		if (this.state.auth.user && this.state.auth.user.id === userId) {
			const newAccentColorName = (Object.keys(ACCENT_COLORS) as AccentColor[]).find(key => ACCENT_COLORS[key].toLowerCase() === theme.toLowerCase()) || 'white';
			this.setState({
				auth: {
					...this.state.auth,
					user: {
						...this.state.auth.user,
						theme: theme
					}
				},
				accentColor: newAccentColorName,
				accentColors: { ...this.state.accentColors, accent1: theme }
			});
		}
	};
	
	/**
	 * Initialize state from database and localStorage/sessionStorage
	 */
	private initializeFromStorage(): void {
		const sessionUser = sessionStorage.getItem('auth_user');
		const sessionToken = sessionStorage.getItem('jwt_token');
		const localUser = localStorage.getItem('auth_user');
		const localToken = localStorage.getItem('jwt_token');
		
		const storedUser = sessionUser || localUser;
		const token = sessionToken || localToken;
		
		if (storedUser && token) {
			try {
				const user = JSON.parse(storedUser);
				const userTheme = AppStateManager.initializeUserAccentColor(user.id);

				this.state.auth.isAuthenticated = true;
				this.state.auth.user = { ...user, theme: userTheme };
				this.state.auth.jwtToken = token;
				
				const colorName = (Object.keys(ACCENT_COLORS) as AccentColor[]).find(
					key => ACCENT_COLORS[key].toLowerCase() === userTheme.toLowerCase()
				) || 'white';
				this.state.accentColor = colorName;
				this.state.accentColors.accent1 = userTheme;
				// Other accent colors (2-4) remain as they were unless explicitly reset.

				console.log('AppState: Restored auth state from storage', {
					user: user.username || user.pseudo,
					persistent: localStorage.getItem('auth_persistent') === 'true',
					theme: userTheme
				});
			} catch (error) {
				console.error('Failed to parse stored user data', error);
				localStorage.removeItem('auth_user');
				sessionStorage.removeItem('auth_user');
				localStorage.removeItem('jwt_token');
				sessionStorage.removeItem('jwt_token');
				// Reset to default state
				this.state.auth.isAuthenticated = false;
				this.state.auth.user = null;
				this.state.auth.jwtToken = null;
				this.state.accentColor = 'white';
				this.state.accentColors = {
					accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
					accent2: AppStateManager.DEFAULT_ACCENT_COLOR,
					accent3: AppStateManager.DEFAULT_ACCENT_COLOR,
					accent4: AppStateManager.DEFAULT_ACCENT_COLOR
				};
			}
		} else {
			// No user/token found, ensure default state
			this.state.auth.isAuthenticated = false;
			this.state.auth.user = null;
			this.state.auth.jwtToken = null;
			this.state.accentColor = 'white';
			this.state.accentColors = {
				accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
				accent2: AppStateManager.DEFAULT_ACCENT_COLOR,
				accent3: AppStateManager.DEFAULT_ACCENT_COLOR,
				accent4: AppStateManager.DEFAULT_ACCENT_COLOR
			};
		}
		this.applyAccentColorToCSS();
	}
	
	/**
	 * Apply the current accent color to CSS variables
	 */
	private applyAccentColorToCSS(): void {
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
		localStorage.setItem('auth_persistent', persistent.toString());
		
		const userTheme = AppStateManager.initializeUserAccentColor(user.id);
		const userWithTheme = { ...user, theme: userTheme };

		const colorName = (Object.keys(ACCENT_COLORS) as AccentColor[]).find(key => ACCENT_COLORS[key].toLowerCase() === userTheme.toLowerCase()) || 'white';
		
		this.setState({
			auth: {
				isAuthenticated: true,
				user: userWithTheme,
				jwtToken: token || null
			},
			accentColor: colorName,
			accentColors: { ...this.state.accentColors, accent1: userTheme } // Preserve other accent colors
		});
		
		const authEvent = new CustomEvent('user-authenticated', {
			detail: { 
				user: userWithTheme,
				persistent
			}
		});
		document.dispatchEvent(authEvent);
		
		setTimeout(() => {
			Router.refreshAllComponents();
		}, 100);
	}
	
	/**
	 * Logout user
	 */
	public logout(): void {
		const oldAuth = { ...this.state.auth };
		this.setState({
			auth: {
				isAuthenticated: false,
				user: null,
				jwtToken: null
			},
			// Reset accent color and accent1 to default on logout
			accentColor: 'white',
			accentColors: {
				...this.state.accentColors, // Preserve accent2-4 unless they should also reset
				accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
			}
		});
		
		localStorage.removeItem('auth_user');
		sessionStorage.removeItem('auth_user');
		localStorage.removeItem('jwt_token');
		sessionStorage.removeItem('jwt_token');
		localStorage.removeItem('auth_persistent');
		
		// If logout happened, refresh components
		if (oldAuth.isAuthenticated) {
			setTimeout(() => {
				Router.refreshAllComponents();
			}, 100);
		}
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
	 * Set accent color and update user theme in localStorage.
	 * This method is for the *current authenticated user*.
	 */
	public setAccentColor(colorName: AccentColor): void {
		if (ACCENT_COLORS[colorName]) {
			const colorHex = ACCENT_COLORS[colorName];
			
			if (this.state.auth.isAuthenticated && this.state.auth.user) {
				const userId = this.state.auth.user.id;
				AppStateManager.setUserAccentColor(userId, colorHex); // This dispatches 'user:theme-updated'
				
				// The event handler handleUserThemeUpdatedEvent will update the state.
				// For immediate effect and clarity, we can also call setState here.
				// Note: handleUserThemeUpdatedEvent updates auth.user.theme, accentColor, and accentColors.accent1.
				// If that event is reliably handled, this direct setState might be partly redundant
				// but ensures immediate consistency within this call's scope.
				this.setState({
					accentColor: colorName,
					accentColors: { ...this.state.accentColors, accent1: colorHex },
					auth: {
						...this.state.auth,
						user: { ...this.state.auth.user, theme: colorHex }
					}
				});

			} else {
				// For non-authenticated users, update session visual if needed.
				// This behavior might need further clarification based on product requirements.
				// For now, update the main accent color and accent1.
				this.setState({
					accentColor: colorName,
					accentColors: { ...this.state.accentColors, accent1: colorHex }
				});
			}
		}
	}
	
	/**
	 * Set accent color for a specific player (1-4) for the current game session.
	 */
	public setPlayerAccentColor(playerIndex: number, colorHex: string | undefined, userId?: string): void {
		if (playerIndex < 1 || playerIndex > 4) {
			console.error('Invalid player index, must be 1-4');
			return;
		}
		
		const colorToSet = colorHex || AppStateManager.DEFAULT_ACCENT_COLOR;
		const accentKey = `accent${playerIndex}` as keyof typeof this.state.accentColors;
		
		const newState: Partial<AppState> = {
			accentColors: {
				...this.state.accentColors,
				[accentKey]: colorToSet
			}
		};

		// If a userId is provided, also update their persistent preference
		if (userId) {
			AppStateManager.setUserAccentColor(userId, colorToSet); // This dispatches 'user:theme-updated'
		}
		
		// If this is player 1 (host/current user), also update the main accentColor state
		// and potentially the auth.user.theme if this player IS the current user.
		if (playerIndex === 1) {
			const colorName = (Object.keys(ACCENT_COLORS) as AccentColor[]).find(
				key => ACCENT_COLORS[key].toLowerCase() === colorToSet.toLowerCase()
			) || 'white';
			newState.accentColor = colorName;

			// If player 1 is the authenticated user, update their theme in auth state too.
			if (this.state.auth.isAuthenticated && this.state.auth.user && (!userId || userId === this.state.auth.user.id)) {
				newState.auth = {
					...this.state.auth,
					user: {
						...this.state.auth.user,
						theme: colorToSet
					}
				};
			}
		}
		this.setState(newState);
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
	 * Get player accent color for the game session (from accent1-accent4).
	 */
	public getPlayerAccentColor(playerIndex: number): string {
		if (playerIndex < 1 || playerIndex > 4) {
			console.error('Invalid player index, must be 1-4');
			return AppStateManager.DEFAULT_ACCENT_COLOR;
		}
		
		const accentKey = `accent${playerIndex}` as keyof typeof this.state.accentColors;
		return this.state.accentColors[accentKey] || AppStateManager.DEFAULT_ACCENT_COLOR;
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
	private handlePageUnload = (): void => {
		const isPersistent = localStorage.getItem('auth_persistent') === 'true';
		
		if (!isPersistent && this.state.auth.isAuthenticated) {
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
	 * Update player theme. This will update their persistent color in localStorage
	 * and dispatch an event that should be handled to update game session colors if active.
	 */
	public updatePlayerTheme(playerId: string, colorHex: string): void {
		AppStateManager.setUserAccentColor(playerId, colorHex);
		// The 'user:theme-updated' event is dispatched by setUserAccentColor.
		// handleUserThemeUpdatedEvent will catch this and update state if playerId is current user.
		// For other players, components observing game state should react to this event
		// or call setPlayerAccentColor for the specific slot.
	}
	
	// --- localStorage Accent Color Methods (Static) ---
	private static getAllAccentColorsFromStorage(): Record<string, string> {
		const storedColors = localStorage.getItem(AppStateManager.ACCENT_COLOR_STORAGE_KEY);
		try {
			return storedColors ? JSON.parse(storedColors) : {};
		} catch (error) {
			console.error('Error parsing accent colors from storage:', error);
			return {};
		}
	}

	public static getUserAccentColor(userId: string): string {
		if (!userId) return AppStateManager.DEFAULT_ACCENT_COLOR;
		const colors = AppStateManager.getAllAccentColorsFromStorage();
		return colors[userId] || AppStateManager.DEFAULT_ACCENT_COLOR;
	}

	public static setUserAccentColor(userId: string, colorHex: string): void {
		if (!userId) return;
		const colors = AppStateManager.getAllAccentColorsFromStorage();
		const normalizedColorHex = colorHex.toLowerCase();
		colors[userId] = normalizedColorHex;
		localStorage.setItem(AppStateManager.ACCENT_COLOR_STORAGE_KEY, JSON.stringify(colors));

		const event = new CustomEvent('user:theme-updated', {
			detail: { userId, theme: normalizedColorHex }
		});
		window.dispatchEvent(event);
	}

	public static initializeUserAccentColor(userId: string): string {
		if (!userId) return AppStateManager.DEFAULT_ACCENT_COLOR;
		const colors = AppStateManager.getAllAccentColorsFromStorage();
		if (!colors[userId]) {
			colors[userId] = AppStateManager.DEFAULT_ACCENT_COLOR;
			localStorage.setItem(AppStateManager.ACCENT_COLOR_STORAGE_KEY, JSON.stringify(colors));
			
			const event = new CustomEvent('user:theme-updated', {
				detail: { userId, theme: AppStateManager.DEFAULT_ACCENT_COLOR }
			});
			window.dispatchEvent(event);
			return AppStateManager.DEFAULT_ACCENT_COLOR;
		}
		return colors[userId];
	}

	// --- State Modification Methods ---
	public setState = (newState: Partial<AppState>): void => {
		const oldState = { ...this.state }; // Shallow copy for oldState in listeners
		
		// Deep merge for nested properties like auth, accentColors, players
		const nextState = {
			...this.state,
			...newState, // Apply top-level changes
			auth: newState.auth ? { ...this.state.auth, ...newState.auth } : this.state.auth,
			accentColors: newState.accentColors ? { ...this.state.accentColors, ...newState.accentColors } : this.state.accentColors,
			players: newState.players ? { ...this.state.players, ...newState.players } : this.state.players,
		};
		
		this.state = nextState;
		this.notifyListeners(newState, oldState); // Pass the partial newState that was applied
		this.persistState();
	};

	private persistState = (): void => {
		if (this.state.auth.isAuthenticated && this.state.auth.user && this.state.auth.user.id) {
			const userTheme = AppStateManager.getUserAccentColor(this.state.auth.user.id);
			const userToStore = { ...this.state.auth.user, theme: userTheme };
			
			const isPersistent = localStorage.getItem('auth_persistent') === 'true';

			if (isPersistent) {
				localStorage.setItem('auth_user', JSON.stringify(userToStore));
				sessionStorage.removeItem('auth_user'); // Clear from session
				if (this.state.auth.jwtToken) {
					localStorage.setItem('jwt_token', this.state.auth.jwtToken);
				}
				sessionStorage.removeItem('jwt_token'); // Ensure it's not in session if persistent
			} else { // Not persistent (session-based)
				sessionStorage.setItem('auth_user', JSON.stringify(userToStore));
				localStorage.removeItem('auth_user'); // Clear from local
				if (this.state.auth.jwtToken) {
					sessionStorage.setItem('jwt_token', this.state.auth.jwtToken);
				}
				localStorage.removeItem('jwt_token'); // Ensure it's not in local if session-based
			}
		} else { // Not authenticated
			localStorage.removeItem('auth_user');
			sessionStorage.removeItem('auth_user');
			localStorage.removeItem('jwt_token');
			sessionStorage.removeItem('jwt_token');
			// 'auth_persistent' is intentionally not cleared here.
		}
		this.applyAccentColorToCSS();
	};
}

export const appState = AppStateManager.getInstance();
