import { Component, ProfileStatsComponent, ProfileHistoryComponent, ProfileFriendsComponent, ProfileSettingsComponent } from '@website/scripts/components';
import { ASCII_ART, AppStateManager } from '@website/scripts/utils';
import { DbService, html, render, navigate, NotificationManager, WebSocketClient } from '@website/scripts/services';
import { ProfileState, User } from '@website/types';

export class ProfileComponent extends Component<ProfileState> {
	private statsComponent?: ProfileStatsComponent;
	private historyComponent?: ProfileHistoryComponent;
	private friendsComponent?: ProfileFriendsComponent;
	private settingsComponent?: ProfileSettingsComponent;
	private initialRenderComplete = false;
	private dataFetchInProgress = false;
	private wsClient: WebSocketClient;
	private statusChangeUnsubscribe?: () => void;
	private abortController?: AbortController;
	private boundHandleUrlChange: () => void;
	
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
			pendingFriends: [],
			isUserOnline: false
		});
		
		this.boundHandleUrlChange = this.handleUrlChange.bind(this);
		window.addEventListener('popstate', this.boundHandleUrlChange);
		this.wsClient = WebSocketClient.getInstance();
	}
	
	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Initializes the component by fetching data
	 */
	async initialize(): Promise<void> {
		const state = this.getInternalState();
		if (state.initialized || state.isLoading || this.dataFetchInProgress) return;
		
		if (this.abortController) this.abortController.abort();
		this.abortController = new AbortController();
		
		this.updateInternalState({ isLoading: true, initialized: true });
		
		try {
			this.dataFetchInProgress = true;
			await this.fetchProfileData();
			if (this.abortController.signal.aborted) return;
			this.dataFetchInProgress = false;
			const updatedState = this.getInternalState();
			
			if (updatedState.profile) {
				this.setupOnlineStatusListener();
				this.updateInternalState({ isUserOnline: this.wsClient.isUserOnline(updatedState.profile.id) });
				await this.renderView();
				this.initialRenderComplete = true;
				this.initializeTabContent();
			}
		} catch (error) {
			if (!this.abortController.signal.aborted) {
				NotificationManager.showError("Error initializing profile");
			}
			this.dataFetchInProgress = false;
			this.updateInternalState({ isLoading: false, initialized: false });
		}
	}
	
	/**
	 * Set up listener for online status changes
	 */
	private setupOnlineStatusListener(): void {
		if (this.statusChangeUnsubscribe) this.statusChangeUnsubscribe();
		
		this.statusChangeUnsubscribe = this.wsClient.addStatusChangeListener((userId, isOnline) => {
			const state = this.getInternalState();
			if (state.profile && state.profile.id === userId) {
				this.updateOnlineStatusIndicator(isOnline);
				(this as any).state = { ...state, isUserOnline: isOnline };
			}
		});
	}
	
	/**
	 * Updates the online status indicator in the DOM
	 */
	private updateOnlineStatusIndicator(isOnline: boolean): void {
		const indicator = this.container.querySelector('.online-status-indicator');
		if (indicator) indicator.classList[isOnline ? 'add' : 'remove']('online');
	}
	
	/**
	 * Renders the component based on current state
	 */
	render(): void {
		!this.getInternalState().initialized && !this.dataFetchInProgress 
			? this.initialize() 
			: this.renderView();
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
		if (this.dataFetchInProgress) return;
		
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = undefined;
		}
		
		this.cleanupComponents();
		if (this.statusChangeUnsubscribe) {
			this.statusChangeUnsubscribe();
			this.statusChangeUnsubscribe = undefined;
		}
		
		this.updateInternalState({
			profile: null,
			initialized: false,
			isLoading: false,
			activeTab: 'stats',
			currentProfileId: profileId,
			isUserOnline: false
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
		if (this.dataFetchInProgress) return;
		
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = undefined;
		}
		
		this.cleanupComponents();
		
		if (this.statusChangeUnsubscribe) {
			this.statusChangeUnsubscribe();
			this.statusChangeUnsubscribe = undefined;
		}
		
		this.updateInternalState({
			profile: null,
			initialized: false,
			isLoading: false,
			activeTab: 'stats',
			currentProfileId: null,
			friendshipStatus: null,
			pendingFriends: [],
			matchesCache: new Map(),
			isUserOnline: false
		});
		
		this.initialize();
	}
	
	/**
	 * Cleanup all child components
	 */
	private cleanupComponents(): void {
		this.statsComponent = undefined;
		this.historyComponent = undefined;
		this.friendsComponent = undefined;
		
		if (this.settingsComponent) {
			if (typeof this.settingsComponent.destroy === 'function') {
				this.settingsComponent.destroy();
			}
			this.settingsComponent = undefined;
		}
	}
	
	/**
	 * Cleanup resources when component is destroyed
	 */
	public destroy(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = undefined;
		}
		
		this.dataFetchInProgress = false;
		
		if (this.statusChangeUnsubscribe) {
			this.statusChangeUnsubscribe();
			this.statusChangeUnsubscribe = undefined;
		}
		
		this.cleanupComponents();
		window.removeEventListener('popstate', this.boundHandleUrlChange);
		super.destroy();
	}
	
	// =========================================
	// TAB MANAGEMENT
	// =========================================
	
	/**
	 * Initialize the active tab content after the first render
	 */
	private initializeTabContent(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		requestAnimationFrame(() => {
			const tabContainer = this.container.querySelector(`.tab-content`);
			if (tabContainer) this.createTabComponent(state.activeTab);
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
			case 'stats': this.initializeStatsTab(tabContentDiv, tabContainer); break;
			case 'history': this.initializeHistoryTab(tabContentDiv, tabContainer); break;
			case 'friends': this.initializeFriendsTab(tabContentDiv, tabContainer); break;
			case 'settings': this.initializeSettingsTab(tabContentDiv, tabContainer); break;
		}
	}
	
	/**
	 * Initialize the stats tab component
	 */
	private initializeStatsTab(tabContentDiv: Element, tabContainer: HTMLElement): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		if (this.statsComponent) {
			const statsContainer = this.statsComponent.getDOMContainer();
			if (statsContainer.parentElement !== tabContentDiv) {
				tabContentDiv.innerHTML = '';
				tabContentDiv.appendChild(statsContainer);
			}
			this.statsComponent.setProfile(state.profile);
			statsContainer.classList.add('active');
			this.statsComponent.refreshData();
		} else {
			this.statsComponent = new ProfileStatsComponent(tabContainer);
			this.statsComponent.setProfile(state.profile);
		}
	}
	
	/**
	 * Initialize the history tab component
	 */
	private initializeHistoryTab(tabContentDiv: Element, tabContainer: HTMLElement): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		if (this.historyComponent) {
			const historyContainer = this.historyComponent.getDOMContainer();
			if (historyContainer.parentElement !== tabContentDiv) {
				tabContentDiv.innerHTML = '';
				tabContentDiv.appendChild(historyContainer);
			}
			this.historyComponent.setProfile(state.profile);
			historyContainer.classList.add('active');
			this.historyComponent.refreshData();
		} else {
			this.historyComponent = new ProfileHistoryComponent(tabContainer);
			this.historyComponent.setProfile(state.profile);
			this.historyComponent.setHandlers({ onPlayerClick: this.handlePlayerClick });
		}
	}
	
	/**
	 * Initialize the friends tab component
	 */
	private initializeFriendsTab(tabContentDiv: Element, tabContainer: HTMLElement): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		if (this.friendsComponent) {
			const friendsContainer = this.friendsComponent.getDOMContainer();
			if (friendsContainer.parentElement !== tabContentDiv) {
				tabContentDiv.innerHTML = '';
				tabContentDiv.appendChild(friendsContainer);
			}
			this.friendsComponent.setProfile(state.profile);
			friendsContainer.classList.add('active');
			this.friendsComponent.refreshData();
		} else {
			this.friendsComponent = new ProfileFriendsComponent(tabContainer);
			this.friendsComponent.setProfile(state.profile);
			this.friendsComponent.setHandlers({
				onPlayerClick: this.handlePlayerClick,
				onFriendRequestAccepted: this.handleFriendRequestAccepted
			});
		}
	}
	
	/**
	 * Initialize the settings tab component
	 */
	private initializeSettingsTab(tabContentDiv: Element, tabContainer: HTMLElement): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		if (this.settingsComponent) {
			const settingsContainer = this.settingsComponent.getDOMContainer();
			if (settingsContainer.parentElement !== tabContentDiv) {
				tabContentDiv.innerHTML = '';
				tabContentDiv.appendChild(settingsContainer);
			}
			this.settingsComponent.setProfile(state.profile);
			settingsContainer.classList.add('active');
		} else {
			this.settingsComponent = new ProfileSettingsComponent(tabContainer);
			this.settingsComponent.setProfile(state.profile);
			this.settingsComponent.setHandlers({ onProfileUpdate: this.handleProfileSettingsUpdate });
		}
	}
	
	/**
	 * Handle tab changes with callback
	 */
	private handleTabChange = (tabId: string): void => {
		if (this.getInternalState().activeTab === tabId) {
			this.refreshActiveTab();
			return;
		}
		
		this.updateInternalState({ activeTab: tabId });
		this.createTabComponent(tabId);
	}
	
	/**
	 * Refreshes the currently active tab's data
	 */
	private refreshActiveTab(): void {
		const state = this.getInternalState();
		
		switch (state.activeTab) {
			case 'stats': if (this.statsComponent) this.statsComponent.refreshData(); break;
			case 'history': if (this.historyComponent) this.historyComponent.refreshData(); break;
			case 'friends': if (this.friendsComponent) this.friendsComponent.refreshData(); break;
			case 'settings': if (this.settingsComponent) this.settingsComponent.refreshData(); break;
		}
	}
	
	// =========================================
	// DATA FETCHING
	// =========================================
	
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
				this.updateInternalState({ isLoading: false });
				return;
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
			
			this.updateInternalState({ profile });
			
			const isOwnProfile = this.isCurrentUserProfile(userId);
			const additionalDataPromises = [];
			let pendingFriends: any[] = [];
			
			if (isOwnProfile) {
				additionalDataPromises.push(
					DbService.getMyFriends()
						.then(friendsResponse => {
							if (Array.isArray(friendsResponse)) {
								const pendingFriendships = friendsResponse.filter(friendship => !friendship.accepted);
								return Promise.all(
									pendingFriendships.map(friendship => 
										DbService.getFriendship(friendship.id)
											.then(friendshipStatus => ({ friendship, friendshipStatus }))
											.catch(() => ({ friendship, friendshipStatus: null }))
									)
								);
							}
							return [];
						})
						.then(friendshipDetails => {
							pendingFriends = friendshipDetails
								.filter(({ friendshipStatus }) => 
									friendshipStatus && friendshipStatus.requesting !== userId
								)
								.map(({ friendship }) => friendship);
						})
						.catch(() => {
							NotificationManager.showError('Could not fetch pending friend requests');
						})
				);
			}
			
			let friendshipStatus = null;
			if (!isOwnProfile) {
				additionalDataPromises.push(
					DbService.getFriendship(userId)
						.then(status => {
							friendshipStatus = status;
						})
						.catch(error => {
							if (error?.response?.status !== 404) {
								NotificationManager.showError('Unexpected error fetching friendship status');
							}
						})
				);
			}
			
			if (additionalDataPromises.length > 0) {
				await Promise.all(additionalDataPromises);
			}
			
			this.updateInternalState({
				profile,
				friendshipStatus,
				pendingFriends,
				isLoading: false
			});
			
		} catch (error) {
			NotificationManager.handleError(error);
			this.updateInternalState({ isLoading: false });
		}
	}
	
	// =========================================
	// HANDLERS
	// =========================================
	
	/**
	 * Handle player profile clicks with callback
	 */
	private handlePlayerClick = async (username: string): Promise<void> => {
		try {
			const userId = await DbService.getIdByUsername(username);
			navigate(`/profile?id=${userId}`);
		} catch (error) {
			NotificationManager.showError(`Could not find user: ${username}`);
		}
	}
	
	/**
	 * Handles updates from the ProfileSettingsComponent
	 */
	private handleProfileSettingsUpdate = (updatedFields: Partial<User>): void => {
		const state = this.getInternalState();
		if (!state.profile) return;

		let profileUpdated = false;
		const newProfileData = { ...state.profile };

		if (updatedFields.username && updatedFields.username !== newProfileData.username) {
			newProfileData.username = updatedFields.username;
			profileUpdated = true;
		}
		
		if (updatedFields.pfp && updatedFields.pfp !== newProfileData.avatarUrl) {
			newProfileData.avatarUrl = updatedFields.pfp;
			profileUpdated = true;
		}

		if (profileUpdated) {
			this.updateInternalState({ profile: newProfileData });
			this.renderView();
		}
	}
	
	/**
	 * Handle URL changes to reset the component when navigating between profiles
	 */
	private handleUrlChange(): void {
		const url = new URL(window.location.href);
		const newProfileId = url.searchParams.get('id');
		const state = this.getInternalState();
		
		if (this.dataFetchInProgress || newProfileId === state.currentProfileId) return;
		
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = undefined;
		}
		
		this.cleanupComponents();
		
		if (this.statusChangeUnsubscribe) {
			this.statusChangeUnsubscribe();
			this.statusChangeUnsubscribe = undefined;
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
	
	/**
	 * Handles friend actions (add/cancel request)
	 */
	private async handleFriendAction(): Promise<void> {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const friendButton = this.container.querySelector('.friend-button') as HTMLButtonElement;
		if (!friendButton || friendButton.classList.contains('is-friend')) return;
		
		const isPending = friendButton.classList.contains('pending');
		
		friendButton.disabled = true;
		friendButton.textContent = 'Processing...';
		
		try {
			let newStatus;
			
			if (isPending) {
				await DbService.removeFriend(state.profile.id);
				newStatus = await DbService.getFriendship(state.profile.id);
				NotificationManager.showSuccess('Friend request cancelled');
			} else {
				await DbService.addFriend(state.profile.id);
				newStatus = await DbService.getFriendship(state.profile.id);
				NotificationManager.showSuccess('Friend request sent');
			}
			
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
			
			this.updateInternalState({ friendshipStatus: newStatus });
		} catch (error) {
			NotificationManager.showError("Error managing friend relationship");
			
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

	/**
	 * Handles friend request acceptance
	 */
	private handleFriendRequestAccepted = (): void => {
		this.checkPendingFriendRequests();
		this.renderView();
	}
	
	// =========================================
	// RENDERING
	// =========================================
	
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
					html`<div class="profile-content"></div>`
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
			
			const isAiUser = state.profile.username.toLowerCase() === 'ai';
			const avatarHtml = `
				<div class="profile-avatar">
					<img src="${isAiUser ? '/images/ai-avatar.jpg' : state.profile.avatarUrl}" alt="${state.profile.username}">
					${!isAiUser ? `<div class="online-status-indicator ${state.isUserOnline ? 'online' : ''}"></div>` : ''}
				</div>
			`;
			
			summaryElement.innerHTML = `
				${avatarHtml}
				<div class="profile-info">
					<h2 class="username">
						${state.profile.username}
						${isAiUser ? '<span class="bot-badge">BOT</span>' : ''}
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
							${isAiUser ? '' : `
							<button class="tab-button">
								Friends
								${isCurrentUserProfile && state.pendingFriends.length > 0 ? 
									`<span class="notification-dot"></span>` : 
									''
								}
							</button>
							`}
						</li>
						${isCurrentUserProfile && !isAiUser ? `
							<li class="tab-item ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
								<button class="tab-button">Settings</button>
							</li>
						` : !isAiUser ? `
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
	
	// =========================================
	// HELPER METHODS
	// =========================================
	
	/**
	 * Returns a promise that resolves on the next animation frame
	 */
	private waitForNextFrame(): Promise<void> {
		return new Promise(resolve => requestAnimationFrame(() => resolve()));
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
			NotificationManager.showError("Error checking if current user profile");
			return false;
		}
	}

	/**
	 * Checks pending friend requests
	 */
	private async checkPendingFriendRequests(): Promise<void> {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const isOwnProfile = this.isCurrentUserProfile(state.profile.id);
		if (!isOwnProfile) return;
		
		try {
			const friendsResponse = await DbService.getMyFriends();
			if (Array.isArray(friendsResponse)) {
				const pendingFriendships = friendsResponse.filter(friendship => !friendship.accepted);
				const incomingRequests = await Promise.all(
					pendingFriendships.map(friendship => 
						DbService.getFriendship(friendship.id)
							.then(friendshipStatus => ({ 
								friendship, 
								isIncoming: friendshipStatus && friendshipStatus.requesting !== state.profile!.id 
							}))
							.catch(() => ({ friendship, isIncoming: false }))
					)
				);
				
				const pendingFriends = incomingRequests
					.filter(({ isIncoming }) => isIncoming)
					.map(({ friendship }) => friendship);
				
				this.updateInternalState({ pendingFriends });
				this.updateNotificationDot(pendingFriends.length > 0);
			}
		} catch (error) {
			NotificationManager.showError('Could not fetch pending friend requests');
		}
	}
	
	/**
	 * Updates notification dot in the UI
	 */
	private updateNotificationDot(show: boolean): void {
		const friendsTab = this.container.querySelector('.tab-item[data-tab="friends"] .tab-button');
		if (!friendsTab) return;
		
		const existingDot = friendsTab.querySelector('.notification-dot');
		
		if (show) {
			if (!existingDot) {
				const notificationDot = document.createElement('span');
				notificationDot.className = 'notification-dot';
				friendsTab.appendChild(notificationDot);
			}
		} else if (existingDot) {
			existingDot.remove();
		}
	}
}
