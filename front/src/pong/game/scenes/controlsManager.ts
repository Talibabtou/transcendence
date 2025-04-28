import { Player, PlayerType } from '@pong/types';
import { GameScene, GameModeType } from '@pong/game/scenes/GameScene';

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
	private gameScene: GameScene | null = null;

	/**
	 * Creates a new ControlsManager instance
	 * @param player1 The first player
	 * @param player2 The second player
	 */
	constructor(player1: Player, player2: Player) {
		this.player1 = player1;
		this.player2 = player2;
	}

	/**
	 * Sets the reference to the game scene
	 */
	public setGameScene(scene: GameScene): void {
		this.gameScene = scene;
	}

	// =========================================
	// Public Methods
	// =========================================

	/**
	 * Sets up player controls based on the game mode
	 * @param gameMode The current game mode
	 */
	public setupControls(gameMode: GameModeType): void {
		// If we have a GameScene reference, use its methods for consistency
		if (this.gameScene) {
			if (this.gameScene.isSinglePlayer()) {
				this.setupSinglePlayerMode();
			} else if (this.gameScene.isMultiPlayer() || this.gameScene.isTournament()) {
				this.setupMultiPlayerMode();
			} else if (this.gameScene.isBackgroundDemo()) {
				this.setupBackgroundMode();
			}
			return;
		}
		
		// Legacy fallback if no GameScene is available
		switch (gameMode) {
			case 'single':
				this.setupSinglePlayerMode();
				break;
			case 'multi':
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
		if (this.player2.getPlayerType() !== PlayerType.HUMAN) {
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
		this.player1.setPlayerType(PlayerType.HUMAN);
		this.player2.setPlayerType(PlayerType.AI);
		this.player1.bindControls();
	}

	/**
	 * Sets up controls for multiplayer mode
	 * Both players: Human
	 */
	private setupMultiPlayerMode(): void {
		this.player1.setPlayerType(PlayerType.HUMAN);
		this.player2.setPlayerType(PlayerType.HUMAN);
		this.player1.bindControls();
		this.player2.bindControls();
	}

	/**
	 * Sets up controls for background demo mode
	 * Both players: AI
	 */
	private setupBackgroundMode(): void {
		this.player1.setPlayerType(PlayerType.BACKGROUND);
		this.player2.setPlayerType(PlayerType.BACKGROUND);
	}
}
