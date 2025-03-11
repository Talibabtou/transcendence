import { Component } from '@website/scripts/components';
import { DbService, html, render, navigate, ASCII_ART } from '@website/scripts/utils';

interface UserProfile {
	id: string;
	username: string;
	avatarUrl: string;
	level: number;
	experience: number;
	totalGames: number;
	wins: number;
	losses: number;
	gameHistory: GameHistoryEntry[];
	friends: Friend[];
	preferences: {
		accentColor: string;
	};
}

interface GameHistoryEntry {
	id: string;
	date: Date;
	opponent: string;
	playerScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
}

interface Friend {
	username: string;
	status: 'online' | 'offline' | 'in-game';
	avatarUrl: string;
}

export class ProfileComponent extends Component {
	private profile: UserProfile | null = null;
	private isLoading: boolean = false;
	private isEditing: boolean = false;
	private activeTab: string = 'summary';
	private colorPicker: HTMLInputElement | null = null;
	
	constructor(container: HTMLElement) {
		super(container);
	}
	
	async render(): Promise<void> {
		try {
			this.isLoading = true;
			this.renderView();
			await this.fetchProfileData();
			this.isLoading = false;
			this.renderView();
		} catch (error) {
			console.error('Error rendering profile:', error);
			this.isLoading = false;
			const errorMessage = error instanceof Error ? error.message : 'Failed to load profile data';
			this.renderView(errorMessage);
		}
	}

	private async fetchProfileData(): Promise<void> {
		try {
			const url = new URL(window.location.href);
			const userId = url.searchParams.get('id') || 'current';

			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 750));
			// Convert userId to number since our DB interface expects it
			const numericId = userId === 'current' ? 1 : parseInt(userId, 10); // You might want to adjust the default ID
			
			// Use DbService for all data fetching
			DbService.getUser(numericId);
			DbService.getUserMatches(numericId);
			DbService.getUserFriends(numericId);
			
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 750));
			this.profile = this.createMockProfile(userId);
		} catch (error) {
			console.error('Error fetching profile data:', error);
			throw new Error('Failed to fetch profile data');
		}
	}

	private createMockProfile(userId: string): UserProfile {
		const isCurrentUser = userId === 'current';
		const id = isCurrentUser ? 'current' : userId;
		
		// Create mock friends
		const mockFriends: Friend[] = [
			{
				username: 'PongMaster',
				status: 'online',
				avatarUrl: '../../public/images/default-avatar.svg'
			},
			{
				username: 'RetroGamer',
				status: 'in-game',
				avatarUrl: '../../public/images/default-avatar.svg'
			},
			{
				username: 'PixelPro',
				status: 'offline',
				avatarUrl: '../../public/images/default-avatar.svg'
			}
		];

		return {
			id,
			username: isCurrentUser ? 'CurrentUser' : `Player${userId}`,
			avatarUrl: '../../public/images/default-avatar.svg',
			level: Math.floor(Math.random() * 50) + 1,
			experience: Math.floor(Math.random() * 10000),
			totalGames: Math.floor(Math.random() * 100),
			wins: Math.floor(Math.random() * 50),
			losses: Math.floor(Math.random() * 50),
			gameHistory: Array.from({ length: 5 }, (_, i) => ({
				id: `game-${i}`,
				date: new Date(Date.now() - 1000 * 60 * 60 * 24 * i), // i days ago
				opponent: `Opponent${i + 1}`,
				playerScore: Math.floor(Math.random() * 10),
				opponentScore: Math.floor(Math.random() * 10),
				result: Math.random() > 0.5 ? 'win' : 'loss'
			})),
			friends: mockFriends,
			preferences: {
				accentColor: '#7cf'
			}
		};
	}

	private renderView(errorMessage?: string): void {
		const template = html`
			<div class="ascii-container">
				<div class="ascii-title-container">
					<pre class="ascii-title">${ASCII_ART.PROFILE}</pre>
				</div>
				
				${this.isLoading ? 
					html`<p class="loading-text">Loading profile data...</p>` :
					errorMessage ?
						html`
							<div class="error-message">${errorMessage}</div>
							<button class="retry-button" onClick=${() => this.render()}>Retry</button>
						` :
						html`
							<div class="profile-layout">
								<nav class="profile-nav">
									${this.renderNavigation()}
								</nav>
								<main class="profile-main">
									${this.renderActiveTab()}
								</main>
							</div>
						`
				}
			</div>
		`;
		
		render(template, this.container);
		
		if (!this.isLoading && !errorMessage) {
			this.setupEventListeners();
		}
	}

	private renderNavigation() {
		const tabs = [
			{ id: 'summary', label: 'SUMMARY', icon: '📊' },
			{ id: 'history', label: 'HISTORY', icon: '🕒' },
			{ id: 'friends', label: 'FRIENDS', icon: '👥' },
			{ id: 'settings', label: 'SETTINGS', icon: '⚙️' }
		];

		return html`
			<ul class="nav-list">
				${tabs.map(tab => html`
					<li class="nav-item ${this.activeTab === tab.id ? 'active' : ''}">
						<button 
							class="nav-button" 
							data-tab="${tab.id}"
							onClick=${() => this.setActiveTab(tab.id)}
						>
							<span class="nav-icon">${tab.icon}</span>
							<span class="nav-label">${tab.label}</span>
						</button>
					</li>
				`)}
			</ul>
		`;
	}

	private renderActiveTab() {
		if (!this.profile) return html``;

		switch (this.activeTab) {
			case 'summary':
				return this.renderSummary();
			case 'history':
				return this.renderHistory();
			case 'friends':
				return this.renderFriends();
			case 'settings':
				return this.renderSettings();
			default:
				return this.renderSummary();
		}
	}

	private renderSummary() {
		if (!this.profile) return html``;
		
		return html`
			<div class="summary-container">
				<div class="profile-hero">
					<div class="profile-avatar-large">
						<img src="${this.profile.avatarUrl}" alt="${this.profile.username}">
					</div>
					<div class="profile-info-large">
						<h2 class="username-large">${this.profile.username}</h2>
						<div class="profile-stats-large">
							<div class="stat-large">
								<span class="stat-value-large">${this.profile.level}</span>
								<span class="stat-label-large">LEVEL</span>
							</div>
							<div class="stat-large">
								<span class="stat-value-large wins-value">${this.profile.wins}</span>
								<span class="stat-label-large">WINS</span>
							</div>
							<div class="stat-large">
								<span class="stat-value-large losses-value">${this.profile.losses}</span>
								<span class="stat-label-large">LOSSES</span>
							</div>
						</div>
					</div>
				</div>
				<div class="recent-activity">
					<h3>Recent Activity</h3>
					${this.renderRecentGames(3)}
				</div>
			</div>
		`;
	}

	private renderHistory() {
		if (!this.profile) return html``;
		
		return html`
			<div class="tab-pane active" id="game-history">
				<table class="game-history-table">
					<thead>
						<tr>
							<th>DATE</th>
							<th>OPPONENT</th>
							<th>RESULT</th>
							<th>SCORE</th>
						</tr>
					</thead>
					<tbody>
						${this.profile.gameHistory.map(game => html`
							<tr class="game-${game.result}">
								<td>${game.date.toLocaleDateString()}</td>
								<td class="opponent-cell" onClick=${() => this.handlePlayerClick(game.opponent)}>
									${game.opponent}
								</td>
								<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
								<td>${game.playerScore} - ${game.opponentScore}</td>
							</tr>
						`)}
					</tbody>
				</table>
			</div>
		`;
	}

	private renderFriends() {
		if (!this.profile) return html``;
		
		return html`
			<div class="friends-container">
				<h3>Friends</h3>
				<div class="friends-list">
					${this.profile.friends.map(friend => html`
						<div class="friend-card">
							<img class="friend-avatar" src="${friend.avatarUrl}" alt="${friend.username}">
							<div class="friend-info">
								<span class="friend-name">${friend.username}</span>
								<span class="friend-status ${friend.status}">${friend.status}</span>
							</div>
						</div>
					`)}
				</div>
			</div>
		`;
	}

	private renderSettings() {
		if (!this.profile) return html``;
		
		return html`
			<div class="tab-pane" id="settings">
				<h4>Account Settings</h4>
				<form class="settings-form">
					<div class="form-group">
						<label for="username">Username</label>
						<input type="text" id="username" value="${this.profile.username}" disabled>
					</div>
					<div class="form-group">
						<label for="avatar">Avatar URL</label>
						<input type="text" id="avatar" value="${this.profile.avatarUrl}" disabled>
					</div>
					<div class="form-group">
						<label for="password">Change Password</label>
						<input type="password" id="password" placeholder="New password" disabled>
					</div>
					<button type="button" class="save-settings-button" disabled>Save Changes</button>
				</form>
			</div>
		`;
	}

	private renderRecentGames(limit: number) {
		if (!this.profile) return html``;
		
		const recentGames = this.profile.gameHistory.slice(0, limit);
		
		return html`
			<table class="game-history-table recent-games">
				<thead>
					<tr>
						<th>DATE</th>
						<th>OPPONENT</th>
						<th>RESULT</th>
						<th>SCORE</th>
					</tr>
				</thead>
				<tbody>
					${recentGames.map(game => html`
						<tr class="game-${game.result}">
							<td>${game.date.toLocaleDateString()}</td>
							<td class="opponent-cell" onClick=${() => this.handlePlayerClick(game.opponent)}>
								${game.opponent}
							</td>
							<td class="result-cell-${game.result}">${game.result.toUpperCase()}</td>
							<td>${game.playerScore} - ${game.opponentScore}</td>
						</tr>
					`)}
				</tbody>
			</table>
		`;
	}

	private setupEventListeners(): void {
		// Set up tab switching
		const tabButtons = this.container.querySelectorAll('.nav-button');
		const tabPanes = this.container.querySelectorAll('.tab-pane');
		tabButtons.forEach(button => {
			button.addEventListener('click', () => {
				const tabId = button.getAttribute('data-tab');
				// Update active tab button
				tabButtons.forEach(btn => btn.classList.remove('active'));
				button.classList.add('active');
				// Show selected tab pane
				tabPanes.forEach(pane => {
					pane.classList.remove('active');
					if (pane.id === tabId) {
						pane.classList.add('active');
					}
				});
			});
		});
		// Set up edit profile button
		const editButton = this.container.querySelector('.edit-profile-button');
		if (editButton) {
			editButton.addEventListener('click', () => {
				this.toggleEditMode();
			});
		}
		// Game history player links
		this.container.querySelectorAll('.opponent-cell').forEach(cell => {
			cell.addEventListener('click', () => {
				const opponentUsername = (cell as HTMLElement).textContent;
				if (opponentUsername) {
					this.handlePlayerClick(opponentUsername);
				}
			});
		});
		// If in edit mode, set up form submission
		if (this.isEditing) {
			const form = this.container.querySelector('.settings-form');
			if (form) {
				form.addEventListener('submit', (e) => {
					e.preventDefault();
					this.saveProfileChanges();
				});
			}
			
			// Cancel button
			const cancelButton = this.container.querySelector('.save-settings-button');
			if (cancelButton) {
				cancelButton.addEventListener('click', () => {
					this.isEditing = false;
					this.renderActiveTab();
				});
			}
		}
	}

	private toggleEditMode(): void {
		this.isEditing = !this.isEditing;
		// Toggle form fields
		const formInputs = this.container.querySelectorAll('.settings-form input');
		const saveButton = this.container.querySelector('.save-settings-button');
		formInputs.forEach(input => {
			(input as HTMLInputElement).disabled = !this.isEditing;
		});
		if (saveButton) {
			(saveButton as HTMLButtonElement).disabled = !this.isEditing;
		}
		// Toggle edit button text
		const editButton = this.container.querySelector('.edit-profile-button');
		if (editButton) {
			editButton.textContent = this.isEditing ? 'Cancel' : 'Edit Profile';
		}
		// Select the settings tab when entering edit mode
		if (this.isEditing) {
			const settingsTab = this.container.querySelector('[data-tab="settings"]');
			if (settingsTab) {
				(settingsTab as HTMLElement).click();
			}
		}
	}

	private saveProfileChanges(): void {
		// Get form data
		const form = this.container.querySelector('.settings-form') as HTMLFormElement;
		if (!form || !this.profile) return;
		// Example of getting form values
		const username = (form.querySelector('[name="username"]') as HTMLInputElement)?.value;
		// Update profile data
		if (username) this.profile.username = username;
		// Simulate saving to database
		DbService.updateUser(parseInt(this.profile.id), {
			pseudo: username
		});
		// Exit edit mode and re-render
		this.isEditing = false;
		this.renderActiveTab();
	}

	private handlePlayerClick(username: string): void {
		navigate(`/profile?username=${username}`);
	}

	private setActiveTab(tabId: string): void {
		this.activeTab = tabId;
		this.renderView();
	}
}
