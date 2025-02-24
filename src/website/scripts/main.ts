import { GameEngine } from '@pong/game/engine';
import { GAME_CONFIG } from '@pong/constants';

console.log('Website initialized');

// Initialize canvas
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// Initialize and start game
const context = canvas.getContext('2d') as CanvasRenderingContext2D;
const game = new GameEngine(context);

// Start game loop
setInterval(() => {
  game.update();
}, 1000 / GAME_CONFIG.FPS);

function render() {
  game.draw();
  requestAnimationFrame(render);
}
requestAnimationFrame(render); 
