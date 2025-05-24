import { v4 as uuidv4 } from 'uuid';

/**
 * Structure to represent a tournament player
 */
interface TournamentPlayer {
	id: string;
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
	isFinals: boolean;
}

/**
 * Tournament state types
 */
export type TournamentPhase = 'pool' | 'finals' | 'complete';

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
	private tournamentPhase: TournamentPhase = 'pool';
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
	public registerPlayers(playerIds: string[], playerNames: string[], playerColors: string[]): string {
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
					completed: false,
					isFinals: false
				});
			}
		}
		
		// Shuffle the pool matches for randomness
		this.shuffleTournamentMatches();
		
		// Add a placeholder for the finals match structure
		this.tournamentMatches.push({
			player1Index: -1,
			player2Index: -1,
			gamesPlayed: 0,
			games: [],
			completed: false,
			isFinals: true
		});
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
		if (this.tournamentPhase === 'complete') {
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
		if (!currentMatch) {
			console.error("Cannot record game result: No current match found");
			return;
		}
		
		console.log("Recording game result:", { 
			player1Score, 
			player2Score, 
			currentMatch: { 
				player1Index: currentMatch.player1Index, 
				player2Index: currentMatch.player2Index 
			} 
		});
		
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
		
		this.completeCurrentMatch();
		
		this.saveToLocalStorage();
		console.log("Tournament state after recording result:", this.getTournamentData());
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
		
		// Determine match winner
		const player1Wins = currentMatch.games.filter(g => g.winner === currentMatch.player1Index).length;
		const player2Wins = currentMatch.games.filter(g => g.winner === currentMatch.player2Index).length;
		
		if (player1Wins > player2Wins) {
			currentMatch.winner = currentMatch.player1Index;
			this.tournamentPlayers[currentMatch.player1Index].wins++;
		} else {
			currentMatch.winner = currentMatch.player2Index;
			this.tournamentPlayers[currentMatch.player2Index].wins++;
		}
		
		// Move to next match or finals
		if (this.tournamentPhase === 'pool') {
			this.currentMatchIndex++;
			if (this.currentMatchIndex >= this.tournamentMatches.length - 1) {
				this.prepareFinals();
			}
		} else if (this.tournamentPhase === 'finals') {
			this.tournamentPhase = 'complete';
		}
		
		this.saveToLocalStorage();
	}
	
	/**
	 * Prepare for the finals phase
	 */
	private prepareFinals(): void {
		const sortedPlayers = [...this.tournamentPlayers]
			.sort((a, b) => b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
		
		const finalist1Index = this.tournamentPlayers.findIndex(p => p.id === sortedPlayers[0].id);
		const finalist2Index = this.tournamentPlayers.findIndex(p => p.id === sortedPlayers[1].id);
		
		// Find the finals match placeholder (should be the last one)
		const finalsMatchIndex = this.tournamentMatches.findIndex(m => m.isFinals);
		if (finalsMatchIndex !== -1) {
			this.tournamentMatches[finalsMatchIndex].player1Index = finalist1Index;
			this.tournamentMatches[finalsMatchIndex].player2Index = finalist2Index;
		} else {
			console.error("Finals match placeholder not found!");
		}
		
		this.tournamentPhase = 'finals';
		this.currentMatchIndex = finalsMatchIndex !== -1 ? finalsMatchIndex : this.tournamentMatches.length - 1;
		this.currentGameInMatch = 0;
		// Ensure the final match is marked as current
		this.setCurrentMatchIndex(this.currentMatchIndex); 
		
		this.saveToLocalStorage();
	}
	
	/**
	 * Get the next game information
	 */
	public getNextGameInfo(): {
		isNewMatch: boolean;
		matchIndex: number;
		gameInMatch: number;
		matchInfo: {
			player1Id: string;
			player2Id: string;
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
		games?: Array<{
			player1Score: number;
			player2Score: number;
		}>;
	}> {
		return this.tournamentMatches.map((match, index) => {
			const isFinalsMatch = match.isFinals;
			const isPoolPhase = this.tournamentPhase === 'pool';
			
			// Determine player names - use '?' for finals during pool phase
			const player1Name = (isFinalsMatch && isPoolPhase) 
				? '?' 
				: (match.player1Index >= 0 ? this.tournamentPlayers[match.player1Index].name : '?');
				
			const player2Name = (isFinalsMatch && isPoolPhase) 
				? '?' 
				: (match.player2Index >= 0 ? this.tournamentPlayers[match.player2Index].name : '?');

			// Use actual game scores instead of win counts
			const gameScores = match.completed && match.games.length > 0 ? {
				player1Score: match.games[0].player1Score, 
				player2Score: match.games[0].player2Score
			} : undefined;

			return {
				matchIndex: index,
				player1Name: player1Name,
				player2Name: player2Name,
				player1Score: gameScores?.player1Score,
				player2Score: gameScores?.player2Score,
				isComplete: match.completed,
				isCurrent: index === this.currentMatchIndex,
				isFinals: isFinalsMatch,
				games: match.games.map(game => ({
					player1Score: game.player1Score,
					player2Score: game.player2Score
				}))
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
		this.tournamentPhase = 'pool';
		localStorage.removeItem('tournament_state');
		localStorage.removeItem('tournament_timestamp');
	}
	
	/**
	 * Get the tournament winner (only valid if tournament is complete)
	 */
	public getTournamentWinner(): {
		id: string;
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
	public initializeTournament(playerIds: string[], playerNames: string[], playerColors: string[]): void {
		// Generate a tournament ID first
		this.tournamentId = uuidv4();
		
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
		
		// Set initial phase as POOL directly instead of not_started
		this.tournamentPhase = 'pool';
		
		console.log('Tournament initialized:', { 
			players: this.tournamentPlayers,
			matches: this.tournamentMatches,
			phase: this.tournamentPhase
		});
		
		this.saveToLocalStorage();
	}
	
	/**
	 * Set the current match index
	 */
	public setCurrentMatchIndex(index: number): void {
		console.log('Setting current match index to:', index);
		
		// Clear current flag from all matches
		this.tournamentMatches.forEach(match => {
			match.isCurrent = false;
		});
		
		// Set the new current match index
		if (index >= 0 && index < this.tournamentMatches.length) {
			this.currentMatchIndex = index;
			this.tournamentMatches[index].isCurrent = true;
			console.log('Current match set:', this.tournamentMatches[index]);
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
		
		this.saveToLocalStorage();
	}
	
	/**
	 * Restore tournament state from localStorage
	 */
	public restoreFromLocalStorage(): boolean {
		try {
			const savedState = localStorage.getItem('tournament_state');
			if (!savedState) return false;
			
			const timestamp = localStorage.getItem('tournament_timestamp');
			const maxAge = 60 * 60 * 1000;
			
			// Check if tournament is too old
			if (timestamp && Date.now() - parseInt(timestamp) > maxAge) {
				localStorage.removeItem('tournament_state');
				localStorage.removeItem('tournament_timestamp');
				return false;
			}
			
			const state = JSON.parse(savedState);
			this.tournamentId = state.tournamentId;
			this.tournamentPlayers = state.players;
			this.tournamentMatches = state.matches;
			this.currentMatchIndex = state.currentMatchIndex;
			this.currentGameInMatch = state.currentGameInMatch;
			this.tournamentPhase = state.phase;
			
			return true;
		} catch (error) {
			console.error('Failed to restore tournament:', error);
			return false;
		}
	}
	
	/**
	 * Save tournament state to localStorage
	 */
	public saveToLocalStorage(): void {
		try {
			const state = {
				tournamentId: this.tournamentId,
				players: this.tournamentPlayers,
				matches: this.tournamentMatches,
				currentMatchIndex: this.currentMatchIndex,
				currentGameInMatch: this.currentGameInMatch,
				phase: this.tournamentPhase
			};
			localStorage.setItem('tournament_state', JSON.stringify(state));
			localStorage.setItem('tournament_timestamp', Date.now().toString());
		} catch (error) {
			console.error("Failed to save tournament state:", error);
		}
	}
	
	/**
	 * Start the tournament
	 */
	public startTournament(): void {
		if (this.tournamentPhase !== 'pool') return;
		
		this.setTournamentPhase('pool');
		this.shuffleTournamentMatches();
		
		// Make sure to mark the first match as current
		this.setCurrentMatchIndex(0);
		
		// Set isCurrent flag explicitly
		if (this.tournamentMatches.length > 0) {
			this.tournamentMatches[0].isCurrent = true;
		}
		
		this.saveToLocalStorage();
	}
	
	/**
	 * Get current match player info
	 */
	public getCurrentMatchPlayerInfo(): {
		playerIds: string[];
		playerNames: string[];
		playerColors: string[];
	} {
		const match = this.getCurrentMatch();
		if (!match) return { playerIds: [], playerNames: [], playerColors: [] };
		
		return {
			playerIds: [
				this.tournamentPlayers[match.player1Index].id,
				this.tournamentPlayers[match.player2Index].id
			],
			playerNames: [
				this.tournamentPlayers[match.player1Index].name,
				this.tournamentPlayers[match.player2Index].name
			],
			playerColors: [
				this.tournamentPlayers[match.player1Index].color,
				this.tournamentPlayers[match.player2Index].color
			]
		};
	}
	
	/**
	 * Get complete tournament data for debugging or display
	 */
	public getTournamentData(): {
		tournamentId: string | null;
		players: TournamentPlayer[];
		matches: TournamentMatch[];
		currentMatchIndex: number;
		currentGameInMatch: number;
		phase: TournamentPhase;
	} {
		return {
			tournamentId: this.tournamentId,
			players: [...this.tournamentPlayers],
			matches: [...this.tournamentMatches],
			currentMatchIndex: this.currentMatchIndex,
			currentGameInMatch: this.currentGameInMatch,
			phase: this.tournamentPhase
		};
	}
	
	/**
	 * Get the tournament expiration time in milliseconds
	 * Returns -1 if no tournament is saved or timestamp is missing
	 */
	public getExpirationTime(): number {
		const timestamp = localStorage.getItem('tournament_timestamp');
		if (!timestamp) return -1;
		
		const maxAge = 60 * 60 * 1000;
		const createTime = parseInt(timestamp, 10);
		const expirationTime = createTime + maxAge;
		
		return expirationTime;
	}
}

// Export the singleton instance
export const TournamentCache = TournamentCacheSingleton.getInstance();

/**
 * Checks if a user ID is part of the current tournament players
 */
export function isUserInCurrentTournament(userId: string): boolean {
	const players = TournamentCache.getTournamentPlayers();
	return players.some(player => player.id === userId);
}
