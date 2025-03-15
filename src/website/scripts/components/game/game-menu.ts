/**
 * Game Menu Component Module
 * Displays the main game menu with different game mode options.
 * Handles user selection of game modes and communicates with parent component.
 */
import { Component, AuthManager } from '@website/scripts/components';
import { html, render, ASCII_ART } from '@website/scripts/utils';

// =========================================
// TYPES & CONSTANTS
// =========================================

/**
 * Define possible game modes
 */
export enum GameMode {
	SINGLE = 'single',
	MULTI = 'multi',
	TOURNAMENT = 'tournament'
}

/**
 * Define state interface for type safety
 */
interface GameMenuState {
	visible: boolean;
	isAuthenticated: boolean;
}

// =========================================
// GAME MENU COMPONENT
// =========================================

export class GameMenuComponent extends Component<GameMenuState> {
	// =========================================
	// PROPERTIES
	// =========================================
	
	/**
	 * Event handler for mode selection
	 */
	private onModeSelected: (mode: GameMode) => void;
	
	/**
	 * Authentication component instance
	 */
	private authManager: AuthManager | null = null;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(container: HTMLElement, onModeSelected: (mode: GameMode) => void) {
		super(container, {
			visible: true,
			isAuthenticated: false
		});
		
		this.onModeSelected = onModeSelected;
		
		// Check authentication status
		this.checkAuthentication();
	}
	
	/**
	 * Checks if the user is authenticated
	 */
	private checkAuthentication(): void {
		// Check both localStorage and sessionStorage for user session
		const localUser = localStorage.getItem('auth_user');
		const sessionUser = sessionStorage.getItem('auth_user');
		const storedUser = localUser || sessionUser;
		
		this.updateInternalState({
			isAuthenticated: !!storedUser
		});
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	render(): void {
		const state = this.getInternalState();
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		// Add game menu with ASCII art title
		let menuContent;
		
		if (state.isAuthenticated) {
			// User is authenticated, show game mode options
			menuContent = html`
				<div id="game-menu" class="game-menu">
					<div class="ascii-title">
						<pre class="pong-title">${ASCII_ART.PONG}</pre>
					</div>
					<div class="menu-buttons">
						<button class="menu-button" data-mode="${GameMode.SINGLE}">
							Single Player
						</button>
						<button class="menu-button" data-mode="${GameMode.MULTI}">
							Multiplayer
						</button>
						<button class="menu-button" data-mode="${GameMode.TOURNAMENT}">
							Tournament
						</button>
					</div>
				</div>
			`;
		} else {
			// User is not authenticated, show login button
			menuContent = html`
				<div id="game-menu" class="game-menu">
					<div class="ascii-title">
						<pre class="pong-title">${ASCII_ART.PONG}</pre>
					</div>
					<div class="menu-buttons">
						<button class="menu-button auth-trigger">
							Connect to Play
						</button>
					</div>
				</div>
			`;
		}
		
		render(menuContent, this.container);
		this.setupEventListeners();
	}
	
	destroy(): void {
		super.destroy();
		// No special cleanup needed
	}
	
	// =========================================
	// EVENT HANDLING
	// =========================================
	
	/**
	 * Sets up event listeners for menu buttons
	 */
	private setupEventListeners(): void {
		const state = this.getInternalState();
		
		if (state.isAuthenticated) {
			// Set up game mode selection buttons
			const buttons = this.container.querySelectorAll('.menu-button[data-mode]');
			buttons.forEach(button => {
				button.addEventListener('click', (e) => {
					const mode = (e.target as HTMLElement).getAttribute('data-mode') as GameMode;
					this.onModeSelected(mode);
				});
			});
		} else {
			// Set up auth trigger button
			const authButton = this.container.querySelector('.auth-trigger');
			if (authButton) {
				authButton.addEventListener('click', () => {
					this.showAuthManager();
				});
			}
		}
	}
	
	/**
	 * Shows the authentication component
	 */
	private showAuthManager(): void {
		// Hide this menu
		this.hide();
		
		// Create a container for auth if it doesn't exist
		let authWrapper = this.container.querySelector('.auth-wrapper');
		if (!authWrapper) {
			authWrapper = document.createElement('div');
			authWrapper.className = 'auth-wrapper';
			this.container.appendChild(authWrapper);
		} else {
			// Clear existing content
			authWrapper.innerHTML = '';
		}
		
		// Show auth component with non-persistent session by default
		this.authManager = new AuthManager(authWrapper as HTMLElement, 'game', false);
		this.authManager.show();
		
		// Listen for authentication event
		const authListener = () => {
			// Clean up auth component
			if (this.authManager) {
				this.authManager.destroy();
				this.authManager = null;
			}
			
			// Remove auth container
			if (authWrapper && authWrapper.parentElement) {
				authWrapper.parentElement.removeChild(authWrapper);
			}
			
			// Check authentication again
			this.checkAuthentication();
			// Show menu again
			this.show();
			// Remove this listener
			document.removeEventListener('user-authenticated', authListener);
		};
		document.addEventListener('user-authenticated', authListener);
	}
	
	// =========================================
	// VISIBILITY MANAGEMENT
	// =========================================
	
	/**
	 * Shows the menu
	 */
	show(): void {
		// Check authentication status again
		this.checkAuthentication();
		this.updateInternalState({ visible: true });
	}
	
	/**
	 * Hides the menu
	 */
	hide(): void {
		this.updateInternalState({ visible: false });
	}
}
