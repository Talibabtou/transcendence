/**
 * AppState Manager
 * Centralized state management for the application
 */

import { Router } from './router';

// Define available accent colors
export type AccentColor = 'white' | 'blue' | 'green' | 'purple' | 'pink' | 'orange' | 'yellow' | 'cyan' | 'teal' | 'lime' | 'red';

// Define the app state interface
export interface AppState {
	auth: {
			isAuthenticated: boolean;
			user: any | null;
			token: string | null;
	};
	accentColor: AccentColor;
	accentColors: {
		accent1: string; // Host accent (same as accentColor but in hex)
		accent2: string; // Guest 1 accent
		accent3: string; // Guest 2 accent - for tournament
		accent4: string; // Guest 3 accent - for tournament
	};
}

// Define state change listener type
type StateChangeListener = (newState: Partial<AppState>, oldState: Partial<AppState>) => void;

export class AppStateManager {
	// Singleton instance
	private static instance: AppStateManager;
	
	// Available accent colors with their hex values
	public static readonly ACCENT_COLORS: Record<AccentColor, string> = {
		'white': '#ffffff',
		'blue': '#3498db',
		'green': '#2ecc71',
		'purple': '#9b59b6',
		'pink': '#e84393',
		'orange': '#e67e22',
		'yellow': '#f1c40f',
		'cyan': '#00bcd4',
		'teal': '#009688',
		'lime': '#cddc39',
		'red': '#e74c3c'
	};
	
	// The current state
	private state: AppState = {
		auth: {
			isAuthenticated: false,
			user: null,
			token: null
		},
		accentColor: 'white',
		accentColors: {
			accent1: '#ffffff', // Host accent (default white)
			accent2: '#ffffff', // Guest 1 accent (default white)
			accent3: '#ffffff', // Guest 2 accent (default white)
			accent4: '#ffffff'  // Guest 3 accent (default white)
		}
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
		// Check for auth data in storage
		const localUser = localStorage.getItem('auth_user');
		const sessionUser = sessionStorage.getItem('auth_user');
		const storedUser = localUser || sessionUser;
		
		if (storedUser) {
			try {
				const user = JSON.parse(storedUser);
				this.state.auth.isAuthenticated = true;
				this.state.auth.user = user;
				
				// Set token if available
				const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
				if (token)
					this.state.auth.token = token;
				
				// Get user's theme from the database if possible
				if (user.id) {
					// Import DbService and get fresh user data
					import('./db').then(({ DbService }) => {
						// Try to get the latest user data from the database
						DbService.getUser(parseInt(user.id))
							.then(dbUser => {
								// If user has a theme in the database, use it
								if (dbUser.theme) {
									// Find corresponding accent color by hex value
									const colorEntry = Object.entries(AppStateManager.ACCENT_COLORS).find(
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
								console.warn('Could not fetch user theme from database, using stored value', err);
								// Fallback to stored theme
								this.applyStoredTheme(user);
							});
					});
				} else {
					// Fallback to stored theme
					this.applyStoredTheme(user);
				}
				
				console.log('AppState: Restored auth state from storage', {
					user: user.username || user.pseudo,
					persistent: !!localUser,
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
			const colorEntry = Object.entries(AppStateManager.ACCENT_COLORS).find(
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
		if (event.key === 'auth_user' || event.key === 'auth_token' || event.key === 'app_accent_color') {
			this.initializeFromStorage();
			this.notifyListeners({
				auth: { ...this.state.auth },
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
			accentColors: newState.accentColors ? { ...this.state.accentColors, ...newState.accentColors } : this.state.accentColors
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
				theme: AppStateManager.ACCENT_COLORS[this.state.accentColor]
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
			if (this.state.auth.token) {
				if (isPersistent) {
					localStorage.setItem('auth_token', this.state.auth.token);
					sessionStorage.removeItem('auth_token');
				} else {
					sessionStorage.setItem('auth_token', this.state.auth.token);
					localStorage.removeItem('auth_token');
				}
			}
		} else {
			// Clear auth data if not authenticated
			localStorage.removeItem('auth_user');
			sessionStorage.removeItem('auth_user');
			localStorage.removeItem('auth_token');
			sessionStorage.removeItem('auth_token');
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
				token: token || null
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
				token: null
			}
		});
		
		// Clear storage
		localStorage.removeItem('auth_user');
		sessionStorage.removeItem('auth_user');
		localStorage.removeItem('auth_token');
		sessionStorage.removeItem('auth_token');
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
		if (AppStateManager.ACCENT_COLORS[color]) {
			// Only update state if color is valid
			const colorHex = AppStateManager.ACCENT_COLORS[color];
			
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
							console.error('Failed to update user theme in database:', error);
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
			const colorEntry = Object.entries(AppStateManager.ACCENT_COLORS).find(
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
		return AppStateManager.ACCENT_COLORS[this.state.accentColor];
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
		return { ...AppStateManager.ACCENT_COLORS };
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
			sessionStorage.removeItem('auth_token');
		}
	}
}

// Export a singleton instance
export const appState = AppStateManager.getInstance();
