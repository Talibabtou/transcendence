import { Match, GameMode } from '@website/types';
import { NotificationManager } from '@website/scripts/services';

/**
 * Extended match data returned by DB service
 */
interface ExtendedMatch extends Match {
	player1: { pseudo: string; };
	player2: { pseudo: string; };
	player1Score: number;
	player2Score: number;
}

/**
 * Structure for match result data
 */
interface MatchResult {
	winner: string | null;
	player1Name: string;
	player2Name: string;
	player1Score: number;
	player2Score: number;
	matchId?: string;
	gameMode?: GameMode;
	isBackgroundGame?: boolean;
	isTimeout?: boolean;
}

/**
 * Game info parameter interface
 */
interface GameInfo {
	gameMode: GameMode;
	playerIds?: string[];
	playerNames?: string[];
	playerColors?: string[];
	isFinal?: boolean;
}

/**
 * Singleton class to manage match caching and state
 */
class MatchCacheSingleton {
	private static instance: MatchCacheSingleton;
	private cache: Map<string, Promise<ExtendedMatch>> = new Map();
	private completedMatches: Set<string> = new Set();
	private lastGameMode: GameMode = GameMode.SINGLE;
	private lastPlayerIds: string[] = [];
	private lastPlayerNames: string[] = [];
	private lastPlayerColors: string[] = [];
	private lastMatchResult: MatchResult | null = null;
	
	private constructor() {}
	
	/**
	 * Get singleton instance
	 */
	public static getInstance(): MatchCacheSingleton {
		if (!MatchCacheSingleton.instance) {
			MatchCacheSingleton.instance = new MatchCacheSingleton();
		}
		return MatchCacheSingleton.instance;
	}
	
	/**
	 * Gets the winner's name from a match
	 * @param match Match data to evaluate
	 */
	public getWinnerName(match: ExtendedMatch): string {
		try {
			return match.player1Score > match.player2Score 
				? match.player1.pseudo 
				: match.player2.pseudo;
		} catch (error) {
			NotificationManager.handleError(error);
			return 'Unknown';
		}
	}
	
	/**
	 * Checks if a match has already been processed
	 * @param matchId ID of the match to check
	 */
	public isMatchCompleted(matchId: string): boolean {
		return this.completedMatches.has(matchId);
	}
	
	/**
	 * Marks a match as completed
	 * @param matchId ID of the match to mark as completed
	 */
	public markMatchCompleted(matchId: string): void {
		try {
			this.completedMatches.add(matchId);
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Set current game information
	 * @param gameInfo Game information to set
	 */
	public setCurrentGameInfo(gameInfo: GameInfo): void {
		try {
			this.lastGameMode = gameInfo.gameMode;
			if (gameInfo.playerIds) this.lastPlayerIds = [...gameInfo.playerIds];
			if (gameInfo.playerNames) this.lastPlayerNames = [...gameInfo.playerNames];
			if (gameInfo.playerColors) this.lastPlayerColors = [...gameInfo.playerColors];
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Get current game information
	 */
	public getCurrentGameInfo() {
		try {
			return {
				gameMode: this.lastGameMode,
				playerIds: [...this.lastPlayerIds],
				playerNames: [...this.lastPlayerNames],
				playerColors: [...this.lastPlayerColors]
			};
		} catch (error) {
			NotificationManager.handleError(error);
			return {
				gameMode: GameMode.SINGLE,
				playerIds: [],
				playerNames: [],
				playerColors: []
			};
		}
	}
	
	/**
	 * Stores the last match result
	 * @param result Match result to store
	 */
	public setLastMatchResult(result: MatchResult): void {
		try {
			this.lastMatchResult = {
				...result,
				player1Name: result.player1Name || 'Player 1',
				player2Name: result.player2Name || 'Player 2',
				player1Score: result.player1Score || 0,
				player2Score: result.player2Score || 0
			};
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Gets the last match result
	 */
	public getLastMatchResult(): MatchResult | null {
		return this.lastMatchResult ? { ...this.lastMatchResult } : null;
	}
	
	/**
	 * Invalidates cache for a specific match
	 * @param matchId ID of the match to invalidate
	 */
	public invalidateMatch(matchId: string): void {
		try {
			this.cache.delete(matchId);
			this.completedMatches.delete(matchId);
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
	
	/**
	 * Clears all cached data
	 */
	public clearCache(): void {
		try {
			this.cache.clear();
			this.completedMatches.clear();
			this.lastGameMode = GameMode.SINGLE;
			this.lastPlayerIds = [];
			this.lastPlayerNames = [];
			this.lastPlayerColors = [];
			this.lastMatchResult = null;
		} catch (error) {
			NotificationManager.handleError(error);
		}
	}
}

export const MatchCache = MatchCacheSingleton.getInstance(); 