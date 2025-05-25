import { Component } from '@website/scripts/components';
import { ASCII_ART, TournamentCache, isUserInCurrentTournament } from '@website/scripts/utils';
import { html, render, navigate } from '@website/scripts/services';
import { GameMode, GameMenuState } from '@website/types';

export class GameMenuComponent extends Component<GameMenuState> {
	// =========================================
	// PROPERTIES
	// =========================================

	private onModeSelected: (mode: GameMode) => void;
	private onTournamentRestored: () => void;
	private onShowTournamentSchedule: () => void;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(
		container: HTMLElement, 
		onModeSelected: (mode: GameMode) => void,
		onTournamentRestored: () => void,
		onShowTournamentSchedule: () => void
	) {
		super(container, {
			visible: true,
			isAuthenticated: false
		});
		
		this.onModeSelected = onModeSelected;
		this.onTournamentRestored = onTournamentRestored;
		this.onShowTournamentSchedule = onShowTournamentSchedule;
		
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
		
		// Add game menu with ASCII art title - with direct event handlers
		let menuContent;
		
		if (state.isAuthenticated) {
			// User is authenticated, show game mode options with direct handlers
			menuContent = html`
				<div id="game-menu" class="game-menu">
					<div class="ascii-title">
						<pre class="pong-title">${ASCII_ART.PONG}</pre>
					</div>
					<div class="menu-buttons">
						<button class="menu-button" 
								onclick="${() => this.handleModeSelection(GameMode.SINGLE)}">
							Single Player
						</button>
						<button class="menu-button" 
								onclick="${() => this.handleModeSelection(GameMode.MULTI)}">
							Multiplayer
						</button>
						<button class="menu-button" 
								onclick="${() => this.handleModeSelection(GameMode.TOURNAMENT)}">
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
						<button class="menu-button auth-trigger" 
								onclick="${() => this.showAuthComponent()}">
							Connect to Play
						</button>
					</div>
				</div>
			`;
		}
		
		render(menuContent, this.container);
	}
	
	destroy(): void {
		// Remove the event listeners when component is destroyed
		document.removeEventListener('user-logout', this.handleAuthStateChange.bind(this));
		document.removeEventListener('user-authenticated', this.handleAuthStateChange.bind(this));
		
		super.destroy();
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
	
	// =========================================
	// HANDLER METHODS
	// =========================================
	
	/**
	 * Handles game mode selection
	 */
	private handleModeSelection(mode: GameMode): void {
		// Special handling for tournament mode
		if (mode === GameMode.TOURNAMENT) {
			const hasRestoredTournament = TournamentCache.restoreFromLocalStorage();

			if (hasRestoredTournament) {
				const localUser = localStorage.getItem('auth_user');
				const sessionUser = sessionStorage.getItem('auth_user');
				const storedUser = localUser || sessionUser;
				let currentUserId: string | null = null;
				
				if (storedUser) {
					const user = JSON.parse(storedUser);
					currentUserId = user.id;
				}

				if (currentUserId !== null && isUserInCurrentTournament(currentUserId)) {
					this.onShowTournamentSchedule();
					this.onTournamentRestored();
					return;
				} else {
					this.onModeSelected(mode);
					return;
				}
			}
		}

		// Normal flow for other modes or new tournament
		this.onModeSelected(mode);
	}
}
