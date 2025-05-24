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

// Centralized connection management functions
const DEFAULT_WS_URL = 'ws://localhost:8085/ws/status';

/**
 * Connects to the WebSocket server after authentication
 * This is a centralized function to be called after login/2FA verification
 * @param token Optional JWT token to use directly (if not yet saved to storage)
 */
export function connectAuthenticatedWebSocket(token?: string): void {
	// Add a short delay to ensure token is available in storage
	setTimeout(() => {
		try {
			// If a token is provided directly, use it to initialize
			if (token) {
				const wsClient = WebSocketClient.getInstance(DEFAULT_WS_URL);
				// Store a reference to use in the direct connection
				const directToken = token;
				
				// Create URL with token
				const tokenParam = `?token=${directToken}`;
				const connectionUrl = DEFAULT_WS_URL.split('?')[0] + tokenParam;
				
				// Close existing connection if any
				wsClient.disconnect();
				
				// Create new connection with the token
				console.log('Establishing WebSocket connection with provided token');
				const socket = new WebSocket(connectionUrl);
				
				// Set up handlers
				socket.onopen = () => console.log('WebSocket connection established with provided token');
				socket.onmessage = (event) => {
					const message = JSON.parse(event.data as string);
					console.log('WebSocket message received:', message);
				};
				socket.onerror = (error) => console.error('WebSocket error:', error);
				socket.onclose = () => console.log('WebSocket connection closed');
				
				// Update the client's socket reference
				(wsClient as any).socket = socket;
			} else {
				// Standard connection using token from storage
				const wsClient = WebSocketClient.getInstance(DEFAULT_WS_URL);
				wsClient.connect();
			}
		} catch (err) {
			console.error('Error connecting to WebSocket after authentication:', err);
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
		console.log('WebSocket disconnected');
	} catch (err) {
		console.error('Error disconnecting WebSocket:', err);
	}
}
