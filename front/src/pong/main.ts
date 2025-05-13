import { GameEngine } from '@pong/game/engine';
import { GAME_CONFIG } from '@pong/constants';

// =========================================
// Game Initialization
// =========================================
function initializeGame(): GameEngine {
	const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
	const context = canvas.getContext('2d') as CanvasRenderingContext2D;
	return new GameEngine(context);
}

// =========================================
// Game Loop
// =========================================
function startGameLoop(game: GameEngine): void {
	setInterval(() => {
		game.update(GAME_CONFIG.FRAME_TIME);
	}, 1000 / 60);

	function render(): void {
		game.draw(GAME_CONFIG.FRAME_TIME);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

// =========================================
// Main Entry Point
// =========================================
document.addEventListener('DOMContentLoaded', (): void => {
	const game = initializeGame();
	startGameLoop(game);

	// Add window unload handler
	window.addEventListener('unload', () => {
		game.cleanup();
	});
});
