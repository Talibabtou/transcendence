/**
 * Players Register Module
 * Handles registration of players for multiplayer and tournament games
 * Provides a split interface showing host and registering guests
 */
import { Component, GuestAuthComponent } from '@website/scripts/components';
import { html, render, ASCII_ART, DbService, appState } from '@website/scripts/utils';
import { GameMode, PlayerData, PlayersRegisterState, IAuthComponent } from '@shared/types';

export class PlayersRegisterComponent extends Component<PlayersRegisterState> {
	private authManager: IAuthComponent | null = null;
	private authContainer: HTMLElement | null = null;
	private onAllPlayersRegistered: (playerIds: number[], playerNames: string[], playerColors: string[]) => void;
	private onBack: () => void;
	private maxPlayers: number = 2;
	
	// =========================================
	// INITIALIZATION
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
					const host: PlayerData = {
						id: hostId,
						username: currentUser.username,
						pfp: currentUser.profilePicture || '/images/default-avatar.svg',
						isConnected: true,
						theme: currentUser.theme || user.theme,
						elo: user.elo
					};
					
					this.updateInternalState({ host });
				})
				.catch(_ => {
					// If we can't fetch from DB, use current user data
					const host: PlayerData = {
						id: hostId,
						username: currentUser.username,
						pfp: currentUser.profilePicture || '/images/default-avatar.svg',
						isConnected: true,
						theme: currentUser.theme
					};
					
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
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
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
				
				${state.error ? html`<div class="register-error">${state.error}</div>` : ''}
			`;
		} else {
			template = html`
				<button class="back-button nav-item" onclick=${() => this.handleBack()}>
					← Back
				</button>

				<div class="multiplayer-title-container">
					<div class="multiplayer-title">Tournament</div>
				</div>
				
				<!-- Tournament layout would need to be implemented -->
				<div class="register-error">Tournament mode layout not implemented yet</div>
			`;
		}
		
		render(template, this.container);
		
		// Initialize auth container after rendering
		this.setupAuthComponent();
		
		// Setup play button event listener
		this.setupEventListeners();
	}
	
	/**
	 * Setup the authentication component on the right side
	 */
	private setupAuthComponent(): void {
		const state = this.getInternalState();
		
		// For multiplayer mode, if the guest isn't yet connected
		if (state.gameMode === GameMode.MULTI && 
			(!state.guests[0] || !state.guests[0].isConnected)) {
			// Get the guest side element
			const guestSide = this.container.querySelector('.guest-side');
			if (guestSide) {
				// Get the auth container or create it if it doesn't exist
				this.authContainer = this.container.querySelector('#guest-auth-container') as HTMLElement;
				
				if (!this.authContainer) {
					// Create the container if it doesn't exist
					this.authContainer = document.createElement('div');
					this.authContainer.id = 'guest-auth-container';
					this.authContainer.className = 'player-auth-wrapper simplified-auth-container';
					
					// Get the player label
					const playerLabel = guestSide.querySelector('.player-label');
					
					// Clear the content except for the player label
					guestSide.innerHTML = '';
					
					// Add back the player label
					if (playerLabel) {
						guestSide.appendChild(playerLabel);
					} else {
						// Create a new player label if it doesn't exist
						const newLabel = document.createElement('div');
						newLabel.className = 'player-label';
						newLabel.textContent = 'PLAYER 2';
						guestSide.appendChild(newLabel);
					}
					
					// Add the auth container
					guestSide.appendChild(this.authContainer);
				}
				this.authManager = new GuestAuthComponent(this.authContainer);
				
				// Show the component
				this.authManager.show();
			} else {
				console.error('Guest side element not found');
			}
		}
	}
	
	/**
	 * Handle the guest-authenticated event
	 */
	private handleGuestAuthenticatedEvent = (event: Event): void => {
		// Cast to CustomEvent and extract user data
		const customEvent = event as CustomEvent<{ user: any }>;
		if (customEvent.detail && customEvent.detail.user) {
			const userData = customEvent.detail.user;
			
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
				pfp: userData.profilePicture || this.generateDefaultProfilePic(userData.username),
				isConnected: true,
				theme: userData.theme,
				elo: userData.elo
			};
			this.handleGuestAuthenticated(guestData);
		}
	};
	
	/**
	 * Renders the host player with color selection
	 */
	private renderHostPlayer(host: PlayerData | null): any {
		if (!host) return '';
		
		// Get available colors from app state
		const availableColors = appState.getAvailableColors();
		
		// Use host's theme directly if available, otherwise use app accent color
		const currentColor = host.theme || appState.getAccentColorHex();
		
		return html`
				<div class="player-avatar">
					<img src="${host.pfp}" alt="${host.username}" />
				</div>
				<div class="player-name">${host.username}</div>
				<div class="player-status">Connected</div>
				
				${host.elo ? html`
					<div class="player-elo">ELO: ${host.elo}</div>
				` : ''}
				
				<!-- Add color selection for host -->
				<div class="player-color-selection">
					<div class="color-label">Paddle Color:</div>
					<div class="color-picker">
						${Object.entries(availableColors).map(([colorName, colorHex]) => html`
							<div 
								class="color-option ${colorHex === currentColor ? 'selected' : ''}"
								style="background-color: ${colorHex}"
								onclick=${() => this.handleHostColorSelect(colorName, colorHex)}
								title="${colorName}"
							></div>
						`)}
					</div>
				</div>
		`;
	}
	
	/**
	 * Renders a connected guest with color selection
	 */
	private renderConnectedGuest(guest: PlayerData): any {
		const availableColors = appState.getAvailableColors();
		
		return html`
			<div class="player-avatar">
				<img src="${guest.pfp}" alt="${guest.username}" />
			</div>
			<div class="player-name">${guest.username}</div>
			<div class="player-status">Connected</div>
			
			${guest.elo ? html`
				<div class="player-elo">ELO: ${guest.elo}</div>
			` : ''}
			
			<!-- Add color selection for guest -->
			<div class="player-color-selection">
				<div class="color-label">Paddle Color:</div>
				<div class="color-picker">
					${Object.entries(availableColors).map(([colorName, colorHex]) => html`
						<div 
							class="color-option ${colorHex === guest.theme ? 'selected' : ''}"
							style="background-color: ${colorHex}"
							onclick=${() => this.handleGuestColorSelect(colorHex, guest.id)}
							title="${colorName}"
						></div>
					`)}
				</div>
			</div>
		`;
	}
	
	/**
	 * Renders the play button if appropriate
	 */
	private renderPlayButton(state: PlayersRegisterState): any {
		// Replace hardcoded values with maxPlayers
		const requiredPlayers = this.maxPlayers;
		
		// Count connected players (host + guests)
		const connectedCount = (state.host ? 1 : 0) + 
			state.guests.filter(g => g && g.isConnected).length;
		
		const isReady = connectedCount >= requiredPlayers;
		
		if (isReady) {
			return html`
				<div class="play-button-container">
					<button class="menu-button play-button">
						Play Now
					</button>
				</div>
			`;
		}
		
		// Return empty div instead of disabled button
		return html`<div class="play-button-container"></div>`;
	}
	
	/**
	 * Setup event listeners for buttons
	 */
	private setupEventListeners(): void {
		// Play button
		const playButton = this.container.querySelector('.play-button');
		if (playButton && !playButton.hasAttribute('disabled')) {
			playButton.addEventListener('click', () => {
				this.startGame();
			});
		}
	}
	
	destroy(): void {
		// Remove event listeners
		document.removeEventListener('guest-authenticated', this.handleGuestAuthenticatedEvent);
		document.removeEventListener('auth-cancelled', this.handleAuthCancelled.bind(this));
		
		// Destroy auth manager if it exists
		if (this.authManager) {
			this.authManager.destroy();
			this.authManager = null;
		}
		
		super.destroy();
	}
	
	// =========================================
	// AUTH HANDLING
	// =========================================
	
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
		
		// Check if user is already registered (prevent duplicates)
		const state = this.getInternalState();
		
		// Check host
		if (state.host && state.host.id === guestData.id) {
			this.updateInternalState({
				error: 'This user is already the host'
			});
			return;
		}
		
		// Check other guests
		const isDuplicate = state.guests.some(guest => 
			guest && guest.isConnected && guest.id === guestData.id
		);
		
		if (isDuplicate) {
			this.updateInternalState({
				error: 'This user is already registered as a player'
			});
			return;
		}
		
		// Create player data - we're already receiving a PlayerData object
		const newPlayer = guestData;
		
		// For multiplayer, we'll update only the guest side without a full rerender
		if (state.gameMode === GameMode.MULTI) {
			// Update internal state first
			this.updateInternalState({
				guests: [newPlayer],
				error: null
			});
			
			// Get the guest side element to update
			const guestSide = this.container.querySelector('.guest-side');
			if (guestSide) {
				// Update only the guest side content
				guestSide.innerHTML = `
					<div class="player-label">PLAYER 2</div>
					<div class="player-avatar">
						<img src="${newPlayer.pfp}" alt="${newPlayer.username}" />
					</div>
					<div class="player-name">${newPlayer.username}</div>
					<div class="player-status">Connected</div>
				`;
			}
			
			// Now check if ready to play (will update play button)
			this.checkReadyToPlay();
		} else {
			// For tournament, handle multiple guests
			const updatedGuests = [...state.guests];
			
			// Add the new guest to the first available slot
			let added = false;
			for (let i = 0; i < 3; i++) {
				if (!updatedGuests[i] || !updatedGuests[i].isConnected) {
					updatedGuests[i] = newPlayer;
					added = true;
					break;
				}
			}
			
			if (!added) {
				updatedGuests.push(newPlayer);
			}
			
			this.updateInternalState({
				guests: updatedGuests,
				error: null
			});
		}
		
		// Check if we have enough players to start
		this.checkReadyToPlay();
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
		if (this.authManager) {
			this.authManager.destroy();
			this.authManager = null;
			
			// Recreate the auth component
			this.setupAuthComponent();
		}
	}
	
	// =========================================
	// GAME HANDLING
	// =========================================
	
	/**
	 * Check if we have enough players to start the game
	 */
	private checkReadyToPlay(): void {
		const state = this.getInternalState();
		
		// Count connected players
		const connectedGuests = state.guests.filter(g => g && g.isConnected).length;
		
		// Use maxPlayers instead of hardcoded values
		const requiredGuests = this.maxPlayers - 1; // Subtract 1 to account for host
		
		const isReady = connectedGuests >= requiredGuests;
		
		this.updateInternalState({
			isReadyToPlay: isReady
		});
		
		// Instead of rendering the whole component, update just what changed
		this.updatePlayButton(isReady);
	}
	
	/**
	 * Update only the play button area without rerendering the entire component
	 */
	private updatePlayButton(isReady: boolean): void {
		const buttonContainer = this.container.querySelector('.play-button-container');
		if (!buttonContainer) return;
		
		if (isReady) {
			// Create and add the play button
			buttonContainer.innerHTML = `
				<button class="menu-button play-button">
					Play Now
				</button>
			`;
			
			// Add event listener to the new button
			const playButton = buttonContainer.querySelector('.play-button');
			if (playButton) {
				playButton.addEventListener('click', () => this.startGame());
			}
		} else {
			buttonContainer.innerHTML = ''; // Empty container if not ready
		}
	}
	
	/**
	 * Start the game with registered players
	 */
	private startGame(): void {
		const state = this.getInternalState();
		
		if (!state.host || !state.guests[0]) {
			console.error('Cannot start game: Missing players');
			return;
		}
		
		// Ensure we have proper IDs and names
		const hostId = state.host.id;
		const guestId = state.guests[0].id;
		
		const hostName = state.host.username || 'Player 1';
		const guestName = state.guests[0].username || 'Player 2';
		
		// Use theme for colors, falling back to defaults
		const hostColor = state.host.theme || '#ffffff';
		const guestColor = state.guests[0].theme || '#ffffff';

		// Pass player IDs, names, colors, and ELO to the callback
		this.onAllPlayersRegistered(
			[hostId, guestId], 
			[hostName, guestName],
			[hostColor, guestColor]
		);
	}
	
	// =========================================
	// UTILITY METHODS
	// =========================================
	
	/**
	 * Generate a default profile picture URL based on username
	 */
	private generateDefaultProfilePic(username: string): string {
		return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
	}
	
	// =========================================
	// PUBLIC METHODS
	// =========================================
	
	/**
	 * Start a rematch with the same players
	 * Used by the game-over component for "Play Again"
	 */
	public startRematch(): void {
		const state = this.getInternalState();
		
		if (!state.host) {
			return;
		}
		
		// Collect player IDs for the rematch
		const playerIds = [state.host.id];
		
		// Add connected guests
		state.guests.forEach(guest => {
			if (guest && guest.isConnected) {
				playerIds.push(guest.id);
			}
		});
		
		// Create a new match with the same players
		if (state.gameMode === GameMode.MULTI) {
			DbService.createMatch(playerIds[0], playerIds[1])
				.then(_ => {

					// Notify parent component to start the game
					this.onAllPlayersRegistered(playerIds, [], []);
				})
				.catch(error => {
					console.error('Error creating rematch:', error);
					this.updateInternalState({
						error: 'Failed to create rematch. Please try again.'
					});
				});
		} else {
			// Tournament rematch logic would go here
			this.onAllPlayersRegistered(playerIds, [], []);
		}
	}
	
	/**
	 * Handle back button click
	 */
	private handleBack(): void {
		// Clean up before going back
		if (this.authManager) {
			this.authManager.destroy();
			this.authManager = null;
		}
		
		// Call the onBack callback
		this.onBack();
	}
	
	/**
	 * Handle host color selection
	 */
	private handleHostColorSelect(_colorName: string, colorHex: string): void {
		const state = this.getInternalState();
		if (!state.host) return;
		
		// Update app accent color for the host (current user)
		appState.setAccentColor(_colorName as any);
		
		// Update host's theme in the local state
		const updatedHost = {
			...state.host,
			theme: colorHex
		};
		
		this.updateInternalState({
			host: updatedHost
		});
	}
	
	/**
	 * Handle guest color selection
	 */
	private handleGuestColorSelect(colorHex: string, guestId: number): void {
		const state = this.getInternalState();
		if (!state.guests || !state.guests.length) return;
		
		// Update guest's theme in the database
		DbService.updateUserTheme(guestId, colorHex);
		
		// Update guest's theme in the local state
		const updatedGuests = state.guests.map(guest => {
			if (guest && guest.id === guestId) {
				return {
					...guest,
					theme: colorHex
				};
			}
			return guest;
		});
		
		this.updateInternalState({
			guests: updatedGuests
		});
	}
}
