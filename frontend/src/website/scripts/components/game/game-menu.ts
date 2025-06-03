import { Component } from '@website/scripts/components';
import { ASCII_ART, TournamentCache, isUserInCurrentTournament } from '@website/scripts/utils';
import { html, render, navigate } from '@website/scripts/services';
import { GameMode, GameMenuState } from '@website/types';

export class GameMenuComponent extends Component<GameMenuState> {
	private onModeSelected: (mode: GameMode) => void;
	private onTournamentRestored: () => void;
	private onShowTournamentSchedule: () => void;
	private boundAuthHandler: EventListener;
	
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
		this.boundAuthHandler = this.handleAuthStateChange.bind(this);
		
		this.checkAuthentication();
		
		document.addEventListener('user-logout', this.boundAuthHandler);
		document.addEventListener('user-authenticated', this.boundAuthHandler);
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Renders the component
	 */
	render(): void {
		const state = this.getInternalState();
		if (!state.visible) {
			this.container.innerHTML = '';
			return;
		}
		
		const menuContent = state.isAuthenticated 
			? this.renderAuthenticatedMenu() 
			: this.renderUnauthenticatedMenu();
		
		render(menuContent, this.container);
	}
	
	/**
	 * Renders menu for authenticated users
	 */
	private renderAuthenticatedMenu() {
		return html`
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
	}
	
	/**
	 * Renders menu for unauthenticated users
	 */
	private renderUnauthenticatedMenu() {
		return html`
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
	
	/**
	 * Cleans up resources used by the component
	 */
	destroy(): void {
		document.removeEventListener('user-logout', this.boundAuthHandler);
		document.removeEventListener('user-authenticated', this.boundAuthHandler);
		super.destroy();
	}
	
	// =========================================
	// AUTHENTICATION MANAGEMENT
	// =========================================
	
	/**
	 * Checks if the user is authenticated
	 */
	private checkAuthentication(): void {
		const storedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		this.updateInternalState({ isAuthenticated: !!storedUser });
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
		navigate('/auth', { state: { returnTo: '/game' } });
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
	// =========================================
	
	/**
	 * Handles game mode selection
	 * @param mode The selected game mode
	 */
	private handleModeSelection(mode: GameMode): void {
		if (mode === GameMode.TOURNAMENT) {
			const hasRestoredTournament = TournamentCache.restoreFromLocalStorage();
			
			if (hasRestoredTournament) {
				const storedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
				let currentUserId: string | null = null;
				
				if (storedUser) {
					currentUserId = JSON.parse(storedUser).id;
				}
				
				if (currentUserId && isUserInCurrentTournament(currentUserId)) {
					this.onShowTournamentSchedule();
					this.onTournamentRestored();
					return;
				}
			}
		}
		
		this.onModeSelected(mode);
	}
}
