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
	lastLogin?: Date;
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
			}
		});
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ profile });
		this.loadFriendsData();
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}
	
	public setPendingFriends(pendingFriends: Friend[]): void {
		this.updateInternalState({ pendingFriends });
	}
	
	private async loadFriendsData(): Promise<void> {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		this.updateInternalState({ isLoading: true });
		
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
						
						// Get user details for this friend
						console.log(`Fetching user details for friend ID: ${friendship.id}`);
						const user = await DbService.getUser(friendship.id);
						console.log(`User details for ${friendship.id}:`, user);
						
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
						
						const friend: Friend = {
							id: friendship.id,
							username: user.username || '',
							avatarUrl: avatarUrl,
							accepted: friendship.accepted,
							lastLogin: user.last_login ? new Date(user.last_login) : undefined
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
				isLoading: false
			});
			
			this.render();
		} catch (error) {
			console.error('Error loading friends data:', error);
			this.updateInternalState({
				pendingFriends: [],
				acceptedFriends: [],
				friends: [],
				isLoading: false
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
								<h3>Pending Friend Requests (${state.pendingFriends.length})</h3>
								<div class="friends-list">
									${state.pendingFriends.map(friend => html`
										<div class="friend-card pending">
											<div class="friend-info" onClick=${() => state.handlers.onPlayerClick(friend.username)}>
												<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username}">
												<div class="friend-details">
													<span class="friend-name">${friend.username}</span>
													<span class="friend-last-login">
														${friend.lastLogin ? this.formatLastSeen(friend.lastLogin) : ''}
													</span>
												</div>
											</div>
											<button class="cancel-friend-button" onClick=${() => this.handleRemoveFriend(friend.id)}>Cancel</button>
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
													<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username}">
													<div class="friend-details">
														<span class="friend-name">${friend.username}</span>
														<span class="friend-last-login">
															${friend.lastLogin ? this.formatLastSeen(friend.lastLogin) : ''}
														</span>
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
} 