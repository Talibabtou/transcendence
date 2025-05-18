/**
 * Profile Component Module
 * Parent component that manages tab navigation and profile summary
 * Handles user profile display, tab switching, and data fetching
 */
import { Component, ProfileStatsComponent, ProfileHistoryComponent, ProfileFriendsComponent, ProfileSettingsComponent } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART, AppStateManager } from '@website/scripts/utils';
import { ProfileState, User } from '@website/types';

/**
 * Component that displays and manages user profiles
 * Provides tabbed interface for different sections of user data
 * Handles profile data fetching, tab navigation, and component lifecycle
 */
export class ProfileComponent extends Component<ProfileState> {
	private statsComponent?: ProfileStatsComponent;
	private historyComponent?: ProfileHistoryComponent;
	private friendsComponent?: ProfileFriendsComponent;
	private settingsComponent?: ProfileSettingsComponent;
	private lastSettingsProfileId?: string;
	
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
			matchesCache: new Map(),
			currentProfileId: null,
			friendshipStatus: false,
			pendingFriends: []
		});
		
		// Listen for URL changes to reset the component when navigating between profiles
		window.addEventListener('popstate', () => this.handleUrlChange());
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
			
			// Now await the render view to complete
			await this.renderView();
			
			this.initialRenderComplete = true;
			
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
		
		requestAnimationFrame(() => {
			const tabContainer = this.container.querySelector(`.tab-content`);
			if (!tabContainer) return;
			
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
		
		if (tabName === 'settings' && this.settingsComponent && this.lastSettingsProfileId === state.profile.id) {
			const settingsContainer = this.settingsComponent.getDOMContainer();
			
			if (settingsContainer.parentElement !== tabContentDiv) {
				tabContentDiv.innerHTML = ''; 
				tabContentDiv.appendChild(settingsContainer);
			}

			this.settingsComponent.setProfile(state.profile);
			settingsContainer.classList.add('active');
			return;
		}

		tabContentDiv.innerHTML = '';
		const tabContainer = document.createElement('div');
		tabContainer.className = 'tab-pane active';
		tabContainer.id = `tab-content-${tabName}`;
		tabContentDiv.appendChild(tabContainer);

		if (this.settingsComponent && (tabName !== 'settings' || this.lastSettingsProfileId !== state.profile.id)) {
			if (typeof this.settingsComponent.destroy === 'function') {
				this.settingsComponent.destroy();
			}
			this.settingsComponent = undefined;
			this.lastSettingsProfileId = undefined;
		}
		
		switch (tabName) {
			case 'stats':
				this.statsComponent = new ProfileStatsComponent(tabContainer);
				this.statsComponent.setProfile(state.profile);
				break;
			case 'history':
				this.historyComponent = new ProfileHistoryComponent(tabContainer);
				this.historyComponent.setProfile(state.profile);
				this.historyComponent.setHandlers({ onPlayerClick: this.handlePlayerClick });
				break;
			case 'friends':
				this.friendsComponent = new ProfileFriendsComponent(tabContainer);
				this.friendsComponent.setProfile(state.profile);
				this.friendsComponent.setHandlers({ onPlayerClick: this.handlePlayerClick });
				break;
			case 'settings':
				this.settingsComponent = new ProfileSettingsComponent(tabContainer);
				this.settingsComponent.setProfile(state.profile);
				this.settingsComponent.setHandlers({ onProfileUpdate: this.handleProfileSettingsUpdate });
				this.lastSettingsProfileId = state.profile.id;
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
		if (this.initialRenderComplete && this.getInternalState().profile) {
			this.initializeTabContent();
		}
	}
	
	/**
	 * Fetches profile data from the database
	 */
	private async fetchProfileData(): Promise<void> {
		try {
			// Get userId from URL
			const url = new URL(window.location.href);
			let userId = url.searchParams.get('id');
			
			// Handle 'current' user case
			if (!userId || userId === 'current') {
				const currentUser = JSON.parse(localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user') || '{}');
				userId = currentUser?.id;
				if (!userId) {
					this.updateInternalState({ errorMessage: 'No user ID provided', isLoading: false });
					return;
				}
			}
			
			// Store the current profile ID
			this.updateInternalState({ currentProfileId: userId });
			
			// Get profile data
			const userProfile = await DbService.getUserProfile(userId);
			console.log({userId})
			console.log({userProfile})
			if (!userProfile) {
				throw new Error(`User with ID ${userId} not found`);
			}
			
			// Get profile picture
			let avatarUrl = '/images/default-avatar.svg';
			try {
				const picResponse = await DbService.getPic(userId);
				if (picResponse?.link) {
					avatarUrl = picResponse.link;
				}
			} catch (error) {
				console.warn(`Could not fetch profile picture, using default.`);
			}
			
			// Get ELO (use separate API call for accurate data)
			let elo = userProfile.summary?.elo || 1000;
			try {
				const eloData = await DbService.getPlayerElo(userId);
				if (eloData?.elo) {
					elo = eloData.elo;
				}
			} catch (error) {
				console.warn(`Could not fetch ELO, using summary data.`);
			}
			
			// Build user profile object
			const profile = {
				id: String(userProfile.id),
				username: userProfile.username,
				avatarUrl,
				totalGames: userProfile.summary?.total_matches - userProfile.summary?.active_matches || 0,
				wins: userProfile.summary?.victories || 0,
				losses: userProfile.summary?.defeats || 0,
				gameHistory: [],
				friends: [],
				preferences: {
					accentColor: AppStateManager.getUserAccentColor(userProfile.id)
				},
				elo
			};
			
			// Check for pending friend requests if this is the current user's profile
			const isOwnProfile = this.isCurrentUserProfile(userId);
			let pendingFriends = [];
			
			if (isOwnProfile) {
				try {
					// Get all friend data for current user
					const friendsResponse = await DbService.getMyFriends();
					if (Array.isArray(friendsResponse)) {
						// Filter to only include pending requests
						pendingFriends = friendsResponse.filter(friendship => !friendship.accepted);
					}
				} catch (error) {
					console.warn('Could not fetch pending friend requests:', error);
				}
			}
			
			// Check friendship status if it's not our own profile
			let friendshipStatus = null;
			if (!isOwnProfile) {
				try {
					friendshipStatus = await DbService.getFriendship(userId);
				} catch (error) {
					console.log("No friendship exists");
				}
			}
			
			// Update state with all the data
			this.updateInternalState({
				profile,
				friendshipStatus,
				pendingFriends,
				isLoading: false
			});
			
		} catch (error) {
			console.error('Error fetching profile data:', error);
			this.updateInternalState({
				errorMessage: error instanceof Error ? error.message : 'Failed to load profile data',
				isLoading: false
			});
		}
	}

	/**
	 * Handle tab changes with callback
	 */
	private handleTabChange = (tabId: string): void => {
		if (this.getInternalState().activeTab === tabId) return;
		
		this.updateInternalState({ activeTab: tabId });
		this.createTabComponent(tabId);
	}
	
	/**
	 * Handle player profile clicks with callback
	 */
	private handlePlayerClick = async (username: string): Promise<void> => {
		try {
			const userId = await DbService.getIdByUsername(username);
			navigate(`/profile?id=${userId}`);
		} catch (error) {
			console.error(`Could not find user with username: ${username}`, error);
		}
	}
	
	/**
	 * Handles updates from the ProfileSettingsComponent
	 */
	private handleProfileSettingsUpdate = async (updatedFields: Partial<User>): Promise<void> => {
		const state = this.getInternalState();
		if (!state.profile) return;

		let profileWasActuallyUpdatedInParent = false;
		const newProfileDataForParent = { ...state.profile };

		if (updatedFields.username && updatedFields.username !== newProfileDataForParent.username) {
			newProfileDataForParent.username = updatedFields.username;
			profileWasActuallyUpdatedInParent = true;
		}

		if (profileWasActuallyUpdatedInParent) {
			this.updateInternalState({ profile: newProfileDataForParent });
		}
	}
	
	/**
	 * Renders the profile view based on current state
	 */
	private async renderView(): Promise<void> {
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
		
		if (!state.isLoading && !state.errorMessage && state.profile) {
			// Get profile content element
			const profileContent = this.container.querySelector('.profile-content');
			if (!profileContent) return;
			
			// Always clear and rebuild everything
			profileContent.innerHTML = '';
			
			// Create profile summary/hero section
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
			
			// Create tabs container
			const tabsOuterContainer = document.createElement('div');
			tabsOuterContainer.className = 'profile-tabs-outer-container';
			
			// Get profile ID directly from URL
			const url = new URL(window.location.href);
			const urlProfileId = url.searchParams.get('id');
			
			// Check if this is current user's profile
			const isCurrentUserProfile = this.isCurrentUserProfile(urlProfileId || state.profile.id);
			
			// Determine friend button text and styling
			let friendButtonText = 'Add Friend';
			let friendButtonClass = 'friend-button tab-button';
			
			if (state.friendshipStatus) {
				if (state.friendshipStatus.status === false) {
					friendButtonText = 'Pending';
					friendButtonClass += ' pending';
				} else if (state.friendshipStatus.status === true) {
					friendButtonText = 'Already Friends';
					friendButtonClass += ' is-friend';
				}
			}
			
			// Create tabs using HTML
			const tabsHTML = `
				<div class="profile-tabs">
					<ul class="tabs-list">
						<li class="tab-item ${state.activeTab === 'stats' ? 'active' : ''}" data-tab="stats">
							<button class="tab-button">Statistics</button>
						</li>
						<li class="tab-item ${state.activeTab === 'history' ? 'active' : ''}" data-tab="history">
							<button class="tab-button">Match History</button>
						</li>
						<li class="tab-item ${state.activeTab === 'friends' ? 'active' : ''}" data-tab="friends">
							<button class="tab-button">
								Friends
								${isCurrentUserProfile && state.pendingFriends.length > 0 ? 
									`<span class="notification-dot"></span>` : 
									''
								}
							</button>
						</li>
						${isCurrentUserProfile ? `
							<li class="tab-item ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
								<button class="tab-button">Settings</button>
							</li>
						` : `
							<li class="tab-item" data-tab="add-friend">
								<button class="${friendButtonClass}">${friendButtonText}</button>
							</li>
						`}
					</ul>
				</div>
				<div class="tab-content"></div>
			`;
			
			tabsOuterContainer.innerHTML = tabsHTML;
			profileContent.appendChild(tabsOuterContainer);
			
			// Add event listeners after HTML rendering
			tabsOuterContainer.querySelectorAll('.tab-item').forEach(tabItem => {
				const tabId = (tabItem as HTMLElement).dataset.tab;
				if (tabId === 'add-friend') {
					tabItem.addEventListener('click', () => this.handleFriendAction());
				} else if (tabId) {
					tabItem.addEventListener('click', () => this.handleTabChange(tabId));
				}
			});
			
			// Wait for next frame to ensure DOM is ready before creating tab content
			await this.waitForNextFrame();
			
			// Create tab component after tabs are fully rendered
			this.createTabComponent(state.activeTab);
		}
	}

	/**
	 * Returns a promise that resolves on the next animation frame
	 * This ensures DOM updates have completed
	 */
	private waitForNextFrame(): Promise<void> {
		return new Promise(resolve => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	}

	/**
	 * Checks if the profile being viewed belongs to the current user
	 */
	private isCurrentUserProfile(profileId: string): boolean {
		if (!profileId) return false;
		
		// Always get current user from storage
		const currentUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (!currentUserJson) return false;
		
		try {
			const currentUser = JSON.parse(currentUserJson);
			return currentUser && currentUser.id && currentUser.id === profileId;
		} catch (error) {
			console.error('Error checking if current user profile:', error);
			return false;
		}
	}

	/**
	 * Handles friend actions (add/cancel request)
	 */
	private async handleFriendAction(): Promise<void> {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const friendButton = this.container.querySelector('.friend-button') as HTMLButtonElement;
		if (!friendButton) return;
		
		// Don't allow action if already friends
		if (friendButton.classList.contains('is-friend')) {
			return;
		}
		
		const isPending = friendButton.classList.contains('pending');
		
		friendButton.disabled = true;
		friendButton.textContent = 'Processing...';
		
		try {
			if (isPending) {
				// Cancel the friend request
				await DbService.removeFriend(state.profile.id);
				friendButton.textContent = 'Add Friend';
				friendButton.classList.remove('pending', 'request-sent');
				
				// Update friendship status in state
				this.updateInternalState({
					friendshipStatus: null
				});
			} else {
				// Send friend request
				await DbService.addFriend(state.profile.id);
				friendButton.textContent = 'Pending';
				friendButton.classList.add('request-sent', 'pending');
				
				// Update friendship status in state
				this.updateInternalState({
					friendshipStatus: { status: 'pending' }
				});
			}
		} catch (error) {
			console.error('Error managing friend relationship:', error);
			// Reset button to previous state
			friendButton.textContent = isPending ? 'Pending' : 'Add Friend';
			if (isPending) {
				friendButton.classList.add('request-sent', 'pending');
			}
		} finally {
			friendButton.disabled = false;
		}
	}

	/**
	 * Handle URL changes to reset the component when navigating between profiles
	 */
	private handleUrlChange(): void {
		const url = new URL(window.location.href);
		const newProfileId = url.searchParams.get('id');
		const state = this.getInternalState();
		
		if (newProfileId !== state.currentProfileId) {
			console.log(`Profile change detected: ${state.currentProfileId} → ${newProfileId}`);
			
			// Clean up existing tab components
			if (this.statsComponent) {
				this.statsComponent = undefined;
			}
			if (this.historyComponent) {
				this.historyComponent = undefined;
			}
			if (this.friendsComponent) {
				this.friendsComponent = undefined;
			}
			if (this.settingsComponent) {
				this.settingsComponent = undefined;
				this.lastSettingsProfileId = undefined;
			}
			
			// Reset state completely
			this.updateInternalState({
				profile: null,
				initialized: false,
				isLoading: false,
				activeTab: 'stats',
				currentProfileId: newProfileId,
				friendshipStatus: null,
			});
			
			// Re-initialize
			this.initialize();
		}
	}

	/**
	 * Force a clean reload of the profile when coming from external links
	 */
	public loadProfile(profileId: string): void {
		// Reset the component state
		this.updateInternalState({
			profile: null,
			initialized: false,
			isLoading: false,
			activeTab: 'stats',
			currentProfileId: profileId
		});
		
		// Reinitialize
		this.initialize();
	}

	public hasPendingRequests(): boolean {
		return this.getInternalState().pendingFriends.length > 0;
	}
}