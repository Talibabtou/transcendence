import { Player, PlayerType } from '@pong/types';

/**
 * Manages player controls and input handling based on game mode.
 * Handles switching between human and AI control for players.
 */
export class ControlsManager {
	// =========================================
	// Properties
	// =========================================
	private readonly player1: Player;
	private readonly player2: Player;

	/**
	 * Creates a new ControlsManager instance
	 * @param player1 The first player
	 * @param player2 The second player
	 */
	constructor(player1: Player, player2: Player) {
		this.player1 = player1;
		this.player2 = player2;
	}

	// =========================================
	// Public Methods
	// =========================================

	/**
	 * Sets up player controls based on the game mode
	 * @param gameMode The current game mode
	 */
	public setupControls(gameMode: 'single' | 'multi' | 'tournament' | 'background_demo'): void {
		switch (gameMode) {
			case 'single':
				this.setupSinglePlayerMode();
				break;
			case 'multi':
				this.setupMultiPlayerMode();
				break;
			case 'tournament':
				this.setupMultiPlayerMode();
				break;
			case 'background_demo':
				this.setupBackgroundMode();
				break;
		}
	}

	/**
	 * Cleans up all player controls
	 */
	public cleanup(): void {
		this.player1.unbindControls();
		if (!this.player2.isAIControlled()) {
			this.player2.unbindControls();
		}
	}

	// =========================================
	// Private Methods
	// =========================================

	/**
	 * Sets up controls for single player mode
	 * Player 1: Human, Player 2: AI
	 */
	private setupSinglePlayerMode(): void {
		this.player1.setControlType(PlayerType.HUMAN);
		this.player2.setControlType(PlayerType.AI);
		this.player1.bindControls();
	}

	/**
	 * Sets up controls for multiplayer mode
	 * Both players: Human
	 */
	private setupMultiPlayerMode(): void {
		this.player1.setControlType(PlayerType.HUMAN);
		this.player2.setControlType(PlayerType.HUMAN);
		this.player1.bindControls();
		this.player2.bindControls();
	}

	/**
	 * Sets up controls for background demo mode
	 * Both players: AI
	 */
	private setupBackgroundMode(): void {
		this.player1.setControlType(PlayerType.AI);
		this.player2.setControlType(PlayerType.AI);
	}
}
