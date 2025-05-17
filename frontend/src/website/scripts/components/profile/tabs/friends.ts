/**
 * Profile Friends Component
 * Displays user's friends list
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService } from '@website/scripts/utils';
import { UserProfile } from '@website/types';

interface Friend {
	id: string;
	username: string;
	avatarUrl: string;
	lastLogin?: Date;
}

interface ProfileFriendsState {
	profile: UserProfile | null;
	friends: Friend[];
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
				// Otherwise use the user ID to get their friends
				friendsResponse = await DbService.getFriendList(state.profile.id);
			}
			
			// Map the response to our Friend interface
			const friends = Array.isArray(friendsResponse) ? friendsResponse.map((friend: any) => ({
				id: friend.id || friend.user_id,
				username: friend.username,
				avatarUrl: friend.avatar_url || '/images/default-avatar.svg',
				lastLogin: friend.last_login ? new Date(friend.last_login) : undefined
			})) : [];
			
			this.updateInternalState({ friends, isLoading: false });
			this.render();
		} catch (error) {
			console.error('Error loading friends data:', error);
			this.updateInternalState({ friends: [], isLoading: false });
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
						<h3>Friends (${state.friends.length})</h3>
						${state.friends.length === 0 ?
							html`<p class="no-data">No friends added yet</p>` :
							html`
								<div class="friends-list">
									${state.friends.map(friend => html`
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