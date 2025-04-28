/**
 * Profile Settings Component
 * Allows users to update their profile settings
 */
import { Component } from '@website/scripts/components';
import { html, render, appState, AccentColor } from '@website/scripts/utils';
import { UserProfile } from '@shared/types';

interface ProfileSettingsState {
	profile: UserProfile | null;
	isEditing: boolean;
}

export class ProfileSettingsComponent extends Component<ProfileSettingsState> {
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			isEditing: false
		});
	}
	
	public setProfile(profile: UserProfile): void {
		this.updateInternalState({ profile });
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		// Get available colors from app state
		const availableColors = appState.getAvailableColors();
		const currentColor = appState.getAccentColor();
		
		const template = html`
			<div class="settings-content">
				<h4>Account Settings</h4>
				<form class="settings-form">
					<div class="form-group">
						<label for="username">Username</label>
						<input type="text" id="username" name="username" 
							value="${state.profile.username}" 
							disabled=${!state.isEditing}>
					</div>
					<div class="form-group">
						<label for="avatar">Avatar URL</label>
						<input type="text" id="avatar" name="avatar" 
							value="${state.profile.avatarUrl}" 
							disabled=${!state.isEditing}>
					</div>
					<div class="form-group">
						<label for="password">Change Password</label>
						<input type="password" id="password" name="password" 
							placeholder="New password" 
							disabled=${!state.isEditing}>
					</div>
					<div class="form-group">
						<label>Accent Color</label>
						<div class="color-picker">
							${Object.entries(availableColors).map(([colorName, colorHex]) => html`
								<div 
									class="color-option ${colorName === currentColor ? 'selected' : ''}"
									style="background-color: ${colorHex}"
									onClick=${() => this.handleColorSelect(colorName as AccentColor)}
									title="${colorName}"
								></div>
							`)}
						</div>
					</div>
					
					<div class="form-actions">
						<button type="button" class="edit-profile-button" 
							onClick=${() => this.toggleEditMode()}>
							${state.isEditing ? 'Cancel' : 'Edit Profile'}
						</button>
						${state.isEditing ? 
							html`<button type="button" class="save-settings-button" 
								onClick=${() => this.saveProfileChanges()}>
								Save Changes
							</button>` : 
							html``
						}
					</div>
				</form>
			</div>
		`;
		
		render(template, this.container);
	}
	
	private toggleEditMode(): void {
		this.updateInternalState({ isEditing: !this.getInternalState().isEditing });
		this.render();
	}
	
	private handleColorSelect(color: AccentColor): void {
		// Update app state
		appState.setAccentColor(color);
		// Re-render to show the selection
		this.render();
	}
	
	private saveProfileChanges(): void {
		const state = this.getInternalState();
		// Get form data
		const form = this.container.querySelector('.settings-form') as HTMLFormElement;
		if (!form || !state.profile) return;
		
		// Example of getting form values
		const username = (form.querySelector('[name="username"]') as HTMLInputElement)?.value;
		
		// Update state and exit edit mode
		if (username) {
			const updatedProfile = {
				...state.profile,
				username
			};
			
			this.updateInternalState({ 
				profile: updatedProfile,
				isEditing: false 
			});
		}
	}
} 