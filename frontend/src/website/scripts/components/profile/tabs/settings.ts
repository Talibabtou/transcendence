/**
 * Profile Settings Component
 * Allows users to update their profile settings
 */
import { Component } from '@website/scripts/components';
import { html, render, DbService, appState, ApiError } from '@website/scripts/utils';
import { UserProfile, ProfileSettingsState } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import { AppStateManager } from '@website/scripts/utils/app-state';

export class ProfileSettingsComponent extends Component<ProfileSettingsState> {
	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			isUploading: false,
			uploadSuccess: false,
			uploadError: null,
			saveSuccess: false,
			formData: {
				username: '',
				email: '',
				password: '',
				confirmPassword: '',
			},
			formErrors: {}
		});
		window.addEventListener('user:theme-updated', this.handleExternalThemeUpdate.bind(this));
	}
	
	private handleExternalThemeUpdate(event: Event): void {
		const customEvent = event as CustomEvent<{ userId: string, theme: string }>;
		if (customEvent.detail && this.getInternalState().profile) {
			if (customEvent.detail.userId === this.getInternalState().profile!.id) {
				this.render();
			}
		}
	}
	
	public setProfile(profile: UserProfile): void {
		const userAccentColor = AppStateManager.getUserAccentColor(profile.id);

		const formData = {
			username: profile.username || '',
			email: '',
			password: '',
			confirmPassword: '',
		};

		const updatedProfile = {
			...profile,
			preferences: {
				...profile.preferences,
				accentColor: userAccentColor
			}
		};

		DbService.getUser(profile.id)
			.then(user => {
				if (user && user.email) {
					this.updateInternalState({
						profile: updatedProfile,
						formData: {
							...formData,
							email: user.email
						}
					});
				} else {
					this.updateInternalState({ profile: updatedProfile, formData });
				}
			})
			.catch(() => {
				this.updateInternalState({ profile: updatedProfile, formData });
			});
	}
	
	render(): void {
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const availableColors = Object.entries(appState.getAvailableColors());
		const firstRowColors = availableColors.slice(0, 6);
		const secondRowColors = availableColors.slice(6);
		
		const currentColor = AppStateManager.getUserAccentColor(state.profile.id);
		
		const template = html`
			<div class="settings-content">
				<!-- Grid layout with 4 equal sections -->
				<div class="settings-grid">
					<!-- Section 1: Profile Picture -->
					<div class="settings-section">
						<h3 class="section-title">Profile Picture</h3>
						<div class="profile-picture-container">
							<div class="current-picture">
								<img src="${state.profile.avatarUrl}" alt="${state.profile.username}" />
							</div>
							<div class="upload-controls">
								<label for="profile-picture-upload" class="upload-label">
									Choose File
									<input 
										type="file" 
										id="profile-picture-upload" 
										accept=".jpg,.jpeg,.png,.svg"
										onchange=${(e: Event) => this.handleFileChange(e)}
									/>
								</label>
								<div class="upload-info">
									${state.isUploading ? html`<span class="uploading">Uploading...</span>` : ''}
									${state.uploadSuccess ? html`<span class="upload-success">Upload successful!</span>` : ''}
									${state.uploadError ? html`<span class="upload-error">${state.uploadError}</span>` : ''}
									<p class="upload-hint">Supported formats: JPG, JPEG, PNG, SVG</p>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Section 2: Accent Color -->
					<div class="settings-section">
						<h3 class="section-title">Accent Color</h3>
						<div class="player-color-selection settings-color-selection">
							<div class="color-picker">
								<div class="color-row">
									${firstRowColors.map(([colorName, colorHex]) => html`
										<div 
											class="color-option ${colorHex.toLowerCase() === currentColor.toLowerCase() ? 'selected' : ''}"
											style="background-color: ${colorHex}"
											onClick=${() => this.handleColorSelect(colorHex)}
											title="${colorName}"
										></div>
									`)}
								</div>
								<div class="color-row">
									${secondRowColors.map(([colorName, colorHex]) => html`
										<div 
											class="color-option ${colorHex.toLowerCase() === currentColor.toLowerCase() ? 'selected' : ''}"
											style="background-color: ${colorHex}"
											onClick=${() => this.handleColorSelect(colorHex)}
											title="${colorName}"
										></div>
									`)}
								</div>
							</div>
						</div>
					</div>
					
					<!-- Section 3: Account Information -->
					<div class="settings-section">
						<h3 class="section-title">Account Information</h3>
						<!-- Username -->
						<div class="form-group">
							<label for="username">Username</label>
							<input 
								type="text" 
								id="username" 
								name="username" 
								value=${state.formData.username}
								onchange=${(e: Event) => this.handleInputChange(e)}
							/>
							${state.formErrors.username ? 
								html`<div class="form-error">${state.formErrors.username}</div>` : ''}
						</div>
						
						<!-- Email -->
						<div class="form-group">
							<label for="email">Email</label>
							<input 
								type="email" 
								id="email" 
								name="email" 
								value=${state.formData.email}
								onchange=${(e: Event) => this.handleInputChange(e)}
							/>
							${state.formErrors.email ? 
								html`<div class="form-error">${state.formErrors.email}</div>` : ''}
						</div>
					</div>
					
					<!-- Section 4: Change Password -->
					<div class="settings-section">
						<h3 class="section-title">Change Password</h3>
						<!-- New Password -->
						<div class="form-group">
							<label for="password">New Password</label>
							<input 
								type="password" 
								id="password" 
								name="password" 
								value=${state.formData.password}
								onchange=${(e: Event) => this.handleInputChange(e)}
							/>
							${state.formErrors.password ? 
								html`<div class="form-error">${state.formErrors.password}</div>` : ''}
						</div>
						
						<!-- Confirm Password -->
						<div class="form-group">
							<label for="confirmPassword">Confirm Password</label>
							<input 
								type="password" 
								id="confirmPassword" 
								name="confirmPassword" 
								value=${state.formData.confirmPassword}
								onchange=${(e: Event) => this.handleInputChange(e)}
							/>
							${state.formErrors.confirmPassword ? 
								html`<div class="form-error">${state.formErrors.confirmPassword}</div>` : ''}
						</div>
					</div>
				</div>
				
				<!-- Save Button - Centered Below All Sections -->
				<form class="settings-form" onsubmit=${(e: Event) => this.handleSubmit(e)}>
					<div class="form-actions">
						<button type="submit" class="save-settings-button">
							Save Changes
						</button>
						${state.saveSuccess ? html`<span class="save-success-icon">✓</span>` : ''}
						${state.formErrors.form ? html`<div class="form-error save-error">${state.formErrors.form}</div>` : ''}
					</div>
				</form>
			</div>
		`;
		
		render(template, this.container);
	}
	
	// Handle file upload for profile picture
	private handleFileChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (file) {
			const state = this.getInternalState();
			
			// Validate file type
			const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
			if (!validTypes.includes(file.type)) {
				this.updateInternalState({
					uploadError: 'Invalid file type. Please use JPG, PNG, or SVG.',
					uploadSuccess: false
				});
				return;
			}
			
			// Validate file size (max 2MB)
			if (file.size > 2 * 1024 * 1024) {
				this.updateInternalState({
					uploadError: 'File too large. Maximum size is 2MB.',
					uploadSuccess: false
				});
				return;
			}
			
			// Start upload
			this.updateInternalState({
				isUploading: true,
				uploadError: null,
				uploadSuccess: false
			});
			
			// Create a new file with user ID as the name
			const fileExtension = file.name.split('.').pop();
			const newFileName = `${state.profile?.id}.${fileExtension}`;
			
			// In a real implementation, we would use FormData to upload to server
			// For our mock, we'll use FileReader to simulate upload
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result;
				if (result && state.profile) {
					// Update db with new profile picture URL
					const newAvatarUrl = `/images/${newFileName}`;
					
					// Simulate server-side upload success
					setTimeout(() => {
						// Update user profile in database
						DbService.updateProfilePicture(state.profile!.id, newAvatarUrl)
						.then(() => {
							// Update local state
							this.updateInternalState({
								isUploading: false,
								uploadSuccess: true,
								profile: {
									...state.profile!,
									avatarUrl: newAvatarUrl
								}
							});
							
							// Update AppState to propagate changes to all components
							appState.updateUserData({
								profilePicture: newAvatarUrl
							});
							
							// Update global game state for player avatars
							appState.setPlayerAvatar(state.profile!.id, newAvatarUrl);
							
							// Trigger profile summary refresh
							this.triggerProfileRefresh();
							
							this.render();
						})
						.catch(error => {
							if (error instanceof ApiError) {
								if (error.isErrorCode(ErrorCodes.INVALID_TYPE)) {
									this.updateInternalState({
										isUploading: false,
										uploadError: 'Invalid image format'
									});
								} else if (error.isErrorCode(ErrorCodes.NO_FILE_PROVIDED)) {
									this.updateInternalState({
										isUploading: false,
										uploadError: 'No file provided'
									});
								} else {
									this.updateInternalState({
										isUploading: false,
										uploadError: `Upload failed: ${error.message}`
									});
								}
							} else {
								this.updateInternalState({
									isUploading: false,
									uploadError: `Upload failed: ${error.message}`
								});
							}
						});
					}, 1000); // Simulate upload delay
				}
			};
			
			reader.onerror = () => {
				this.updateInternalState({
					isUploading: false,
					uploadError: 'Error reading file.'
				});
			};
			
			reader.readAsDataURL(file);
		}
	}
	
	// Handle color selection
	private handleColorSelect(colorHex: string): void {
		const state = this.getInternalState();
		if (!state.profile) return;

		AppStateManager.setUserAccentColor(state.profile.id, colorHex);
		
		// For current user (Player 1 equivalent), also update the session slot color.
		appState.setPlayerAccentColor(1, colorHex, state.profile.id);

		// No need to call appState.updatePlayerTheme here, as setUserAccentColor is the new source of truth.
		// No need to directly update this.updateInternalState({ profile: updatedProfile }) here
		// because the 'user:theme-updated' event + handleExternalThemeUpdate + this.render() will handle it.
	}
	
	// Handle form input changes
	private handleInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const { name, value } = input;
		
		// Update form data
		this.updateInternalState({
			formData: {
				...this.getInternalState().formData,
				[name]: value
			}
		});
	}
	
	// Handle form submission
	private handleSubmit(event: Event): void {
		event.preventDefault();
		
		const state = this.getInternalState();
		if (!state.profile) return;
		
		// Validate form
		const errors: { [key: string]: string } = {};
		
		// Username validation
		if (!state.formData.username) {
			errors.username = 'Username is required';
		} else if (state.formData.username.length < 3) {
			errors.username = 'Username must be at least 3 characters';
		}
		
		// Email validation
		if (state.formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.formData.email)) {
			errors.email = 'Please enter a valid email address';
		}
		
		// Password validation
		if (state.formData.password || state.formData.confirmPassword) {
			if (state.formData.password.length < 6) {
				errors.password = 'Password must be at least 6 characters';
			}
			
			if (state.formData.password !== state.formData.confirmPassword) {
				errors.confirmPassword = 'Passwords do not match';
			}
		}
		
		// If there are errors, update state and stop
		if (Object.keys(errors).length > 0) {
			this.updateInternalState({ formErrors: errors });
			return;
		}
		
		// Clear any previous errors
		this.updateInternalState({ formErrors: {} });
		
		// Prepare update data
		const updateData: any = {};
		
		// Only include fields that have changed or are being set
		if (state.formData.username !== state.profile.username) {
			updateData.username = state.formData.username;
		}
		
		// Send email if it's provided in the form.
		// The backend controller auth.controller.ts checks `if (email)` before updating.
		if (state.formData.email) {
			// To send email only if it changed from initial, you'd need to store initialEmail.
			// Current logic sends it if non-empty. Assuming this is fine.
			updateData.email = state.formData.email;
		}
		
		// Send password if it's provided in the form.
		if (state.formData.password) {
			updateData.password = state.formData.password;
		}
		
		// If nothing has changed, don't make an API call
		if (Object.keys(updateData).length === 0) {
			// Optionally, show a message "No changes to save"
			this.updateInternalState({ saveSuccess: true, formErrors: { form: 'No changes detected.' } });
			setTimeout(() => {
				this.updateInternalState({ saveSuccess: false, formErrors: { form: undefined } });
			}, 2000);
			return;
		}
		
		// Update user data in database
		DbService.updateUser(state.profile.id, updateData)
			.then((updatedUser) => {
				// Assuming updatedUser is the User object returned by the server
				const updatedProfile = {
					...state.profile!,
					username: updatedUser.username
				};
				
				this.updateInternalState({
					profile: updatedProfile,
					formData: {
						...state.formData,
						username: updatedUser.username,
						email: updatedUser.email || '',
						password: '',
						confirmPassword: ''
					},
					saveSuccess: true,
					formErrors: { form: undefined }
				});
				
				// Update AppState
				appState.updateUserData({
					username: updatedUser.username,
					email: updatedUser.email
				});
				
				// Update global game state for player names
				appState.setPlayerName(state.profile!.id, updatedUser.username);
				
				// Update auth user in localStorage/sessionStorage
				this.updateAuthUserInStorage(updatedUser);
				
				// Trigger profile summary refresh
				this.triggerProfileRefresh();
				
				// Set timeout to hide success indicator after 2 seconds
				setTimeout(() => {
					this.updateInternalState({
						saveSuccess: false
					});
				}, 2000);
				
				this.render();
			})
			.catch(error => {
				const currentFormErrors = { ...state.formErrors };
				if (error instanceof ApiError) {
					switch(error.code) {
						case ErrorCodes.SQLITE_CONSTRAINT:
							currentFormErrors.form = 'Username or email already in use';
							break;
						case ErrorCodes.INVALID_FIELDS:
							currentFormErrors.form = 'Invalid user information provided';
							break;
						case ErrorCodes.PLAYER_NOT_FOUND:
							currentFormErrors.form = 'User not found';
							break;
						default:
							currentFormErrors.form = `Failed to update profile: ${error.message}`;
					}
				} else {
					currentFormErrors.form = `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
				this.updateInternalState({ formErrors: currentFormErrors, saveSuccess: false });
			});
	}
	
	// Helper method to update auth user in storage
	private updateAuthUserInStorage(updatedUser: any): void {
		// Get current auth user from storage
		const authUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (authUserJson) {
			try {
				const authUser = JSON.parse(authUserJson);
				// Update relevant fields
				const updatedAuthUser = {
					...authUser,
					pseudo: updatedUser.username,
					username: updatedUser.username,
					email: updatedUser.email || authUser.email
				};
				
				// Save back to the same storage
				if (localStorage.getItem('auth_user')) {
					localStorage.setItem('auth_user', JSON.stringify(updatedAuthUser));
				} else if (sessionStorage.getItem('auth_user')) {
					sessionStorage.setItem('auth_user', JSON.stringify(updatedAuthUser));
				}
			} catch (error) {
				console.error('Error updating auth user in storage:', error);
			}
		}
	}
	
	// Helper method to trigger profile summary refresh
	private triggerProfileRefresh(): void {
		// Dispatch a custom event that the profile component can listen for
		// This event may still be useful if other parts of the profile summary
		// not directly handled by this settings tab need to react to general data updates.
		const event = new CustomEvent('profile-data-updated');
		document.dispatchEvent(event);
		
		// Also try to find and refresh the profile component directly
		const profileComponent = document.querySelector('.profile-component');
		if (profileComponent && profileComponent.parentElement) {
			// This assumes the profile component has a refresh or reload method
			// This is likely still fine for username/avatar changes from settings.
			const event = new CustomEvent('refresh-profile-data');
			profileComponent.dispatchEvent(event);
		}
	}
	
	destroy(): void {
		window.removeEventListener('user:theme-updated', this.handleExternalThemeUpdate.bind(this));
		super.destroy();
	}
}
