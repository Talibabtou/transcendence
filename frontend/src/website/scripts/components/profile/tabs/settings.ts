import { Component } from '@website/scripts/components';
import { appState, hashPassword, AppStateManager } from '@website/scripts/utils';
import { DbService, html, render, NotificationManager } from '@website/scripts/services';
import { UserProfile, ProfileSettingsState, User } from '@website/types';

export class ProfileSettingsComponent extends Component<ProfileSettingsState> {
	private onProfileUpdate?: (updatedFields: Partial<User>) => void;
	private initialDbUsername: string | null = null;
	private initialDbEmail: string | null = null;
	private dataLoadInProgress = false;

	constructor(container: HTMLElement) {
		super(container, {
			profile: null,
			isUploading: false,
			uploadSuccess: false,
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

	// =========================================
	// LIFECYCLE METHODS
	// =========================================
	
	/**
	 * Renders the profile settings component
	 */
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
								<label class="toggle-label">Two-Factor Authentication</label>
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
						${state.formErrors.form && !state.noChangesMessage ? 
														html`<div class="form-error save-error">${state.formErrors.form}</div>` : ''}
					</div>
				</form>
			</div>
		`;
		
		render(template, this.container);
	}
	
	/**
	 * Cleans up event listeners and component resources
	 */
	destroy(): void {
		window.removeEventListener('user:theme-updated', this.handleExternalThemeUpdate.bind(this));
		super.destroy();
	}
	
	/**
	 * Returns the DOM container for this component
	 */
	public getDOMContainer(): HTMLElement {
		return this.container;
	}

	// =========================================
	// PUBLIC API METHODS
	// =========================================
	
	/**
	 * Sets the user profile for the settings component
	 */
	public setProfile(profile: UserProfile): void {
		const state = this.getInternalState();
		const userAccentColor = AppStateManager.getUserAccentColor(profile.id);
		
		if (state.profile?.id !== profile.id || this.initialDbUsername === null) {
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
				.catch(() => NotificationManager.showError('Error fetching user data'));
			}
		} else if (userAccentColor !== state.profile?.preferences?.accentColor) {
			this.updateInternalState({
				profile: {
					...state.profile,
					preferences: {
						...(state.profile.preferences || {}),
						accentColor: userAccentColor
					}
				}
			});
		}
	}
	
	/**
	 * Sets handlers for component events
	 */
	public setHandlers(handlers: { onProfileUpdate?: (updatedFields: Partial<User>) => void }): void {
		if (handlers.onProfileUpdate) this.onProfileUpdate = handlers.onProfileUpdate;
	}

	// =========================================
	// EVENT HANDLERS
	// =========================================
	
	/**
	 * Handles theme updates from external sources
	 */
	private handleExternalThemeUpdate(event: Event): void {
		const customEvent = event as CustomEvent<{ userId: string, theme: string }>;
		if (customEvent.detail && this.getInternalState().profile) {
			if (customEvent.detail.userId === this.getInternalState().profile!.id) this.render();
		}
	}
	
	/**
	 * Handles file upload for profile picture
	 */
	private async handleFileChange(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (!file) return;
				
		const state = this.getInternalState();
		if (!state.profile) return;
		
		const isValid = await this.validateFileType(file);
		if (!isValid) {
			NotificationManager.handleErrorCode('invalid_file_type', 'Invalid file type. Please use JPG, JPEG, PNG, or GIF.');
			this.updateInternalState({ uploadSuccess: false, isUploading: false });
			return;
		}
		
		if (file.size > 1 * 1024 * 1024) {
			NotificationManager.handleErrorCode('file_too_large', 'File too large. Maximum size is 1MB.');
			this.updateInternalState({ uploadSuccess: false, isUploading: false });
			return;
		}
		
		this.updateInternalState({ isUploading: true, uploadSuccess: false });
		
		try {
			await DbService.updateProfilePicture(file);
			NotificationManager.showSuccess('Profile picture updated successfully');
			const picResponse = await DbService.getPic(state.profile.id);
			
			if (picResponse?.link) {
				this.updateInternalState({
					isUploading: false,
					uploadSuccess: true,
					profile: { ...state.profile, avatarUrl: picResponse.link }
				});
				
				if (this.onProfileUpdate) this.onProfileUpdate({ pfp: picResponse.link });
			} else {
				this.updateInternalState({ isUploading: false, uploadSuccess: true });
			}
		} catch (error) {
			if (error instanceof TypeError && error.message.includes('null')) {
				NotificationManager.showSuccess('Profile picture updated successfully');
				
				try {
					const picResponse = await DbService.getPic(state.profile.id);
					if (picResponse?.link) {
						this.updateInternalState({
							isUploading: false,
							uploadSuccess: true,
							profile: { ...state.profile, avatarUrl: picResponse.link }
						});
						
						if (this.onProfileUpdate) this.onProfileUpdate({ pfp: picResponse.link });
					} else {
						this.updateInternalState({ isUploading: false, uploadSuccess: true });
					}
				} catch {
					this.updateInternalState({ isUploading: false, uploadSuccess: true });
				}
			} else {
				NotificationManager.showError('Upload failed. Please try again.');
				this.updateInternalState({ isUploading: false, uploadSuccess: false });
			}
		}
	}

	/**
	 * Validates file type using magic bytes
	 */
	private async validateFileType(file: File): Promise<boolean> {
		const magicBytes = {
			jpeg: [0xFF, 0xD8, 0xFF],
			png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
			gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
			gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
		};
		const buffer = await file.arrayBuffer();
		const bytes = new Uint8Array(buffer, 0, 8);
		
		if (this.compareBytes(bytes, magicBytes.jpeg)) {
			return true;
		}
		if (this.compareBytes(bytes, magicBytes.png)) {
			return true;
		}
		if (this.compareBytes(bytes, magicBytes.gif87a) || 
			this.compareBytes(bytes, magicBytes.gif89a)) {
			return true;
		}
		
		return false;
	}

	/**
	 * Compares file bytes with magic bytes
	 */
	private compareBytes(fileBytes: Uint8Array, magicBytes: number[]): boolean {
		if (fileBytes.length < magicBytes.length) return false;
		
		for (let i = 0; i < magicBytes.length; i++) {
			if (fileBytes[i] !== magicBytes[i]) {
				return false;
			}
		}
		
		return true;
	}

	/**
	 * Handles color selection for accent color
	 */
	private handleColorSelect(colorHex: string): void {
		const state = this.getInternalState();
		if (!state.profile) return;

		AppStateManager.setUserAccentColor(state.profile.id, colorHex);
		appState.setPlayerAccentColor(1, colorHex, state.profile.id);
		NotificationManager.showSuccess('Theme color updated');
	}
	
	/**
	 * Handles form input changes
	 */
	private handleInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const { name, value } = input;
		
		if (name === 'username') {
			const sanitizedValue = value.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
			
			if (sanitizedValue !== value) input.value = sanitizedValue;
			
			this.updateInternalState({
				formData: { ...this.getInternalState().formData, [name]: sanitizedValue }
			});
			return;
		}
		
		this.updateInternalState({
			formData: { ...this.getInternalState().formData, [name]: value }
		});
	}
	
	/**
	 * Handles form submission
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
		} else if (state.formData.username.length > 20) {
			errors.username = 'Username cannot exceed 20 characters';
		} else if (!/^[a-zA-Z0-9]+$/.test(state.formData.username)) {
			errors.username = 'Username can only contain letters and numbers';
		}
		
		if (state.formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(state.formData.email)) {
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
			NotificationManager.showError(Object.values(errors)[0]);
			return;
		}
		
		this.updateInternalState({ formErrors: {}, noChangesMessage: null });
		const updateData: Partial<User> = {};
		
		if (state.formData.username !== this.initialDbUsername) updateData.username = state.formData.username;
		if (state.formData.email !== this.initialDbEmail) updateData.email = state.formData.email;
		if (state.formData.password) updateData.password = await hashPassword(state.formData.password);
		
		if (Object.keys(updateData).length === 0) {
			NotificationManager.showInfo('No changes detected');
			this.updateInternalState({ formErrors: { form: undefined } });
			return;
		}

		try {
			await DbService.updateUser(state.profile.id, updateData);
			NotificationManager.showSuccess('Profile updated successfully');
			
			const newUsername = updateData.username || state.profile.username;
			const newEmail = updateData.email !== undefined ? updateData.email : this.initialDbEmail;

			this.initialDbUsername = newUsername;
			this.initialDbEmail = newEmail;
			
			this.updateInternalState({
				profile: { ...state.profile, username: newUsername },
				formData: {
					username: newUsername,
					email: newEmail || '',
					password: '',
					confirmPassword: ''
				},
				noChangesMessage: null,
				formErrors: { form: undefined }
			});
			
			const actualChanges: Partial<User> = {};
			if (updateData.username) actualChanges.username = newUsername;
			if (updateData.email !== undefined) actualChanges.email = newEmail || undefined;
			
			if (Object.keys(actualChanges).length > 0) {
				appState.updateUserData(actualChanges);
				if (actualChanges.username) {
					appState.setPlayerName(state.profile.id, actualChanges.username);
				}
				this.updateAuthUserInStorage(actualChanges);
				if (this.onProfileUpdate) this.onProfileUpdate(actualChanges);
			}
		} catch (error) {
			const currentFormErrors = { ...state.formErrors };
			
			if (error instanceof Error) {
				if (error.message.includes('409') || error.message.includes('Conflict') || 
					error.message.includes('already in use') || error.message.includes('duplicate')) {
					currentFormErrors.form = 'Username already in use';
					NotificationManager.showError('Username already in use');
				} else if (error.message.includes('constraint') || error.message.includes('already in use')) {
					currentFormErrors.form = 'Username or email already in use';
					NotificationManager.showError('Username or email already in use');
				} else if (error.message.includes('Invalid') || error.message.includes('fields')) {
					currentFormErrors.form = 'Invalid user information provided';
					NotificationManager.showError('Invalid user information provided');
				} else if (error.message.includes('not found')) {
					currentFormErrors.form = 'User not found';
					NotificationManager.showError('User not found');
				} else {
					currentFormErrors.form = `Failed to update profile: ${error.message}`;
					NotificationManager.showError(`Failed to update profile: ${error.message}`);
				}
			} else {
				currentFormErrors.form = 'Failed to update profile';
				NotificationManager.showError('Failed to update profile');
			}
			
			this.updateInternalState({ formErrors: currentFormErrors });
		}
	}
	
	// =========================================
	// TWO-FACTOR AUTHENTICATION METHODS
	// =========================================

	/**
	 * Handles toggling of two-factor authentication
	 */
	private async handle2FAToggle(event: Event): Promise<void> {
		const toggle = event.target as HTMLInputElement;
		const toggleContainer = toggle.closest('.toggle-switch');
		const state = this.getInternalState();
		
		if (!state.profile) return;
		
		try {
			if (toggle.checked) {
				const qrCodeResponse = await DbService.generate2FA();
				this.showQRCodePopup(qrCodeResponse.qrcode);
			} else {
				await DbService.disable2FA();
				NotificationManager.showSuccess('Two-factor authentication disabled');
				this.updateInternalState({
					profile: { ...state.profile, twoFactorEnabled: false }
				});
				if (toggleContainer) toggleContainer.classList.remove('active');
			}
		} catch (error) {
			NotificationManager.showError('2FA operation failed');
			
			toggle.checked = !toggle.checked;
			if (toggleContainer) toggleContainer.classList.toggle('active', toggle.checked);
			
			this.updateInternalState({
				formErrors: {
					...state.formErrors,
					twoFA: `Failed to ${toggle.checked ? 'enable' : 'disable'} 2FA. Please try again.`
				}
			});
		}
	}
	
	/**
	 * Displays the QR code popup for 2FA setup
	 */
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
	
	/**
	 * Verifies the 2FA code entered by the user
	 */
	private async verify2FACode(code: string): Promise<void> {
		if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
			NotificationManager.showError('Please enter a valid 6-digit code');
			
			const codeInput = document.getElementById('twofa-code') as HTMLInputElement;
			if (codeInput) {
				codeInput.classList.add('error');
				setTimeout(() => codeInput.classList.remove('error'), 2000);
			}
			
			const toggle = document.getElementById('twofa-toggle') as HTMLInputElement;
			const toggleContainer = toggle?.closest('.toggle-switch');
			if (toggle && toggleContainer) {
				toggle.checked = false;
				toggleContainer.classList.remove('active');
			}
			return;
		}
		
		try {
			await DbService.validate2FA(code);
			NotificationManager.showSuccess('Two-factor authentication enabled successfully');
			
			this.updateInternalState({
				profile: { ...this.getInternalState().profile!, twoFactorEnabled: true }
			});
			
			const toggle = document.getElementById('twofa-toggle') as HTMLInputElement;
			const toggleContainer = toggle?.closest('.toggle-switch');
			if (toggle && toggleContainer) {
				toggle.checked = true;
				toggleContainer.classList.add('active');
			}
			
			const popupOverlay = document.querySelector('.popup-overlay');
			if (popupOverlay && popupOverlay.parentNode) {
				popupOverlay.parentNode.removeChild(popupOverlay);
			}
		} catch (error) {
			NotificationManager.showError('Failed to verify 2FA code');
			
			const toggle = document.getElementById('twofa-toggle') as HTMLInputElement;
			const toggleContainer = toggle?.closest('.toggle-switch');
			if (toggle && toggleContainer) {
				toggle.checked = false;
				toggleContainer.classList.remove('active');
			}
			
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

	// =========================================
	// HELPER METHODS
	// =========================================
	
	/**
	 * Updates the auth user in local or session storage
	 */
	private updateAuthUserInStorage(updatedUser: any): void {
		const authUserJson = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
		if (!authUserJson) return;
				
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
	}

	/**
	 * Refreshes the settings data (user info and 2FA status)
	 */
	public async refreshData(): Promise<void> {
		const state = this.getInternalState();
		if (this.dataLoadInProgress || !state.profile?.id) return;
		this.dataLoadInProgress = true;

		try {
			const [userFromDb, twoFactorEnabled] = await Promise.all([
				DbService.getUser(state.profile.id),
				DbService.check2FAStatus()
			]);
			
			this.initialDbUsername = userFromDb.username;
			this.initialDbEmail = userFromDb.email || null;

			this.updateInternalState({
				profile: {
					...state.profile,
					username: userFromDb.username,
					twoFactorEnabled,
					avatarUrl: state.profile.avatarUrl,
					preferences: {
						...(state.profile.preferences || {}),
						accentColor: AppStateManager.getUserAccentColor(state.profile.id)
					}
				},
				formData: {
					username: userFromDb.username,
					email: userFromDb.email || '',
					password: '',
					confirmPassword: '',
				}
			});
		} catch (err) {
			NotificationManager.showError('Error refreshing settings data');
		}
		this.dataLoadInProgress = false;
	}
}
