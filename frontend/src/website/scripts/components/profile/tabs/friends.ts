import { Component } from '@website/scripts/components';
import { DbService, html, render } from '@website/scripts/services';
import { UserProfile } from '@website/types';
import { IReplyGetFriend } from '@shared/types/friends.types';

interface Friend extends IReplyGetFriend {
	requesting: string;
}

interface ProfileFriendsState {
	profile: UserProfile | null;
	friends: IReplyGetFriend[];
	pendingFriends: Friend[];
	acceptedFriends: IReplyGetFriend[];
	isLoading: boolean;
	isCurrentUser: boolean;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
	dataLoadInProgress: boolean;
	currentUserId: string;
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
			dataLoadInProgress: false,
			currentUserId: ''
		});
		
		// Get current user ID once during initialization
		this.initCurrentUser();
	}
	
	private initCurrentUser(): void {
		const currentUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (currentUserJson) {
			try {
				const currentUser = JSON.parse(currentUserJson);
				this.updateInternalState({ currentUserId: currentUser.id.toString() });
			} catch (error) {
				console.error('Error parsing current user data:', error);
			}
		}
	}
	
	public setProfile(profile: UserProfile): void {
		const state = this.getInternalState();
		const isCurrentUser = state.currentUserId === profile.id;
		
		this.updateInternalState({ 
			profile,
			isCurrentUser
		});
		
		if (!state.dataLoadInProgress) {
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
		
		try {
			// Load friends list
			let friendsResponse: IReplyGetFriend[];
			if (state.isCurrentUser) {
				// If viewing own profile, use the "my friends" endpoint
				friendsResponse = await DbService.getMyFriends();
			} else {
				// Otherwise use the user ID to get their friends - will only return accepted friends
				friendsResponse = await DbService.getFriendList(state.profile.id);
			}
			
			if (Array.isArray(friendsResponse)) {
				console.log("Friendship data:", friendsResponse);
				
				// Simply filter the friends based on accepted status
				const pendingFriends = [];
				const acceptedFriends = [];
				
				// Process each friend to add requesting information for pending requests
				for (const friend of friendsResponse) {
					if (friend.accepted) {
						acceptedFriends.push(friend as Friend);
					} else {
						// For pending requests, get the friendship status to determine requester
						const friendshipStatus = await DbService.getFriendship(friend.id);
						const enrichedFriend = {
							...friend,
							requesting: friendshipStatus?.requesting || ''
						};
						pendingFriends.push(enrichedFriend);
					}
				}
				
				this.updateInternalState({
					pendingFriends,
					acceptedFriends,
					friends: friendsResponse,
					isLoading: false,
					dataLoadInProgress: false
				});
			} else {
				this.updateInternalState({
					pendingFriends: [],
					acceptedFriends: [],
					friends: [],
					isLoading: false,
					dataLoadInProgress: false
				});
			}
			
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
			await this.loadFriendsData();
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
												<img class="friend-avatar" src="${friend.pic === 'default' ? '/images/default-avatar.svg' : friend.pic ? friend.pic : '/images/default-avatar.svg'}" alt="${friend.username || 'Unknown'}"/>
												<div class="friend-details">
													<span class="friend-name">${friend.username || 'Unknown User'}</span>
												</div>
											</div>
											${state.isCurrentUser ? 
												(friend.requesting === state.currentUserId
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
													<img class="friend-avatar" src="${friend.pic === 'default' ? '/images/default-avatar.svg' : friend.pic ? friend.pic : '/images/default-avatar.svg'}" alt="${friend.username || 'Unknown'}"/>
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
