import { v4 as uuidv4 } from 'uuid';

/**
 * Structure to represent a tournament player
 */
interface TournamentPlayer {
	id: number;
	name: string;
	color: string;
	wins: number;
	gamesWon: number;
	gamesLost: number;
}

/**
 * Structure to represent a tournament match/duel
 */
interface TournamentMatch {
	player1Index: number;
	player2Index: number;
	gamesPlayed: number;
	games: {
		winner: number;
		player1Score: number;
		player2Score: number;
		matchId?: number;
	}[];
	winner?: number;
	completed: boolean;
	isCurrent?: boolean;
}

/**
 * Tournament state types
 */
export type TournamentPhase = 'not_started' | 'pool' | 'finals' | 'complete';

/**
 * Singleton class for tournament caching and management
 */
class TournamentCacheSingleton {
	private static instance: TournamentCacheSingleton;
	
	// Tournament data
	private tournamentId: string | null = null;
	private tournamentPlayers: TournamentPlayer[] = [];
	private tournamentMatches: TournamentMatch[] = [];
	private currentMatchIndex: number = 0;
	private tournamentPhase: TournamentPhase = 'not_started';
	private currentGameInMatch: number = 0;
	
	private constructor() {}
	
	public static getInstance(): TournamentCacheSingleton {
		if (!TournamentCacheSingleton.instance) {
			TournamentCacheSingleton.instance = new TournamentCacheSingleton();
		}
		return TournamentCacheSingleton.instance;
	}
	
	/**
	 * Store registered players and initialize tournament
	 */
	public registerPlayers(playerIds: number[], playerNames: string[], playerColors: string[]): string {
		if (playerIds.length !== 4 || playerNames.length !== 4 || playerColors.length !== 4) {
			throw new Error('Tournament requires exactly 4 players');
		}
		
		// Generate a unique tournament ID
		this.tournamentId = uuidv4();
		
		// Initialize players
		this.tournamentPlayers = playerIds.map((id, index) => ({
			id,
			name: playerNames[index] || `Player ${index + 1}`,
			color: playerColors[index] || '#ffffff',
			wins: 0,
			gamesWon: 0,
			gamesLost: 0
		}));
		
		return this.tournamentId;
	}
	
	/**
	 * Initialize tournament schedule after players are registered
	 */
	public initTournamentSchedule(): void {
		if (this.tournamentPlayers.length !== 4) {
			throw new Error('Cannot initialize tournament without 4 players');
		}
		
		// Generate round-robin schedule for pool phase
		this.generatePoolMatches();
		
		this.tournamentPhase = 'pool';
		this.currentMatchIndex = 0;
		this.currentGameInMatch = 0;
	}
	
	/**
	 * Generate the pool phase matches (round-robin)
	 * Each player plays against all other players once
	 */
	private generatePoolMatches(): void {
		this.tournamentMatches = [];
		
		// For 4 players, create matches where each player faces all others (6 matches total)
		for (let i = 0; i < this.tournamentPlayers.length; i++) {
			for (let j = i + 1; j < this.tournamentPlayers.length; j++) {
				this.tournamentMatches.push({
					player1Index: i,
					player2Index: j,
					gamesPlayed: 0,
					games: [],
					completed: false
				});
			}
		}
		
		// Shuffle the matches for randomness
		this.shuffleTournamentMatches();
	}
	
	/**
	 * Shuffle the tournament matches array for random order
	 */
	private shuffleTournamentMatches(): void {
		// Fisher-Yates shuffle algorithm
		for (let i = this.tournamentMatches.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.tournamentMatches[i], this.tournamentMatches[j]] = 
			[this.tournamentMatches[j], this.tournamentMatches[i]];
		}
	}
	
	/**
	 * Get the current match information
	 */
	public getCurrentMatch(): TournamentMatch | null {
		if (this.tournamentPhase === 'not_started' || this.tournamentPhase === 'complete') {
			return null;
		}
		
		if (this.currentMatchIndex >= this.tournamentMatches.length) {
			return null;
		}
		
		return this.tournamentMatches[this.currentMatchIndex];
	}
	
	/**
	 * Record the result of a game in the current match
	 */
	public recordGameResult(player1Score: number, player2Score: number, matchId?: number): void {
		const currentMatch = this.getCurrentMatch();
		if (!currentMatch) return;
		
		// Determine winner
		const winnerIndex = player1Score > player2Score ? 
			currentMatch.player1Index : currentMatch.player2Index;
		
		// Record game result
		currentMatch.games.push({
			winner: winnerIndex,
			player1Score,
			player2Score,
			matchId
		});
		
		currentMatch.gamesPlayed++;
		this.currentGameInMatch++;
		
		// Update player stats
		if (player1Score > player2Score) {
			this.tournamentPlayers[currentMatch.player1Index].gamesWon++;
			this.tournamentPlayers[currentMatch.player2Index].gamesLost++;
		} else {
			this.tournamentPlayers[currentMatch.player2Index].gamesWon++;
			this.tournamentPlayers[currentMatch.player1Index].gamesLost++;
		}
		
		// Check if match is complete (best of 3)
		const player1Wins = currentMatch.games.filter(
			g => g.winner === currentMatch.player1Index
		).length;
		
		const player2Wins = currentMatch.games.filter(
			g => g.winner === currentMatch.player2Index
		).length;
		
		// Match is complete if either player has 2 wins
		if (player1Wins === 2 || player2Wins === 2) {
			this.completeCurrentMatch();
		}
	}
	
	/**
	 * Complete the current match
	 */
	public completeCurrentMatch(): void {
		const currentMatch = this.getCurrentMatch();
		if (!currentMatch) return;
		
		// Mark as completed
		currentMatch.completed = true;
		currentMatch.isCurrent = false;
		
		// Count wins for each player
		const player1Wins = currentMatch.games.filter(
			g => g.winner === currentMatch.player1Index
		).length;
		
		const player2Wins = currentMatch.games.filter(
			g => g.winner === currentMatch.player2Index
		).length;
		
		// Determine match winner
		if (player1Wins > player2Wins) {
			currentMatch.winner = currentMatch.player1Index;
			this.tournamentPlayers[currentMatch.player1Index].wins++;
		} else {
			currentMatch.winner = currentMatch.player2Index;
			this.tournamentPlayers[currentMatch.player2Index].wins++;
		}
		
		// Reset current game counter
		this.currentGameInMatch = 0;
		
		// Move to next match or to finals
		if (this.tournamentPhase === 'pool') {
			this.currentMatchIndex++;
			
			// Check if pool phase is complete
			if (this.currentMatchIndex >= this.tournamentMatches.length - 1) { // -1 because the last one is finals
				this.prepareFinals();
			}
		} else if (this.tournamentPhase === 'finals') {
			// Tournament is complete
			this.tournamentPhase = 'complete';
		}
	}
	
	/**
	 * Prepare for the finals phase
	 */
	private prepareFinals(): void {
		// Sort players by wins (and then by games won as tiebreaker)
		const sortedPlayers = [...this.tournamentPlayers]
			.sort((a, b) => b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
		
		// Get top 2 player indices
		const finalist1Index = this.tournamentPlayers.findIndex(p => p.id === sortedPlayers[0].id);
		const finalist2Index = this.tournamentPlayers.findIndex(p => p.id === sortedPlayers[1].id);
		
		// Create finals match
		this.tournamentMatches.push({
			player1Index: finalist1Index,
			player2Index: finalist2Index,
			gamesPlayed: 0,
			games: [],
			completed: false
		});
		
		this.tournamentPhase = 'finals';
		this.currentMatchIndex = this.tournamentMatches.length - 1;
		this.currentGameInMatch = 0;
	}
	
	/**
	 * Get the next game information
	 */
	public getNextGameInfo(): {
		isNewMatch: boolean;
		matchIndex: number;
		gameInMatch: number;
		matchInfo: {
			player1Id: number;
			player2Id: number;
			player1Name: string;
			player2Name: string;
			player1Color: string;
			player2Color: string;
		};
		isFinals: boolean;
	} | null {
		const currentMatch = this.getCurrentMatch();
		if (!currentMatch) return null;
		
		const player1 = this.tournamentPlayers[currentMatch.player1Index];
		const player2 = this.tournamentPlayers[currentMatch.player2Index];
		
		return {
			isNewMatch: currentMatch.gamesPlayed === 0,
			matchIndex: this.currentMatchIndex,
			gameInMatch: this.currentGameInMatch,
			matchInfo: {
				player1Id: player1.id,
				player2Id: player2.id,
				player1Name: player1.name,
				player2Name: player2.name,
				player1Color: player1.color,
				player2Color: player2.color
			},
			isFinals: this.tournamentPhase === 'finals'
		};
	}
	
	/**
	 * Get tournament standings for all players
	 */
	public getTournamentStandings(): Array<{
		name: string;
		wins: number;
		gamesWon: number;
		gamesLost: number;
		position: number;
	}> {
		// Sort players by wins and then by game difference
		const sortedPlayers = [...this.tournamentPlayers]
			.sort((a, b) => b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
		
		return sortedPlayers.map((player, index) => ({
			name: player.name,
			wins: player.wins,
			gamesWon: player.gamesWon,
			gamesLost: player.gamesLost,
			position: index + 1
		}));
	}
	
	/**
	 * Get all tournament matches for display
	 */
	public getTournamentSchedule(): Array<{
		matchIndex: number;
		player1Name: string;
		player2Name: string;
		player1Score?: number;
		player2Score?: number;
		isComplete: boolean;
		isCurrent: boolean;
		isFinals: boolean;
	}> {
		return this.tournamentMatches.map((match, index) => {
			const player1 = this.tournamentPlayers[match.player1Index];
			const player2 = this.tournamentPlayers[match.player2Index];
			
			// Calculate match scores (number of games won by each player)
			const player1Score = match.games.filter(g => g.winner === match.player1Index).length;
			const player2Score = match.games.filter(g => g.winner === match.player2Index).length;
			
			return {
				matchIndex: index,
				player1Name: player1.name,
				player2Name: player2.name,
				player1Score: match.completed ? player1Score : undefined,
				player2Score: match.completed ? player2Score : undefined,
				isComplete: match.completed,
				isCurrent: index === this.currentMatchIndex,
				isFinals: index === this.tournamentMatches.length - 1 && this.tournamentPhase !== 'pool'
			};
		});
	}
	
	/**
	 * Get current tournament phase
	 */
	public getTournamentPhase(): TournamentPhase {
		return this.tournamentPhase;
	}
	
	/**
	 * Get the tournament ID
	 */
	public getTournamentId(): string | null {
		return this.tournamentId;
	}
	
	/**
	 * Reset the tournament cache
	 */
	public clearTournament(): void {
		this.tournamentId = null;
		this.tournamentPlayers = [];
		this.tournamentMatches = [];
		this.currentMatchIndex = 0;
		this.currentGameInMatch = 0;
		this.tournamentPhase = 'not_started';
	}
	
	/**
	 * Get the tournament winner (only valid if tournament is complete)
	 */
	public getTournamentWinner(): {
		id: number;
		name: string;
		color: string;
	} | null {
		if (this.tournamentPhase !== 'complete') {
			return null;
		}
		
		const finalMatch = this.tournamentMatches[this.tournamentMatches.length - 1];
		if (!finalMatch || !finalMatch.winner) {
			return null;
		}
		
		const winner = this.tournamentPlayers[finalMatch.winner];
		return {
			id: winner.id,
			name: winner.name,
			color: winner.color
		};
	}
	
	/**
	 * Get all tournament players
	 */
	public getTournamentPlayers(): TournamentPlayer[] {
		return [...this.tournamentPlayers];
	}
	
	/**
	 * Get all tournament matches
	 */
	public getTournamentMatches(): TournamentMatch[] {
		return [...this.tournamentMatches];
	}
	
	/**
	 * Get the current match index
	 */
	public getCurrentMatchIndex(): number {
		return this.currentMatchIndex;
	}
	
	/**
	 * Initialize tournament with player information
	 */
	public initializeTournament(playerIds: number[], playerNames: string[], playerColors: string[]): void {
		console.log('Initializing tournament with:', { playerIds, playerNames, playerColors });
		
		// Store players
		this.tournamentPlayers = playerIds.map((id, index) => ({
			id,
			name: playerNames[index] || `Player ${index + 1}`,
			color: playerColors[index] || '#ffffff',
			wins: 0,
			gamesWon: 0,
			gamesLost: 0
		}));
		
		// Generate round-robin matches
		this.generatePoolMatches();
		
		// Set initial match as current
		if (this.tournamentMatches.length > 0) {
			this.currentMatchIndex = 0;
			this.tournamentMatches[0].isCurrent = true;
		}
		
		// Set initial phase
		this.tournamentPhase = 'not_started';
		
		console.log('Tournament initialized:', { 
			players: this.tournamentPlayers,
			matches: this.tournamentMatches,
			phase: this.tournamentPhase
		});
	}
	
	/**
	 * Set the current match index
	 */
	public setCurrentMatchIndex(index: number): void {
		// Clear current flag from all matches
		this.tournamentMatches.forEach(match => {
			match.isCurrent = false;
		});
		
		// Set the new current match index
		if (index >= 0 && index < this.tournamentMatches.length) {
			this.currentMatchIndex = index;
			this.tournamentMatches[index].isCurrent = true;
		}
	}
	
	/**
	 * Find the next match that needs to be played
	 */
	public findNextMatchIndex(): number {
		// Look for the first non-completed match
		for (let i = 0; i < this.tournamentMatches.length; i++) {
			if (!this.tournamentMatches[i].completed) {
				return i;
			}
		}
		return -1; // No more matches to play
	}
	
	/**
	 * Set the tournament phase
	 */
	public setTournamentPhase(phase: TournamentPhase): void {
		this.tournamentPhase = phase;
		
		// If moving to pool phase, make sure the first match is marked as current
		if (phase === 'pool' && this.tournamentMatches.length > 0) {
			this.setCurrentMatchIndex(0);
		}
		
		// If moving to finals phase, make sure the finals match is marked as current
		if (phase === 'finals' && this.tournamentMatches.length > 0) {
			this.setCurrentMatchIndex(this.tournamentMatches.length - 1);
		}
	}
}

// Export the singleton instance
export const TournamentCache = TournamentCacheSingleton.getInstance();
