/**
 * AppState Manager
 * Centralized state management for the application
 */

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
				accentColor: 'white' // Default accent color
		};
		
		// Listeners for state changes
		private listeners: StateChangeListener[] = [];
		
		// Private constructor for singleton
		private constructor() {
				// Initialize state from storage
				this.initializeFromStorage();
				
				// Listen for storage events (for multi-tab support)
				window.addEventListener('storage', this.handleStorageChange.bind(this));
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
		 * Initialize state from localStorage/sessionStorage
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
								
								// You might also have a token stored
								const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
								if (token) {
										this.state.auth.token = token;
								}
								
								// If user has a stored accent color preference, use it
								if (user.accentColor && AppStateManager.ACCENT_COLORS[user.accentColor as AccentColor]) {
										this.state.accentColor = user.accentColor as AccentColor;
								}
								
								console.log('AppState: Restored auth state from storage', {
										user: user.username,
										persistent: !!localUser,
										accentColor: this.state.accentColor
								});
						} catch (error) {
								console.error('Failed to parse stored user data', error);
								localStorage.removeItem('auth_user');
								sessionStorage.removeItem('auth_user');
						}
				}
				
				// Check for accent color preference for non-authenticated users
				const accentColor = localStorage.getItem('app_accent_color');
				if (accentColor && AppStateManager.ACCENT_COLORS[accentColor as AccentColor]) {
						this.state.accentColor = accentColor as AccentColor;
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
								accentColor: this.state.accentColor
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
						auth: newState.auth ? { ...this.state.auth, ...newState.auth } : this.state.auth
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
						// Update user object with current accent color
						const user = {
								...this.state.auth.user,
								accentColor: this.state.accentColor
						};
						
						// Check if we should use persistent storage
						const isPersistent = localStorage.getItem('auth_persistent') === 'true';
						
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
				
				// Always persist accent color (even for non-authenticated users)
				localStorage.setItem('app_accent_color', this.state.accentColor);
				
				// Apply accent color to CSS variables
				this.applyAccentColorToCSS();
		}
		
		/**
		 * Apply the current accent color to CSS variables
		 */
		private applyAccentColorToCSS(): void {
				const colorHex = AppStateManager.ACCENT_COLORS[this.state.accentColor];
				document.documentElement.style.setProperty('--accent-color', colorHex);
				
				// You might want to derive other colors from the accent color
				// For example, a darker version for hover states
				document.documentElement.style.setProperty('--accent-color-dark', this.darkenColor(colorHex, 20));
				document.documentElement.style.setProperty('--accent-color-light', this.lightenColor(colorHex, 20));
		}
		
		/**
		 * Darken a hex color by a percentage
		 */
		private darkenColor(hex: string, percent: number): string {
				// Convert hex to RGB
				let r = parseInt(hex.substring(1, 3), 16);
				let g = parseInt(hex.substring(3, 5), 16);
				let b = parseInt(hex.substring(5, 7), 16);
				
				// Darken
				r = Math.floor(r * (100 - percent) / 100);
				g = Math.floor(g * (100 - percent) / 100);
				b = Math.floor(b * (100 - percent) / 100);
				
				// Convert back to hex
				return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
		}
		
		/**
		 * Lighten a hex color by a percentage
		 */
		private lightenColor(hex: string, percent: number): string {
				// Convert hex to RGB
				let r = parseInt(hex.substring(1, 3), 16);
				let g = parseInt(hex.substring(3, 5), 16);
				let b = parseInt(hex.substring(5, 7), 16);
				
				// Lighten
				r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
				g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
				b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
				
				// Convert back to hex
				return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
		 * Set accent color
		 */
		public setAccentColor(color: AccentColor): void {
				if (AppStateManager.ACCENT_COLORS[color]) {
						this.setState({ accentColor: color });
						
						// If user is authenticated, update their profile in the database
						if (this.state.auth.isAuthenticated && this.state.auth.user) {
								// This would be an API call in a real application
								console.log('Updating user profile with new accent color:', color);
								// api.updateUserProfile(this.state.auth.user.id, { accentColor: color });
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
		 * Get all available accent colors
		 */
		public getAvailableColors(): Record<AccentColor, string> {
				return { ...AppStateManager.ACCENT_COLORS };
		}
}

// Export a singleton instance
export const appState = AppStateManager.getInstance();
