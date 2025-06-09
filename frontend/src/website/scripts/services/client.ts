import { appState } from "@website/scripts/utils";
import { NotificationManager } from "@website/scripts/services";

type OnlineStatusChangeCallback = (userId: string, isOnline: boolean) => void;

const PING_INTERVAL = 30 * 1000;
const MAX_SERVER_INACTIVITY_DURATION = 75 * 1000;
const DEFAULT_WS_URL = 'wss://localhost:$HTTPS_PORT/ws/status';

export class WebSocketClient {
	private socket: WebSocket | null = null;
	private readonly url: string;
	private static instance: WebSocketClient;
	private onlineUsers: Set<string> = new Set();
	private statusChangeListeners: OnlineStatusChangeCallback[] = [];
	private pingIntervalId: NodeJS.Timeout | null = null;
	private serverInactivityTimerId: NodeJS.Timeout | null = null;

	private constructor(url: string) {
		this.url = url;
	}

	// =========================================
	// SINGLETON MANAGEMENT
	// =========================================

	/**
	 * Gets the singleton instance of WebSocketClient
	 * @param url - The WebSocket server URL (required on first call)
	 * @returns The WebSocketClient singleton instance
	 */
	public static getInstance(url?: string): WebSocketClient {
		if (!WebSocketClient.instance) {
			if (!url) throw new Error("WebSocket URL must be provided on first instantiation.");
			WebSocketClient.instance = new WebSocketClient(url);
		}
		return WebSocketClient.instance;
	}

	// =========================================
	// CONNECTION MANAGEMENT
	// =========================================

	/**
	 * Establishes a connection to the WebSocket server
	 * Uses authentication token from storage if available
	 */
	public connect(): void {
		if (this.socket && (this.socket.readyState === WebSocket.OPEN || 
			this.socket.readyState === WebSocket.CONNECTING)) return;

		const token = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
		if (!token) return;
		
		const connectionUrl = `${this.url.split('?')[0]}?token=${token}`;
		this.socket = new WebSocket(connectionUrl);
		this.setupSocketHandlers();
	}

	/**
	 * Sets up event handlers for the WebSocket connection
	 */
	private setupSocketHandlers(): void {
		if (!this.socket) return;
		
		this.socket.onopen = () => {
			this.startKeepAlive();
			this.resetServerInactivityTimer();
		};
		
		this.socket.onmessage = (event) => {
			this.resetServerInactivityTimer();
			try {
				this.handleWebSocketMessage(JSON.parse(event.data as string));
			} catch (error) {
				NotificationManager.handleError(error);
			}
		};
		
		this.socket.onerror = () => {
			this.stopKeepAlive();
			this.clearServerInactivityTimer();
			appState.logout();
			NotificationManager.showError('WebSocket error: Disconnecting...');
		};
		
		this.socket.onclose = () => {
			this.stopKeepAlive();
			this.clearServerInactivityTimer();
		};
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleWebSocketMessage(data: any): void {
		switch (data.type) {
			case 'online_users_list':
				this.onlineUsers.clear();
				data.users.forEach((userId: string) => this.onlineUsers.add(userId));
				break;
			case 'user_online':
				if (!this.onlineUsers.has(data.userId)) {
					this.onlineUsers.add(data.userId);
					this.notifyStatusChangeListeners(data.userId, true);
				}
				break;
			case 'user_offline':
				if (this.onlineUsers.has(data.userId)) {
					this.onlineUsers.delete(data.userId);
					this.notifyStatusChangeListeners(data.userId, false);
				}
				break;
		}
	}

	/**
	 * Notify listeners about status changes
	 */
	private notifyStatusChangeListeners(userId: string, isOnline: boolean): void {
		this.statusChangeListeners.forEach(listener => {
			try {
				listener(userId, isOnline);
			} catch (error) {
				NotificationManager.handleError(error);
			}
		});
	}

	/**
	 * Add a listener for online status changes
	 */
	public addStatusChangeListener(callback: OnlineStatusChangeCallback): () => void {
		this.statusChangeListeners.push(callback);
		return () => {
			this.statusChangeListeners = this.statusChangeListeners.filter(cb => cb !== callback);
		};
	}

	/**
	 * Check if a user is online
	 */
	public isUserOnline(userId: string): boolean {
		return this.onlineUsers.has(userId);
	}

	/**
	 * Get the list of online users
	 */
	public getOnlineUsers(): string[] {
		return Array.from(this.onlineUsers);
	}

	/**
	 * Sends a message through the WebSocket connection
	 * @param message - The message to send (will be JSON stringified)
	 */
	public sendMessage(message: any): void {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		} else {
			NotificationManager.showWarning('WebSocket not open. Message not sent.');
		}
	}

	/**
	 * Closes the WebSocket connection
	 */
	public disconnect(): void {
		this.stopKeepAlive();
		this.clearServerInactivityTimer();
		if (this.socket) this.socket.close();
	}

	/**
	 * Updates the authentication token and reconnects
	 * @param token - The new JWT token or null to disconnect
	 */
	public updateToken(token: string | null): void {
		this.disconnect();
		
		if (token) {
			const newUrl = `${this.url.split('?')[0]}?token=${token}`;
			this.socket = new WebSocket(newUrl);
			this.setupSocketHandlers();
		}
	}

	/**
	 * Gets the current WebSocket connection state
	 * @returns The WebSocket ready state or null if no socket exists
	 */
	public getReadyState(): number | null {
		return this.socket ? this.socket.readyState : null;
	}

	// =========================================
	// KEEP-ALIVE MECHANISM
	// =========================================

	private startKeepAlive(): void {
		this.stopKeepAlive();
		this.pingIntervalId = setInterval(() => {
			if (this.socket?.readyState === WebSocket.OPEN) {
				this.sendMessage({ type: 'ping' });
			}
		}, PING_INTERVAL);
	}

	private stopKeepAlive(): void {
		if (this.pingIntervalId) {
			clearInterval(this.pingIntervalId);
			this.pingIntervalId = null;
		}
	}

	private resetServerInactivityTimer(): void {
		this.clearServerInactivityTimer();
		this.serverInactivityTimerId = setTimeout(
			() => this.handleServerInactivity(),
			MAX_SERVER_INACTIVITY_DURATION
		);
	}

	private clearServerInactivityTimer(): void {
		if (this.serverInactivityTimerId) {
			clearTimeout(this.serverInactivityTimerId);
			this.serverInactivityTimerId = null;
		}
	}

	private handleServerInactivity(): void {
		if (this.socket?.readyState === WebSocket.OPEN) {
			NotificationManager.showWarning(
				'No response from server. Connection may be stale. Attempting to reconnect.'
			);
			this.disconnect();
			setTimeout(() => this.connect(), 1000);
		}
	}
}


// =========================================
// UTILITY FUNCTIONS
// =========================================

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
				wsClient.disconnect();
				
				const socket = new WebSocket(`${DEFAULT_WS_URL.split('?')[0]}?token=${token}`);
				
				socket.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data as string);
						if (wsClient) (wsClient as any).handleWebSocketMessage(data);
					} catch (error) {
						NotificationManager.handleError(error);
					}
				};
				
				socket.onerror = () => {
					appState.logout();
					NotificationManager.showError('WebSocket error: disconnecting...');
				};
				
				(wsClient as any).socket = socket;
			} else {
				WebSocketClient.getInstance(DEFAULT_WS_URL).connect();
			}
		} catch (err) {
			NotificationManager.handleError(err);
		}
	}, 100);
}

/**
 * Disconnects from the WebSocket server during logout
 * This is a centralized function to be called during logout
 */
export function disconnectWebSocket(): void {
	try {
		const socket = WebSocketClient.getInstance();
		socket.disconnect();
	} catch (err) {
		NotificationManager.handleError(err);
	}
}
