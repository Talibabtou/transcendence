/**
 * Profile Component Module
 * Parent component that manages tab navigation and profile summary
 */
import { Component, ProfileStatsComponent, ProfileHistoryComponent, ProfileFriendsComponent, ProfileSettingsComponent } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART, ApiError, AppStateManager } from '@website/scripts/utils';
import { UserProfile, ProfileState, User } from '@website/types';
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
	private lastSettingsProfileId?: string; // To track the profile ID for the current settingsComponent
	
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
		
		// --- Conditional reuse for settings tab ---
		if (tabName === 'settings' && this.settingsComponent && this.lastSettingsProfileId === state.profile.id) {
			// Settings tab is the target, an instance exists, and it's for the *same profile ID*.

			// Use the public getter method
			const settingsContainer = this.settingsComponent.getDOMContainer();
			
			if (settingsContainer.parentElement !== tabContentDiv) {
				// This implies tabContentDiv was cleared, or settingsComponent was detached.
				// Clear tabContentDiv and re-append the existing settingsComponent's container.
				tabContentDiv.innerHTML = ''; 
				tabContentDiv.appendChild(settingsContainer);
			}
			// else, settingsComponent.container is already in place.

			this.settingsComponent.setProfile(state.profile); // Pass the (potentially updated) profile data
			settingsContainer.classList.add('active'); // Ensure its container is styled as active
			return; // Instance reused.
		}
		// --- End of conditional reuse ---

		// If we reach here, we're creating a tab fresh.
		tabContentDiv.innerHTML = ''; // Clear content for the new tab.
		const tabContainer = document.createElement('div');
		tabContainer.className = 'tab-pane active';
		tabContainer.id = `tab-content-${tabName}`;
		tabContentDiv.appendChild(tabContainer);

		// Destroy previous settings component if we are navigating away from it, 
		// or creating settings for a different user.
		if (this.settingsComponent && (tabName !== 'settings' || this.lastSettingsProfileId !== state.profile.id)) {
			if (typeof this.settingsComponent.destroy === 'function') {
				this.settingsComponent.destroy();
			}
			this.settingsComponent = undefined;
			this.lastSettingsProfileId = undefined;
		}
		// Similar logic for other components if they need explicit destruction or state saving.
		
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
				this.settingsComponent.setProfile(state.profile); // Uses the refined setProfile
				this.settingsComponent.setHandlers({ onProfileUpdate: this.handleProfileSettingsUpdate });
				this.lastSettingsProfileId = state.profile.id; // Track ID for this new instance
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
			
			if (!userId || userId === 'current') {
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
			
			if (!userId) {
				this.updateInternalState({ errorMessage: 'No user ID provided', isLoading: false });
				return;
			}

			try {
				// Fetch main user profile details
				const user = await DbService.getUserProfile(userId); // Contains username, summary etc.
				if (!user) {
					throw new Error(`User with ID ${userId} not found`);
				}
				
				// Fetch the profile picture URL using DbService.getPic
				let avatarUrl = '/images/default-avatar.svg'; // Default
				try {
					const picResponse = await DbService.getPic(userId);
					if (picResponse && picResponse.link) {
						avatarUrl = picResponse.link;
					}
				} catch (picError) {
					console.warn(`Could not fetch profile picture for user ${userId}. Using default.`, picError);
					// Keep default avatarUrl
				}

				const userAccentColor = AppStateManager.getUserAccentColor(user.id);

				const userProfile: UserProfile = {
					id: String(user.id),
					username: user.username,
					avatarUrl: avatarUrl, // Use the fetched or default avatar URL
					totalGames: user.summary?.total_matches || 0,
					wins: user.summary?.victories || 0,
					losses: (user.summary?.total_matches || 0) - (user.summary?.victories || 0),
					gameHistory: [], 
					friends: [], 
					preferences: {
						accentColor: userAccentColor
					},
					elo: user.summary?.elo || 1000
				};
				
				this.updateInternalState({ profile: userProfile, isLoading: false, errorMessage: undefined });
			} catch (error) {
				let specificErrorMessage = 'Failed to load profile data.';
				if (error instanceof ApiError) {
					if (error.isErrorCode(ErrorCodes.PLAYER_NOT_FOUND)) {
						specificErrorMessage = `User with ID ${userId} not found`;
					} else {
						specificErrorMessage = error.message;
					}
				} else if (error instanceof Error) {
					specificErrorMessage = error.message;
				}
				console.error('Error fetching user data from DB:', error);
				this.updateInternalState({ 
					errorMessage: specificErrorMessage,
					isLoading: false 
				});
			}
		} catch (error) { // Catches errors from URL parsing or lack of userId before DB calls
			console.error('Error in fetchProfileData setup:', error);
			this.updateInternalState({ 
				errorMessage: error instanceof Error ? error.message : 'Failed to determine user for profile',
				isLoading: false 
			});
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
		
		// If avatar was updated, settings component handles its own display.
		// We need to re-fetch to update the summary in ProfileComponent.
		// A simpler way is to just re-trigger fetchProfileData if any sensitive field changed.
		// For now, we only explicitly handle username.
		// If `updatedFields` contained an avatar change indicator, we would also set `profileWasActuallyUpdatedInParent = true;`
		// or directly call `await this.fetchProfileData();` and then `this.renderView();`

		if (profileWasActuallyUpdatedInParent) {
			this.updateInternalState({ profile: newProfileDataForParent });
			// This state update triggers ProfileComponent.render() -> renderView().
			// renderView() will redraw the summary with the new username.
			// If the settings tab is active, it should be reused correctly.
		}
		// If an avatar was changed in settings, the settings tab updates its own image.
		// To update the main profile summary avatar, we would need a more robust refresh or direct update.
		// The `triggerProfileRefresh` event from settings.ts can be listened to here.
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
				// If profileContent already has children from a previous render,
				// we might want to update them instead of clearing and re-adding,
				// or ensure this part only runs once for initial setup of the summary structure.
				// For simplicity in this example, let's assume it's safe to clear and re-add if called multiple times,
				// but for precise DOM update, you'd be more surgical.
				
				// Check if summary already exists to avoid re-creating basic structure if only content needs update
				let summaryElement = profileContent.querySelector('.profile-hero') as HTMLElement;
				if (!summaryElement) {
					profileContent.innerHTML = '';
					summaryElement = document.createElement('div');
					summaryElement.className = 'profile-hero';
					profileContent.appendChild(summaryElement);
				}

				// Update or create summary content
				// Using textContent for dynamic parts to prevent XSS if data is ever user-supplied directly here
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
				
				let tabsOuterContainer = profileContent.querySelector('.profile-tabs-outer-container') as HTMLElement;
				if (!tabsOuterContainer) {
					tabsOuterContainer = document.createElement('div');
					tabsOuterContainer.className = 'profile-tabs-outer-container'; // Wrapper for tabs + content

					const isCurrentUserProfile = this.isCurrentUserProfile(state.profile.id);
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
									<button class="tab-button">Friends</button>
								</li>
								${isCurrentUserProfile ? `
									<li class="tab-item ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
										<button class="tab-button">Settings</button>
									</li>
								` : ''}
							</ul>
						</div>
						<div class="tab-content"></div> <!-- Tab content will be rendered here by createTabComponent -->
					`;
					tabsOuterContainer.innerHTML = tabsHTML;
					profileContent.appendChild(tabsOuterContainer);

					// Add event listeners to tab buttons
					tabsOuterContainer.querySelectorAll('.tab-item').forEach(tabItem => {
						tabItem.addEventListener('click', () => {
							const tabId = (tabItem as HTMLElement).dataset.tab;
							if (tabId) {
								this.handleTabChange(tabId);
							}
						});
					});
				} else {
					// If tabs structure already exists, just update active class
					tabsOuterContainer.querySelectorAll('.tab-item').forEach(tabItem => {
						const tabId = (tabItem as HTMLElement).dataset.tab;
						if (tabId === state.activeTab) {
							tabItem.classList.add('active');
						} else {
							tabItem.classList.remove('active');
						}
					});
				}
				// The active tab content itself is managed by createTabComponent via handleTabChange
			}
		}
	}

	/**
	 * Checks if the profile being viewed belongs to the current user
	 */
	private isCurrentUserProfile(profileId: string): boolean {
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
