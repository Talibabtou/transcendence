import { Match, GameMode } from '@website/types';

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
	
	/**
	 * Set current game information
	 * @param gameInfo Game information to set
	 */
	public setCurrentGameInfo(gameInfo: {
		gameMode: GameMode;
		playerIds?: string[];
		playerNames?: string[];
		playerColors?: string[];
		isFinal?: boolean;
	}): void {
		this.lastGameMode = gameInfo.gameMode;
		if (gameInfo.playerIds) this.lastPlayerIds = [...gameInfo.playerIds];
		if (gameInfo.playerNames) this.lastPlayerNames = [...gameInfo.playerNames];
		if (gameInfo.playerColors) this.lastPlayerColors = [...gameInfo.playerColors];
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