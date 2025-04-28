/**
 * Profile Component Module
 * Parent component that manages tab navigation and profile summary
 */
import { Component, ProfileStatsComponent, ProfileHistoryComponent, ProfileFriendsComponent, ProfileSettingsComponent } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART } from '@website/scripts/utils';
import { UserProfile, ProfileState } from '@shared/types';

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
			const userId = url.searchParams.get('id') || 'current';
			const numericId = userId === 'current' ? 1 : parseInt(userId, 10);
			
			try {
				// Fetch core user data
				const user = await DbService.getUser(numericId);
				if (!user) {
					throw new Error(`User with ID ${numericId} not found`);
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
				await this.loadSummaryData(numericId, userProfile);
				
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
	 * Load summary data (wins/losses/elo)
	 */
	private async loadSummaryData(userId: number, profile: UserProfile): Promise<void> {
		try {
			// Fetch match history to calculate wins/losses
			const matches = await DbService.getUserMatches(userId);
			
			// Calculate wins and losses without loading all goals
			let wins = 0;
			let losses = 0;
			
			// Get 3 most recent matches for the summary
			const recentMatches = [...matches].sort((a, b) => 
				b.created_at.getTime() - a.created_at.getTime()
			).slice(0, 3);
			
			// Process recent matches for display
			const recentGameHistory = await Promise.all(recentMatches.map(async (match) => {
				// Check if already cached
				if (this.getInternalState().matchesCache.has(match.id)) {
					return this.getInternalState().matchesCache.get(match.id);
				}
				
				// Get opponent details
				const isPlayer1 = match.player_1 === userId;
				const opponentId = isPlayer1 ? match.player_2 : match.player_1;
				let opponentName = `Player ${opponentId}`;
				
				try {
					const opponent = await DbService.getUser(opponentId);
					if (opponent) {
						opponentName = opponent.pseudo;
					}
				} catch {
					console.log(`Could not fetch opponent data for ID ${opponentId}`);
				}
				
				// Get goals for this match
				const allMatchGoals = await DbService.getMatchGoals(match.id);
				
				// Calculate scores
				let playerScore = 0;
				let opponentScore = 0;
				
				for (const goal of allMatchGoals) {
					if (goal.player === userId) {
						playerScore++;
					} else if (goal.player === opponentId) {
						opponentScore++;
					}
				}
				
				// Determine result
				const result = playerScore > opponentScore ? 'win' : 'loss';
				if (result === 'win') wins++;
				else losses++;
				
				// Create game history entry
				const historyEntry = {
					id: match.id,
					date: new Date(match.created_at),
					opponent: opponentName,
					playerScore,
					opponentScore,
					result
				};
				
				// Cache the result
				this.getInternalState().matchesCache.set(match.id, historyEntry);
				
				return historyEntry;
			}));
			
			// Update profile with summary data
			const updatedProfile = {
				...profile,
				totalGames: matches.length,
				wins,
				losses,
				gameHistory: recentGameHistory
			};
			
			this.updateInternalState({ profile: updatedProfile });
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
		navigate(`/profile?${username}`);
	}
	
	/**
	 * Renders the profile view based on current state
	 */
	private renderView(): void {
		const state = this.getInternalState();
		
		const template = html`
			<div class="profile-container">
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
							<div class="profile-content">
								<!-- Summary section always visible -->
								${this.renderSummary()}
								
								<!-- Horizontal tabs -->
								<div class="profile-tabs">
									<ul class="tabs-list">
										<li class="tab-item ${state.activeTab === 'stats' ? 'active' : ''}">
											<button class="tab-button" onClick=${() => this.handleTabChange('stats')}>
												<span class="tab-icon">📈</span> STATS
											</button>
										</li>
										<li class="tab-item ${state.activeTab === 'history' ? 'active' : ''}">
											<button class="tab-button" onClick=${() => this.handleTabChange('history')}>
												<span class="tab-icon">🕒</span> HISTORY
											</button>
										</li>
										<li class="tab-item ${state.activeTab === 'friends' ? 'active' : ''}">
											<button class="tab-button" onClick=${() => this.handleTabChange('friends')}>
												<span class="tab-icon">👥</span> FRIENDS
											</button>
										</li>
										<li class="tab-item ${state.activeTab === 'settings' ? 'active' : ''}">
											<button class="tab-button" onClick=${() => this.handleTabChange('settings')}>
												<span class="tab-icon">⚙️</span> SETTINGS
											</button>
										</li>
									</ul>
								</div>
								
								<!-- Tab content area - this is just a container -->
								<div class="tab-content"></div>
							</div>
						`
				}
			</div>
		`;
		
		render(template, this.container);
	}

	/**
	 * Renders the summary section
	 */
	private renderSummary() {
		const state = this.getInternalState();
		if (!state.profile) return html``;
		
		return html`
				<div class="profile-hero">
					<div class="profile-avatar-large">
						<img src="${state.profile.avatarUrl}" alt="${state.profile.username}">
					</div>
					<div class="profile-info-large">
						<h2 class="username-large">${state.profile.username}</h2>
						<div class="profile-stats-large">
							<div class="stat-large">
							<span class="stat-value-large elo-value">${state.profile.elo || 1000}</span>
							<span class="stat-label-large">ELO</span>
							</div>
							<div class="stat-large">
							<span class="stat-value-large wins-value">${state.profile.wins || 0}</span>
								<span class="stat-label-large">WINS</span>
							</div>
							<div class="stat-large">
							<span class="stat-value-large losses-value">${state.profile.losses || 0}</span>
								<span class="stat-label-large">LOSSES</span>
						</div>
					</div>
				</div>
			</div>
		`;
	}
}
