import { appState } from "@website/scripts/utils";
import { NotificationManager } from "@website/scripts/services";

type OnlineStatusChangeCallback = (userId: string, isOnline: boolean) => void;

const PING_INTERVAL = 30 * 1000; // 30 seconds
const MAX_SERVER_INACTIVITY_DURATION = 75 * 1000; // 75 seconds

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
			if (!url) {
				throw new Error("WebSocket URL must be provided on first instantiation.");
			}
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
		if (this.socket && (this.socket.readyState === WebSocket.OPEN
			|| this.socket.readyState === WebSocket.CONNECTING)) {
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
				const data = JSON.parse(event.data as string);
				this.handleWebSocketMessage(data);
			} catch (error) {
				NotificationManager.showError('Error parsing WebSocket message: ' + error);
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
				this.handleOnlineUsersList(data.users);
				break;
			case 'user_online':
				this.handleUserOnline(data.userId);
				break;
			case 'user_offline':
				this.handleUserOffline(data.userId);
				break;
			case 'pong':
				this.handlePong();
				break;
		}
	}

	/**
	 * Handle initial list of online users
	 */
	private handleOnlineUsersList(users: string[]): void {
		this.onlineUsers.clear();
		users.forEach(userId => this.onlineUsers.add(userId));
	}

	/**
	 * Handle user coming online
	 */
	private handleUserOnline(userId: string): void {
		if (!this.onlineUsers.has(userId)) {
			this.onlineUsers.add(userId);
			this.notifyStatusChangeListeners(userId, true);
		}
	}

	/**
	 * Handle user going offline
	 */
	private handleUserOffline(userId: string): void {
		if (this.onlineUsers.has(userId)) {
			this.onlineUsers.delete(userId);
			this.notifyStatusChangeListeners(userId, false);
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
				NotificationManager.showError('Error in status change listener: ' + error);
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
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
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
		if (this.socket) {
			this.socket.close();
		}
	}

	/**
	 * Updates the authentication token and reconnects
	 * @param token - The new JWT token or null to disconnect
	 */
	public updateToken(token: string | null): void {
		this.disconnect();
		
		if (token) {
			const tokenParam = token ? `?token=${token}` : '';
			const newUrl = this.url.split('?')[0] + tokenParam;
			
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
		this.stopKeepAlive(); // Clear any existing interval
		this.pingIntervalId = setInterval(() => this.sendPing(), PING_INTERVAL);
	}

	private stopKeepAlive(): void {
		if (this.pingIntervalId) {
			clearInterval(this.pingIntervalId);
			this.pingIntervalId = null;
		}
	}

	private sendPing(): void {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			this.sendMessage({ type: 'ping' });
		}
	}

	private handlePong(): void {
		// Pong received, connection is healthy from server's perspective
		// console.debug('Pong received from server');
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
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			NotificationManager.showWarning(
				'No response from server. Connection may be stale. Attempting to reconnect.'
			);
			this.disconnect(); // This will also clear timers
			// Add a small delay before reconnecting to avoid rapid hammering
			setTimeout(() => this.connect(), 1000); 
		}
	}
}

const DEFAULT_WS_URL = 'wss://localhost:$HTTPS_PORT/ws/status';

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
				const directToken = token;
				const tokenParam = `?token=${directToken}`;
				const connectionUrl = DEFAULT_WS_URL.split('?')[0] + tokenParam;
				
				wsClient.disconnect();
				
				const socket = new WebSocket(connectionUrl);
				
				socket.onopen = () => {};
				
				socket.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data as string);
						if (wsClient) {
							(wsClient as any).handleWebSocketMessage(data);
						}
					} catch (error) {
						NotificationManager.showError('Error parsing WebSocket message: ' + error);
					}
				};
				
				socket.onerror = () => {
					appState.logout();
					NotificationManager.showError('WebSocket error: disconnecting...');
				};
				
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
