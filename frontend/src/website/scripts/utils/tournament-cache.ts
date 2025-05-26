import { TournamentPhase, TournamentPlayer, TournamentMatch } from '@website/types/components';
import { v4 as uuidv4 } from 'uuid';
import { NotificationManager } from '../services/notification-manager';

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
	
	// =========================================
	// TOURNAMENT INITIALIZATION
	// =========================================
	
	/**
	 * Store registered players and initialize tournament
	 * @param playerIds Array of player IDs
	 * @param playerNames Array of player names
	 * @param playerColors Array of player colors
	 * @returns Unique tournament ID
	 */
	public registerPlayers(playerIds: string[], playerNames: string[], playerColors: string[]): string {
		if (playerIds.length !== 4 || playerNames.length !== 4 || playerColors.length !== 4) {
			throw new Error('Tournament requires exactly 4 players');
		}
		
		this.tournamentId = uuidv4();
		
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
		
		this.generatePoolMatches();
		
		this.tournamentPhase = 'pool';
		this.currentMatchIndex = 0;
		this.currentGameInMatch = 0;
	}
	
	/**
	 * Initialize tournament with player information
	 * @param playerIds Array of player IDs
	 * @param playerNames Array of player names
	 * @param playerColors Array of player colors
	 */
	public initializeTournament(playerIds: string[], playerNames: string[], playerColors: string[]): void {
		this.tournamentId = uuidv4();
		
		this.tournamentPlayers = playerIds.map((id, index) => ({
			id,
			name: playerNames[index] || `Player ${index + 1}`,
			color: playerColors[index] || '#ffffff',
			wins: 0,
			gamesWon: 0,
			gamesLost: 0
		}));
		
		this.generatePoolMatches();
		
		if (this.tournamentMatches.length > 0) {
			this.currentMatchIndex = 0;
			this.tournamentMatches[0].isCurrent = true;
		}
		
		this.tournamentPhase = 'pool';
		
		console.log('Tournament initialized:', { 
			players: this.tournamentPlayers,
			matches: this.tournamentMatches,
			phase: this.tournamentPhase
		});
		
		this.saveToLocalStorage();
	}
	
	/**
	 * Start the tournament
	 */
	public startTournament(): void {
		if (this.tournamentPhase !== 'pool') return;
		
		this.setTournamentPhase('pool');
		this.shuffleTournamentMatches();
		
		this.setCurrentMatchIndex(0);
		
		if (this.tournamentMatches.length > 0) {
			this.tournamentMatches[0].isCurrent = true;
		}
		
		this.saveToLocalStorage();
	}
	
	// =========================================
	// MATCH GENERATION AND MANAGEMENT
	// =========================================
	
	/**
	 * Generate the pool phase matches (round-robin)
	 */
	private generatePoolMatches(): void {
		this.tournamentMatches = [];
		
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
		
		this.shuffleTournamentMatches();
		
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
		for (let i = this.tournamentMatches.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.tournamentMatches[i], this.tournamentMatches[j]] = 
			[this.tournamentMatches[j], this.tournamentMatches[i]];
		}
	}
	
	/**
	 * Get the current match information
	 * @returns Current match or null if tournament is complete
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
	 * Set the current match index
	 * @param index Index of the match to set as current
	 */
	public setCurrentMatchIndex(index: number): void {
		console.log('Setting current match index to:', index);
		
		this.tournamentMatches.forEach(match => {
			match.isCurrent = false;
		});
		
		if (index >= 0 && index < this.tournamentMatches.length) {
			this.currentMatchIndex = index;
			this.tournamentMatches[index].isCurrent = true;
			console.log('Current match set:', this.tournamentMatches[index]);
		}
	}
	
	/**
	 * Find the next match that needs to be played
	 * @returns Index of the next match or -1 if no matches remain
	 */
	public findNextMatchIndex(): number {
		for (let i = 0; i < this.tournamentMatches.length; i++) {
			if (!this.tournamentMatches[i].completed) {
				return i;
			}
		}
		return -1;
	}
	
	// =========================================
	// GAME RESULTS AND TOURNAMENT PROGRESSION
	// =========================================
	
	/**
	 * Record the result of a game in the current match
	 * @param player1Score Score of player 1
	 * @param player2Score Score of player 2
	 * @param matchId Optional match ID
	 */
	public recordGameResult(player1Score: number, player2Score: number, matchId?: number): void {
		const currentMatch = this.getCurrentMatch();
		if (!currentMatch) {
			NotificationManager.showError("Cannot record game result: No current match found");
			return;
		}
		
		const winnerIndex = player1Score > player2Score ? 
			currentMatch.player1Index : currentMatch.player2Index;
		
		currentMatch.games.push({
			winner: winnerIndex,
			player1Score,
			player2Score,
			matchId
		});
		
		currentMatch.gamesPlayed++;
		this.currentGameInMatch++;
		
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
		
		currentMatch.completed = true;
		currentMatch.isCurrent = false;
		
		const player1Wins = currentMatch.games.filter(g => g.winner === currentMatch.player1Index).length;
		const player2Wins = currentMatch.games.filter(g => g.winner === currentMatch.player2Index).length;
		
		if (player1Wins > player2Wins) {
			currentMatch.winner = currentMatch.player1Index;
			this.tournamentPlayers[currentMatch.player1Index].wins++;
		} else {
			currentMatch.winner = currentMatch.player2Index;
			this.tournamentPlayers[currentMatch.player2Index].wins++;
		}
		
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
		
		const finalsMatchIndex = this.tournamentMatches.findIndex(m => m.isFinals);
		if (finalsMatchIndex !== -1) {
			this.tournamentMatches[finalsMatchIndex].player1Index = finalist1Index;
			this.tournamentMatches[finalsMatchIndex].player2Index = finalist2Index;
		} else {
			NotificationManager.showError("Finals match placeholder not found");
		}
		
		this.tournamentPhase = 'finals';
		this.currentMatchIndex = finalsMatchIndex !== -1 ? finalsMatchIndex : this.tournamentMatches.length - 1;
		this.currentGameInMatch = 0;
		this.setCurrentMatchIndex(this.currentMatchIndex); 
		
		this.saveToLocalStorage();
	}
	
	// =========================================
	// DATA ACCESS METHODS
	// =========================================
	
	/**
	 * Get the next game information
	 * @returns Information about the next game or null if tournament is complete
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
	 * @returns Array of player standings with position information
	 */
	public getTournamentStandings(): Array<{
		name: string;
		wins: number;
		gamesWon: number;
		gamesLost: number;
		position: number;
	}> {
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
	 * @returns Array of match information for UI display
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
			
			const player1Name = (isFinalsMatch && isPoolPhase) 
				? '?' 
				: (match.player1Index >= 0 ? this.tournamentPlayers[match.player1Index].name : '?');
				
			const player2Name = (isFinalsMatch && isPoolPhase) 
				? '?' 
				: (match.player2Index >= 0 ? this.tournamentPlayers[match.player2Index].name : '?');

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
	 * @returns Current tournament phase
	 */
	public getTournamentPhase(): TournamentPhase {
		return this.tournamentPhase;
	}
	
	/**
	 * Get the tournament ID
	 * @returns Tournament ID or null if no tournament exists
	 */
	public getTournamentId(): string | null {
		return this.tournamentId;
	}
	
	/**
	 * Get the tournament winner
	 * @returns Winner information or null if tournament is not complete
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
	 * @returns Array of tournament players
	 */
	public getTournamentPlayers(): TournamentPlayer[] {
		return [...this.tournamentPlayers];
	}
	
	/**
	 * Get all tournament matches
	 * @returns Array of tournament matches
	 */
	public getTournamentMatches(): TournamentMatch[] {
		return [...this.tournamentMatches];
	}
	
	/**
	 * Get the current match index
	 * @returns Current match index
	 */
	public getCurrentMatchIndex(): number {
		return this.currentMatchIndex;
	}
	
	/**
	 * Get current match player info
	 * @returns Player information for the current match
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
	 * @returns Complete tournament state
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
	
	// =========================================
	// TOURNAMENT PHASE MANAGEMENT
	// =========================================
	
	/**
	 * Set the tournament phase
	 * @param phase New tournament phase
	 */
	public setTournamentPhase(phase: TournamentPhase): void {
		this.tournamentPhase = phase;
		
		if (phase === 'pool' && this.tournamentMatches.length > 0) {
			this.setCurrentMatchIndex(0);
		}
		
		if (phase === 'finals' && this.tournamentMatches.length > 0) {
			this.setCurrentMatchIndex(this.tournamentMatches.length - 1);
		}
		
		this.saveToLocalStorage();
	}
	
	// =========================================
	// PERSISTENCE
	// =========================================
	
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
	 * Restore tournament state from localStorage
	 * @returns True if restoration was successful, false otherwise
	 */
	public restoreFromLocalStorage(): boolean {
		try {
			const savedState = localStorage.getItem('tournament_state');
			if (!savedState) return false;
			
			const timestamp = localStorage.getItem('tournament_timestamp');
			const maxAge = 60 * 60 * 1000;
			
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
			NotificationManager.showError("Failed to restore tournament");
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
			NotificationManager.showError("Failed to save tournament state");
		}
	}
	
	/**
	 * Get the tournament expiration time in milliseconds
	 * @returns Expiration time or -1 if no tournament is saved
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
 * @param userId User ID to check
 * @returns True if user is in the tournament, false otherwise
 */
export function isUserInCurrentTournament(userId: string): boolean {
	const players = TournamentCache.getTournamentPlayers();
	return players.some(player => player.id === userId);
}
