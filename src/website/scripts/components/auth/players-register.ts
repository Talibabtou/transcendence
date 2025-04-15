/**
 * Players Register Module
 * Handles registration of players for multiplayer and tournament games
 * Provides a split interface showing host and registering guests
 */
import { Component, GuestAuthComponent } from '@website/scripts/components';
import { html, render, ASCII_ART, DbService, appState } from '@website/scripts/utils';
import { GameMode, PlayerData, PlayersRegisterState, IAuthComponent } from '@shared/types';

export class PlayersRegisterComponent extends Component<PlayersRegisterState> {
	private authManagers: Map<string, IAuthComponent> = new Map();
	private authContainer: HTMLElement | null = null;
	private onAllPlayersRegistered: (playerIds: number[], playerNames: string[], playerColors: string[]) => void;
	private onBack: () => void;
	private maxPlayers: number = 2;
	
	// =========================================
	// INITIALIZATION & LIFECYCLE
	// =========================================
	
	constructor(
		container: HTMLElement, 
		gameMode: GameMode, 
		onAllPlayersRegistered: (playerIds: number[], playerNames: string[], playerColors: string[]) => void,
		onBack: () => void
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
	}
	
	/**
	 * Initialize host player data from current app state
	 */
	private initializeHost(): void {
		const currentUser = appState.getCurrentUser();
		
		if (currentUser) {
			// Extract numeric ID for host
			let hostId: number;
			
			if (typeof currentUser.id === 'string' && currentUser.id.includes('_')) {
				// Extract numeric part after underscore
				const parts = currentUser.id.split('_');
				hostId = parseInt(parts[parts.length - 1], 10);
			} else if (typeof currentUser.id === 'string') {
				hostId = parseInt(currentUser.id, 10);
			} else {
				hostId = Number(currentUser.id);
			}
			
			// Fetch the user's ELO from the database if possible
			DbService.getUser(hostId)
				.then(user => {
					const hostTheme = currentUser.theme || user.theme || '#ffffff';
					
					const host: PlayerData = {
						id: hostId,
						username: currentUser.username,
						pfp: currentUser.profilePicture || '/images/default-avatar.svg',
						isConnected: true,
						theme: hostTheme,
						elo: user.elo
					};
					
					// IMPORTANT: Explicitly set player accent1 color
					appState.setPlayerAccentColor(1, hostTheme);
					
					// Apply directly to CSS for immediate effect
					document.documentElement.style.setProperty('--accent1-color', hostTheme);
					
					this.updateInternalState({ host });
				})
				.catch(_ => {
					// If we can't fetch from DB, use current user data
					const hostTheme = currentUser.theme || '#ffffff';
					
					const host: PlayerData = {
						id: hostId,
						username: currentUser.username,
						pfp: currentUser.profilePicture || '/images/default-avatar.svg',
						isConnected: true,
						theme: hostTheme
					};
					
					// IMPORTANT: Explicitly set player accent1 color
					appState.setPlayerAccentColor(1, hostTheme);
					
					// Apply directly to CSS for immediate effect
					document.documentElement.style.setProperty('--accent1-color', hostTheme);
					
					this.updateInternalState({ host });
				});
		} else {
			// This shouldn't happen as the host should be authenticated
			console.error('No authenticated host found');
			this.updateInternalState({ 
				error: 'Host authentication required'
			});
		}
	}
	
	render(): void {
		const state = this.getInternalState();
		
		// Main container setup
		this.container.className = 'players-register-container';
		
		let template;
		
		if (state.gameMode === GameMode.MULTI) {
			template = html`
				<button class="back-button nav-item" onclick=${() => this.handleBack()}>
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
				<button class="back-button nav-item" onclick=${() => this.handleBack()}>
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
		if (!host) return '';
		
		// Get available colors from app state
		const availableColors = Object.entries(appState.getAvailableColors());
		
		// Get host's current color directly from appState
		const currentColor = appState.getAccentColorHex();
		
		// Split colors into two rows (6 in first row, 5 in second row)
		const firstRowColors = availableColors.slice(0, 6);
		const secondRowColors = availableColors.slice(6);
		
		return html`
			<div class="player-avatar">
				<img src="${host.pfp}" alt="${host.username}" />
			</div>
			<div class="player-name">${host.username}</div>
			<div class="player-elo">${host.elo !== undefined ? String(host.elo) : '0'}</div>
			
			<div class="player-color-selection">
				<div class="color-picker">
					<div class="color-row">
						${firstRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${colorHex === currentColor ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick=${() => this.handleHostColorSelect(colorName, colorHex)}
								title="${colorName}"
							></div>
						`)}
					</div>
					<div class="color-row">
						${secondRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${colorHex === currentColor ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick=${() => this.handleHostColorSelect(colorName, colorHex)}
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
		if (!guest) return '';
		
		const availableColors = Object.entries(appState.getAvailableColors());
		const firstRowColors = availableColors.slice(0, 6);
		const secondRowColors = availableColors.slice(6);
		
		return html`
			<div class="player-avatar">
				<img src="${guest.pfp}" alt="${guest.username}" />
			</div>
			<div class="player-name">${guest.username}</div>
			<div class="player-elo">${guest.elo !== undefined ? String(guest.elo) : '0'}</div>
			
			<div class="player-color-selection">
				<div class="color-picker">
					<div class="color-row">
						${firstRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${guest.theme === colorHex ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick=${() => this.handleGuestColorSelect(colorHex, guest.id)}
								title="${colorName}"
							></div>
						`)}
					</div>
					<div class="color-row">
						${secondRowColors.map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${guest.theme === colorHex ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick=${() => this.handleGuestColorSelect(colorHex, guest.id)}
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
					<button class="menu-button play-button" onclick=${() => this.startGame()}>
						${state.gameMode === GameMode.TOURNAMENT ? 'Show Pool' : 'Play Now'}
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
			const position = customEvent.detail.position; // Get position if available
			
			// Get user ID in the correct format for the player data
			let guestId: number;
			
			if (typeof userData.id === 'string' && userData.id.includes('_')) {
				// Extract numeric part from string ID with prefix
				const parts = userData.id.split('_');
				guestId = parseInt(parts[parts.length - 1], 10);
			} else if (typeof userData.id === 'string') {
				// Convert string ID to number
				guestId = parseInt(userData.id, 10);
			} else {
				// Already numeric
				guestId = Number(userData.id);
			}
			
			if (isNaN(guestId)) {
				console.error('Invalid guest ID format:', userData.id);
				this.updateInternalState({
					error: 'Invalid guest ID format'
				});
				return;
			}
			
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
	 * Handle guest authenticated - receives data directly from GuestAuthComponent
	 */
	private handleGuestAuthenticated(guestData: PlayerData): void {
		if (!guestData) {
			console.error('No guest data received');
			return;
		}
		
		// Set default theme for guest if not present
		if (!guestData.theme) {
			// Default white for guest
			guestData.theme = '#ffffff';
			
			// Update this in the database - use the exact ID format (don't convert)
			DbService.updateUserTheme(guestData.id, guestData.theme);
		}
		
		// Check if we need to fetch ELO from DB if not already provided
		if (guestData.elo === undefined) {
			DbService.getUser(guestData.id)
				.then(user => {
					if (user.elo !== undefined) {
						guestData.elo = user.elo;
					}
					this.continueGuestAuthentication(guestData);
				})
				.catch(_ => {
					this.continueGuestAuthentication(guestData);
				});
		} else {
			this.continueGuestAuthentication(guestData);
		}
	}
	
	/**
	 * Continue guest authentication after potentially fetching ELO
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

		let updatedGuests: PlayerData[] = [...state.guests]; // Initialize with current guests
		let isReadyToPlay = state.isReadyToPlay; // Start with current readiness

		if (state.gameMode === GameMode.MULTI) {
			// For multiplayer, just replace the entire guests array
			updatedGuests = [guestData]; // Set the single guest
			
			// Set player 2's accent color
			appState.setPlayerAccentColor(2, guestData.theme || '#ffffff');
			
			// Calculate readiness here
			const connectedGuestsCount = (state.host ? 1 : 0) + updatedGuests.filter(g => g && g.isConnected).length;
			isReadyToPlay = connectedGuestsCount >= this.maxPlayers;
			
		} else if (state.gameMode === GameMode.TOURNAMENT) {
			// For tournament, add player to the next available slot
			const nextIndex = state.guests.filter(g => g && g.isConnected).length;
			
			if (nextIndex >= 3) {
				this.updateInternalState({
					error: 'All player slots are filled'
				});
				return; // Exit early, no state change needed here
			}
			
			// Create a new guests array with the new player added at the correct position
			// Ensure the array is big enough
			while (updatedGuests.length <= nextIndex) {
				updatedGuests.push({} as PlayerData); // Add placeholders if needed
			}
			
			// Add the new guest at the next position
			updatedGuests[nextIndex] = guestData;
			
			// Set the accent color for this player position
			const playerPosition = nextIndex + 2; // Player positions: 2, 3, 4
			appState.setPlayerAccentColor(playerPosition, guestData.theme || '#ffffff');
			
			// Also update the CSS variable directly for immediate effect
			const cssVarName = `--accent${playerPosition}-color`;
			document.documentElement.style.setProperty(cssVarName, guestData.theme || '#ffffff');

			// Calculate readiness here
			const connectedGuestsCount = (state.host ? 1 : 0) + updatedGuests.filter(g => g && g.isConnected).length;
			isReadyToPlay = connectedGuestsCount >= this.maxPlayers;
		}

		// Update state with both guest list and readiness in one go
		this.updateInternalState({
			guests: updatedGuests,
			isReadyToPlay: isReadyToPlay, // Update readiness flag
			error: null // Clear any previous error
		});
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
			
			const playerIds = [state.host.id, ...connectedGuests.map(g => g.id)];
			const playerNames = [
				state.host.username || 'Player 1',
				...connectedGuests.map((g, i) => g.username || `Player ${i + 2}`)
			];
			const playerColors = [
				state.host.theme || '#ffffff',
				...connectedGuests.map(g => g.theme || '#ffffff')
			];
			
			// Hide any existing menu
			document.getElementById('game-menu')?.remove();
			
			// First pass player data to initialize tournament
			this.onAllPlayersRegistered(playerIds, playerNames, playerColors);
			
			// Then show tournament schedule after a small delay to ensure initialization is complete
			setTimeout(() => {
				document.dispatchEvent(new CustomEvent('show-tournament-schedule'));
			}, 100);
		}
	}
	
	// =========================================
	// COLOR SELECTION HANDLERS
	// =========================================
	
	/**
	 * Handle host color selection
	 */
	private handleHostColorSelect(colorName: string, colorHex: string): void {
		const state = this.getInternalState();
		if (!state.host) return;
		
		// Update app accent color for the host (current user)
		appState.setAccentColor(colorName as any);
		
		// Keep this direct CSS update for immediate visual feedback,
		// although the re-render triggered by appState should also handle it.
		document.documentElement.style.setProperty('--accent1-color', colorHex);
	}
	
	/**
	 * Handle guest color selection
	 */
	private handleGuestColorSelect(colorHex: string, guestId: number): void {
		const state = this.getInternalState();
		if (!state.guests || !state.guests.length) return;
		
		// Update guest's theme in the database
		DbService.updateUserTheme(guestId, colorHex);
		
		// Find guest index
		const guestIndex = state.guests.findIndex(g => g && g.id === guestId);
		
		if (guestIndex >= 0) {
			// Calculate player position (2, 3, or 4)
			const playerPosition = guestIndex + 2;
			
			// Update accent color in the app state
			appState.setPlayerAccentColor(playerPosition, colorHex);
			
			// Update guest's theme in the local state
			const updatedGuests = [...state.guests];
			updatedGuests[guestIndex] = {
				...updatedGuests[guestIndex],
				theme: colorHex
			};
			
			this.updateInternalState({
				guests: updatedGuests
			});
			
			// Update CSS variable for immediate effect
			document.documentElement.style.setProperty(
				`--accent${playerPosition}-color`, 
				colorHex
			);
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
