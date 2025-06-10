import { Component } from '@website/scripts/components';
import { DbService, html, NotificationManager, render } from '@website/scripts/services';
import { UserProfile, ProfileFriendsState } from '@website/types';
import { IReplyGetFriend } from '@shared/types/friends.types';
import { escapeHtml } from '@website/scripts/utils/crypto';

export interface Friend extends IReplyGetFriend {
	requesting: string;
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
				onPlayerClick: () => {},
				onFriendRequestAccepted: () => {},
				onFriendRequestRefused: () => {}
			},
			dataLoadInProgress: false,
			currentUserId: ''
		});
		
		this.initCurrentUser();
	}
	
	// =========================================
	// INITIALIZATION
	// =========================================
	
	/**
	 * Initializes the current user from local or session storage
	 */
	private initCurrentUser(): void {
		const currentUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (currentUserJson) {
			const currentUser = JSON.parse(currentUserJson);
			this.updateInternalState({ currentUserId: currentUser.id });
		}
	}
	
	// =========================================
	// PUBLIC METHODS
	// =========================================
	
	/**
	 * Sets the profile to display friends for
	 * @param profile - The user profile to display
	 */
	public setProfile(profile: UserProfile): void {
		const state = this.getInternalState();
		if (state.profile?.id !== profile.id) {
			this.updateInternalState({ 
				profile,
				isCurrentUser: state.currentUserId === profile.id,
				pendingFriends: [],
				acceptedFriends: [],
				friends: []
			});
			
			if (!state.dataLoadInProgress) this.loadFriendsData();
		}
	}
	
	/**
	 * Sets handlers for component interactions
	 * @param handlers - Object containing event handlers
	 */
	public setHandlers(handlers: { 
		onPlayerClick: (username: string) => void; 
		onFriendRequestAccepted?: () => void;
		onFriendRequestRefused?: () => void;
	}): void {
		this.updateInternalState({ 
			handlers: {
				...this.getInternalState().handlers,
				...handlers
			}
		});
	}
	
	/**
	 * Sets the list of pending friends
	 * @param pendingFriends - Array of pending friend relationships
	 */
	public setPendingFriends(pendingFriends: Friend[]): void {
		this.updateInternalState({ pendingFriends });
	}
	
	/**
	 * Refreshes the friends data
	 */
	public refreshData(): void {
		const state = this.getInternalState();
		if (!state.dataLoadInProgress && state.profile) this.loadFriendsData();
	}
	
	// =========================================
	// DATA MANAGEMENT
	// =========================================
	
	/**
	 * Loads friends data from the database
	 */
	private async loadFriendsData(): Promise<void> {
		const state = this.getInternalState();
		if (!state.profile || state.dataLoadInProgress) return;
		
		this.updateInternalState({ dataLoadInProgress: true });
		
		try {
			const friendsResponse = state.isCurrentUser
				? await DbService.getMyFriends()
				: await DbService.getFriendList(state.profile.id);
			
			if (Array.isArray(friendsResponse)) {
				const pendingPromises: Promise<void>[] = [];
				const pendingFriends: Friend[] = [];
				const acceptedFriends: IReplyGetFriend[] = [];
				
				friendsResponse.forEach(friend => {
					if (friend.accepted) {
						acceptedFriends.push(friend);
					} else if (state.isCurrentUser) {
						pendingPromises.push(
							DbService.getFriendship(friend.id)
								.then(friendshipStatus => {
									pendingFriends.push({
										...friend,
										requesting: friendshipStatus?.requesting || ''
									});
								})
						);
					}
				});
				
				if (pendingPromises.length > 0) await Promise.all(pendingPromises);
				
				this.updateInternalState({
					pendingFriends,
					acceptedFriends,
					friends: friendsResponse,
					dataLoadInProgress: false
				});
			} else {
				this.updateInternalState({
					pendingFriends: [],
					acceptedFriends: [],
					friends: [],
					dataLoadInProgress: false
				});
			}
		} catch (error) {
			NotificationManager.showError('Failed to load friends data');
			this.updateInternalState({
				pendingFriends: [],
				acceptedFriends: [],
				friends: [],
				dataLoadInProgress: false
			});
		}
	}
	
	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Handles removing a friend
	 * @param friendId - ID of the friend to remove
	 */
	private async handleRemoveFriend(friendId: string): Promise<void> {
		try {
			await DbService.removeFriend(friendId);
			await this.loadFriendsData();
		} catch (error) {
			NotificationManager.showError('Failed to remove friend');
		}
	}
	
	/**
	 * Handles accepting a friend request
	 * @param friendId - ID of the friend request to accept
	 */
	private async handleAcceptFriend(friendId: string): Promise<void> {
		try {
			await DbService.acceptFriendRequest(friendId);
			await this.loadFriendsData();
			
			const { onFriendRequestAccepted } = this.getInternalState().handlers;
			if (onFriendRequestAccepted) onFriendRequestAccepted();
		} catch (error) {
			NotificationManager.showError('Failed to accept friend request');
		}
	}
	
	/**
	 * Handles refusing a friend request
	 * @param friendId - ID of the friend request to refuse
	 */
	private async handleRefuseFriendRequest(friendId: string): Promise<void> {
		try {
			await DbService.removeFriend(friendId);
			await this.loadFriendsData();
			
			const { onFriendRequestRefused } = this.getInternalState().handlers;
			if (onFriendRequestRefused) onFriendRequestRefused();
		} catch (error) {
			NotificationManager.showError('Failed to refuse friend request');
		}
	}
	
	// =========================================
	// RENDERING
	// =========================================
	
	/**
	 * Renders the friends component into its container
	 */
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
												<img class="friend-avatar" src="${friend.pic}" alt="${friend.username || 'Unknown'}"/>
												<div class="friend-details">
													<span class="friend-name">${escapeHtml(friend.username || 'Unknown User')}</span>
												</div>
											</div>
											${state.isCurrentUser ? 
												(friend.requesting === state.currentUserId
													? html`
														<button class="cancel-friend-button" onClick=${() => this.handleRemoveFriend(friend.id)}>Cancel</button>
													`
													: html`
														<div class="friend-actions">
															<button class="accept-friend-button icon-button" title="Accept" onClick=${() => this.handleAcceptFriend(friend.id)}>✓</button>
															<button class="refuse-friend-button icon-button" title="Refuse" onClick=${() => this.handleRefuseFriendRequest(friend.id)}>✗</button>
														</div>
													`)
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
													<img class="friend-avatar" src="${friend.pic}" alt="${friend.username || 'Unknown'}"/>
													<div class="friend-details">
														<span class="friend-name">${escapeHtml(friend.username || 'Unknown User')}</span>
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
