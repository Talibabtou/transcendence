/**
 * Profile Friends Component
 * Displays user's friends list
 */
import { Component } from '@website/scripts/components';
import { html, render } from '@website/scripts/utils';
import { UserProfile } from '@shared/types';

interface ProfileFriendsState {
	profile: UserProfile | null;
	handlers: {
		onPlayerClick: (username: string) => void;
	};
}

export class ProfileFriendsComponent extends Component<ProfileFriendsState> {
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			handlers: {
				onPlayerClick: () => {}
			}
		});
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ profile });
	}
	
	public setHandlers(handlers: { onPlayerClick: (username: string) => void }): void {
		this.updateInternalState({ handlers });
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const template = html`
			<div class="friends-container">
				<h3>Friends</h3>
				${state.profile.friends.length === 0 ?
					html`<p class="no-data">No friends added yet</p>` :
					html`
						<div class="friends-list">
							${state.profile.friends.map(friend => html`
								<div class="friend-card" onClick=${() => state.handlers.onPlayerClick(friend.username)}>
									<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username}">
									<div class="friend-info">
										<span class="friend-name">${friend.username}</span>
										<span class="friend-last-login">
											Last seen: ${friend.lastLogin ? this.formatLastSeen(friend.lastLogin) : 'Unknown'}
										</span>
									</div>
								</div>
							`)}
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