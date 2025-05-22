import { Match, GameMode } from '@website/types';
import { DbService } from '@website/scripts/services';

/**
 * Extended match data returned by DB service
 */
interface ExtendedMatch extends Match {
	player1: { pseudo: string; };
	player2: { pseudo: string; };
	player1Score: number;
	player2Score: number;
}

// Update the interface for match results to include all needed fields
interface MatchResult {
	winner: string;
	player1Name: string;
	player2Name: string;
	player1Score: number;
	player2Score: number;
	matchId?: string;
	gameMode?: GameMode;
	isBackgroundGame?: boolean;
}

class MatchCacheSingleton {
	private static instance: MatchCacheSingleton;
	private cache: Map<string, Promise<ExtendedMatch>>;
	private completedMatches: Set<string>;
	private lastGameMode: GameMode = GameMode.SINGLE;
	private lastPlayerIds: string[] = [];
	private lastPlayerNames: string[] = [];
	private lastPlayerColors: string[] = [];
	
	// Store the last match result
	private lastMatchResult: MatchResult | null = null;
	
	private constructor() {
		this.cache = new Map();
		this.completedMatches = new Set();
	}
	
	public static getInstance(): MatchCacheSingleton {
		if (!MatchCacheSingleton.instance) {
			MatchCacheSingleton.instance = new MatchCacheSingleton();
		}
		return MatchCacheSingleton.instance;
	}
	
	/**
	 * Gets match data, either from cache or by fetching from DB
	 */
	public getMatchData(matchId: string): Promise<ExtendedMatch> {
		// Check if we already have a promise for this matchId
		if (this.cache.has(matchId)) {
			return this.cache.get(matchId)!;
		}
		
		// Create a new promise for the DB fetch
		// Use DbService directly from the import instead of dynamic import
		const dataPromise = DbService.getMatchDetails(matchId);

		// Store in cache
		this.cache.set(matchId, dataPromise);
		
		return dataPromise;
	}
	
	/**
	 * Gets the winner's name from a match
	 */
	public getWinnerName(match: ExtendedMatch): string {
		return match.player1Score > match.player2Score 
			? match.player1.pseudo 
			: match.player2.pseudo;
	}
	
	/**
	 * Checks if a match has already been processed
	 */
	public isMatchCompleted(matchId: string): boolean {
		return this.completedMatches.has(matchId);
	}
	
	/**
	 * Marks a match as completed
	 */
	public markMatchCompleted(matchId: string): void {
		this.completedMatches.add(matchId);
	}
	
	public setCurrentGameInfo(info: {
		gameMode: GameMode;
		playerIds?: string[];
		playerNames?: string[];
		playerColors?: string[];
	}): void {
		this.lastGameMode = info.gameMode;
		if (info.playerIds) this.lastPlayerIds = [...info.playerIds];
		if (info.playerNames) this.lastPlayerNames = [...info.playerNames];
		if (info.playerColors) this.lastPlayerColors = [...info.playerColors];
	}
	
	public getCurrentGameInfo(): {
		gameMode: GameMode;
		playerIds: string[];
		playerNames: string[];
		playerColors: string[];
	} {
		return {
			gameMode: this.lastGameMode,
			playerIds: [...this.lastPlayerIds],
			playerNames: [...this.lastPlayerNames],
			playerColors: [...this.lastPlayerColors]
		};
	}
	
	/**
	 * Stores the last match result
	 */
	public setLastMatchResult(result: MatchResult): void {
		this.lastMatchResult = {
			...result,
			player1Name: result.player1Name || 'Player 1',
			player2Name: result.player2Name || 'Player 2',
			player1Score: result.player1Score || 0,
			player2Score: result.player2Score || 0
		};
	}
	
	/**
	 * Gets the last match result
	 */
	public getLastMatchResult(): MatchResult | null {
		return this.lastMatchResult ? { ...this.lastMatchResult } : null;
	}
	
	/**
	 * Invalidates cache for a specific match
	 */
	public invalidateMatch(matchId: string): void {
		this.cache.delete(matchId);
		this.completedMatches.delete(matchId);
	}
	
	/**
	 * Clears all cached data
	 */
	public clearCache(): void {
		// Clear match data cache
		this.cache.clear();
		
		// Clear completed matches set
		this.completedMatches.clear();
		
		// Reset game mode to default
		this.lastGameMode = GameMode.SINGLE;
		
		// Clear player information
		this.lastPlayerIds = [];
		this.lastPlayerNames = [];
		this.lastPlayerColors = [];
		
		// Clear last match result
		this.lastMatchResult = null;
	}
}

export const MatchCache = MatchCacheSingleton.getInstance(); 