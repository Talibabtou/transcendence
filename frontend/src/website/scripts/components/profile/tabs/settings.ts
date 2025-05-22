import { Component } from '@website/scripts/components';
import { appState, hashPassword } from '@website/scripts/utils';
import { DbService, html, render, ApiError } from '@website/scripts/services';
import { UserProfile, ProfileSettingsState, User } from '@website/types';
import { ErrorCodes } from '@shared/constants/error.const';
import { AppStateManager } from '@website/scripts/utils/app-state';

export class ProfileSettingsComponent extends Component<ProfileSettingsState> {
	private onProfileUpdate?: (updatedFields: Partial<User>) => void;
	private initialDbUsername: string | null = null;
	private initialDbEmail: string | null = null;

	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			isUploading: false,
			uploadSuccess: false,
			uploadError: null,
			saveSuccess: false,
			noChangesMessage: null,
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
		const currentComponentState = this.getInternalState();
		const userAccentColor = AppStateManager.getUserAccentColor(profile.id);
		
		if (currentComponentState.profile?.id !== profile.id || this.initialDbUsername === null) {
			this.initialDbUsername = profile.username || '';
			this.initialDbEmail = null;
			
			this.updateInternalState({
				profile: {
					...profile,
					preferences: {
						...(profile.preferences || {}),
						accentColor: userAccentColor
					}
				}
			});
			
			if (profile.id) {
				Promise.all([
					DbService.getUser(profile.id),
					DbService.check2FAStatus()
				])
				.then(([userFromDb, twoFactorEnabled]) => {
					this.initialDbUsername = userFromDb.username;
					this.initialDbEmail = userFromDb.email || null;
					
					this.updateInternalState({
						profile: {
							...profile,
							username: userFromDb.username,
							twoFactorEnabled,
							preferences: {
								...(profile.preferences || {}),
								accentColor: userAccentColor
							}
						},
						formData: {
							username: userFromDb.username,
							email: userFromDb.email || '',
							password: '',
							confirmPassword: '',
						}
					});
					
					setTimeout(() => {
						const toggle = document.getElementById('twofa-toggle') as HTMLInputElement;
						if (toggle) toggle.checked = twoFactorEnabled;
					}, 0);
				})
				.catch(err => {
					console.warn('Error fetching user data:', err);
				});
			}
		} else if (userAccentColor !== currentComponentState.profile?.preferences?.accentColor) {
			this.updateInternalState({
				profile: {
					...currentComponentState.profile,
					preferences: {
						...(currentComponentState.profile.preferences || {}),
						accentColor: userAccentColor
					}
				}
			});
		}
	}
	
	public setHandlers(handlers: { onProfileUpdate?: (updatedFields: Partial<User>) => void }): void {
		if (handlers.onProfileUpdate) {
			this.onProfileUpdate = handlers.onProfileUpdate;
		}
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
				<div class="settings-grid">
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
										accept=".jpg,.jpeg,.png,.gif"
										onchange=${(e: Event) => this.handleFileChange(e)}
									/>
								</label>
								<div class="upload-info">
									${state.isUploading ? html`<span class="uploading">Uploading...</span>` : ''}
									${state.uploadSuccess ? html`<span class="upload-success">Upload successful!</span>` : ''}
									${state.uploadError ? html`<span class="upload-error">${state.uploadError}</span>` : ''}
									<p class="upload-hint">Supported formats: JPG, JPEG, PNG, GIF</p>
								</div>
							</div>
						</div>
					</div>
					
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
						
						<div class="security-options">
							<h4 class="section-title">2FA Authentication</h4>
							<div class="toggle-container">
								<label class="toggle-label">Enable Two-Factor Authentication</label>
								<div class="toggle-switch ${state.profile.twoFactorEnabled ? 'active' : ''}">
									<input 
										type="checkbox" 
										id="twofa-toggle" 
										${state.profile.twoFactorEnabled ? 'checked' : ''}
										onclick=${(e: Event) => this.handle2FAToggle(e)}
									/>
									<span class="toggle-slider"></span>
								</div>
							</div>
							${state.formErrors.twoFA ? html`<div class="form-error">${state.formErrors.twoFA}</div>` : ''}
						</div>
					</div>
					
					<div class="settings-section">
						<h3 class="section-title">Account Information</h3>
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
					
					<div class="settings-section">
						<h3 class="section-title">Change Password</h3>
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
				
				<form class="settings-form" onsubmit=${(e: Event) => this.handleSubmit(e)}>
					<div class="form-actions">
						<button type="submit" class="save-settings-button">
							Save Changes
						</button>
						${state.saveSuccess && !state.noChangesMessage ? html`<span class="save-success-icon">✓</span>` : ''}
						${state.formErrors.form && !state.noChangesMessage ? html`<div class="form-error save-error">${state.formErrors.form}</div>` : ''}
					</div>
					${state.noChangesMessage ? html`<div class="no-changes-message">${state.noChangesMessage}</div>` : ''}
				</form>
			</div>
		`;
		
		render(template, this.container);
	}
	
	/**
	 * Handle file upload for profile picture
	 */
	private handleFileChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (file) {
			const state = this.getInternalState();
			if (!state.profile) return;
			
			const validTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'];
			if (!validTypes.includes(file.type)) {
				this.updateInternalState({
					uploadError: 'Invalid file type. Please use JPG, JPEG, PNG, or GIF.',
					uploadSuccess: false,
					isUploading: false
				});
				return;
			}
			
			if (file.size > 1 * 1024 * 1024) { // 1MB
				this.updateInternalState({
					uploadError: 'File too large. Maximum size is 1MB.',
					uploadSuccess: false,
					isUploading: false
				});
				return;
			}
			
			this.updateInternalState({
				isUploading: true,
				uploadError: null,
				uploadSuccess: false
			});
			
			DbService.updateProfilePicture(file) 
				.then((response) => {
					this.updateInternalState({
						isUploading: false,
						uploadSuccess: true,
						uploadError: null,
						profile: {
							...this.getInternalState().profile!,
							avatarUrl: response.avatarUrl || this.getInternalState().profile!.avatarUrl
						}
					});
				})
				.catch(error => {
					let specificError = "Upload failed. Please try again.";
					if (error instanceof ApiError) {
						if (error.isErrorCode(ErrorCodes.INVALID_TYPE)) {
							specificError = 'Invalid image format';
						} else if (error.isErrorCode(ErrorCodes.NO_FILE_PROVIDED)) {
							specificError = 'No file provided for upload';
						} else {
							specificError = `Upload failed: ${error.message}`;
						}
					} else if (error instanceof Error) {
						specificError = error.message;
					}
					this.updateInternalState({
						isUploading: false,
						uploadError: specificError,
						uploadSuccess: false
					});
				});
		}
	}
	
	/**
	 * Handle color selection
	 */
	private handleColorSelect(colorHex: string): void {
		const state = this.getInternalState();
		if (!state.profile) return;

		AppStateManager.setUserAccentColor(state.profile.id, colorHex);
		
		appState.setPlayerAccentColor(1, colorHex, state.profile.id);
	}
	
	/**
	 * Handle form input changes
	 */
	private handleInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const { name, value } = input;
		
		this.updateInternalState({
			formData: {
				...this.getInternalState().formData,
				[name]: value
			}
		});
	}
	
	/**
	 * Handle form submission
	 */
	private async handleSubmit(event: Event): Promise<void> {
		event.preventDefault();
		
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const errors: { [key: string]: string } = {};
		
		if (!state.formData.username) {
			errors.username = 'Username is required';
		} else if (state.formData.username.length < 3) {
			errors.username = 'Username must be at least 3 characters';
		}
		
		if (state.formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.formData.email)) {
			errors.email = 'Please enter a valid email address';
		}
		
		if (state.formData.password || state.formData.confirmPassword) {
			if (state.formData.password.length < 6) {
				errors.password = 'Password must be at least 6 characters';
			}
			
			if (state.formData.password !== state.formData.confirmPassword) {
				errors.confirmPassword = 'Passwords do not match';
			}
		}
		
		if (Object.keys(errors).length > 0) {
			this.updateInternalState({ formErrors: errors, saveSuccess: false, noChangesMessage: null });
			return;
		}
		this.updateInternalState({ formErrors: {}, noChangesMessage: null });
		const updateData: Partial<User> = {};
		
		if (state.formData.username !== this.initialDbUsername) {
			updateData.username = state.formData.username;
		}
		if (state.formData.email !== this.initialDbEmail) {

			updateData.email = state.formData.email;
		}
		if (state.formData.password) {
			// Hash the password before sending to the database
			updateData.password = await hashPassword(state.formData.password);
		}
		
		if (Object.keys(updateData).length === 0) {
			this.updateInternalState({ 
				saveSuccess: false,
				noChangesMessage: 'No changes detected.',
				formErrors: { form: undefined }
			});
			setTimeout(() => {
				this.updateInternalState({ noChangesMessage: null });
			}, 2000);
			return;
		}

		const newUsername = updateData.username || state.profile.username;
		const newEmail = updateData.email !== undefined ? updateData.email : this.initialDbEmail;

		this.initialDbUsername = newUsername;
		this.initialDbEmail = newEmail;
		
		this.updateInternalState({
			profile: {
				...state.profile,
				username: newUsername,
			},
			formData: {
				username: newUsername,
				email: newEmail || '',
				password: '',
				confirmPassword: ''
			},
			saveSuccess: true,
			noChangesMessage: null,
			formErrors: { form: undefined }
		});
		
		// Propagate necessary changes
		const actualChangesForParent: Partial<User> = {};
		if (updateData.username) actualChangesForParent.username = newUsername;
		if (updateData.email !== undefined) actualChangesForParent.email = newEmail || undefined;
		
		if (Object.keys(actualChangesForParent).length > 0) {
			appState.updateUserData(actualChangesForParent);
			if (actualChangesForParent.username) {
				appState.setPlayerName(state.profile.id, actualChangesForParent.username);
			}
			this.updateAuthUserInStorage(actualChangesForParent);
			if (this.onProfileUpdate) {
				this.onProfileUpdate(actualChangesForParent);
			}
		}
		
		// Hide the green success ticker after 2 seconds for actual saves
		setTimeout(() => {
			this.updateInternalState({ saveSuccess: false });
		}, 2000);

		DbService.updateUser(state.profile.id, updateData)
			.catch(error => {
				// Rollback optimistic updates
				this.initialDbUsername = this.initialDbUsername;
				this.initialDbEmail = this.initialDbEmail;

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
				this.updateInternalState({ 
					formErrors: currentFormErrors, 
					saveSuccess: false,
					formData: {
						username: this.initialDbUsername || '',
						email: this.initialDbEmail || '',
						password: '',
						confirmPassword: ''
					},
					profile: {
						...state.profile!,
						username: this.initialDbUsername || '',
					}
				});
			});
	}
	
	/**
	 * Helper method to update auth user in storage
	 */
	private updateAuthUserInStorage(updatedUser: any): void {
		const authUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (authUserJson) {
			try {
				const authUser = JSON.parse(authUserJson);
				const updatedAuthUser = {
					...authUser,
					pseudo: updatedUser.username,
					username: updatedUser.username,
					email: updatedUser.email || authUser.email
				};
				
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
	
	public getDOMContainer(): HTMLElement {
		return this.container;
	}
	
	destroy(): void {
		window.removeEventListener('user:theme-updated', this.handleExternalThemeUpdate.bind(this));
		super.destroy();
	}

	private async handle2FAToggle(event: Event): Promise<void> {
		const toggle = event.target as HTMLInputElement;
		const state = this.getInternalState();
		
		if (!state.profile) return;
		
		try {
			if (toggle.checked) {
				// Enabling 2FA
				const qrCodeResponse = await DbService.generate2FA();
				this.showQRCodePopup(qrCodeResponse.qrcode);
			} else {
				// Disabling 2FA
				await DbService.disable2FA();
				this.updateInternalState({
					profile: { ...state.profile, twoFactorEnabled: false }
				});
			}
		} catch (error) {
			console.error('2FA operation failed:', error);
			
			// Revert toggle to previous state
			toggle.checked = !toggle.checked;
			
			this.updateInternalState({
				formErrors: {
					...state.formErrors,
					twoFA: `Failed to ${toggle.checked ? 'enable' : 'disable'} 2FA. Please try again.`
				}
			});
		}
	}

	private showQRCodePopup(qrCodeImage: string): void {
		const popupOverlay = document.createElement('div');
		popupOverlay.className = 'popup-overlay';
		
		const popupContent = document.createElement('div');
		popupContent.className = 'popup-content qrcode-popup';
		
		popupContent.innerHTML = `
			<button id="cancel-twofa-btn" class="cancel-button">✕</button>
			<div class="qrcode-container">
				<img src="${qrCodeImage}" alt="QR Code for 2FA" />
			</div>
			<p class="qrcode-instructions">
				1. Scan this QR code with your authentication app<br>
				2. Enter the 6-digit code from your app below
			</p>
			<div class="code-input-container">
				<input type="text" id="twofa-code" maxlength="6" placeholder="000000" />
				<button id="verify-twofa-btn" class="verify-twofa-button">Verify</button>
			</div>
		`;
		
		popupOverlay.appendChild(popupContent);
		document.body.appendChild(popupOverlay);
		
		// Add event listeners
		const verifyButton = document.getElementById('verify-twofa-btn');
		const cancelButton = document.getElementById('cancel-twofa-btn');
		const codeInput = document.getElementById('twofa-code') as HTMLInputElement;
		
		verifyButton?.addEventListener('click', () => this.verify2FACode(codeInput.value));
		cancelButton?.addEventListener('click', () => {
			document.body.removeChild(popupOverlay);
			const toggle = document.getElementById('twofa-toggle') as HTMLInputElement;
			if (toggle) toggle.checked = false;
		});
	}

	private async verify2FACode(code: string): Promise<void> {
		if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
			// Add error styling to input instead of alert
			const codeInput = document.getElementById('twofa-code') as HTMLInputElement;
			if (codeInput) {
				codeInput.classList.add('error');
				setTimeout(() => codeInput.classList.remove('error'), 2000);
			}
			return;
		}
		
		try {
			await DbService.validate2FA(code);
			
			// Single state update
			this.updateInternalState({
				profile: { 
					...this.getInternalState().profile!, 
					twoFactorEnabled: true 
				},
				saveSuccess: true // Show success indicator
			});
			
			// Hide success after 2 seconds
			setTimeout(() => {
				this.updateInternalState({ saveSuccess: false });
			}, 2000);
			
			// Close popup and update checkbox
			const popupOverlay = document.querySelector('.popup-overlay');
			if (popupOverlay) document.body.removeChild(popupOverlay);
			
			const toggle = document.getElementById('twofa-toggle') as HTMLInputElement;
			if (toggle) toggle.checked = true;
		} catch (error) {
			console.error('Failed to verify 2FA code:', error);
			// Visual error indication instead of alert
			const codeInput = document.getElementById('twofa-code') as HTMLInputElement;
			if (codeInput) {
				codeInput.value = '';
				codeInput.placeholder = 'Invalid code';
				codeInput.classList.add('error');
				setTimeout(() => {
					codeInput.placeholder = '000000';
					codeInput.classList.remove('error');
				}, 2000);
			}
		}
	}
}
