import { Component, GuestAuthComponent } from '@website/scripts/components';
import { ASCII_ART, appState, TournamentCache, AppStateManager } from '@website/scripts/utils';
import { DbService, html, render, NotificationManager } from '@website/scripts/services';
import { GameMode, PlayerData, PlayersRegisterState, IAuthComponent } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class PlayersRegisterComponent extends Component<PlayersRegisterState> {
	private authManagers: Map<string, IAuthComponent> = new Map();
	private authContainer: HTMLElement | null = null;
	private onAllPlayersRegistered: (playerIds: string[], playerNames: string[], playerColors: string[]) => void;
	private onBack: () => void;
	private maxPlayers: number = 2;
	private onShowTournamentSchedule?: () => void;
	
	/**
	 * Creates a new players registration component
	 * @param container - The HTML element to render the component into
	 * @param gameMode - The game mode (MULTI or TOURNAMENT)
	 * @param onAllPlayersRegistered - Callback when all players are registered
	 * @param onBack - Callback when back button is clicked
	 * @param onShowTournamentSchedule - Callback to show tournament schedule
	 */
	constructor(
		container: HTMLElement, 
		gameMode: GameMode, 
		onAllPlayersRegistered: (playerIds: string[], playerNames: string[], playerColors: string[]) => void,
		onBack: () => void,
		onShowTournamentSchedule: () => void
	) {
		super(container, {
			gameMode,
			host: null,
			guests: [],
			isReadyToPlay: false
		});
		this.onAllPlayersRegistered = onAllPlayersRegistered;
		this.onBack = onBack;
		this.onShowTournamentSchedule = onShowTournamentSchedule;
		
		if (gameMode === GameMode.TOURNAMENT) this.maxPlayers = 4;
		this.initializeHost();
		this.handleGuestAuthenticatedEvent = this.handleGuestAuthenticatedEvent.bind(this);
		document.addEventListener('guest-authenticated', this.handleGuestAuthenticatedEvent);
		document.addEventListener('auth-cancelled', this.handleAuthCancelled.bind(this));
		window.addEventListener('user:theme-updated', this.handleUserThemeUpdated.bind(this));
	}
	
	/**
	 * Initialize host player data from current app state
	 */
	private initializeHost(): void {
		const currentUser = appState.getCurrentUser();
		if (currentUser && currentUser.id) {
			const hostId = currentUser.id;
			const hostTheme = AppStateManager.getUserAccentColor(hostId);
			const hostData: PlayerData = {
				id: hostId,
				username: currentUser.username || 'Player 1',
				pfp: currentUser.profilePicture || '/images/default-avatar.svg',
				isConnected: true,
				theme: hostTheme,
				elo: 0
			};
			DbService.getUserProfile(hostId)
				.then(userProfile => {
					if (userProfile) {
						hostData.username = userProfile.username || hostData.username;
						hostData.elo = userProfile.summary?.elo || 0;
						// Handle profile picture
						if (userProfile.pics?.link) hostData.pfp = userProfile.pics.link;
						appState.setPlayerAccentColor(1, hostData.theme, hostData.id);
						this.updateInternalState({ host: { ...hostData } });
					}
				})
				.catch(error => {
					NotificationManager.handleError(error);
					appState.setPlayerAccentColor(1, hostData.theme, hostData.id);
					this.updateInternalState({ host: { ...hostData } });
				});
		} else NotificationManager.showError('Host authentication required');
	}
	
	/**
	 * Renders the component into its container
	 */
	render(): void {
		const state = this.getInternalState();
		this.container.className = 'players-register-container';
		let template;
		if (state.gameMode === GameMode.MULTI) {
			template = html`
				<button class="back-button nav-item" onclick="${() => this.handleBack()}">
					← Back
				</button>
				
				<div class="ascii-title-container">
					<div class="ascii-title">${ASCII_ART.MULTI}</div>
				</div>
				
				<div class="players-grid">
					<div class="vertical-separator"></div>
					
					<!-- Host Side -->
					<div class="player-side host-side">
						<div class="player-label">PLAYER 1</div>
						${this.renderHostPlayer(state.host)}
					</div>
					
					<!-- Guest Side -->
					<div class="player-side guest-side">
						<div class="player-label">PLAYER 2</div>
						${state.guests[0] && state.guests[0].isConnected 
							? this.renderConnectedGuest(state.guests[0])
							: html`<div id="guest-auth-container" class="player-auth-wrapper"></div>`
						}
					</div>
				</div>
				
				${this.renderPlayButton(state)}
			`;
		} else {
			const nextAuthIndex = state.guests.filter(g => g && g.isConnected).length;
			template = html`
				<button class="back-button nav-item" onclick="${() => this.handleBack()}">
					← Back
				</button>

				<div class="ascii-title-container">
					<div class="ascii-title">${ASCII_ART.TOURNAMENT}</div>
				</div>
				
				<div class="tournament-players-grid">
					<!-- Host -->
					<div class="player-side host-side">
						<div class="player-label">PLAYER 1</div>
						${this.renderHostPlayer(state.host)}
					</div>
					
					<div class="vertical-separator"></div>
					
					<!-- Player 2 -->
					<div class="player-side guest-side">
						<div class="player-label">PLAYER 2</div>
						${nextAuthIndex === 0 
							? html`<div id="guest-auth-container-0" class="player-auth-wrapper"></div>`
							: (state.guests[0] && state.guests[0].isConnected 
								? this.renderConnectedGuest(state.guests[0])
								: html`<div class="waiting-indicator">WAITING</div>`)
						}
					</div>
					
					<div class="vertical-separator"></div>
					
					<!-- Player 3 -->
					<div class="player-side guest-side">
						<div class="player-label">PLAYER 3</div>
						${nextAuthIndex === 1
							? html`<div id="guest-auth-container-1" class="player-auth-wrapper"></div>`
							: (state.guests[1] && state.guests[1].isConnected 
								? this.renderConnectedGuest(state.guests[1])
								: html`<div class="waiting-indicator">WAITING</div>`)
						}
					</div>
					
					<div class="vertical-separator"></div>
					
					<!-- Player 4 -->
					<div class="player-side guest-side">
						<div class="player-label">PLAYER 4</div>
						${nextAuthIndex === 2
							? html`<div id="guest-auth-container-2" class="player-auth-wrapper"></div>`
							: (state.guests[2] && state.guests[2].isConnected 
								? this.renderConnectedGuest(state.guests[2])
								: html`<div class="waiting-indicator">WAITING</div>`)
						}
					</div>
				</div>
				
				${this.renderPlayButton(state)}
			`;
		}
		render(template, this.container);
		this.setupAuthComponent();
	}
	
	/**
	 * Cleans up resources and removes event listeners
	 */
	destroy(): void {
		document.removeEventListener('guest-authenticated', this.handleGuestAuthenticatedEvent);
		document.removeEventListener('auth-cancelled', this.handleAuthCancelled.bind(this));
		window.removeEventListener('user:theme-updated', this.handleUserThemeUpdated.bind(this));
		this.authManagers.forEach(manager => manager.destroy());
		this.authManagers.clear();
		super.destroy();
	}
	
	// =========================================
	// RENDERING METHODS
	// =========================================
	
	/**
	 * Renders the host player with color selection
	 * @param host - The host player data
	 * @returns HTML template for the host player
	 */
	private renderHostPlayer(host: PlayerData | null): any {
		if (!host || !host.id) return '';
		const availableColors = Object.entries(appState.getAvailableColors());
		const currentColor = AppStateManager.getUserAccentColor(host.id);
		const firstRowColors = availableColors.slice(0, 6);
		const secondRowColors = availableColors.slice(6);
		return html`
			<div class="player-avatar">
				<img src="${host.pfp}" alt="${host.username}" />
			</div>
			<div class="player-name">${host.username}</div>
			<div class="player-elo">${host.elo !== undefined ? host.elo : '0'}</div>
			
			<div class="player-color-selection">
				<div class="color-picker">
					<div class="color-row">
						${firstRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${colorHex === currentColor ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick="${() => this.handleHostColorSelect(colorHex)}"
								title="${colorName}"
							></div>
						`)}
					</div>
					<div class="color-row">
						${secondRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${colorHex === currentColor ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick="${() => this.handleHostColorSelect(colorHex)}"
								title="${colorName}"
							></div>
						`)}
					</div>
				</div>
			</div>
		`;
	}
	
	/**
	 * Renders a connected guest with color selection
	 * @param guest - The guest player data
	 * @returns HTML template for the guest player
	 */
	private renderConnectedGuest(guest: PlayerData | null): any {
		if (!guest || !guest.id) return '';
		const availableColors = Object.entries(appState.getAvailableColors());
		const firstRowColors = availableColors.slice(0, 6);
		const secondRowColors = availableColors.slice(6);
		const guestColor = AppStateManager.getUserAccentColor(guest.id);
		return html`
			<div class="player-avatar">
				<img src="${guest.pfp}" alt="${guest.username}" />
			</div>
			<div class="player-name">${guest.username}</div>
			<div class="player-elo">${guest.elo !== undefined ? guest.elo : '0'}</div>
			
			<div class="player-color-selection">
				<div class="color-picker">
					<div class="color-row">
						${firstRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${guestColor === colorHex ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick="${() => this.handleGuestColorSelect(colorHex, guest.id)}"
								title="${colorName}"
							></div>
						`)}
					</div>
					<div class="color-row">
						${secondRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${guestColor === colorHex ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick="${() => this.handleGuestColorSelect(colorHex, guest.id)}"
								title="${colorName}"
							></div>
						`)}
					</div>
				</div>
			</div>
		`;
	}
	
	/**
	 * Renders the play button based on player readiness
	 * @param state - The current component state
	 * @returns HTML template for the play button
	 */
	private renderPlayButton(state: PlayersRegisterState): any {
		const requiredPlayers = this.maxPlayers;
		const connectedCount = (state.host ? 1 : 0) + 
			state.guests.filter(g => g && g.isConnected).length;
		const isReady = connectedCount >= requiredPlayers;
		return html`
			<div class="play-button-container">
				${isReady ? html`
					<button class="menu-button play-button" onclick="${() => this.startGame()}">
						${state.gameMode === GameMode.TOURNAMENT ? 'Start Tournament' : 'Play Now'}
					</button>
				` : ''}
			</div>
		`;
	}
	
	// =========================================
	// AUTH COMPONENT SETUP
	// =========================================
	
	/**
	 * Sets up the authentication component based on game mode
	 */
	private setupAuthComponent(): void {
		const state = this.getInternalState();
		if (state.gameMode === GameMode.MULTI) {
			if (!state.guests.length || !state.guests[0] || !state.guests[0].isConnected) {
				const guestSide = this.container.querySelector('.guest-side');
				if (guestSide) {
					this.authContainer = this.container.querySelector('#guest-auth-container') as HTMLElement;
					if (!this.authContainer) {
						this.authContainer = document.createElement('div');
						this.authContainer.id = 'guest-auth-container';
						this.authContainer.className = 'player-auth-wrapper simplified-auth-container';
						const playerLabel = guestSide.querySelector('.player-label');
						guestSide.innerHTML = '';
						if (playerLabel) guestSide.appendChild(playerLabel);
						else {
							const newLabel = document.createElement('div');
							newLabel.className = 'player-label';
							newLabel.textContent = 'PLAYER 2';
							guestSide.appendChild(newLabel);
						}
						guestSide.appendChild(this.authContainer);
					}
					if (this.authManagers.has('guest')) {
						this.authManagers.get('guest')?.destroy();
						this.authManagers.delete('guest');
					}
					const authManager = new GuestAuthComponent(this.authContainer);
					this.authManagers.set('guest', authManager);
					authManager.show();
				}
			}
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			const nextAuthIndex = state.guests.filter(g => g && g.isConnected).length;
			if (nextAuthIndex < 3) {
				const guestSides = this.container.querySelectorAll('.guest-side');
				const targetGuestSide = guestSides[nextAuthIndex];
				if (targetGuestSide) {
					const playerLabel = targetGuestSide.querySelector('.player-label');
					const labelContent = playerLabel ? playerLabel.innerHTML : `PLAYER ${nextAuthIndex + 2}`;
					const authContainerId = `guest-auth-container-${nextAuthIndex}`;
					targetGuestSide.innerHTML = '';
					const newLabel = document.createElement('div');
					newLabel.className = 'player-label';
					newLabel.innerHTML = labelContent;
					targetGuestSide.appendChild(newLabel);
					const authContainer = document.createElement('div');
					authContainer.id = authContainerId;
					authContainer.className = 'player-auth-wrapper simplified-auth-container';
					targetGuestSide.appendChild(authContainer);
					const managerId = `guest-${nextAuthIndex}`;
					if (this.authManagers.has(managerId)) {
						this.authManagers.get(managerId)?.destroy();
						this.authManagers.delete(managerId);
					}
					const authManager = new GuestAuthComponent(authContainer);
					this.authManagers.set(managerId, authManager);
					authManager.show();
				}
			}
		}
	}
	
	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Handles the guest-authenticated event
	 * @param event - The authentication event
	 */
	private handleGuestAuthenticatedEvent = (event: Event): void => {
		const customEvent = event as CustomEvent<{ user: any, position?: number }>;
		if (customEvent.detail && customEvent.detail.user) {
			const userData = customEvent.detail.user;
			const position = customEvent.detail.position;
			const guestId = userData.id;
			const guestData: PlayerData = {
				id: guestId,
				username: userData.username,
				pfp: userData.profilePicture,
				isConnected: true,
				theme: userData.theme,
				elo: userData.elo,
				position: position
			};
			this.handleGuestAuthenticated(guestData);
		}
	};
	
	/**
	 * Handles user theme updates from other components
	 * @param event - The theme update event
	 */
	private handleUserThemeUpdated(event: Event): void {
		const customEvent = event as CustomEvent<{ userId: string, theme: string }>;
		if (!customEvent.detail) return;
		const { userId, theme } = customEvent.detail;
		const state = this.getInternalState();
		let needsRender = false;
		if (state.host && state.host.id === userId) {
			if (state.host.theme !== theme) {
				this.updateInternalState({ host: { ...state.host, theme: theme } });
				needsRender = true;
			}
		} else {
			const guestIndex = state.guests.findIndex(g => g && g.id === userId);
			if (guestIndex >= 0 && state.guests[guestIndex].theme !== theme) {
				const updatedGuests = [...state.guests];
				updatedGuests[guestIndex] = { ...updatedGuests[guestIndex], theme: theme };
				this.updateInternalState({ guests: updatedGuests });
				needsRender = true;
			}
		}
		if (needsRender) this.render();
	}
	
	/**
	 * Processes guest authentication with received data
	 * @param guestDataFromEvent - The guest player data from auth event
	 */
	private handleGuestAuthenticated(guestDataFromEvent: PlayerData): void {
		if (!guestDataFromEvent || !guestDataFromEvent.id) {
			NotificationManager.showError('No guest data or guest ID received from auth event');
			return;
		}
		const guestSelectedTheme = AppStateManager.getUserAccentColor(guestDataFromEvent.id);
		const guestData: PlayerData = {
			...guestDataFromEvent,
			theme: guestSelectedTheme, 
			pfp: guestDataFromEvent.pfp || '/images/default-avatar.svg',
			elo: guestDataFromEvent.elo !== undefined ? guestDataFromEvent.elo : 0,
			isConnected: true
		};
		DbService.getUserProfile(guestData.id)
			.then(userProfile => {
				if (userProfile) {
					guestData.username = userProfile.username || guestData.username;
					guestData.elo = userProfile.summary?.elo || 0;
					// Handle profile picture
					if (userProfile.pics?.link) guestData.pfp = userProfile.pics.link;
				}
			})
			.catch(error => {
				if (error && typeof error === 'object' && 'code' in error && error.code === ErrorCodes.PICTURE_NOT_FOUND) {
				} else NotificationManager.handleError(error);
			})
			.finally(() => {
				guestData.pfp = guestData.pfp || '/images/default-avatar.svg';
				guestData.elo = guestData.elo !== undefined ? guestData.elo : 0;
				guestData.username = guestData.username || 'Player';
				this.continueGuestAuthentication(guestData);
			});
	}
	
	/**
	 * Continues guest authentication process after fetching details
	 * 
	 * @param guestData - The processed guest player data
	 */
	private continueGuestAuthentication(guestData: PlayerData): void {
		const state = this.getInternalState();
		if (state.host && state.host.id === guestData.id) {
			NotificationManager.showWarning('This user is already registered as a player');
			return;
		}
		const isDuplicate = state.guests.some(guest => 
			guest && guest.isConnected && guest.id === guestData.id
		);
		if (isDuplicate) {
			NotificationManager.showWarning('This user is already registered as a player');
			return;
		}
		guestData.pfp = guestData.pfp || '/images/default-avatar.svg';
		guestData.elo = guestData.elo !== undefined ? guestData.elo : 0;
		guestData.username = guestData.username || 'Player';
		guestData.theme = guestData.theme || AppStateManager.getUserAccentColor(guestData.id);
		let updatedGuests: PlayerData[] = [...state.guests];
		let isReadyToPlay = state.isReadyToPlay;
		if (state.gameMode === GameMode.MULTI) {
			updatedGuests = [guestData];
			appState.setPlayerAccentColor(2, guestData.theme as string, guestData.id);
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			const nextIndex = updatedGuests.filter(g => g && g.isConnected).length;
			if (nextIndex >= 3) {
				NotificationManager.showError('All player slots are filled');
				return;
			}
			while (updatedGuests.length <= nextIndex)
				updatedGuests.push({} as PlayerData); 
			updatedGuests[nextIndex] = guestData;
			const playerPosition = nextIndex + 2;
			appState.setPlayerAccentColor(playerPosition, guestData.theme as string, guestData.id);
		}
		const connectedCount = (state.host ? 1 : 0) + 
			updatedGuests.filter(g => g && g.isConnected).length;
		isReadyToPlay = connectedCount >= this.maxPlayers;
		this.updateInternalState({
			guests: updatedGuests,
			isReadyToPlay: isReadyToPlay
		});
		this.renderComponent();
	}
	
	/**
	 * Handle auth cancelled event
	 */
	private handleAuthCancelled(): void {
		if (this.authManagers.has('guest')) {
			this.authManagers.get('guest')?.destroy();
			this.authManagers.delete('guest');
			this.setupAuthComponent();
		}
	}
	
	// =========================================
	// GAME STATE MANAGEMENT
	// =========================================
	
	/**
	 * Start the game with registered players
	 */
	private startGame(): void {
		const state = this.getInternalState();
		if (!state.host) {
			NotificationManager.showError('Cannot start game: Missing host');
			return;
		}
		if (state.gameMode === GameMode.MULTI) {
			document.getElementById('game-menu')?.remove();
			if (!state.guests[0]) {
				NotificationManager.showError('Cannot start game: Missing guest');
				return;
			}
			const hostId = state.host.id;
			const guestId = state.guests[0].id;
			const hostName = state.host.username || 'Player 1';
			const guestName = state.guests[0].username || 'Player 2';
			const hostColor = state.host.theme || '#ffffff';
			const guestColor = state.guests[0].theme || '#ffffff';
			this.authManagers.forEach(manager => manager.destroy());
			this.authManagers.clear();
			this.onAllPlayersRegistered(
				[hostId, guestId], 
				[hostName, guestName],
				[hostColor, guestColor]
			);
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			const connectedGuests = state.guests.filter(g => g && g.isConnected);
			if (connectedGuests.length < 3) {
				NotificationManager.showError('Cannot start tournament: Not enough players');
				return;
			}
			if (typeof TournamentCache !== 'undefined' && TournamentCache.getTournamentData()) TournamentCache.clearTournament();
			const playerIds = [state.host.id, ...connectedGuests.map(g => g.id)];
			const playerNames = [
				state.host.username || 'Player 1',
				...connectedGuests.map((g, i) => g.username || `Player ${i + 2}`)
			];
			const playerColors = [
				state.host.theme || '#ffffff',
				...connectedGuests.map(g => g.theme || '#ffffff')
			];
			document.getElementById('game-menu')?.remove();
			this.onAllPlayersRegistered(playerIds, playerNames, playerColors);
			if (this.onShowTournamentSchedule) this.onShowTournamentSchedule();
		}
	}
	
	// =========================================
	// COLOR SELECTION HANDLERS
	// =========================================
	
	/**
	 * Handle host color selection
	 */
	private handleHostColorSelect(colorHex: string): void {
		const state = this.getInternalState();
		if (!state.host || !state.host.id) return;
		AppStateManager.setUserAccentColor(state.host.id, colorHex);
		appState.setPlayerAccentColor(1, colorHex, state.host.id);
	}
	
	/**
	 * Handle guest color selection
	 */
	private handleGuestColorSelect(colorHex: string, guestId: string): void {
		if (!guestId) return;
		const state = this.getInternalState();
		AppStateManager.setUserAccentColor(guestId, colorHex);
		const guestIndex = state.guests.findIndex(g => g && g.id === guestId);
		if (guestIndex >= 0) {
			const playerPosition = guestIndex + 2;
			appState.setPlayerAccentColor(playerPosition, colorHex, guestId);
		}
	}
	
	/**
	 * Handle back button click
	 */
	private handleBack(): void {
		this.authManagers.forEach(manager => {
			manager.destroy();
		});
		this.authManagers.clear();
		this.onBack();
	}
}
