import { Component } from './component';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  wins: number;
  losses: number;
}

export class LeaderboardComponent extends Component {
  private leaderboardData: LeaderboardEntry[] = [];
  private isLoading: boolean = false;
  
  constructor(container: HTMLElement) {
    super(container);
  }
  
  async render(): Promise<void> {
    try {
      // Show loading state
      this.renderLoading();
      
      // Use inline template as the default approach
      this.renderWithInlineTemplate();
      
      // Fetch data
      await this.fetchLeaderboardData();
      
      // Render the leaderboard content
      this.renderLeaderboard();
      
    } catch (error) {
      console.error('Error rendering leaderboard:', error);
      this.renderError('Failed to load leaderboard. Please try again later.');
    }
  }
  
  private renderWithInlineTemplate(): void {
    this.container.innerHTML = `
      <div class="ascii-container">
        <h2 class="section-title">Leaderboard</h2>
        <div class="leaderboard-content">
          <!-- Leaderboard content will be dynamically loaded -->
        </div>
      </div>
    `;
  }
  
  private renderLoading(): void {
    this.isLoading = true;
    this.container.innerHTML = `
      <div class="ascii-container">
        <h2 class="section-title">Leaderboard</h2>
        <div class="leaderboard-content">
          <p class="loading-text">Loading leaderboard data...</p>
        </div>
      </div>
    `;
  }
  
  private renderError(message: string): void {
    const leaderboardContent = this.container.querySelector('.leaderboard-content');
    if (leaderboardContent) {
      leaderboardContent.innerHTML = `
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
  
  private async fetchLeaderboardData(): Promise<void> {
    // Mock data for now - in the future, this would be a real API call
    // await fetch('/api/leaderboard')
    this.isLoading = true;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data
    this.leaderboardData = [
      { rank: 1, username: 'Champion42', score: 2500, wins: 25, losses: 2 },
      { rank: 2, username: 'PongMaster', score: 2250, wins: 22, losses: 3 },
      { rank: 3, username: 'RetroGamer', score: 2100, wins: 21, losses: 5 },
      { rank: 4, username: 'PixelHero', score: 1950, wins: 19, losses: 4 },
      { rank: 5, username: 'GameWizard', score: 1800, wins: 18, losses: 6 },
      { rank: 6, username: 'ArcadeKing', score: 1650, wins: 16, losses: 5 },
      { rank: 7, username: 'VectorVictor', score: 1500, wins: 15, losses: 7 },
      { rank: 8, username: 'PaddlePro', score: 1350, wins: 13, losses: 4 },
      { rank: 9, username: 'ScoreSeeker', score: 1200, wins: 12, losses: 8 },
      { rank: 10, username: 'BallBouncer', score: 1050, wins: 10, losses: 5 }
    ];
    
    this.isLoading = false;
  }
  
  private renderLeaderboard(): void {
    if (this.isLoading) return;
    
    const leaderboardContent = this.container.querySelector('.leaderboard-content');
    if (!leaderboardContent) return;
    
    // Create the table
    const tableHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>W</th>
            <th>L</th>
          </tr>
        </thead>
        <tbody>
          ${this.leaderboardData.map(entry => `
            <tr>
              <td class="rank-cell">${entry.rank}</td>
              <td class="player-cell">${entry.username}</td>
              <td class="score-cell">${entry.score}</td>
              <td class="wins-cell">${entry.wins}</td>
              <td class="losses-cell">${entry.losses}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    leaderboardContent.innerHTML = tableHTML;
    
    // Add event listeners for player profiles (future feature)
    const playerCells = leaderboardContent.querySelectorAll('.player-cell');
    playerCells.forEach(cell => {
      cell.addEventListener('click', (e) => {
        const playerName = (e.target as HTMLElement).textContent;
        console.log(`View profile for: ${playerName}`);
        // Future: Navigate to player profile
      });
    });
  }
  
  destroy(): void {
    // Clean up any event listeners or resources
    super.destroy();
  }
} 