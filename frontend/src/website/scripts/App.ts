import { NavbarComponent } from '@website/scripts/utils';
import { API_PREFIX } from '@shared/constants/path.const';
import { Router, NotificationManager, WebSocketClient } from '@website/scripts/services';
import { GameManager } from '@website/scripts/components';

declare global {
	interface Window {
		gameManager?: GameManager;
		webSocketClient?: WebSocketClient;
	}
}

export class App {
	private gameManager!: GameManager;
	private webSocketClient!: WebSocketClient;

	constructor() {
		this.initialize();
	}

	private initialize(): void {
		this.initializeNotificationManager();
		this.initializeNavbar();
		this.initializeGameManager();
		this.initializeWebSocketClient();
		this.initializeRouter();
	}

	private initializeNotificationManager(): void {
		try {
			NotificationManager;
		} catch (error) {
			console.error('Failed to initialize notification manager:', error);
		}
	}

	private initializeNavbar(): void {
		NavbarComponent.initialize();
	}

	private initializeGameManager(): void {
		try {
			this.gameManager = GameManager.getInstance();
			this.gameManager.initialize();
			this.gameManager.startBackgroundGame();
			window.gameManager = this.gameManager;
		} catch (error) {
			NotificationManager.showError('Failed to initialize game manager');
		}
	}

	private initializeWebSocketClient(): void {
		try {
			const token = localStorage.getItem('jwt_token') || '';
			const websocketUrl = `wss://localhost:8043/ws/status?token=${token}`; 
			this.webSocketClient = WebSocketClient.getInstance(websocketUrl);
			this.webSocketClient.connect();
			window.webSocketClient = this.webSocketClient;
		} catch (error) {
			NotificationManager.showError('Failed to initialize WebSocket client');
		}
	}

	private initializeRouter(): void {
		const contentContainer = document.querySelector('.content-container') as HTMLElement;
		if (contentContainer) {
			new Router(contentContainer);
		} else {
			NotificationManager.showError('Could not find content container element');
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new App();
});
