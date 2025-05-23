import { Component, GuestAuthComponent } from '@website/scripts/components';
import { ASCII_ART, appState, TournamentCache, AppStateManager } from '@website/scripts/utils';
import { DbService, html, render, ApiError } from '@website/scripts/services';
import { GameMode, PlayerData, PlayersRegisterState, IAuthComponent } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

export class PlayersRegisterComponent extends Component<PlayersRegisterState> {
	private authManagers: Map<string, IAuthComponent> = new Map();
	private authContainer: HTMLElement | null = null;
	private onAllPlayersRegistered: (playerIds: string[], playerNames: string[], playerColors: string[]) => void;
	private onBack: () => void;
	private maxPlayers: number = 2;
	private onShowTournamentSchedule?: () => void;
	
	// =========================================
	// INITIALIZATION & LIFECYCLE
	// =========================================
	
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
			isReadyToPlay: false,
			error: null
		});
		
		this.onAllPlayersRegistered = onAllPlayersRegistered;
		this.onBack = onBack;
		this.onShowTournamentSchedule = onShowTournamentSchedule;
		
		// Set max players based on game mode
		if (gameMode === GameMode.TOURNAMENT) {
			this.maxPlayers = 4;
		}
		
		// Initialize host data
		this.initializeHost();
		
		// IMPORTANT: Use bind for both event handlers to ensure correct 'this' context
		this.handleGuestAuthenticatedEvent = this.handleGuestAuthenticatedEvent.bind(this);
		
		// Listen for authentication events - use guest-authenticated instead of user-authenticated
		document.addEventListener('guest-authenticated', this.handleGuestAuthenticatedEvent);
		document.addEventListener('auth-cancelled', this.handleAuthCancelled.bind(this));
		
		// Listen for theme updates to keep UI in sync with settings changes
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
			
			// Initialize hostData with available information and defaults
			const hostData: PlayerData = {
				id: hostId,
				username: currentUser.username || 'Player 1',
				pfp: currentUser.profilePicture || '/images/default-avatar.svg',
				isConnected: true,
				theme: hostTheme,
				elo: 0
			};

			// Chain promises to fetch detailed information
			DbService.getUser(hostId)
				.then(userFromDb => {
					hostData.username = userFromDb.username || hostData.username;
					// Use pfp from userFromDb as a fallback if getPic fails
					hostData.pfp = userFromDb.pfp || hostData.pfp;
					// Use elo from userFromDb as a fallback if getPlayerElo fails
					hostData.elo = userFromDb.elo !== undefined ? userFromDb.elo : hostData.elo;
					return DbService.getPlayerElo(hostId);
				})
				.then(eloResponse => {
					// eloResponse is expected to be an object like { elo: number, ... }
					if (eloResponse && eloResponse.elo !== undefined) {
						hostData.elo = eloResponse.elo;
					}
					return DbService.getPic(hostId);
				})
				.then(picResponse => {
					// picResponse is { link: string }
					// The link should be a relative path like /uploads/image.png
					if (picResponse && picResponse.link && picResponse.link !== 'undefined') {
                        // The backend might return API_PREFIX in the link, ensure it's a relative path for the client
                        // However, profile service getPic returns `/uploads/${existingFile}` which is already correct.
						hostData.pfp = picResponse.link;
					}
				})
				.catch(error => {
					// Check if it's an ApiError for PICTURE_NOT_FOUND
					if (error instanceof ApiError && error.isErrorCode(ErrorCodes.PICTURE_NOT_FOUND)) {
					} else {
						// For any other error, log a warning.
						console.warn(`Error fetching full details for host ${hostId}. Using fallbacks.`, error);
					}
				})
				.finally(() => {
					appState.setPlayerAccentColor(1, hostData.theme, hostData.id);
					this.updateInternalState({ host: { ...hostData } });
				});
		} else {
			console.error('No authenticated host found or host ID missing');
			this.updateInternalState({ error: 'Host authentication required' });
		}
	}
	
	render(): void {
		const state = this.getInternalState();
		
		// Main container setup
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
			// Tournament mode with sequential authentication
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
		
		// Initialize auth container after rendering
		this.setupAuthComponent();
	}
	
	destroy(): void {
		// Remove event listeners
		document.removeEventListener('guest-authenticated', this.handleGuestAuthenticatedEvent);
		document.removeEventListener('auth-cancelled', this.handleAuthCancelled.bind(this));
		window.removeEventListener('user:theme-updated', this.handleUserThemeUpdated.bind(this));
		
		// Destroy all auth managers
		this.authManagers.forEach(manager => manager.destroy());
		this.authManagers.clear();
		
		super.destroy();
	}
	
	// =========================================
	// RENDERING METHODS
	// =========================================
	
	/**
	 * Renders the host player with color selection
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
	 * Renders or updates the play button based on player readiness
	 * Used for both initial rendering and dynamic updates
	 */
	private renderPlayButton(state: PlayersRegisterState): any {
		const requiredPlayers = this.maxPlayers;
		const connectedCount = (state.host ? 1 : 0) + 
			state.guests.filter(g => g && g.isConnected).length;
		const isReady = connectedCount >= requiredPlayers;
		
		// Always return fresh HTML for consistency
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
	 * Setup the authentication component
	 */
	private setupAuthComponent(): void {
		const state = this.getInternalState();
		
		if (state.gameMode === GameMode.MULTI) {
			// Only setup auth if there's no guest yet
			if (!state.guests.length || !state.guests[0] || !state.guests[0].isConnected) {
				const guestSide = this.container.querySelector('.guest-side');
				if (guestSide) {
					this.authContainer = this.container.querySelector('#guest-auth-container') as HTMLElement;
					
					if (!this.authContainer) {
						this.authContainer = document.createElement('div');
						this.authContainer.id = 'guest-auth-container';
						this.authContainer.className = 'player-auth-wrapper simplified-auth-container';
						
						// Get the player label
						const playerLabel = guestSide.querySelector('.player-label');
						
						// Clear and preserve the label
						guestSide.innerHTML = '';
						
						if (playerLabel) {
							guestSide.appendChild(playerLabel);
						} else {
							const newLabel = document.createElement('div');
							newLabel.className = 'player-label';
							newLabel.textContent = 'PLAYER 2';
							guestSide.appendChild(newLabel);
						}
						
						guestSide.appendChild(this.authContainer);
					}
					
					// Clear existing auth manager
					if (this.authManagers.has('guest')) {
						this.authManagers.get('guest')?.destroy();
						this.authManagers.delete('guest');
					}
					
					// Create new auth manager
					const authManager = new GuestAuthComponent(this.authContainer);
					this.authManagers.set('guest', authManager);
					authManager.show();
				}
			}
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			// For tournament mode, only set up one auth container at a time
			const nextAuthIndex = state.guests.filter(g => g && g.isConnected).length;
			
			// Only show auth component if we still need more players
			if (nextAuthIndex < 3) {
				const guestSides = this.container.querySelectorAll('.guest-side');
				const targetGuestSide = guestSides[nextAuthIndex];
				
				if (targetGuestSide) {
					// Clear any existing content except the player label
					const playerLabel = targetGuestSide.querySelector('.player-label');
					const labelContent = playerLabel ? playerLabel.innerHTML : `PLAYER ${nextAuthIndex + 2}`;
					
					// Create or get the auth container
					const authContainerId = `guest-auth-container-${nextAuthIndex}`;
					targetGuestSide.innerHTML = ''; // Clear completely
					
					// Add back the player label
					const newLabel = document.createElement('div');
					newLabel.className = 'player-label';
					newLabel.innerHTML = labelContent;
					targetGuestSide.appendChild(newLabel);
					
					// Create auth container
					const authContainer = document.createElement('div');
					authContainer.id = authContainerId;
					authContainer.className = 'player-auth-wrapper simplified-auth-container';
					targetGuestSide.appendChild(authContainer);
					
					// Clean up existing auth manager if it exists
					const managerId = `guest-${nextAuthIndex}`;
					if (this.authManagers.has(managerId)) {
						this.authManagers.get(managerId)?.destroy();
						this.authManagers.delete(managerId);
					}
					
					// Create a new auth manager
					const authManager = new GuestAuthComponent(authContainer);
					this.authManagers.set(managerId, authManager);
					authManager.show();
				}
			}
		}
	}
	
	// =========================================
	// AUTH EVENT HANDLERS
	// =========================================
	
	/**
	 * Handle the guest-authenticated event
	 */
	private handleGuestAuthenticatedEvent = (event: Event): void => {
		// Cast to CustomEvent and extract user data
		const customEvent = event as CustomEvent<{ user: any, position?: number }>;
		if (customEvent.detail && customEvent.detail.user) {
			const userData = customEvent.detail.user;
			const position = customEvent.detail.position;
			
			// Use the string ID directly
			const guestId = userData.id;
			
			// Convert to PlayerData format
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
	 * Handle user theme updates from other components (like settings)
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
		if (needsRender) {
			this.render();
		}
	}
	
	/**
	 * Handle guest authenticated - receives data directly from GuestAuthComponent
	 */
	private handleGuestAuthenticated(guestDataFromEvent: PlayerData): void {
		if (!guestDataFromEvent || !guestDataFromEvent.id) {
			console.error('No guest data or guest ID received from auth event');
			return;
		}
		
		// Retrieve the guest's stored accent color preference FIRST
		const guestSelectedTheme = AppStateManager.getUserAccentColor(guestDataFromEvent.id);

		const guestData: PlayerData = {
			...guestDataFromEvent,
			theme: guestSelectedTheme, 
			pfp: guestDataFromEvent.pfp || '/images/default-avatar.svg',
			elo: guestDataFromEvent.elo !== undefined ? guestDataFromEvent.elo : 0,
			isConnected: true
		};

		DbService.getUser(guestData.id)
			.then(userFromDb => {
				guestData.username = userFromDb.username || guestData.username;
				guestData.pfp = userFromDb.pfp || guestData.pfp;
				guestData.elo = userFromDb.elo !== undefined ? userFromDb.elo : guestData.elo;
				return DbService.getPlayerElo(guestData.id);
			})
			.then(eloResponse => {
				if (eloResponse && eloResponse.elo !== undefined) {
					guestData.elo = eloResponse.elo;
				}
				return DbService.getPic(guestData.id);
			})
			.then(picResponse => {
				if (picResponse && picResponse.link && picResponse.link !== 'undefined') {
					guestData.pfp = picResponse.link;
				}
			})
			.catch(error => {
				if (error instanceof ApiError && error.isErrorCode(ErrorCodes.PICTURE_NOT_FOUND)) {
				} else {
					console.warn(`Error fetching full details for guest ${guestData.id}. Using fallbacks.`, error);
				}
			})
			.finally(() => {
				guestData.pfp = guestData.pfp || '/images/default-avatar.svg';
				guestData.elo = guestData.elo !== undefined ? guestData.elo : 0;
				guestData.username = guestData.username || 'Player';
				// guestData.theme is now correctly set before this call
				this.continueGuestAuthentication(guestData);
			});
	}
	
	/**
	 * Continue guest authentication after fetching all details
	 */
	private continueGuestAuthentication(guestData: PlayerData): void {
		const state = this.getInternalState();
		
		// Check if user is already the host
		if (state.host && state.host.id === guestData.id) {
			const currentAuthManager = this.authManagers.get('guest') || 
				this.authManagers.get(`guest-${state.guests.filter(g => g && g.isConnected).length}`);
			
			if (currentAuthManager && typeof (currentAuthManager as any).showError === 'function') {
				(currentAuthManager as any).showError('This user is already the host');
			}
			return;
		}
		
		const isDuplicate = state.guests.some(guest => 
			guest && guest.isConnected && guest.id === guestData.id
		);
		
		if (isDuplicate) {
			const currentAuthManager = this.authManagers.get('guest') || 
				this.authManagers.get(`guest-${state.guests.filter(g => g && g.isConnected).length}`);
			
			if (currentAuthManager && typeof (currentAuthManager as any).showError === 'function') {
				(currentAuthManager as any).showError('This user is already registered as a player');
			}
			return;
		}

		// Final defaults before adding to state (should be mostly covered by .finally() in handleGuestAuthenticated)
		guestData.pfp = guestData.pfp || '/images/default-avatar.svg';
		guestData.elo = guestData.elo !== undefined ? guestData.elo : 0;
		guestData.username = guestData.username || 'Player';
		// Ensure theme is still what we expect, though it should be set by handleGuestAuthenticated
		guestData.theme = guestData.theme || AppStateManager.getUserAccentColor(guestData.id);


		let updatedGuests: PlayerData[] = [...state.guests];
		let isReadyToPlay = state.isReadyToPlay; // This probably should be re-evaluated based on connected players

		if (state.gameMode === GameMode.MULTI) {
			updatedGuests = [guestData]; // Replace existing or add new
			// Ensure appState also knows about this theme for player 2
			appState.setPlayerAccentColor(2, guestData.theme as string, guestData.id);
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			const nextIndex = updatedGuests.filter(g => g && g.isConnected).length;
			if (nextIndex >= 3) { // Max 3 guests (players 2, 3, 4)
				this.updateInternalState({
					error: 'All player slots are filled'
				});
				return; // Exit if tournament is full
			}
			// Fill any gaps if players disconnected and reconnected out of order (less likely with current UI)
			while (updatedGuests.length <= nextIndex) {
				updatedGuests.push({} as PlayerData); 
			}
			updatedGuests[nextIndex] = guestData;
			const playerPosition = nextIndex + 2; // Host is 1, guests start at 2
			// Ensure appState also knows about this theme for the correct tournament position
			appState.setPlayerAccentColor(playerPosition, guestData.theme as string, guestData.id);
		}

		// Re-evaluate readiness
		const connectedCount = (state.host ? 1 : 0) + 
			updatedGuests.filter(g => g && g.isConnected).length;
		isReadyToPlay = connectedCount >= this.maxPlayers;


		this.updateInternalState({
			guests: updatedGuests,
			isReadyToPlay: isReadyToPlay,
			error: null // Clear any previous error
		});

		this.renderComponent(); // Re-render to show the new player or updated details
	}
	
	/**
	 * Handle auth cancelled event
	 */
	private handleAuthCancelled(): void {
		// For cancellation, we'll just show an error message
		// but keep the auth component visible since we still need a guest
		this.updateInternalState({
			error: 'Guest registration cancelled. Please try again.'
		});
		
		// Reset the auth component
		if (this.authManagers.has('guest')) {
			this.authManagers.get('guest')?.destroy();
			this.authManagers.delete('guest');
			
			// Recreate the auth component
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
			console.error('Cannot start game: Missing host');
			return;
		}
		
		if (state.gameMode === GameMode.MULTI) {
			// Hide the menu and immediately clean up
			document.getElementById('game-menu')?.remove();
			
			if (!state.guests[0]) {
				console.error('Cannot start game: Missing guest');
				return;
			}
			
			// Prepare all data before calling callback
			const hostId = state.host.id;
			const guestId = state.guests[0].id;
			const hostName = state.host.username || 'Player 1';
			const guestName = state.guests[0].username || 'Player 2';
			const hostColor = state.host.theme || '#ffffff';
			const guestColor = state.guests[0].theme || '#ffffff';

			// Clean up auth managers before transitioning
			this.authManagers.forEach(manager => manager.destroy());
			this.authManagers.clear();

			// Call callback with all data
			this.onAllPlayersRegistered(
				[hostId, guestId], 
				[hostName, guestName],
				[hostColor, guestColor]
			);
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			const connectedGuests = state.guests.filter(g => g && g.isConnected);
			if (connectedGuests.length < 3) {
				console.error('Cannot start tournament: Not enough players');
				return;
			}
			
			// Clear any existing tournament data when starting a new one
			if (typeof TournamentCache !== 'undefined' && TournamentCache.getTournamentData()) {
				TournamentCache.clearTournament();
			}
			
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
			if (this.onShowTournamentSchedule) {
				this.onShowTournamentSchedule();
			}
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
		// Clean up before going back
		this.authManagers.forEach(manager => {
			manager.destroy();
		});
		this.authManagers.clear();
		
		// Call the onBack callback to return to the game menu
		this.onBack();
	}
}
