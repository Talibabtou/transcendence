import { TournamentPhase, TournamentPlayer, TournamentMatch } from '@website/types/components';
import { NotificationManager } from '@website/scripts/services';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for player match info
 */
interface PlayerMatchInfo {
	player1Id: string;
	player2Id: string;
	player1Name: string;
	player2Name: string;
	player1Color: string;
	player2Color: string;
}

/**
 * Tournament cache singleton responsible for managing tournament state
 */
class TournamentCacheSingleton {
	private static instance: TournamentCacheSingleton;
	
	// Tournament data
	private tournamentId: string | null = null;
	private tournamentPlayers: TournamentPlayer[] = [];
	private tournamentMatches: TournamentMatch[] = [];
	private currentMatchIndex: number = 0;
	private tournamentPhase: TournamentPhase = 'pool';
	
	private constructor() {}
	
	/**
	 * Get singleton instance
	 */
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
		try {
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
		} catch (error) {
			NotificationManager.handleError(error);
			throw error;
		}
	}
	
	/**
	 * Initialize tournament schedule after players are registered
	 */
	public initTournamentSchedule(): void {
		try {
			if (this.tournamentPlayers.length !== 4) {
				throw new Error('Cannot initialize tournament without 4 players');
			}
			
			this.generatePoolMatches();
			
			this.tournamentPhase = 'pool';
			this.currentMatchIndex = 0;
		} catch (error) {
			NotificationManager.handleError(error);
			throw error;
		}
	}
	
	/**
	 * Initialize tournament with player information
	 * @param playerIds Array of player IDs
	 * @param playerNames Array of player names
	 * @param playerColors Array of player colors
	 */
	public initializeTournament(playerIds: string[], playerNames: string[], playerColors: string[]): void {
		try {
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
			
			this.saveToLocalStorage();
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Start the tournament
	 */
	public startTournament(): void {
		try {
			if (this.tournamentPhase !== 'pool') return;
			
			this.setTournamentPhase('pool');
			this.shuffleTournamentMatches();
			this.setCurrentMatchIndex(0);
			
			this.saveToLocalStorage();
		} catch (error) {
			NotificationManager.handleError(error);
		}
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
		if (this.tournamentPhase === 'complete' || this.currentMatchIndex >= this.tournamentMatches.length) {
			return null;
		}
		
		return this.tournamentMatches[this.currentMatchIndex];
	}
	
	/**
	 * Set the current match index
	 * @param index Index of the match to set as current
	 */
	public setCurrentMatchIndex(index: number): void {
		try {
			this.tournamentMatches.forEach(match => {
				match.isCurrent = false;
			});
			
			if (index >= 0 && index < this.tournamentMatches.length) {
				this.currentMatchIndex = index;
				this.tournamentMatches[index].isCurrent = true;
			}
		} catch (error) {
			NotificationManager.handleError(error);
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
	public recordGameResult(player1Score: number, player2Score: number, matchId?: string): void {
		try {
			const currentMatch = this.getCurrentMatch();
			if (!currentMatch) {
				NotificationManager.showError("Cannot record game result: No current match found");
				return;
			}
			
			const winnerIndex = player1Score > player2Score ? 
				currentMatch.player1Index : currentMatch.player2Index;
			
			// Add game result
			currentMatch.games.push({
				winner: winnerIndex,
				player1Score,
				player2Score,
				matchId
			});
			
			currentMatch.gamesPlayed++;
			
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
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Complete the current match
	 */
	public completeCurrentMatch(): void {
		try {
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
			} else if (this.tournamentPhase === 'finals') {
				this.tournamentPhase = 'complete';
			}
			
			this.saveToLocalStorage();
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Check if all pool matches are completed
	 * @returns true if all pool matches except finals are completed
	 */
	public areAllPoolMatchesCompleted(): boolean {
		if (this.tournamentPhase !== 'pool') return false;
		
		// Check if all non-finals matches are completed
		for (let i = 0; i < this.tournamentMatches.length - 1; i++) {
			if (!this.tournamentMatches[i].completed) {
				return false;
			}
		}
		
		return true;
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
		matchInfo: PlayerMatchInfo;
		isFinals: boolean;
	} | null {
		try {
			const currentMatch = this.getCurrentMatch();
			if (!currentMatch) {
				return null;
			}
			if (currentMatch.isFinals && this.tournamentPhase === 'pool') {
				return null;
			}
			const p1Idx = currentMatch.player1Index;
			const p2Idx = currentMatch.player2Index;
			if (
				typeof p1Idx !== 'number' || p1Idx < 0 || p1Idx >= this.tournamentPlayers.length ||
				typeof p2Idx !== 'number' || p2Idx < 0 || p2Idx >= this.tournamentPlayers.length
			) {
				return null;
			}

			const player1 = this.tournamentPlayers[p1Idx];
			const player2 = this.tournamentPlayers[p2Idx];

			if (!player1 || !player2) {
				return null;
			}
			
			return {
				isNewMatch: currentMatch.gamesPlayed === 0,
				matchIndex: this.currentMatchIndex,
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
		} catch (error) {
			NotificationManager.handleError(error);
			return null;
		}
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
		try {
			const sortedPlayers = [...this.tournamentPlayers]
				.sort((a, b) => b.wins - a.wins || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
			
			return sortedPlayers.map((player, index) => ({
				name: player.name,
				wins: player.wins,
				gamesWon: player.gamesWon,
				gamesLost: player.gamesLost,
				position: index + 1
			}));
		} catch (error) {
			NotificationManager.handleError(error);
			return [];
		}
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
		try {
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
					player1Name,
					player2Name,
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
		} catch (error) {
			NotificationManager.handleError(error);
			return [];
		}
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
		try {
			if (this.tournamentPhase !== 'complete') {
				return null;
			}
			
			const finalMatch = this.tournamentMatches[this.tournamentMatches.length - 1];
			if (!finalMatch || finalMatch.winner === undefined) {
				return null;
			}
			
			const winner = this.tournamentPlayers[finalMatch.winner];
			return {
				id: winner.id,
				name: winner.name,
				color: winner.color
			};
		} catch (error) {
			NotificationManager.handleError(error);
			return null;
		}
	}
	
	/**
	 * Get all tournament players
	 * @returns Array of tournament players
	 */
	public getTournamentPlayers(): TournamentPlayer[] {
		return [...this.tournamentPlayers];
	}
	
	/**
	 * Get all tournament matches structure (without results)
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
		try {
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
		} catch (error) {
			NotificationManager.handleError(error);
			return { playerIds: [], playerNames: [], playerColors: [] };
		}
	}
	
	/**
	 * Get basic tournament data for querying results
	 * @returns Basic tournament state
	 */
	public getTournamentData(): {
		tournamentId: string | null;
		players: TournamentPlayer[];
		matches: TournamentMatch[];
		currentMatchIndex: number;
		phase: TournamentPhase;
	} {
		return {
			tournamentId: this.tournamentId,
			players: [...this.tournamentPlayers],
			matches: [...this.tournamentMatches],
			currentMatchIndex: this.currentMatchIndex,
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
		try {
			this.tournamentPhase = phase;
			
			if (phase === 'pool' && this.tournamentMatches.length > 0) {
				this.setCurrentMatchIndex(0);
			}
			
			if (phase === 'finals' && this.tournamentMatches.length > 0) {
				this.setCurrentMatchIndex(this.tournamentMatches.length - 1);
			}
			
			this.saveToLocalStorage();
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Reset the tournament cache
	 */
	public clearTournament(): void {
		try {
			this.tournamentId = null;
			this.tournamentPlayers = [];
			this.tournamentMatches = [];
			this.currentMatchIndex = 0;
			this.tournamentPhase = 'pool';
			localStorage.removeItem('tournament_state');
			localStorage.removeItem('tournament_timestamp');
		} catch (error) {
			NotificationManager.handleError(error);
		}
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
			this.tournamentPhase = state.phase;
			
			return true;
		} catch (error) {
			NotificationManager.handleError(error);
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
				phase: this.tournamentPhase
			};
			localStorage.setItem('tournament_state', JSON.stringify(state));
			localStorage.setItem('tournament_timestamp', Date.now().toString());
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Get the tournament expiration time in milliseconds
	 * @returns Expiration time or -1 if no tournament is saved
	 */
	public getExpirationTime(): number {
		try {
			const timestamp = localStorage.getItem('tournament_timestamp');
			if (!timestamp) return -1;
			
			const maxAge = 60 * 60 * 1000; // 1 hour
			const createTime = parseInt(timestamp, 10);
			return createTime + maxAge;
		} catch (error) {
			NotificationManager.handleError(error);
			return -1;
		}
	}
	
	/**
	 * Update tournament matches with data from server
	 * @param serverMatches Array of tournament matches from server
	 */
	public updateMatchFromServer(serverMatches: any[]): void {
		try {
			if (!serverMatches || !Array.isArray(serverMatches) || serverMatches.length === 0) {
				return;
			}
			
			// Process each match from the server and update our local matches
			for (const serverMatch of serverMatches) {
				// Find player indexes in our tournament players array
				const player1Index = this.tournamentPlayers.findIndex(p => p.id === serverMatch.id1);
				const player2Index = this.tournamentPlayers.findIndex(p => p.id === serverMatch.id2);
				
				if (player1Index === -1 || player2Index === -1) continue;
				
				// Find corresponding match in our tournament matches
				const matchIndex = this.tournamentMatches.findIndex(m => 
					(m.player1Index === player1Index && m.player2Index === player2Index) ||
					(m.player1Index === player2Index && m.player2Index === player1Index)
				);
				
				if (matchIndex === -1 || this.tournamentMatches[matchIndex].isFinals) continue;
				
				const match = this.tournamentMatches[matchIndex];
				
				// Update match with server data
				match.completed = true;
				match.games = [{
					winner: serverMatch.goals1 > serverMatch.goals2 ? match.player1Index : match.player2Index,
					player1Score: serverMatch.goals1,
					player2Score: serverMatch.goals2,
					matchId: serverMatch.matchId
				}];
				match.gamesPlayed = 1;
				
				// Update player stats
				if (serverMatch.goals1 > serverMatch.goals2) {
					match.winner = match.player1Index;
					this.tournamentPlayers[match.player1Index].wins++;
					this.tournamentPlayers[match.player1Index].gamesWon++;
					this.tournamentPlayers[match.player2Index].gamesLost++;
				} else {
					match.winner = match.player2Index;
					this.tournamentPlayers[match.player2Index].wins++;
					this.tournamentPlayers[match.player2Index].gamesWon++;
					this.tournamentPlayers[match.player1Index].gamesLost++;
				}
			}
			
			this.saveToLocalStorage();
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Cancel the tournament and return to the menu
	 */
	public cancelTournament(): void {
		try {
			this.clearTournament();
			document.dispatchEvent(new CustomEvent('tournament-cancelled'));
		} catch (error) {
			NotificationManager.handleError(error);
		}
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
	try {
		const players = TournamentCache.getTournamentPlayers();
		return players.some(player => player.id === userId);
	} catch (error) {
		NotificationManager.handleError(error);
		return false;
	}
}
