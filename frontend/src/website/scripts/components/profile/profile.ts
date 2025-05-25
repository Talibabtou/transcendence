import { Component, ProfileStatsComponent, ProfileHistoryComponent, ProfileFriendsComponent, ProfileSettingsComponent } from '@website/scripts/components';
import { ASCII_ART, AppStateManager } from '@website/scripts/utils';
import { DbService, html, render, navigate, NotificationManager } from '@website/scripts/services';
import { ProfileState, User } from '@website/types';

export class ProfileComponent extends Component<ProfileState> {
	private statsComponent?: ProfileStatsComponent;
	private historyComponent?: ProfileHistoryComponent;
	private friendsComponent?: ProfileFriendsComponent;
	private settingsComponent?: ProfileSettingsComponent;
	private lastSettingsProfileId?: string;
	private initialRenderComplete = false;
	
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
		
		window.addEventListener('popstate', () => this.handleUrlChange());
	}
	
	//--------------------------------
	// Lifecycle Methods
	//--------------------------------
	
	/**
	 * Initializes the component by fetching data
	 */
	async initialize(): Promise<void> {
		const state = this.getInternalState();
		if (state.initialized || state.isLoading) return;
		
		this.updateInternalState({ 
			isLoading: true,
			initialized: true
		});
		
		try {
			await this.fetchProfileData();
			
			this.updateInternalState({ 
				isLoading: false 
			});
			
			await this.renderView();
			
			this.initialRenderComplete = true;
			
			this.initializeTabContent();
		} catch (error) {
			console.error('Error initializing profile:', error);
			
			this.updateInternalState({ 
				isLoading: false,
				initialized: false
			});
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
		if (!this.initialRenderComplete && this.getInternalState().profile) {
			this.initialRenderComplete = true;
			this.initializeTabContent();
		}
	}
	
	/**
	 * Force a clean reload of the profile when coming from external links
	 */
	public loadProfile(profileId: string): void {
		this.updateInternalState({
			profile: null,
			initialized: false,
			isLoading: false,
			activeTab: 'stats',
			currentProfileId: profileId
		});
	}
	
	/**
	 * Checks if the profile has pending friend requests
	 */
	public hasPendingRequests(): boolean {
		return this.getInternalState().pendingFriends.length > 0;
	}
	
	/**
	 * Override the base refresh method to completely reset the component state
	 */
	public refresh(): void {
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
			if (typeof this.settingsComponent.destroy === 'function') {
				this.settingsComponent.destroy();
			}
			this.settingsComponent = undefined;
			this.lastSettingsProfileId = undefined;
		}
		
		this.updateInternalState({
			profile: null,
			initialized: false,
			isLoading: false,
			activeTab: 'stats',
			currentProfileId: null,
			friendshipStatus: null,
			pendingFriends: [],
			matchesCache: new Map()
		});
		
		this.initialize();
	}
	
	//--------------------------------
	// Tab Management
	//--------------------------------
	
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
		
		tabContentDiv.innerHTML = '';
		const tabContainer = document.createElement('div');
		tabContainer.className = 'tab-pane active';
		tabContainer.id = `tab-content-${tabName}`;
		tabContentDiv.appendChild(tabContainer);

		switch (tabName) {
			case 'stats':
				if (this.statsComponent) {
					const statsContainer = this.statsComponent.getDOMContainer();
					if (statsContainer.parentElement !== tabContentDiv) {
						tabContentDiv.innerHTML = '';
						tabContentDiv.appendChild(statsContainer);
					}
					this.statsComponent.setProfile(state.profile);
					if (typeof this.statsComponent.refreshData === 'function') {
						this.statsComponent.refreshData();
					}
					statsContainer.classList.add('active');
				} else {
					this.statsComponent = new ProfileStatsComponent(tabContainer);
					this.statsComponent.setProfile(state.profile);
				}
				break;
			case 'history':
				if (this.historyComponent) {
					const historyContainer = this.historyComponent.getDOMContainer();
					if (historyContainer.parentElement !== tabContentDiv) {
						tabContentDiv.innerHTML = '';
						tabContentDiv.appendChild(historyContainer);
					}
					this.historyComponent.setProfile(state.profile);
					historyContainer.classList.add('active');
				} else {
					this.historyComponent = new ProfileHistoryComponent(tabContainer);
					this.historyComponent.setProfile(state.profile);
					this.historyComponent.setHandlers({ onPlayerClick: this.handlePlayerClick });
				}
				break;
			case 'friends':
				if (this.friendsComponent) {
					const friendsContainer = this.friendsComponent.getDOMContainer();
					if (friendsContainer.parentElement !== tabContentDiv) {
						tabContentDiv.innerHTML = '';
						tabContentDiv.appendChild(friendsContainer);
					}
					this.friendsComponent.setProfile(state.profile);
					friendsContainer.classList.add('active');
				} else {
					this.friendsComponent = new ProfileFriendsComponent(tabContainer);
					this.friendsComponent.setProfile(state.profile);
					this.friendsComponent.setHandlers({ onPlayerClick: this.handlePlayerClick });
				}
				break;
			case 'settings':
				if (this.settingsComponent && this.lastSettingsProfileId === state.profile.id) {
					const settingsContainer = this.settingsComponent.getDOMContainer();
					
					if (settingsContainer.parentElement !== tabContentDiv) {
						tabContentDiv.innerHTML = ''; 
						tabContentDiv.appendChild(settingsContainer);
					}

					this.settingsComponent.setProfile(state.profile);
					settingsContainer.classList.add('active');
				} else {
					if (this.settingsComponent) {
						if (typeof this.settingsComponent.destroy === 'function') {
							this.settingsComponent.destroy();
						}
						this.settingsComponent = undefined;
					}
					this.settingsComponent = new ProfileSettingsComponent(tabContainer);
					this.settingsComponent.setProfile(state.profile);
					this.settingsComponent.setHandlers({ onProfileUpdate: this.handleProfileSettingsUpdate });
					this.lastSettingsProfileId = state.profile.id;
				}
				break;
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
	
	//--------------------------------
	// Data Fetching
	//--------------------------------
	
	/**
	 * Fetches profile data from the database
	 */
	private async fetchProfileData(): Promise<void> {
		const url = new URL(window.location.href);
		let userId = url.searchParams.get('id');
		
		if (!userId) {
			const currentUser = JSON.parse(localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user') || '{}');
			userId = currentUser?.id;
			if (!userId) {
				NotificationManager.showError('No user ID provided');
				this.updateInternalState({ isLoading: false });
				return;
			}
		}
		
		this.updateInternalState({ currentProfileId: userId });
		
		try {
			const userProfile = await DbService.getUserProfile(userId);
			
			if (!userProfile) {
				NotificationManager.showError(`User profile not found`);
				throw new Error(`User with ID ${userId} not found`);
			}
			
			const profile = {
				id: String(userProfile.id),
				username: userProfile.username,
				avatarUrl: userProfile.pics?.link,
				totalGames: userProfile.summary?.total_matches - userProfile.summary?.active_matches || 0,
				wins: userProfile.summary?.victories || 0,
				losses: userProfile.summary?.defeats || 0,
				gameHistory: [],
				friends: [],
				preferences: {
					accentColor: AppStateManager.getUserAccentColor(userProfile.id)
				},
				elo: userProfile.summary?.elo || 1000
			};
			
			const isOwnProfile = this.isCurrentUserProfile(userId);
			let pendingFriends = [];
			
			if (isOwnProfile) {
				try {
					const friendsResponse = await DbService.getMyFriends();
					if (Array.isArray(friendsResponse)) {
						const pendingFriendships = friendsResponse.filter(friendship => !friendship.accepted);
						
						let hasIncomingRequest = false;
						
						for (const friendship of pendingFriendships) {
							try {
								const friendshipStatus = await DbService.getFriendship(friendship.id);
								
								if (friendshipStatus && friendshipStatus.requesting !== userId) {
									pendingFriends.push(friendship);
									hasIncomingRequest = true;
									break;
								}
							} catch (error) {
								console.warn(`Failed to get friendship details for ${friendship.id}`, error);
							}
						}
						
						if (!hasIncomingRequest) {
							pendingFriends = [];
						}
					}
				} catch (error) {
					console.warn('Could not fetch pending friend requests:', error);
				}
			}
			
			let friendshipStatus = null;
			if (!isOwnProfile) {
				try {
					friendshipStatus = await DbService.getFriendship(userId);
				} catch (error) {
				}
			}
			
			this.updateInternalState({
				profile,
				friendshipStatus,
				pendingFriends,
				isLoading: false
			});
			
		} catch (error) {
			console.error('Error fetching profile data:', error);
			
			this.updateInternalState({ isLoading: false });
		}
	}
	
	//--------------------------------
	// Event Handlers
	//--------------------------------
	
	/**
	 * Handle player profile clicks with callback
	 */
	private handlePlayerClick = async (username: string): Promise<void> => {
		try {
			const userId = await DbService.getIdByUsername(username);
			navigate(`/profile?id=${userId}`);
		} catch (error) {
			NotificationManager.showError(`Could not find user: ${username}`);
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
	 * Handle URL changes to reset the component when navigating between profiles
	 */
	private handleUrlChange(): void {
		const url = new URL(window.location.href);
		const newProfileId = url.searchParams.get('id');
		const state = this.getInternalState();
		
		if (newProfileId !== state.currentProfileId) {
			
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
			
			this.updateInternalState({
				profile: null,
				initialized: false,
				isLoading: false,
				activeTab: 'stats',
				currentProfileId: newProfileId,
				friendshipStatus: null,
			});
			
			this.initialize();
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
		
		if (friendButton.classList.contains('is-friend')) {
			return;
		}
		
		const isPending = friendButton.classList.contains('pending');
		
		friendButton.disabled = true;
		friendButton.textContent = 'Processing...';
		
		try {
			if (isPending) {
				await DbService.removeFriend(state.profile.id);
				const newStatus = await DbService.getFriendship(state.profile.id);
				
				NotificationManager.showSuccess('Friend request cancelled');
				
				if (newStatus === null) {
					friendButton.textContent = 'Add Friend';
					friendButton.classList.remove('pending', 'request-sent', 'is-friend');
				} else if (newStatus.status === false) {
					friendButton.textContent = 'Pending';
					friendButton.classList.add('pending', 'request-sent');
					friendButton.classList.remove('is-friend');
				} else {
					friendButton.textContent = 'Already Friends';
					friendButton.classList.add('is-friend');
					friendButton.classList.remove('pending', 'request-sent');
				}
				
				this.updateInternalState({
					friendshipStatus: newStatus
				});
			} else {
				await DbService.addFriend(state.profile.id);
				const newStatus = await DbService.getFriendship(state.profile.id);
				
				NotificationManager.showSuccess('Friend request sent');
				
				if (newStatus === null) {
					friendButton.textContent = 'Add Friend';
					friendButton.classList.remove('pending', 'request-sent', 'is-friend');
				} else if (newStatus.status === false) {
					friendButton.textContent = 'Pending';
					friendButton.classList.add('pending', 'request-sent');
					friendButton.classList.remove('is-friend');
				} else {
					friendButton.textContent = 'Already Friends';
					friendButton.classList.add('is-friend');
					friendButton.classList.remove('pending', 'request-sent');
				}
				
				this.updateInternalState({
					friendshipStatus: newStatus
				});
			}
		} catch (error) {
			console.error('Error managing friend relationship:', error);
			
			if (isPending) {
				friendButton.textContent = 'Pending';
				friendButton.classList.add('pending', 'request-sent');
			} else {
				friendButton.textContent = 'Add Friend';
				friendButton.classList.remove('pending', 'request-sent', 'is-friend');
			}
		} finally {
			friendButton.disabled = false;
		}
	}
	
	//--------------------------------
	// Rendering
	//--------------------------------
	
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
					html`
						<div class="profile-content"></div>
					`
				}
			</div>
		`;
		
		render(template, this.container);
		
		if (!state.isLoading && state.profile) {
			const profileContent = this.container.querySelector('.profile-content');
			if (!profileContent) return;
			
			profileContent.innerHTML = '';
			
			const summaryElement = document.createElement('div');
			summaryElement.className = 'profile-hero';
			summaryElement.innerHTML = `
				<div class="profile-avatar">
					<img src="${state.profile.username.toLowerCase() === 'ai' ? '/images/ai-avatar.jpg' : state.profile.avatarUrl}" alt="${state.profile.username}">
				</div>
				<div class="profile-info">
					<h2 class="username">
						${state.profile.username}
						${state.profile.username.toLowerCase() === 'ai' ? 
							'<span class="bot-badge">BOT</span>' : 
							''
						}
					</h2>
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
			
			const tabsOuterContainer = document.createElement('div');
			tabsOuterContainer.className = 'profile-tabs-outer-container';
			
			const url = new URL(window.location.href);
			const urlProfileId = url.searchParams.get('id');
			
			const isCurrentUserProfile = this.isCurrentUserProfile(urlProfileId || state.profile.id);
			
			const isAiBot = state.profile.username.toLowerCase() === 'ai';
			
			let friendButtonText = 'Add Friend';
			let friendButtonClass = 'friend-button tab-button';
			
			if (state.friendshipStatus !== null) {
				if (state.friendshipStatus.status === false) {
					friendButtonText = 'Pending';
					friendButtonClass += ' pending request-sent';
				} else if (state.friendshipStatus.status === true) {
					friendButtonText = 'Already Friends';
					friendButtonClass += ' is-friend';
				}
			} else {
				friendButtonText = 'Add Friend';
				friendButtonClass = 'friend-button tab-button';
			}
			
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
							${isAiBot ? '' : `
							<button class="tab-button">
								Friends
								${isCurrentUserProfile && state.pendingFriends.length > 0 ? 
									`<span class="notification-dot"></span>` : 
									''
								}
							</button>
							`}
						</li>
						${isCurrentUserProfile && !isAiBot ? `
							<li class="tab-item ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
								<button class="tab-button">Settings</button>
							</li>
						` : !isAiBot ? `
							<li class="tab-item" data-tab="add-friend">
								<button class="${friendButtonClass}">${friendButtonText}</button>
							</li>
						` : ''}
					</ul>
				</div>
				<div class="tab-content"></div>
			`;
			
			tabsOuterContainer.innerHTML = tabsHTML;
			profileContent.appendChild(tabsOuterContainer);
			
			tabsOuterContainer.querySelectorAll('.tab-item').forEach(tabItem => {
				const tabId = (tabItem as HTMLElement).dataset.tab;
				if (tabId === 'add-friend') {
					tabItem.addEventListener('click', () => this.handleFriendAction());
				} else if (tabId) {
					tabItem.addEventListener('click', () => this.handleTabChange(tabId));
				}
			});
			
			await this.waitForNextFrame();
			
			this.createTabComponent(state.activeTab);
		}
	}
	
	//--------------------------------
	// Helper Methods
	//--------------------------------
	
	/**
	 * Returns a promise that resolves on the next animation frame
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
}
