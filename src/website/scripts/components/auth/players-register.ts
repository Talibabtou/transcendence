/**
 * Players Register Module
 * Handles registration of players for multiplayer and tournament games
 * Provides a split interface showing host and registering guests
 */
import { Component, AuthManager, SimplifiedAuthManager } from '@website/scripts/components';
import { html, render, ASCII_ART, DbService, appState } from '@website/scripts/utils';
import { GameMode, PlayerData, PlayersRegisterState } from '@shared/types';

export class PlayersRegisterComponent extends Component<PlayersRegisterState> {
	private authManager: AuthManager | null = null;
	private authContainer: HTMLElement | null = null;
	private onAllPlayersRegistered: (playerIds: number[]) => void;
	private maxPlayers: number = 2;
	private isGameStarting: boolean = false;
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	constructor(
		container: HTMLElement, 
		gameMode: GameMode, 
		onAllPlayersRegistered: (playerIds: number[]) => void
	) {
		super(container, {
			gameMode,
			host: null,
			guests: [],
			isReadyToPlay: false,
			error: null
		});
		
		this.onAllPlayersRegistered = onAllPlayersRegistered;
		
		// Set max players based on game mode
		if (gameMode === GameMode.TOURNAMENT) {
			this.maxPlayers = 4;
		}
		
		// Initialize host data
		this.initializeHost();
		
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
			
			const host: PlayerData = {
				id: hostId,
				username: currentUser.username,
				pfp: currentUser.profilePicture || '/images/default-avatar.svg',
				isConnected: true
			};
			
			this.updateInternalState({ host });
			console.log('Host initialized with ID:', hostId);
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
			// Render 2-player layout with vertical split
			template = html`
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
			// Tournament layout would go here with 4 players
			template = html`
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
			
			// Get the auth container
			this.authContainer = this.container.querySelector('#guest-auth-container');
			
			if (this.authContainer) {
				// Add simplified auth class
				this.authContainer.className = 'player-auth-wrapper simplified-auth-container';
				
				// Create simplified auth manager - only pass the container
				this.authManager = new SimplifiedAuthManager(this.authContainer);
				
				// Show the auth component immediately
				this.authManager.show();
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
			
			// Guest ID should already be numeric from simplified-auth-manager
			const guestId = Number(userData.id);
			
			if (isNaN(guestId)) {
				console.error('Invalid guest ID received:', userData.id);
				return;
			}
			
			// Convert to PlayerData format
			const guestData: PlayerData = {
				id: guestId,
				username: userData.username,
				pfp: userData.profilePicture || this.generateDefaultProfilePic(userData.username),
				isConnected: true
			};
			
			console.log('Guest authenticated with ID:', guestId);
			this.handleGuestAuthenticated(guestData);
		}
	};
	
	/**
	 * Renders the host player
	 */
	private renderHostPlayer(host: PlayerData | null): any {
		if (!host) return '';
		
		return html`
			<div class="player-avatar">
				<img src="${host.pfp}" alt="${host.username}" />
			</div>
			<div class="player-name">${host.username}</div>
			<div class="player-status">Connected</div>
		`;
	}
	
	/**
	 * Renders a connected guest
	 */
	private renderConnectedGuest(guest: PlayerData): any {
		return html`
			<div class="player-avatar">
				<img src="${guest.pfp}" alt="${guest.username}" />
			</div>
			<div class="player-name">${guest.username}</div>
			<div class="player-status">Connected</div>
		`;
	}
	
	/**
	 * Renders the play button if appropriate
	 */
	private renderPlayButton(state: PlayersRegisterState): any {
		// For multiplayer we need host + 1 guest
		const requiredPlayers = state.gameMode === GameMode.MULTI ? 2 : 4;
		
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
	 * Handle guest authenticated - receives data directly from SimplifiedAuthManager
	 */
	private handleGuestAuthenticated(guestData: PlayerData): void {
		if (!guestData) {
			console.error('No guest data received');
			return;
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
		
		// For multiplayer, just set the first guest
		if (state.gameMode === GameMode.MULTI) {
			this.updateInternalState({
				guests: [newPlayer],
				error: null
			});
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
		
		// Required guests (1 for multiplayer, 3 for tournament)
		const requiredGuests = state.gameMode === GameMode.MULTI ? 1 : 3;
		
		const isReady = connectedGuests >= requiredGuests;
		
		this.updateInternalState({
			isReadyToPlay: isReady
		});
		
		// Force re-render to update play button
		this.renderComponent();
	}
	
	/**
	 * Start the game with registered players
	 */
	private startGame(): void {
		const state = this.getInternalState();
		
		// Check if game is already starting to prevent multiple calls
		if (this.isGameStarting) {
			console.log('Game already starting, ignoring duplicate call');
			return;
		}
		
		if (!state.isReadyToPlay || !state.host) {
			console.warn('Not ready to play or missing host');
			return;
		}
		
		// Set flag to prevent multiple starts
		this.isGameStarting = true;
		
		// Prevent multiple submissions
		const playButton = this.container.querySelector('.play-button') as HTMLButtonElement;
		if (playButton) {
			playButton.disabled = true;
			playButton.textContent = 'Starting...';
		}
		
		// Collect player IDs - host is always first
		const playerIds = [state.host.id];
		
		// Add connected guests
		state.guests.forEach(guest => {
			if (guest && guest.isConnected) {
				playerIds.push(guest.id);
			}
		});
		
		console.log('Starting game with players:', playerIds);
		
		// Record the match in the database - only create ONE match
		if (state.gameMode === GameMode.MULTI) {
			// Check that we have valid numeric IDs
			if (isNaN(playerIds[0]) || isNaN(playerIds[1])) {
				console.error('Invalid player IDs:', playerIds);
				this.updateInternalState({
					error: 'Invalid player IDs. Please try again.'
				});
				// Reset flag and re-enable button
				this.isGameStarting = false;
				if (playButton) {
					playButton.disabled = false;
					playButton.textContent = 'Play Now';
				}
				return;
			}
			
			// Create a 1v1 match
			DbService.createMatch(playerIds[0], playerIds[1])
				.then(match => {
					console.log('Created match:', match);
					
					// Notify parent component that all players are registered - only once
					this.onAllPlayersRegistered(playerIds);
					
					// No need to reset flag as component will be destroyed
				})
				.catch(error => {
					console.error('Error creating match:', error);
					this.updateInternalState({
						error: 'Failed to create match. Please try again.'
					});
					// Reset flag and re-enable button
					this.isGameStarting = false;
					if (playButton) {
						playButton.disabled = false;
						playButton.textContent = 'Play Now';
					}
				});
		} else {
			// Tournament logic would go here
			this.onAllPlayersRegistered(playerIds);
		}
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
				.then(match => {
					console.log('Created rematch:', match);
					
					// Notify parent component to start the game
					this.onAllPlayersRegistered(playerIds);
				})
				.catch(error => {
					console.error('Error creating rematch:', error);
					this.updateInternalState({
						error: 'Failed to create rematch. Please try again.'
					});
				});
		} else {
			// Tournament rematch logic would go here
			this.onAllPlayersRegistered(playerIds);
		}
	}
}
