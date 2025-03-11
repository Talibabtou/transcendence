import { Component, GameMode } from '@website/scripts/components';
import { GameManager } from '@website/scripts/utils';
import { GameEngine } from '@pong/game/engine';

interface GameCanvasState {
		visible: boolean;
		isPlaying: boolean;
		isPaused: boolean;
}

export class GameCanvasComponent extends Component<GameCanvasState> {
		private canvas: HTMLCanvasElement | null = null;
		private gameManager: GameManager;

		constructor(container: HTMLElement) {
				super(container, {
						visible: false,
						isPlaying: false,
						isPaused: false
				});

				this.gameManager = GameManager.getInstance();
		}

		beforeRender(): void {
		}

		render(): void {
				this.container.innerHTML = '';
		}

		// Start a game with the specified mode
		startGame(mode: GameMode): void {
				this.updateInternalState({
						visible: true,
						isPlaying: true
				});
	
				// Tell the game manager to start the game in our container
				this.gameManager.startMainGame(mode, this.container);
		}

		// Stop and hide the game
		stopGame(): void {
				this.updateInternalState({
						visible: false,
						isPlaying: false
				});
				this.gameManager.cleanupMainGame();
		}

		// Check if the game is over
		isGameOver(): boolean {
				const gameState = this.gameManager.getMainGameState();
				return gameState?.isGameOver || false;
		}
		
		// Get current game state
		getGameState(): any {
				return this.gameManager.getMainGameState();
		}
		
		destroy(): void {
				super.destroy();
		}
		
		public show(): void {
				if (this.canvas) {
						this.canvas.style.display = 'block';
				}
		}
		
		public hide(): void {
				if (this.canvas) {
						this.canvas.style.display = 'none';
				}
		}

		public getEngine(): GameEngine | null {
				return this.gameManager.getMainGameEngine();
		}
}
