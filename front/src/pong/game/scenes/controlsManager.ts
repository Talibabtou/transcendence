import { Player, PlayerType } from '@pong/types';
import { GameScene } from '@pong/game/scenes/GameScene';
import { GameMode } from '@shared/types';

/**
 * Manages player controls and input handling based on game mode.
 * Handles switching between human and AI control for players.
 */
export class ControlsManager {
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
	 * Sets up player controls based on the game mode
	 * @param gameMode The current game mode
	 */
	public setupControls(gameMode: GameMode): void {
		if (this.gameScene) {
			if (this.gameScene.isSinglePlayer()) {
				this.setSinglePlayerMode();
			} else if (this.gameScene.isMultiPlayer() || this.gameScene.isTournament()) {
				this.setMultiPlayerMode();
			} else if (this.gameScene.isBackgroundDemo()) {
				this.setBackgroundMode();
			}
			return;
		}
		switch (gameMode) {
			case GameMode.SINGLE:
				this.setSinglePlayerMode();
				break;
			case GameMode.MULTI:
			case GameMode.TOURNAMENT:
				this.setMultiPlayerMode();
				break;
			case GameMode.BACKGROUND_DEMO:
				this.setBackgroundMode();
				break;
		}
	}

	/**
	 * Cleans up all player controls
	 */
	public cleanup(): void {
		this.player1.unbindControls();
		if (this.player2.PlayerType !== PlayerType.HUMAN) {
			this.player2.unbindControls();
		}
	}

	////////////////////////////////////////////////////////////
	// Getters and setters
	////////////////////////////////////////////////////////////
	public setGameScene(scene: GameScene): void { this.gameScene = scene; }

	private setSinglePlayerMode(): void {
		this.player1.setPlayerType(PlayerType.HUMAN);
		this.player2.setPlayerType(PlayerType.AI);
		this.player1.bindControls();
	}

	private setMultiPlayerMode(): void {
		this.player1.setPlayerType(PlayerType.HUMAN);
		this.player2.setPlayerType(PlayerType.HUMAN);
		this.player1.bindControls();
		this.player2.bindControls();
	}

	private setBackgroundMode(): void {
		this.player1.setPlayerType(PlayerType.BACKGROUND);
		this.player2.setPlayerType(PlayerType.BACKGROUND);
	}
}
