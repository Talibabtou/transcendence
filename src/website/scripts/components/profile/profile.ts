/**
 * Profile Component Module
 * Parent component that manages tab navigation and profile summary
 */
import { Component, ProfileStatsComponent, ProfileHistoryComponent, ProfileFriendsComponent, ProfileSettingsComponent } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART, ApiError } from '@website/scripts/utils';
import { UserProfile, ProfileState } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';

/**
 * Component that displays and manages user profiles
 * Provides tabbed interface for different sections of user data
 */
export class ProfileComponent extends Component<ProfileState> {
	// Tab component instances
	private statsComponent?: ProfileStatsComponent;
	private historyComponent?: ProfileHistoryComponent;
	private friendsComponent?: ProfileFriendsComponent;
	private settingsComponent?: ProfileSettingsComponent;
	
	// Track if initial render has occurred
	private initialRenderComplete = false;
	
	/**
	 * Creates a new ProfileComponent
	 * @param container - The HTML element to render the profile into
	 */
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			isLoading: false,
			isEditing: false,
			activeTab: 'stats',
			initialized: false,
			historyPage: 0,
			historyPageSize: 20,
			historyIsLoading: false,
			tabsLoading: {
				summary: false,
				stats: false,
				history: false,
				friends: false,
				settings: false
			},
			matchesCache: new Map()
		});
	}
	
	/**
	 * Initializes the component by fetching data
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
			
			// Directly render view after data is loaded
			this.renderView();
			
			// Set flag to indicate we need to render active tab
			this.initialRenderComplete = true;
			
			// Check if tab content exists and render into it
			this.initializeTabContent();
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
	 * Initialize the active tab content after the first render
	 */
	private initializeTabContent(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		// Use requestAnimationFrame to ensure DOM is ready
		requestAnimationFrame(() => {
			const tabContainer = this.container.querySelector(`.tab-content`);
			if (!tabContainer) return;
			
			// Create and initialize the active tab component
			this.createTabComponent(state.activeTab);
		});
	}
	
	/**
	 * Create and initialize a tab component based on tab name
	 */
	private createTabComponent(tabName: string): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const tabContentDiv = this.container.querySelector(`.tab-content`);
		if (!tabContentDiv) return;
		
		// Clear previous content
		tabContentDiv.innerHTML = '';
		
		// Create container for the new tab
		const tabContainer = document.createElement('div');
		tabContainer.className = 'tab-pane active';
		tabContainer.id = `tab-content-${tabName}`;
		tabContentDiv.appendChild(tabContainer);
		
		switch (tabName) {
			case 'stats':
				this.statsComponent = new ProfileStatsComponent(tabContainer);
				this.statsComponent.setProfile(state.profile);
				break;
				
			case 'history':
				this.historyComponent = new ProfileHistoryComponent(tabContainer);
				this.historyComponent.setProfile(state.profile);
				this.historyComponent.setHandlers({
					onPlayerClick: this.handlePlayerClick
				});
				break;
				
			case 'friends':
				this.friendsComponent = new ProfileFriendsComponent(tabContainer);
				this.friendsComponent.setProfile(state.profile);
				this.friendsComponent.setHandlers({
					onPlayerClick: this.handlePlayerClick
				});
				break;
				
			case 'settings':
				this.settingsComponent = new ProfileSettingsComponent(tabContainer);
				this.settingsComponent.setProfile(state.profile);
				break;
		}
	}
	
	/**
	 * Renders the component based on current state
	 */
	render(): void {
		if (!this.getInternalState().initialized) {
			this.initialize();
		} else {
			this.renderView();
		}
	}
	
	/**
	 * Called after initial render
	 */
	afterRender(): void {
		// If this is the first render and we have a profile, initialize tab content
		if (this.initialRenderComplete && this.getInternalState().profile) {
			this.initializeTabContent();
		}
	}
	
	/**
	 * Fetches profile data from the database
	 */
	private async fetchProfileData(): Promise<void> {
		try {
			const url = new URL(window.location.href);
			let userId = url.searchParams.get('id');
			
			// If no ID parameter is provided, use the current logged-in user
			if (!userId || userId === 'current') {
				// Get the current user from localStorage or sessionStorage
				const currentUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
				if (currentUserJson) {
					try {
						const currentUser = JSON.parse(currentUserJson);
						if (currentUser && currentUser.id) {
							userId = currentUser.id.toString();
						}
					} catch (error) {
						console.error('Error parsing current user data:', error);
					}
				}
			}
			
			try {
				// Fetch core user data
				if (!userId) {
					throw new Error('No user ID provided');
				}
				const user = await DbService.getUserProfile(userId);
				if (!user) {
					throw new Error(`User with ID ${userId} not found`);
				}
				
				// Initialize UserProfile with minimal data
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
					},
					elo: user.elo || 1000
				};
				
				// Set initial profile with basic data
				this.updateInternalState({ profile: userProfile });
				
				// Load initial summary data
				await this.loadSummaryData(userId, userProfile);
				
			} catch (error) {
				if (error instanceof ApiError) {
					if (error.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
						this.updateInternalState({ 
							errorMessage: `User with ID ${userId} not found`
						});
					} else {
						this.updateInternalState({ 
							errorMessage: error.message
						});
					}
				} else {
					console.error('Error fetching user data from DB:', error);
					this.updateInternalState({ 
						errorMessage: `Error loading user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
					});
				}
			}
		} catch (error) {
			console.error('Error in fetchProfileData:', error);
			throw new Error('Failed to fetch profile data');
		}
	}

	/**
	 * Load summary data (wins/losses/elo)
	 */
	private async loadSummaryData(userId: string, profile: UserProfile): Promise<void> {
		try {
			console.log(`Loading summary for user ID: ${userId}`);
			
			// Get user from DB to ensure we have latest data
			const user = await DbService.getUser(userId);
			
			// Update profile with user data
			profile.username = user.pseudo;
			profile.avatarUrl = user.pfp || '/images/default-avatar.svg';
			profile.elo = user.elo || 1000;
			profile.preferences.accentColor = user.theme || '#ffffff';
			
			// Fetch match history to calculate wins/losses
			const matches = await DbService.getUserMatches(userId);
			console.log(`Found ${matches.length} matches for user ID: ${userId}`);
			
			// Process matches to calculate wins/losses
			let wins = 0;
			let losses = 0;
			let totalGames = 0; // Only count "completed" matches (3 points or more)
			
			for (const match of matches) {
				// Get goals for this match
				const goals = await DbService.getMatchGoals(match.id);
				
				// Calculate scores
				const isPlayer1 = match.player_1 === userId;
				const opponentId = isPlayer1 ? match.player_2 : match.player_1;
				
				let playerScore = 0;
				let opponentScore = 0;
				
				for (const goal of goals) {
					if (goal.player === userId) {
						playerScore++;
					} else if (goal.player === opponentId) {
						opponentScore++;
					}
				}
				
				// Only count matches where at least one player has 3+ points
				if (playerScore >= 3 || opponentScore >= 3) {
					totalGames++;
					
					if (playerScore > opponentScore) {
						wins++;
					} else if (opponentScore > playerScore) {
						losses++;
					}
					// Ties don't count for either
					
					console.log(`Match ${match.id}: ${playerScore}-${opponentScore} (counted)`);
				} else {
					console.log(`Match ${match.id}: ${playerScore}-${opponentScore} (not counted - under 3 points)`);
				}
			}
			
			console.log(`Final stats: ${wins} wins, ${losses} losses out of ${totalGames} completed games`);
			
			// Update profile with calculated stats
			profile.totalGames = totalGames;
			profile.wins = wins;
			profile.losses = losses;
			
			// Update profile state with a new object to ensure reactivity
			this.updateInternalState({ profile: {...profile} });
			
			// Update UI
			this.renderView();
		} catch (error) {
			console.error('Error loading summary data:', error);
		}
	}

	/**
	 * Handle tab changes with callback
	 */
	private handleTabChange = (tabId: string): void => {
		if (this.getInternalState().activeTab === tabId) return;
		
		// Update the active tab state
		this.updateInternalState({ activeTab: tabId });
		
		// Create the new tab component
		this.createTabComponent(tabId);
	}
	
	/**
	 * Handle player profile clicks with callback
	 */
	private handlePlayerClick = (username: string): void => {
		// Find user by username to get ID
		const dbData = localStorage.getItem('pong_db');
		if (!dbData) {
			console.error('DB not found in localStorage');
			return;
		}
		
		const users = JSON.parse(dbData).users;
		const user = users.find((u: any) => u.pseudo === username);
		
		if (user) {
			navigate(`/profile?id=${user.id}`);
		} else {
			console.error(`Could not find user with username: ${username}`);
			// Navigate by username as fallback
			navigate(`/profile?id=${username}`);
		}
	}
	
	/**
	 * Renders the profile view based on current state
	 */
	private renderView(): void {
		const state = this.getInternalState();
		
		const template = html`
			<div class="component-container profile-container">
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
							<div class="profile-content"></div>
						`
				}
			</div>
		`;
		
		render(template, this.container);
		
		// After render, manually add summary if profile exists
		if (!state.isLoading && !state.errorMessage && state.profile) {
			const profileContent = this.container.querySelector('.profile-content');
			if (profileContent) {
				profileContent.innerHTML = '';
				
				// Render summary
				const summaryElement = document.createElement('div');
				summaryElement.className = 'profile-hero';
				summaryElement.innerHTML = `
					<div class="profile-avatar">
						<img src="${state.profile.avatarUrl}" alt="${state.profile.username}">
					</div>
					<div class="profile-info">
						<h2 class="username">${state.profile.username}</h2>
						<div class="summary-stats">
							<div class="stat">
								<span class="stat-value elo-value">${state.profile.elo || 1000}</span>
								<span class="stat-label">ELO</span>
							</div>
							<div class="stat">
								<span class="stat-value wins-value">${state.profile.wins || 0}</span>
								<span class="stat-label">WINS</span>
							</div>
							<div class="stat">
								<span class="stat-value losses-value">${state.profile.losses || 0}</span>
								<span class="stat-label">LOSSES</span>
							</div>
						</div>
					</div>
				`;
				
				profileContent.appendChild(summaryElement);
				
				// Check if this is the current user's profile
				const isCurrentUserProfile = this.isCurrentUserProfile(state.profile.id);
				
				// Add tabs - only show settings for current user
				const tabsHTML = `
					<div class="profile-tabs">
						<ul class="tabs-list">
							<li class="tab-item ${state.activeTab === 'stats' ? 'active' : ''}">
								<button class="tab-button">Statistics</button>
							</li>
							<li class="tab-item ${state.activeTab === 'history' ? 'active' : ''}">
								<button class="tab-button">Match History</button>
							</li>
							<li class="tab-item ${state.activeTab === 'friends' ? 'active' : ''}">
								<button class="tab-button">Friends</button>
							</li>
							${isCurrentUserProfile ? `
								<li class="tab-item ${state.activeTab === 'settings' ? 'active' : ''}">
									<button class="tab-button">Settings</button>
								</li>
							` : ''}
						</ul>
					</div>
					<div class="tab-content"></div>
				`;
				
				const tabsContainer = document.createElement('div');
				tabsContainer.innerHTML = tabsHTML;
				
				// Add event listeners to tabs - adjust for possible missing settings tab
				const tabButtons = tabsContainer.querySelectorAll('.tab-button');
				Array.from(tabButtons).forEach((button, index) => {
					button.addEventListener('click', () => {
						const tabNames = ['stats', 'history', 'friends'];
						if (isCurrentUserProfile) {
							tabNames.push('settings');
						}
						if (index < tabNames.length) {
							this.handleTabChange(tabNames[index]);
						}
					});
				});
				
				// Add tabs to content
				while (tabsContainer.firstChild) {
					profileContent.appendChild(tabsContainer.firstChild);
				}
			}
		}
	}

	/**
	 * Checks if the profile being viewed belongs to the current user
	 */
	private isCurrentUserProfile(profileId: string): boolean {
		// Get the current user from local storage
		const currentUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (!currentUserJson) return false;
		
		try {
			const currentUser = JSON.parse(currentUserJson);
			return currentUser && currentUser.id && currentUser.id.toString() === profileId;
		} catch (error) {
			console.error('Error parsing current user data:', error);
			return false;
		}
	}
}
