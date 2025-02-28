import { Component } from './component';

interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string;
  level: number;
  experience: number;
  totalGames: number;
  wins: number;
  losses: number;
  achievements: Achievement[];
  gameHistory: GameHistoryEntry[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date | null;
}

interface GameHistoryEntry {
  id: string;
  date: Date;
  opponent: string;
  playerScore: number;
  opponentScore: number;
  result: 'win' | 'loss';
}

export class ProfileComponent extends Component {
  private profile: UserProfile | null = null;
  private isLoading: boolean = false;
  private isEditing: boolean = false;
  
  constructor(container: HTMLElement) {
    super(container);
  }
  
  async render(): Promise<void> {
    try {
      // Show loading state
      this.renderLoading();
      
      // Use inline template as the default approach
      this.renderWithInlineTemplate();
      
      // Fetch user profile data
      await this.fetchProfileData();
      
      // Render the profile content
      this.renderProfile();
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error rendering profile:', error);
      this.renderError('Failed to load profile. Please try again later.');
    }
  }
  
  private renderWithInlineTemplate(): void {
    this.container.innerHTML = `
      <div class="ascii-container">
        <h2 class="section-title">Profile</h2>
        <div class="profile-content">
          <!-- Profile content will be dynamically loaded -->
        </div>
      </div>
    `;
  }
  
  private renderLoading(): void {
    this.isLoading = true;
    this.container.innerHTML = `
      <div class="ascii-container">
        <h2 class="section-title">Profile</h2>
        <div class="profile-content">
          <p class="loading-text">Loading profile data...</p>
        </div>
      </div>
    `;
  }
  
  private renderError(message: string): void {
    const profileContent = this.container.querySelector('.profile-content');
    if (profileContent) {
      profileContent.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
          <button class="retry-button">Retry</button>
        </div>
      `;
      
      // Add retry button handler
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => this.render());
      }
    }
  }
  
  private async fetchProfileData(): Promise<void> {
    // Mock data for now - in the future, this would be a real API call
    // await fetch('/api/profile')
    this.isLoading = true;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data
    this.profile = {
      id: 'user123',
      username: 'PongChampion42',
      avatarUrl: 'https://placekitten.com/200/200', // Placeholder
      level: 12,
      experience: 5840,
      totalGames: 42,
      wins: 28,
      losses: 14,
      achievements: [
        {
          id: 'ach1',
          name: 'First Win',
          description: 'Win your first game',
          iconUrl: '🏆',
          unlockedAt: new Date('2023-04-15')
        },
        {
          id: 'ach2',
          name: 'Winning Streak',
          description: 'Win 5 games in a row',
          iconUrl: '🔥',
          unlockedAt: new Date('2023-05-22')
        },
        {
          id: 'ach3',
          name: 'Perfect Game',
          description: 'Win a game without conceding a point',
          iconUrl: '✨',
          unlockedAt: null
        }
      ],
      gameHistory: [
        {
          id: 'game1',
          date: new Date('2023-06-02'),
          opponent: 'GameWizard',
          playerScore: 10,
          opponentScore: 7,
          result: 'win'
        },
        {
          id: 'game2',
          date: new Date('2023-06-01'),
          opponent: 'PaddlePro',
          playerScore: 10,
          opponentScore: 4,
          result: 'win'
        },
        {
          id: 'game3',
          date: new Date('2023-05-30'),
          opponent: 'Champion42',
          playerScore: 8,
          opponentScore: 10,
          result: 'loss'
        }
      ]
    };
    
    this.isLoading = false;
  }
  
  private renderProfile(): void {
    if (this.isLoading || !this.profile) return;
    
    const profileContent = this.container.querySelector('.profile-content');
    if (!profileContent) return;
    
    // Create the profile HTML
    const profileHTML = `
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            <img src="${this.profile.avatarUrl}" alt="${this.profile.username}'s avatar">
          </div>
          <div class="profile-info">
            <h3 class="profile-username">${this.profile.username}</h3>
            <div class="profile-level">Level ${this.profile.level}</div>
            <div class="profile-stats">
              <div class="stat">
                <span class="stat-label">Games</span>
                <span class="stat-value">${this.profile.totalGames}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Wins</span>
                <span class="stat-value">${this.profile.wins}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Losses</span>
                <span class="stat-value">${this.profile.losses}</span>
              </div>
            </div>
          </div>
          <div class="profile-actions">
            <button class="edit-profile-button">Edit Profile</button>
          </div>
        </div>
        
        <div class="profile-tabs">
          <button class="tab-button active" data-tab="game-history">Game History</button>
          <button class="tab-button" data-tab="achievements">Achievements</button>
          <button class="tab-button" data-tab="settings">Settings</button>
        </div>
        
        <div class="profile-tab-content">
          <div class="tab-pane active" id="game-history">
            <h4>Recent Games</h4>
            <table class="game-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${this.profile.gameHistory.map(game => `
                  <tr class="game-${game.result}">
                    <td>${game.date.toLocaleDateString()}</td>
                    <td>${game.opponent}</td>
                    <td>${game.result.toUpperCase()}</td>
                    <td>${game.playerScore} - ${game.opponentScore}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="tab-pane" id="achievements">
            <h4>Achievements</h4>
            <div class="achievements-grid">
              ${this.profile.achievements.map(achievement => `
                <div class="achievement ${achievement.unlockedAt ? 'unlocked' : 'locked'}">
                  <div class="achievement-icon">${achievement.iconUrl}</div>
                  <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    ${achievement.unlockedAt 
                      ? `<div class="achievement-date">Unlocked: ${achievement.unlockedAt.toLocaleDateString()}</div>`
                      : '<div class="achievement-locked">Locked</div>'
                    }
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
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
        </div>
      </div>
    `;
    
    profileContent.innerHTML = profileHTML;
  }
  
  private setupEventListeners(): void {
    // Set up tab switching
    const tabButtons = this.container.querySelectorAll('.tab-button');
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
  
  destroy(): void {
    // Clean up any event listeners or resources
    super.destroy();
  }
} 