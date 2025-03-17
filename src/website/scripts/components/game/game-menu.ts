/**
 * Game Menu Component Module
 * Displays the main game menu with different game mode options.
 * Handles user selection of game modes and communicates with parent component.
 */
import { Component, AuthManager } from '@website/scripts/components';
import { html, render, ASCII_ART, navigate } from '@website/scripts/utils';
import { GameMode, GameMenuState } from '@shared/types';

export class GameMenuComponent extends Component<GameMenuState> {
	// =========================================
	// PROPERTIES
	// =========================================

	private onModeSelected: (mode: GameMode) => void;
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
		
		// Add event listener for authentication state changes
		document.addEventListener('user-logout', this.handleAuthStateChange.bind(this));
		document.addEventListener('user-authenticated', this.handleAuthStateChange.bind(this));
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
	
	/**
	 * Handles authentication state changes (login/logout)
	 */
	private handleAuthStateChange(): void {
		this.checkAuthentication();
		this.renderComponent();
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
		// Remove the event listeners when component is destroyed
		document.removeEventListener('user-logout', this.handleAuthStateChange.bind(this));
		document.removeEventListener('user-authenticated', this.handleAuthStateChange.bind(this));
		
		super.destroy();
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
					this.showAuthComponent();
				});
			}
		}
	}
	
	/**
	 * Shows the authentication component
	 */
	private showAuthComponent(): void {
		// Hide the game menu
		this.hide();
		
		// Use history state to store the return location
		navigate('/auth', { 
			state: { 
				returnTo: '/game' 
			}
		});
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
		
		// Force a render to ensure everything is visible
		this.renderComponent();
	}
	
	/**
	 * Hides the menu
	 */
	hide(): void {
		this.updateInternalState({ visible: false });
	}
}
