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
		// First check if already connected or connecting
		if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
			console.log('WebSocket is already connected or connecting.');
			return;
		}

		// Get token from storage
		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		
		// Only attempt to connect if a token exists
		if (!token) {
			console.log('No authentication token available. WebSocket connection aborted.');
			return;
		}
		
		// Connect with token
		const tokenParam = `?token=${token}`;
		const connectionUrl = this.url.split('?')[0] + tokenParam;
		
		console.log('Establishing WebSocket connection with token');
		this.socket = new WebSocket(connectionUrl);
		this.setupSocketHandlers();
	}

	private setupSocketHandlers(): void {
		if (!this.socket) return;
		
		this.socket.onopen = () => {
			console.log('WebSocket connection established');
		};

		this.socket.onmessage = (event) => {
			const message = JSON.parse(event.data as string);
			console.log('WebSocket message received:', message);
		};

		this.socket.onerror = (error) => {
			console.error('WebSocket error:', error);
		};

		this.socket.onclose = () => {
			console.log('WebSocket connection closed');
		};
	}

	public sendMessage(message: any): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		} else {
			console.error('WebSocket is not connected.');
		}
	}

	public disconnect(): void {
		if (this.socket) {
			this.socket.close();
		}
	}

	public updateToken(token: string | null): void {
		// Disconnect existing connection
		this.disconnect();
		
		if (token) {
			// Create a new URL with the token
			const tokenParam = token ? `?token=${token}` : '';
			const newUrl = this.url.split('?')[0] + tokenParam;
			
			// Reconnect with the new URL
			this.socket = new WebSocket(newUrl);
			this.setupSocketHandlers();
		}
	}

	public getReadyState(): number | null {
		return this.socket ? this.socket.readyState : null;
	}
}

// Example of how to get the instance (ensure URL is provided, e.g., from env)
// const websocketUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8000/ws/status/';
// export const webSocketClient = WebSocketClient.getInstance(websocketUrl); 