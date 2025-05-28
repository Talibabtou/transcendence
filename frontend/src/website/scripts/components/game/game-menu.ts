import { Component } from '@website/scripts/components';
import { GameMode, GameMenuState } from '@website/types';
import { html, render, navigate } from '@website/scripts/services';
import { ASCII_ART, TournamentCache, isUserInCurrentTournament } from '@website/scripts/utils';

export class GameMenuComponent extends Component<GameMenuState> {
	private onModeSelected: (mode: GameMode) => void;
	private onTournamentRestored: () => void;
	private onShowTournamentSchedule: () => void;
	
	/**
	 * Creates a new game menu component
	 * @param container The HTML element to render the component into
	 * @param onModeSelected Callback when a game mode is selected
	 * @param onTournamentRestored Callback when a tournament is restored
	 * @param onShowTournamentSchedule Callback to show tournament schedule
	 */
	/**
	 * Creates a new game menu component
	 * @param container The HTML element to render the component into
	 * @param onModeSelected Callback when a game mode is selected
	 * @param onTournamentRestored Callback when a tournament is restored
	 * @param onShowTournamentSchedule Callback to show tournament schedule
	 */
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
		
		this.checkAuthentication();
		
		document.addEventListener('user-logout', this.handleAuthStateChange.bind(this));
		document.addEventListener('user-authenticated', this.handleAuthStateChange.bind(this));
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Renders the component
	 */
	/**
	 * Renders the component
	 */
	render(): void {
		const state = this.getInternalState();
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		let menuContent;
		
		if (state.isAuthenticated) {
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
	
	/**
	 * Cleans up resources used by the component
	 */
	/**
	 * Cleans up resources used by the component
	 */
	destroy(): void {
		document.removeEventListener('user-logout', this.handleAuthStateChange.bind(this));
		document.removeEventListener('user-authenticated', this.handleAuthStateChange.bind(this));
		
		super.destroy();
	}
	
	// =========================================
	// AUTHENTICATION MANAGEMENT
	// =========================================
	
	/**
	 * Checks if the user is authenticated
	 */
	private checkAuthentication(): void {
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
	// AUTHENTICATION MANAGEMENT
	// =========================================
	
	/**
	 * Checks if the user is authenticated
	 */
	private checkAuthentication(): void {
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
	
	/**
	 * Shows the authentication component
	 */
	private showAuthComponent(): void {
		this.hide();
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
		this.checkAuthentication();
		this.updateInternalState({ visible: true });
		this.renderComponent();
	}
	
	/**
	 * Hides the menu
	 */
	hide(): void {
		this.updateInternalState({ visible: false });
	}
	
	// =========================================
	// GAME MODE MANAGEMENT
	// GAME MODE MANAGEMENT
	// =========================================
	
	/**
	 * Handles game mode selection
	 * @param mode The selected game mode
	 * @param mode The selected game mode
	 */
	private handleModeSelection(mode: GameMode): void {
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
		this.onModeSelected(mode);
	}
}
