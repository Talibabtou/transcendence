import { AppState, AccentColor, ACCENT_COLORS } from '@website/types';
import { NotificationManager, Router, disconnectWebSocket, navigate } from '@website/scripts/services';

type StateChangeListener = (newState: Partial<AppState>, oldState: Partial<AppState>) => void;

export class AppStateManager {
	private static instance: AppStateManager;
	private static ACCENT_COLOR_STORAGE_KEY = 'playerAccentColors';
	private static DEFAULT_ACCENT_COLOR = '#ffffff';
	private static DEFAULT_ACCENT_NAME: AccentColor = 'white';
	
	private state: AppState = {
		auth: { isAuthenticated: false, user: null, jwtToken: null },
		accentColor: AppStateManager.DEFAULT_ACCENT_NAME,
		accentColors: {
			accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent2: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent3: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent4: AppStateManager.DEFAULT_ACCENT_COLOR
		},
		players: {}
	};
	
	private listeners: StateChangeListener[] = [];
	
	private constructor() {
		this.initializeFromStorage();
		window.addEventListener('storage', this.handleStorageChange.bind(this));
		window.addEventListener('beforeunload', this.handlePageUnload);
		window.addEventListener('user:theme-updated', this.handleUserThemeUpdatedEvent);
	}
	
	// =========================================
	// SINGLETON MANAGEMENT
	// =========================================

	/**
	 * Get the singleton instance of the AppStateManager
	 * @returns The AppStateManager instance
	 */
	public static getInstance(): AppStateManager {
		if (!AppStateManager.instance) {
			AppStateManager.instance = new AppStateManager();
		}
		return AppStateManager.instance;
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Handles storage changes from other tabs/windows
	 * @param event The storage event
	 */
	private handleStorageChange = (event: StorageEvent): void => {
		const oldStateSnapshot = JSON.parse(JSON.stringify(this.state));

		const reinitializeAndNotify = () => {
			this.initializeFromStorage();
			this.notifyListeners({
				auth: this.state.auth,
				accentColor: this.state.accentColor,
				accentColors: this.state.accentColors,
			}, oldStateSnapshot);
			
			if (oldStateSnapshot.auth.isAuthenticated !== this.state.auth.isAuthenticated ||
				(oldStateSnapshot.auth.user?.id !== this.state.auth.user?.id)) {
				Router.refreshAllComponents();
			}
		};
	
		if (!event.key) {
			reinitializeAndNotify();
			return;
		}
	
		switch (event.key) {
			case 'auth_user':
			case 'jwt_token':
			case 'auth_persistent':
				reinitializeAndNotify();
				break;
	
			case AppStateManager.ACCENT_COLOR_STORAGE_KEY:
				if (this.state.auth.isAuthenticated && this.state.auth.user) {
					const userId = this.state.auth.user.id;
					const newStoredTheme = AppStateManager.getUserAccentColor(userId);
	
					if (this.state.auth.user.theme !== newStoredTheme) {
						const newAccentColorName = this.findAccentColorNameByHex(newStoredTheme);
						this.setState({
							auth: {
								...this.state.auth,
								user: { ...this.state.auth.user, theme: newStoredTheme }
							},
							accentColor: newAccentColorName,
							accentColors: { ...this.state.accentColors, accent1: newStoredTheme }
						});
					} else {
						this.applyAccentColorToCSS();
					}
				} else {
					this.applyAccentColorToCSS();
				}
				break;
		}
	};
	
	/**
	 * Handles the 'user:theme-updated' event dispatched by setUserAccentColor
	 * @param event The custom event
	 */
	private handleUserThemeUpdatedEvent = (event: Event): void => {
		const customEvent = event as CustomEvent<{ userId: string, theme: string }>;
		if (!customEvent.detail) return;

		const { userId, theme } = customEvent.detail;
		if (this.state.auth.user && this.state.auth.user.id === userId) {
			const newAccentColorName = this.findAccentColorNameByHex(theme);
			this.setState({
				auth: {
					...this.state.auth,
					user: { ...this.state.auth.user, theme }
				},
				accentColor: newAccentColorName,
				accentColors: { ...this.state.accentColors, accent1: theme }
			});
		}
	};
	
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
	
	// =========================================
  // INITIALIZATION
  // =========================================

	/**
	 * Initialize state from localStorage/sessionStorage
	 */
	private initializeFromStorage(): void {
		const storedUser = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		
		if (storedUser && token) {
			try {
				const user = JSON.parse(storedUser);
				const userTheme = AppStateManager.initializeUserAccentColor(user.id);
				this.state.auth.isAuthenticated = true;
				this.state.auth.user = { ...user, theme: userTheme };
				this.state.auth.jwtToken = token;
				this.state.accentColor = this.findAccentColorNameByHex(userTheme);
				this.state.accentColors.accent1 = userTheme;
			} catch (error) {
				NotificationManager.handleError(error);
				this.resetState();
				this.clearStorageItems();
			}
		} else {
			this.resetState();
		}
		this.applyAccentColorToCSS();
	}
	
	/**
	 * Reset state to defaults
	 */
	private resetState(): void {
		this.state.auth.isAuthenticated = false;
		this.state.auth.user = null;
		this.state.auth.jwtToken = null;
		this.state.accentColor = AppStateManager.DEFAULT_ACCENT_NAME;
		this.state.accentColors = {
			accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent2: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent3: AppStateManager.DEFAULT_ACCENT_COLOR,
			accent4: AppStateManager.DEFAULT_ACCENT_COLOR
		};
	}
	
	/**
	 * Clear all auth-related storage items
	 */
	private clearStorageItems(): void {
		localStorage.removeItem('auth_user');
		sessionStorage.removeItem('auth_user');
		localStorage.removeItem('jwt_token');
		sessionStorage.removeItem('jwt_token');
	}
	
	// =========================================
	// STATE MANAGEMENT
	// =========================================
	
	/**
	 * Subscribe to state changes
	 * @param listener The listener function to call when state changes
	 * @returns A function to unsubscribe the listener
	 */
	public subscribe(listener: StateChangeListener): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener);
		};
	}
	
	/**
	 * Notify listeners of state changes
	 * @param newState The new partial state
	 * @param oldState The old state
	 */
	private notifyListeners(newState: Partial<AppState>, oldState: Partial<AppState>): void {
		this.listeners.forEach(listener => {
			try {
				listener(newState, oldState);
			} catch (error) {
				NotificationManager.handleError(error);
			}
		});
	}
	
	/**
	 * Update the application state
	 * @param newState The new partial state to apply
	 */
	public setState = (newState: Partial<AppState>): void => {
		const oldState = { ...this.state };
		this.state = {
			...this.state,
			...newState,
			auth: newState.auth ? { ...this.state.auth, ...newState.auth } : this.state.auth,
			accentColors: newState.accentColors ? { ...this.state.accentColors, ...newState.accentColors } : this.state.accentColors,
			players: newState.players ? { ...this.state.players, ...newState.players } : this.state.players,
		};
		
		this.notifyListeners(newState, oldState);
		this.persistState();
	};

	/**
	 * Persist the current state to storage
	 */
	private persistState = (): void => {
		if (this.state.auth.isAuthenticated && this.state.auth.user?.id) {
			const userTheme = AppStateManager.getUserAccentColor(this.state.auth.user.id);
			const userToStore = { ...this.state.auth.user, theme: userTheme };
			const isPersistent = localStorage.getItem('auth_persistent') === 'true';
			const storage = isPersistent ? localStorage : sessionStorage;
			const otherStorage = isPersistent ? sessionStorage : localStorage;

			storage.setItem('auth_user', JSON.stringify(userToStore));
			otherStorage.removeItem('auth_user');
			
			if (this.state.auth.jwtToken) {
				storage.setItem('jwt_token', this.state.auth.jwtToken);
			}
			otherStorage.removeItem('jwt_token');
		} else {
			this.clearStorageItems();
		}
		this.applyAccentColorToCSS();
	};
	
	// =========================================
	// AUTHENTICATION
	// =========================================
	
	/**
	 * Login user
	 * @param user The user object
	 * @param token The JWT token
	 * @param persistent Whether to persist the login
	 */
	public login(user: any, token?: string, persistent: boolean = false): void {
		localStorage.setItem('auth_persistent', persistent.toString());
		const userTheme = AppStateManager.initializeUserAccentColor(user.id);
		const userWithTheme = { ...user, theme: userTheme };
		const colorName = this.findAccentColorNameByHex(userTheme);
		
		this.setState({
			auth: {
				isAuthenticated: true,
				user: userWithTheme,
				jwtToken: token || null
			},
			accentColor: colorName,
			accentColors: { ...this.state.accentColors, accent1: userTheme }
		});
		
		document.dispatchEvent(new CustomEvent('user-authenticated', {
			detail: { user: userWithTheme, persistent }
		}));
		
		setTimeout(() => Router.refreshAllComponents(), 100);
	}
	
	/**
	 * Logout user
	 */
	public logout(): void {
		const wasAuthenticated = this.state.auth.isAuthenticated;
		
		try {
			disconnectWebSocket();
		} catch (error) {
			NotificationManager.handleError(error);
		}
		
		this.setState({
			auth: { isAuthenticated: false, user: null, jwtToken: null },
			accentColor: AppStateManager.DEFAULT_ACCENT_NAME,
			accentColors: {
				accent1: AppStateManager.DEFAULT_ACCENT_COLOR,
				accent2: AppStateManager.DEFAULT_ACCENT_COLOR,
				accent3: AppStateManager.DEFAULT_ACCENT_COLOR,
				accent4: AppStateManager.DEFAULT_ACCENT_COLOR
			},
			players: {}
		});
		
		this.clearStorageItems();
		localStorage.removeItem('auth_persistent');
		
		if (wasAuthenticated) {
			Router.refreshAllComponents();
			if (window.location.pathname.includes('/profile')) {
				navigate('/');
			}
		}
	}
	
	/**
	 * Check if user is authenticated
	 * @returns Whether the user is authenticated
	 */
	public isAuthenticated(): boolean {
		return this.state.auth.isAuthenticated;
	}
	
	/**
	 * Get current user
	 * @returns The current user or null
	 */
	public getCurrentUser(): any | null {
		return this.state.auth.user;
	}
	
	/**
	 * Update user data in the app state
	 * @param userData The user data to update
	 */
	public updateUserData(userData: Partial<{username: string, email: string, profilePicture: string, password: string}>) {
		const currentUser = this.getCurrentUser();
		if (currentUser) {
			this.setState({
				auth: {
					...this.state.auth,
					user: { ...currentUser, ...userData }
				}
			});
		}
	}
	
	// =========================================
	// THEME MANAGEMENT
	// =========================================
	
	/**
	 * Apply the current accent color to CSS variables
	 */
	private applyAccentColorToCSS(): void {
		const { accent1, accent2, accent3, accent4 } = this.state.accentColors;
		document.documentElement.style.setProperty('--accent1-color', accent1);
		document.documentElement.style.setProperty('--accent2-color', accent2);
		document.documentElement.style.setProperty('--accent3-color', accent3);
		document.documentElement.style.setProperty('--accent4-color', accent4);
	}
	
	/**
	 * Set accent color and update user theme in localStorage
	 * @param colorName The accent color name
	 */
	public setAccentColor(colorName: AccentColor): void {
		const colorHex = ACCENT_COLORS[colorName];
		if (!colorHex) return;
		
		const newState: Partial<AppState> = {
			accentColor: colorName,
			accentColors: { ...this.state.accentColors, accent1: colorHex }
		};
		
		if (this.state.auth.isAuthenticated && this.state.auth.user) {
			AppStateManager.setUserAccentColor(this.state.auth.user.id, colorHex);
			newState.auth = {
				...this.state.auth,
				user: { ...this.state.auth.user, theme: colorHex }
			};
		}
		
		this.setState(newState);
	}
	
	/**
	 * Set accent color for a specific player (1-4) for the current game session
	 * @param playerIndex The player index (1-4)
	 * @param colorHex The color hex value
	 * @param userId Optional user ID
	 */
	public setPlayerAccentColor(playerIndex: number, colorHex: string | undefined, userId?: string): void {
		if (playerIndex < 1 || playerIndex > 4) return;
		
		const colorToSet = colorHex || AppStateManager.DEFAULT_ACCENT_COLOR;
		const accentKey = `accent${playerIndex}` as keyof typeof this.state.accentColors;
		const newState: Partial<AppState> = {
			accentColors: { ...this.state.accentColors, [accentKey]: colorToSet }
		};

		if (userId) {
			AppStateManager.setUserAccentColor(userId, colorToSet);
		}
		
		if (playerIndex === 1) {
			newState.accentColor = this.findAccentColorNameByHex(colorToSet);
			if (this.state.auth.isAuthenticated && this.state.auth.user && (!userId || userId === this.state.auth.user.id)) {
				newState.auth = {
					...this.state.auth,
					user: { ...this.state.auth.user, theme: colorToSet }
				};
			}
		}
		
		this.setState(newState);
	}
	
	/**
	 * Find accent color name by hex value
	 * @param hexColor The hex color value
	 * @returns The accent color name
	 */
	private findAccentColorNameByHex(hexColor: string): AccentColor {
		return (Object.keys(ACCENT_COLORS) as AccentColor[]).find(
			key => ACCENT_COLORS[key].toLowerCase() === hexColor.toLowerCase()
		) || AppStateManager.DEFAULT_ACCENT_NAME;
	}

	/**
	 * Get current accent color
	 * @returns The current accent color
	 */
	public getAccentColor(): AccentColor {
		return this.state.accentColor;
	}
	
	/**
	 * Get accent color hex value
	 * @returns The accent color hex value
	 */
	public getAccentColorHex(): string {
		return ACCENT_COLORS[this.state.accentColor];
	}

	/**
	 * Get player accent color for the game session
	 */
	public getPlayerAccentColor(playerIndex: number): string {
		if (playerIndex < 1 || playerIndex > 4) return AppStateManager.DEFAULT_ACCENT_COLOR;
		const accentKey = `accent${playerIndex}` as keyof typeof this.state.accentColors;
		return this.state.accentColors[accentKey] || AppStateManager.DEFAULT_ACCENT_COLOR;
	}
	
	/**
	 * Get all available accent colors
	 * @returns Record of all available accent colors
	 */
	public getAvailableColors(): Record<AccentColor, string> {
		return { ...ACCENT_COLORS };
	}
	
	/**
	 * Update player theme
	 * @param playerId The player ID
	 * @param colorHex The color hex value
	 */
	public updatePlayerTheme(playerId: string, colorHex: string): void {
		AppStateManager.setUserAccentColor(playerId, colorHex);
	}
	
	// =========================================
	// PLAYER MANAGEMENT
	// =========================================
	
	/**
	 * Set player name in the app state
	 * @param playerId The player ID
	 * @param username The username
	 */
	public setPlayerName(playerId: string, username: string): void {
		this.setState({
			players: {
				...this.state.players,
				[playerId]: { ...this.state.players[playerId], username }
			}
		});
	}
	
	/**
	 * Set player avatar in the app state
	 * @param playerId The player ID
	 * @param pfp The profile picture URL
	 */
	public setPlayerAvatar(playerId: string, pfp: string): void {
		this.setState({
			players: {
				...this.state.players,
				[playerId]: { ...this.state.players[playerId], pfp }
			}
		});
	}
	
	// =========================================
	// STATIC ACCENT COLOR METHODS
	// =========================================
	
	/**
	 * Get all accent colors from storage
	 * @returns Record of user IDs to accent colors
	 */
	private static getAllAccentColorsFromStorage(): Record<string, string> {
		const storedColors = localStorage.getItem(AppStateManager.ACCENT_COLOR_STORAGE_KEY);
		try {
			return storedColors ? JSON.parse(storedColors) : {};
		} catch (error) {
			NotificationManager.handleError(error);
			return {};
		}
	}

	/**
	 * Get a user's accent color
	 * @param userId The user ID
	 * @returns The user's accent color
	 */
	public static getUserAccentColor(userId: string): string {
		if (!userId) return AppStateManager.DEFAULT_ACCENT_COLOR;
		const colors = AppStateManager.getAllAccentColorsFromStorage();
		return colors[userId] || AppStateManager.DEFAULT_ACCENT_COLOR;
	}

	/**
	 * Set a user's accent color
	 * @param userId The user ID
	 * @param colorHex The color hex value
	 */
	public static setUserAccentColor(userId: string, colorHex: string): void {
		if (!userId) return;
		
		const colors = AppStateManager.getAllAccentColorsFromStorage();
		const normalizedColorHex = colorHex.toLowerCase();
		colors[userId] = normalizedColorHex;
		localStorage.setItem(AppStateManager.ACCENT_COLOR_STORAGE_KEY, JSON.stringify(colors));
		window.dispatchEvent(new CustomEvent('user:theme-updated', {
			detail: { userId, theme: normalizedColorHex }
		}));
	}

	/**
	 * Initialize a user's accent color
	 * @param userId The user ID
	 * @returns The user's accent color
	 */
	public static initializeUserAccentColor(userId: string): string {
		if (!userId) return AppStateManager.DEFAULT_ACCENT_COLOR;
		
		const colors = AppStateManager.getAllAccentColorsFromStorage();
		if (!colors[userId]) {
			colors[userId] = AppStateManager.DEFAULT_ACCENT_COLOR;
			localStorage.setItem(AppStateManager.ACCENT_COLOR_STORAGE_KEY, JSON.stringify(colors));
			
			window.dispatchEvent(new CustomEvent('user:theme-updated', {
				detail: { userId, theme: AppStateManager.DEFAULT_ACCENT_COLOR }
			}));
			return AppStateManager.DEFAULT_ACCENT_COLOR;
		}
		return colors[userId];
	}
}

export const appState = AppStateManager.getInstance();
