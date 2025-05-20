/**
 * Profile Friends Component
 * Displays user's friends list with pending and accepted sections
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService } from '@website/scripts/utils';
import { UserProfile } from '@website/types';

interface Friend {
	id: string;
	username: string;
	avatarUrl: string;
	accepted: boolean;
	isRequester?: boolean;
}

interface ProfileFriendsState {
	profile: UserProfile | null;
	friends: Friend[];
	pendingFriends: Friend[];
	acceptedFriends: Friend[];
	isLoading: boolean;
	isCurrentUser: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
	dataLoadInProgress: boolean;
}

export class ProfileFriendsComponent extends Component<ProfileFriendsState> {
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			friends: [],
			pendingFriends: [],
			acceptedFriends: [],
			isLoading: false,
			isCurrentUser: false,
			handlers: {
				onPlayerClick: () => {}
			},
			dataLoadInProgress: false
		});
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ profile });
		if (!this.getInternalState().dataLoadInProgress) {
			this.loadFriendsData();
		}
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}
	
	public setPendingFriends(pendingFriends: Friend[]): void {
		this.updateInternalState({ pendingFriends });
	}
	
	private async loadFriendsData(): Promise<void> {
		const state = this.getInternalState();
		if (!state.profile || state.dataLoadInProgress) return;
		
		this.updateInternalState({ 
			isLoading: true,
			dataLoadInProgress: true
		});
		
		// Check if this is the current user's profile
		const currentUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		let currentUserId = '';
		
		if (currentUserJson) {
			try {
				const currentUser = JSON.parse(currentUserJson);
				currentUserId = currentUser.id.toString();
				const isCurrentUser = currentUserId === state.profile.id;
				this.updateInternalState({ isCurrentUser });
			} catch (error) {
				console.error('Error parsing current user data:', error);
			}
		}
		
		try {
			// Load friends list
			let friendsResponse;
			if (state.isCurrentUser) {
				// If viewing own profile, use the "my friends" endpoint
				friendsResponse = await DbService.getMyFriends();
			} else {
				// Otherwise use the user ID to get their friends - will only return accepted friends
				friendsResponse = await DbService.getFriendList(state.profile.id);
			}
			
			// Process raw friendship data
			const pendingFriends: Friend[] = [];
			const acceptedFriends: Friend[] = [];
			
			if (Array.isArray(friendsResponse)) {
				console.log("Friendship data:", friendsResponse);
				
				// Process each friendship and fetch additional user data
				for (const friendship of friendsResponse) {
					try {
						// Make sure we have a valid ID
						if (!friendship.id) {
							console.error("Missing ID in friendship:", friendship);
							continue;
						}
						
						// Get username using the getUsernameById method
						console.log(`Fetching username for friend ID: ${friendship.id}`);
						const username = await DbService.getUsernameById(friendship.id);
						console.log(`Username received: ${username} for ID: ${friendship.id}`);
						
						// Get profile picture
						let avatarUrl = '/images/default-avatar.svg';
						try {
							const picResponse = await DbService.getPic(friendship.id);
							if (picResponse?.link) {
								avatarUrl = picResponse.link;
							}
						} catch (picError) {
							console.warn(`Could not fetch profile picture for user ${friendship.id}, using default.`);
						}
						
						// Check if this user is the requester for pending friendships
						let isRequester = false;
						if (!friendship.accepted) {
							// Fetch friendship status to get requester info
							const friendshipStatus = await DbService.getFriendship(friendship.id);
							if (friendshipStatus && friendshipStatus.isRequester !== undefined) {
								isRequester = friendshipStatus.isRequester;
							}
						}
						
						const friend: Friend = {
							id: friendship.id,
							username: username,
							avatarUrl: avatarUrl,
							accepted: friendship.accepted,
							isRequester
						};
						
						// Categorize as pending or accepted
						if (friendship.accepted) {
							acceptedFriends.push(friend);
						} else {
							pendingFriends.push(friend);
						}
					} catch (userError) {
						console.error(`Failed to fetch details for user ${friendship.id}:`, userError);
					}
				}
			}
			
			this.updateInternalState({
				pendingFriends,
				acceptedFriends,
				friends: [...pendingFriends, ...acceptedFriends],
				isLoading: false,
				dataLoadInProgress: false
			});
			
			this.render();
		} catch (error) {
			console.error('Error loading friends data:', error);
			this.updateInternalState({
				pendingFriends: [],
				acceptedFriends: [],
				friends: [],
				isLoading: false,
				dataLoadInProgress: false
			});
			this.render();
		}
	}
	
	private async handleRemoveFriend(friendId: string): Promise<void> {
		try {
			await DbService.removeFriend(friendId);
			await this.loadFriendsData(); // Reload data after removing
		} catch (error) {
			console.error('Error removing friend:', error);
		}
	}
	
	private async handleAcceptFriend(friendId: string): Promise<void> {
		try {
			await DbService.acceptFriendRequest(friendId);
			await this.loadFriendsData();
		} catch (error) {
			console.error('Error accepting friend request:', error);
		}
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const template = html`
			<div class="friends-container">
				${state.isLoading ? 
					html`<p class="loading-text">Loading friends data...</p>` :
					html`
						${state.isCurrentUser && state.pendingFriends.length > 0 ? html`
							<div class="friends-section pending-friends-section">
								<h3>Pending Requests (${state.pendingFriends.length})</h3>
								<div class="friends-list">
									${state.pendingFriends.map(friend => html`
										<div class="friend-card pending">
											<div class="friend-info" onClick=${() => state.handlers.onPlayerClick(friend.username)}>
												<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username || 'Unknown'}"/>
												<div class="friend-details">
													<span class="friend-name">${friend.username || 'Unknown User'}</span>
												</div>
											</div>
											${friend.isRequester !== undefined ? 
												(friend.isRequester === true
													? html`<button class="cancel-friend-button" onClick=${() => this.handleRemoveFriend(friend.id)}>Cancel</button>` 
													: html`<button class="accept-friend-button" onClick=${() => this.handleAcceptFriend(friend.id)}>Accept</button>`)
												: ''}
										</div>
									`)}
								</div>
							</div>
						` : ''}
						
						<div class="friends-section accepted-friends-section">
							<h3>Friends (${state.acceptedFriends.length})</h3>
							${state.acceptedFriends.length === 0 ?
								html`<p class="no-data">No friends added yet</p>` :
								html`
									<div class="friends-list">
										${state.acceptedFriends.map(friend => html`
											<div class="friend-card">
												<div class="friend-info" onClick=${() => state.handlers.onPlayerClick(friend.username)}>
													<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username || 'Unknown'}"/>
													<div class="friend-details">
														<span class="friend-name">${friend.username || 'Unknown User'}</span>
													</div>
												</div>
												${state.isCurrentUser ? html`
													<button class="remove-friend-button" onClick=${() => this.handleRemoveFriend(friend.id)}>Remove</button>
												` : ''}
											</div>
										`)}
									</div>
								`
							}
						</div>
					`
				}
			</div>
		`;
		
		render(template, this.container);
	}
}
