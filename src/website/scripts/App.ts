import { Router, BackgroundPongGame, NavbarComponent } from './utils';

export class App {
		constructor() {
				this.initialize();
		}

		private initialize(): void {
				// Initialize the navbar logo
				NavbarComponent.initialize();
				// Always initialize the background Pong game
				window.backgroundPong = new BackgroundPongGame();
				// Initialize the router with the main content container
				const contentContainer = document.querySelector('.content-container') as HTMLElement;
				if (contentContainer) {
						new Router(contentContainer);
				} else {
						console.error('Could not find content container element');
				}
		}
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
		new App();
});
