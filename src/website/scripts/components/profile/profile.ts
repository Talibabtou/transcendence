/**
 * Profile Component Module
 * Displays and manages user profile information, game history, friends, and settings.
 * Provides tabbed interface for different sections of user data.
 */
import { Component } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART, appState, AccentColor } from '@website/scripts/utils';
import { UserProfile, FriendProfile, ProfileState, GameHistoryEntry } from '@shared/types';

/**
 * Component that displays and manages user profiles
 * Provides tabbed interface for different sections of user data
 */
export class ProfileComponent extends Component<ProfileState> {
	// =========================================
	// INITIALIZATION
	// =========================================
	
	/**
	 * Creates a new ProfileComponent
	 * @param container - The HTML element to render the profile into
	 */
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			isLoading: false,
			isEditing: false,
			activeTab: 'summary',
			initialized: false
		});
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Initializes the component by fetching data
	 * Separated from render to prevent recursion
	 */
	async initialize(): Promise<void> {
		const state = this.getInternalState();
		if (state.initialized || state.isLoading) return;
		
		try {
			this.updateInternalState({ 
				isLoading: true, 
				errorMessage: undefined,
				initialized: true
			});
			
			await this.fetchProfileData();
			
			this.updateInternalState({ 
				isLoading: false 
			});
		} catch (error) {
			console.error('Error initializing profile:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to load profile data';
			this.updateInternalState({ 
				isLoading: false, 
				errorMessage,
				initialized: false
			});
		}
	}
	
	/**
	 * Renders the component based on current state
	 * Only handles UI rendering, not data fetching
	 */
	render(): void {
		this.renderView();
	}
	
	/**
	 * Called after initial render
	 * This is where we trigger data fetching
	 */
	afterRender(): void {
		if (!this.getInternalState().initialized) {
			this.initialize();
		}
	}
	
	/**
	 * Cleans up the component when it's destroyed
	 */
	destroy(): void {
		super.destroy();
	}

	// =========================================
	// DATA MANAGEMENT
	// =========================================
	
	/**
	 * Fetches profile data from the database
	 */
	private async fetchProfileData(): Promise<void> {
		try {
			const url = new URL(window.location.href);
			const userId = url.searchParams.get('id') || 'current';
			const numericId = userId === 'current' ? 1 : parseInt(userId, 10);
			
			try {
				// Fetch core user data
				const user = await DbService.getUser(numericId);
				if (!user) {
					throw new Error(`User with ID ${numericId} not found`);
				}
				
				// Initialize UserProfile with user data
				const userProfile: UserProfile = {
					id: String(user.id),
					username: user.pseudo,
					avatarUrl: user.pfp || '/images/default-avatar.svg',
					totalGames: 0,
					wins: 0,
					losses: 0,
					gameHistory: [],
					friends: [],
					preferences: {
						accentColor: user.theme || '#ffffff'
					}
				};
				
				// Fetch match history
				try {
					const matches = await DbService.getUserMatches(numericId);
					
					if (matches && Array.isArray(matches)) {
						// Process matches to create game history
						const gameHistory: GameHistoryEntry[] = [];
						let wins = 0;
						let losses = 0;
						
						for (const match of matches) {
							// Check if user was player1 or player2
							const isPlayer1 = match.player_1 === numericId;
							const opponentId = isPlayer1 ? match.player_2 : match.player_1;
							
							// Fetch opponent details
							let opponentName = `Player ${opponentId}`;
							try {
								const opponent = await DbService.getUser(opponentId);
								if (opponent) {
									opponentName = opponent.pseudo;
								}
							} catch (err) {
								console.log(`Could not fetch opponent data for ID ${opponentId}`);
							}
							
							// Get all goals for this match
							let allMatchGoals = [];
							try {
								allMatchGoals = await DbService.getMatchGoals(match.id);
							} catch (err) {
								console.log(`Could not fetch goals for match ${match.id}`);
							}
							
							// Calculate scores from goals
							let playerScore = 0;
							let opponentScore = 0;
							
							for (const goal of allMatchGoals) {
								if (goal.player === numericId) {
									playerScore++;
								} else if (goal.player === opponentId) {
									opponentScore++;
								}
							}
							
							// Determine match result
							const result = playerScore > opponentScore ? 'win' : 'loss';
							if (result === 'win') wins++;
							else losses++;
							
							// Add to game history
							gameHistory.push({
								id: String(match.id),
								date: new Date(match.created_at),
								opponent: opponentName,
								playerScore,
								opponentScore,
								result
							});
						}
						
						// Update the profile with match data
						userProfile.gameHistory = gameHistory;
						userProfile.wins = wins;
						userProfile.losses = losses;
						userProfile.totalGames = gameHistory.length;
					}
				} catch (err) {
					console.error('Error fetching match history:', err);
				}
				
				// Fetch friends
				try {
					const friends = await DbService.getUserFriends(numericId);
					
					if (friends && Array.isArray(friends)) {
						const friendProfiles: FriendProfile[] = [];
						
						for (const friend of friends) {
							try {
								const friendData = await DbService.getUser(friend.friend_id);
								if (friendData) {
									friendProfiles.push({
										id: friendData.id,
										username: friendData.pseudo,
										avatarUrl: friendData.pfp || '/images/default-avatar.svg',
										lastLogin: friendData.last_login
									});
								}
							} catch (friendErr) {
								console.error(`Could not fetch data for friend ID ${friend.friend_id}:`, friendErr);
							}
						}
						
						userProfile.friends = friendProfiles;
					}
				} catch (err) {
					console.error('Error fetching friends list:', err);
				}
				
				// Set the profile in the component state
				this.updateInternalState({ profile: userProfile });
				
			} catch (err) {
				console.error('Error fetching user data from DB:', err);
				this.updateInternalState({ 
					errorMessage: `Error loading user profile: ${err instanceof Error ? err.message : 'Unknown error'}`
				});
			}
		} catch (error) {
			console.error('Error in fetchProfileData:', error);
			throw new Error('Failed to fetch profile data');
		}
	}

	/**
	 * Saves profile changes to the database
	 */
	private saveProfileChanges(): void {
		const state = this.getInternalState();
		// Get form data
		const form = this.container.querySelector('.settings-form') as HTMLFormElement;
		if (!form || !state.profile) return;
		
		// Example of getting form values
		const username = (form.querySelector('[name="username"]') as HTMLInputElement)?.value;
		
		// Update profile data
		if (username) {
			const updatedProfile = {
				...state.profile,
				username
			};
			
			// Simulate saving to database
			DbService.updateUser(parseInt(state.profile.id), {
				pseudo: username
			});
			
			// Update state and exit edit mode
			this.updateInternalState({ 
				profile: updatedProfile,
				isEditing: false 
			});
		}
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Handles clicks on player names
	 * Navigates to the clicked player's profile
	 * @param username - Username of the clicked player
	 */
	private handlePlayerClick(username: string): void {
		navigate(`/profile?username=${username}`);
	}

	/**
	 * Sets the active tab and re-renders the view
	 * @param tabId - ID of the tab to activate
	 */
	private setActiveTab(tabId: string): void {
		this.updateInternalState({ activeTab: tabId });
	}

	/**
	 * Toggles edit mode for profile settings
	 */
	private toggleEditMode(): void {
		const state = this.getInternalState();
		this.updateInternalState({ isEditing: !state.isEditing });
		
		// After state update and re-render, update form elements
		setTimeout(() => {
			// Toggle form fields
			const formInputs = this.container.querySelectorAll('.settings-form input');
			const saveButton = this.container.querySelector('.save-settings-button');
			
			formInputs.forEach(input => {
				(input as HTMLInputElement).disabled = !state.isEditing;
			});
			
			if (saveButton) {
				(saveButton as HTMLButtonElement).disabled = !state.isEditing;
			}
			
			// Toggle edit button text
			const editButton = this.container.querySelector('.edit-profile-button');
			if (editButton) {
				editButton.textContent = state.isEditing ? 'Cancel' : 'Edit Profile';
			}
			
			// Select the settings tab when entering edit mode
			if (state.isEditing) {
				this.setActiveTab('settings');
			}
		}, 0);
	}

	/**
	 * Sets up event listeners after rendering
	 */
	private setupEventListeners(): void {
		const state = this.getInternalState();
		
		// Set up tab switching
		const tabButtons = this.container.querySelectorAll('.nav-button');
		tabButtons.forEach(button => {
			button.addEventListener('click', () => {
				const tabId = button.getAttribute('data-tab');
				if (tabId) {
					this.setActiveTab(tabId);
				}
			});
		});
		
		// Set up edit profile button
		const editButton = this.container.querySelector('.edit-profile-button');
		if (editButton) {
			editButton.addEventListener('click', () => {
				this.toggleEditMode();
			});
		}
		
		// Game history player links
		this.container.querySelectorAll('.opponent-cell').forEach(cell => {
			cell.addEventListener('click', () => {
				const opponentUsername = (cell as HTMLElement).textContent;
				if (opponentUsername) {
					this.handlePlayerClick(opponentUsername);
				}
			});
		});
		
		// If in edit mode, set up form submission
		if (state.isEditing) {
			const form = this.container.querySelector('.settings-form');
			if (form) {
				form.addEventListener('submit', (e) => {
					e.preventDefault();
					this.saveProfileChanges();
				});
			}
			
			// Cancel button
			const cancelButton = this.container.querySelector('.save-settings-button');
			if (cancelButton) {
				cancelButton.addEventListener('click', () => {
					this.updateInternalState({ isEditing: false });
				});
			}
		}
	}

	// =========================================
	// RENDERING
	// =========================================
	
	/**
	 * Renders the profile view based on current state
	 */
	private renderView(): void {
		const state = this.getInternalState();
		
		const template = html`
			<div class="ascii-container">
				<div class="ascii-title-container">
					<pre class="ascii-title">${ASCII_ART.PROFILE}</pre>
				</div>
				
				${state.isLoading ? 
					html`<p class="loading-text">Loading profile data...</p>` :
					state.errorMessage ?
						html`
							<div class="error-message">${state.errorMessage}</div>
							<button class="retry-button" onClick=${() => this.render()}>Retry</button>
						` :
						html`
							<div class="profile-layout">
								<nav class="profile-nav">
									${this.renderNavigation()}
								</nav>
								<main class="profile-main">
									${this.renderActiveTab()}
								</main>
							</div>
						`
				}
			</div>
		`;
		
		render(template, this.container);
		
		if (!state.isLoading && !state.errorMessage) {
			this.setupEventListeners();
		}
	}

	/**
	 * Renders the navigation tabs
	 */
	private renderNavigation() {
		const state = this.getInternalState();
		const tabs = [
			{ id: 'summary', label: 'SUMMARY', icon: '📊' },
			{ id: 'history', label: 'HISTORY', icon: '🕒' },
			{ id: 'friends', label: 'FRIENDS', icon: '👥' },
			{ id: 'settings', label: 'SETTINGS', icon: '⚙️' }
		];

		return html`
			<ul class="nav-list">
				${tabs.map(tab => html`
					<li class="nav-item ${state.activeTab === tab.id ? 'active' : ''}">
						<button 
							class="nav-button" 
							data-tab="${tab.id}"
							onClick=${() => this.setActiveTab(tab.id)}
						>
							<span class="nav-icon">${tab.icon}</span>
							<span class="nav-label">${tab.label}</span>
						</button>
					</li>
				`)}
			</ul>
		`;
	}

	/**
	 * Renders the active tab content
	 */
	private renderActiveTab() {
		const state = this.getInternalState();
		if (!state.profile) return html``;

		switch (state.activeTab) {
			case 'summary':
				return this.renderSummary();
			case 'history':
				return this.renderHistory();
			case 'friends':
				return this.renderFriends();
			case 'settings':
				return this.renderSettings();
			default:
				return this.renderSummary();
		}
	}

	// =========================================
	// TAB CONTENT RENDERING
	// =========================================

	/**
	 * Renders the summary tab content
	 */
	private renderSummary() {
		const state = this.getInternalState();
		if (!state.profile) return html``;
		
		return html`
			<div class="summary-container">
				<div class="profile-hero">
					<div class="profile-avatar-large">
						<img src="${state.profile.avatarUrl}" alt="${state.profile.username}">
					</div>
					<div class="profile-info-large">
						<h2 class="username-large">${state.profile.username}</h2>
						<div class="profile-stats-large">
							<div class="stat-large">
								<span class="stat-value-large elo-value">${state.profile.elo || 0}</span>
								<span class="stat-label-large">ELO</span>
							</div>
							<div class="stat-large">
								<span class="stat-value-large wins-value">${state.profile.wins}</span>
								<span class="stat-label-large">WINS</span>
							</div>
							<div class="stat-large">
								<span class="stat-value-large losses-value">${state.profile.losses}</span>
								<span class="stat-label-large">LOSSES</span>
							</div>
						</div>
					</div>
				</div>
				<div class="recent-activity">
					<h3>Recent Activity</h3>
					${this.renderRecentGames(3)}
				</div>
			</div>
		`;
	}

	/**
	 * Renders the game history tab content
	 */
	private renderHistory() {
		const state = this.getInternalState();
		if (!state.profile) return html``;
		
		return html`
			<div class="tab-pane active" id="game-history">
				<table class="game-history-table">
					<thead>
						<tr>
							<th>DATE</th>
							<th>OPPONENT</th>
							<th>RESULT</th>
							<th>SCORE</th>
						</tr>
					</thead>
					<tbody>
						${state.profile.gameHistory.map(game => html`
							<tr class="game-${game.result}">
								<td>${game.date.toLocaleDateString()}</td>
								<td class="opponent-cell" onClick=${() => this.handlePlayerClick(game.opponent)}>
									${game.opponent}
								</td>
								<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
								<td>${game.playerScore} - ${game.opponentScore}</td>
							</tr>
						`)}
					</tbody>
				</table>
			</div>
		`;
	}

	/**
	 * Renders the friends tab content
	 */
	private renderFriends() {
		const state = this.getInternalState();
		if (!state.profile) return html``;
		
		return html`
			<div class="friends-container">
				<h3>Friends</h3>
				<div class="friends-list">
					${state.profile.friends.map(friend => html`
						<div class="friend-card">
							<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username}">
							<div class="friend-info">
								<span class="friend-name">${friend.username}</span>
								<span class="friend-last-login">
									Last seen: ${friend.lastLogin ? this.formatLastSeen(friend.lastLogin) : 'Unknown'}
								</span>
							</div>
						</div>
					`)}
				</div>
			</div>
		`;
	}

	/**
	 * Renders the settings tab content
	 */
	private renderSettings() {
		const state = this.getInternalState();
		if (!state.profile) return html``;
		
		// Get available colors from app state
		const availableColors = appState.getAvailableColors();
		const currentColor = appState.getAccentColor();
		
		return html`
			<div class="tab-pane" id="settings">
				<h4>Account Settings</h4>
				<form class="settings-form">
					<div class="form-group">
						<label for="username">Username</label>
						<input type="text" id="username" name="username" value="${state.profile.username}" disabled>
					</div>
					<div class="form-group">
						<label for="avatar">Avatar URL</label>
						<input type="text" id="avatar" name="avatar" value="${state.profile.avatarUrl}" disabled>
					</div>
					<div class="form-group">
						<label for="password">Change Password</label>
						<input type="password" id="password" name="password" placeholder="New password" disabled>
					</div>
					<div class="form-group">
						<label>Accent Color</label>
						<div class="color-picker">
							${Object.entries(availableColors).map(([colorName, colorHex]) => html`
								<div 
									class="color-option ${colorName === currentColor ? 'selected' : ''}"
									style="background-color: ${colorHex}"
									onClick=${() => this.handleColorSelect(colorName as AccentColor)}
									title="${colorName}"
								></div>
							`)}
						</div>
					</div>
					<button type="button" class="save-settings-button" disabled>Save Changes</button>
				</form>
			</div>
		`;
	}

	/**
	 * Renders a subset of recent games
	 * @param limit - Maximum number of games to display
	 */
	private renderRecentGames(limit: number) {
		const state = this.getInternalState();
		if (!state.profile) return html``;
		
		const recentGames = state.profile.gameHistory.slice(0, limit);
		
		return html`
			<table class="game-history-table recent-games">
				<thead>
					<tr>
						<th>DATE</th>
						<th>OPPONENT</th>
						<th>RESULT</th>
						<th>SCORE</th>
					</tr>
				</thead>
				<tbody>
					${recentGames.map(game => html`
						<tr class="game-${game.result}">
							<td>${game.date.toLocaleDateString()}</td>
							<td class="opponent-cell" onClick=${() => this.handlePlayerClick(game.opponent)}>
								${game.opponent}
							</td>
							<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
							<td>${game.playerScore} - ${game.opponentScore}</td>
						</tr>
					`)}
				</tbody>
			</table>
		`;
	}

	// Helper function to format the last seen date in a user-friendly way
	private formatLastSeen(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) {
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			if (diffHours === 0) {
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				return diffMinutes <= 5 ? 'Just now' : `${diffMinutes} minutes ago`;
			}
			return `${diffHours} hours ago`;
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	// Add a method to handle color selection
	private handleColorSelect(color: AccentColor): void {
		// Update app state
		appState.setAccentColor(color);
		// Re-render settings to show the selection
		this.renderSettings();
	}
}
