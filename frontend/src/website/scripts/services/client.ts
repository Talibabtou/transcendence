import { NotificationManager } from "./notification-manager";

export class WebSocketClient {
	private socket: WebSocket | null = null;
	private readonly url: string;
	private static instance: WebSocketClient;

	private constructor(url: string) {
		this.url = url;
	}

	public static getInstance(url?: string): WebSocketClient {
		if (!WebSocketClient.instance) {
			if (!url) {
				throw new Error("WebSocket URL must be provided on first instantiation.");
			}
			WebSocketClient.instance = new WebSocketClient(url);
		}
		return WebSocketClient.instance;
	}

	public connect(): void {
		if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
			return;
		}

		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		
		if (!token) {
			return;
		}
		
		const tokenParam = `?token=${token}`;
		const connectionUrl = this.url.split('?')[0] + tokenParam;
		
		this.socket = new WebSocket(connectionUrl);
		this.setupSocketHandlers();
	}

	private setupSocketHandlers(): void {
		if (!this.socket) return;
		
		this.socket.onopen = () => {};
		this.socket.onmessage = (event) => {
			JSON.parse(event.data as string);
		};
		this.socket.onerror = () => {};
		this.socket.onclose = () => {};
	}

	public sendMessage(message: any): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		}
	}

	public disconnect(): void {
		if (this.socket) {
			this.socket.close();
		}
	}

	public updateToken(token: string | null): void {
		this.disconnect();
		
		if (token) {
			const tokenParam = token ? `?token=${token}` : '';
			const newUrl = this.url.split('?')[0] + tokenParam;
			
			this.socket = new WebSocket(newUrl);
			this.setupSocketHandlers();
		}
	}

	public getReadyState(): number | null {
		return this.socket ? this.socket.readyState : null;
	}
}

const DEFAULT_WS_URL = 'ws://localhost:8085/ws/status';

/**
 * Connects to the WebSocket server after authentication
 * This is a centralized function to be called after login/2FA verification
 * @param token Optional JWT token to use directly (if not yet saved to storage)
 */
export function connectAuthenticatedWebSocket(token?: string): void {
	setTimeout(() => {
		try {
			if (token) {
				const wsClient = WebSocketClient.getInstance(DEFAULT_WS_URL);
				const directToken = token;
				const tokenParam = `?token=${directToken}`;
				const connectionUrl = DEFAULT_WS_URL.split('?')[0] + tokenParam;
				
				wsClient.disconnect();
				
				const socket = new WebSocket(connectionUrl);
				
				socket.onopen = () => {};
				socket.onmessage = (event) => {
					JSON.parse(event.data as string);
				};
				socket.onerror = () => {};
				socket.onclose = () => {};
				
				(wsClient as any).socket = socket;
			} else {
				const wsClient = WebSocketClient.getInstance(DEFAULT_WS_URL);
				wsClient.connect();
			}
		} catch (err) {
			NotificationManager.showError('Error connecting to WebSocket after authentication: ' + err);
		}
	}, 100); 
}

/**
 * Disconnects from the WebSocket server during logout
 * This is a centralized function to be called during logout
 */
export function disconnectWebSocket(): void {
	try {
		const wsClient = WebSocketClient.getInstance();
		wsClient.disconnect();
	} catch (err) {
		NotificationManager.showError('Error disconnecting WebSocket: ' + err);
	}
}
