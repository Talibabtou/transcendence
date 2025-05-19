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
            console.log('WebSocket is already connected or connecting.');
            return;
        }

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('WebSocket connection established');
            // Send a message to identify the user, e.g., a JWT token
            // this.sendMessage({ type: 'auth', token: 'your_jwt_token' });
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data as string);
            console.log('WebSocket message received:', message);
            // Handle incoming messages, e.g., online user list updates
            // this.handleIncomingMessage(message);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onclose = () => {
            console.log('WebSocket connection closed');
            // Optionally, implement reconnection logic here
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

    // private handleIncomingMessage(message: any): void {
    //     switch (message.type) {
    //         case 'user_online':
    //             console.log('User online:', message.userId);
    //             // Update UI or state
    //             break;
    //         case 'user_offline':
    //             console.log('User offline:', message.userId);
    //             // Update UI or state
    //             break;
    //         default:
    //             console.log('Unhandled message type:', message.type);
    //     }
    // }

    public getReadyState(): number | null {
        return this.socket ? this.socket.readyState : null;
    }
}

// Example of how to get the instance (ensure URL is provided, e.g., from env)
// const websocketUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8000/ws/status/';
// export const webSocketClient = WebSocketClient.getInstance(websocketUrl); 