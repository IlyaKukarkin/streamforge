// WebSocket server for real-time communication with Godot game
import WebSocket, { WebSocketServer } from "ws";
import type { DonationQueue } from "./donation-queue.js";
import type { GameStateManager } from "./game-state.js";
import { logger } from "./services/logger.js";
import type {
	Config,
	ConnectionState,
	GameStateUpdate,
	StatsUpdate,
	WebSocketMessage,
} from "./types/index.js";

export class GameWebSocketServer {
	private server: WebSocketServer;
	private config: Config;
	private gameStateManager: GameStateManager;
	private donationQueue: DonationQueue;
	private connectedClients: Map<string, ConnectionState> = new Map();
	private messageHandlers: Map<string, Function> = new Map();

	constructor(
		config: Config,
		gameStateManager: GameStateManager,
		donationQueue: DonationQueue,
	) {
		this.config = config;
		this.gameStateManager = gameStateManager;
		this.donationQueue = donationQueue;

		// Initialize WebSocket server
		this.server = new WebSocketServer({
			port: config.websocket.port,
			perMessageDeflate: false,
		});

		this.setupMessageHandlers();
		this.setupEventListeners();

		logger.info(
			`WebSocket server initialized on port ${config.websocket.port}`,
		);
	}

	private setupMessageHandlers(): void {
		this.messageHandlers.set(
			"game_state_update",
			this.handleGameStateUpdate.bind(this),
		);
		this.messageHandlers.set("stats_update", this.handleStatsUpdate.bind(this));
		this.messageHandlers.set("ping", this.handlePing.bind(this));
		this.messageHandlers.set("client_info", this.handleClientInfo.bind(this));
	}

	private setupEventListeners(): void {
		this.server.on("connection", this.handleConnection.bind(this));
		this.server.on("error", this.handleServerError.bind(this));

		// Listen for donation events from the queue
		this.donationQueue.onDonationProcessed((donation) => {
			this.broadcastDonation(donation);
		});

		// Listen for game state changes
		this.gameStateManager.onStateChange((gameState) => {
			this.broadcastGameState(gameState);
		});
	}

	private handleConnection(ws: WebSocket, request: any): void {
		const clientId = this.generateClientId();
		const clientIP = request.socket.remoteAddress || "unknown";

		logger.info(`New WebSocket connection: ${clientId} from ${clientIP}`);

		// Initialize client state
		const connectionState: ConnectionState = {
			id: clientId,
			ip: clientIP,
			connectedAt: Date.now(),
			lastPing: Date.now(),
			isAlive: true,
			clientType: "unknown", // Will be updated when client sends info
		};

		this.connectedClients.set(clientId, connectionState);

		// Setup client-specific handlers
		ws.on("message", (data: Buffer) => {
			this.handleMessage(clientId, ws, data);
		});

		ws.on("close", (code: number, reason: Buffer) => {
			this.handleDisconnection(clientId, code, reason.toString());
		});

		ws.on("error", (error: Error) => {
			this.handleClientError(clientId, error);
		});

		ws.on("pong", () => {
			this.handlePong(clientId);
		});

		// Send initial game state to new client
		this.sendGameStateUpdate(ws);

		// Send welcome message
		this.sendMessage(ws, {
			type: "connection_established",
			data: {
				clientId,
				gameState: this.gameStateManager.getCurrentState(),
				serverTime: Date.now(),
			},
		});
	}

	private handleMessage(clientId: string, ws: WebSocket, data: Buffer): void {
		try {
			const message: WebSocketMessage = JSON.parse(data.toString());

			// Update last activity
			const client = this.connectedClients.get(clientId);
			if (client) {
				client.lastPing = Date.now();
			}

			logger.debug(`Message received from ${clientId}:`, {
				type: message.type,
			});

			// Route message to appropriate handler
			const handler = this.messageHandlers.get(message.type);
			if (handler) {
				handler(clientId, ws, message);
			} else {
				logger.warn(`Unknown message type from ${clientId}: ${message.type}`);
				this.sendError(ws, `Unknown message type: ${message.type}`);
			}
		} catch (error) {
			logger.error(`Error parsing message from ${clientId}:`, error);
			this.sendError(ws, "Invalid message format");
		}
	}

	private handleGameStateUpdate(
		clientId: string,
		ws: WebSocket,
		message: WebSocketMessage,
	): void {
		try {
			const update = message.data as GameStateUpdate;
			this.gameStateManager.updateGameState(update);

			logger.debug(`Game state updated by ${clientId}:`, update);
		} catch (error) {
			logger.error(`Error handling game state update from ${clientId}:`, error);
			this.sendError(ws, "Failed to update game state");
		}
	}

	private handleStatsUpdate(
		clientId: string,
		ws: WebSocket,
		message: WebSocketMessage,
	): void {
		try {
			const stats = message.data as StatsUpdate;
			this.gameStateManager.updateStats(stats);

			logger.debug(`Stats updated by ${clientId}:`, stats);
		} catch (error) {
			logger.error(`Error handling stats update from ${clientId}:`, error);
			this.sendError(ws, "Failed to update stats");
		}
	}

	private handlePing(
		clientId: string,
		ws: WebSocket,
		message: WebSocketMessage,
	): void {
		this.sendMessage(ws, {
			type: "pong",
			data: {
				timestamp: Date.now(),
				clientId,
			},
		});
	}

	private handleClientInfo(
		clientId: string,
		ws: WebSocket,
		message: WebSocketMessage,
	): void {
		const clientInfo = message.data as { type: string; version?: string };
		const client = this.connectedClients.get(clientId);

		if (client) {
			client.clientType = clientInfo.type;
			logger.info(`Client ${clientId} identified as: ${clientInfo.type}`);
		}
	}

	private handlePong(clientId: string): void {
		const client = this.connectedClients.get(clientId);
		if (client) {
			client.isAlive = true;
			client.lastPing = Date.now();
		}
	}

	private handleDisconnection(
		clientId: string,
		code: number,
		reason: string,
	): void {
		logger.info(`Client ${clientId} disconnected: ${code} - ${reason}`);
		this.connectedClients.delete(clientId);
	}

	private handleClientError(clientId: string, error: Error): void {
		logger.error(`WebSocket error for client ${clientId}:`, error);
		this.connectedClients.delete(clientId);
	}

	private handleServerError(error: Error): void {
		logger.error("WebSocket server error:", error);
	}

	// Broadcasting methods
	public broadcastDonation(donation: any): void {
		const message: WebSocketMessage = {
			type: "donation_event",
			data: donation,
		};

		this.broadcast(message);
		logger.info(`Broadcasted donation event:`, {
			eventType: donation.eventType,
			amount: donation.amount,
			username: donation.username,
		});
	}

	public broadcastGameState(gameState: any): void {
		const message: WebSocketMessage = {
			type: "game_state_broadcast",
			data: gameState,
		};

		this.broadcast(message, { excludeType: "game" }); // Don't send back to game clients
		logger.debug("Broadcasted game state update");
	}

	private broadcast(
		message: WebSocketMessage,
		options: { excludeType?: string } = {},
	): void {
		const messageStr = JSON.stringify(message);
		const deadClients: string[] = [];

		this.server.clients.forEach((ws, index) => {
			const clientId = this.findClientIdBySocket(ws);
			const client = clientId ? this.connectedClients.get(clientId) : null;

			// Skip if client type should be excluded
			if (options.excludeType && client?.clientType === options.excludeType) {
				return;
			}

			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(messageStr);
				} catch (error) {
					logger.error(`Error sending message to client ${clientId}:`, error);
					if (clientId) deadClients.push(clientId);
				}
			} else {
				if (clientId) deadClients.push(clientId);
			}
		});

		// Clean up dead connections
		deadClients.forEach((clientId) => {
			this.connectedClients.delete(clientId);
			logger.debug(`Removed dead client: ${clientId}`);
		});
	}

	private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
		if (ws.readyState === WebSocket.OPEN) {
			try {
				ws.send(JSON.stringify(message));
			} catch (error) {
				logger.error("Error sending message to client:", error);
			}
		}
	}

	private sendError(ws: WebSocket, errorMessage: string): void {
		this.sendMessage(ws, {
			type: "error",
			data: {
				message: errorMessage,
				timestamp: Date.now(),
			},
		});
	}

	private sendGameStateUpdate(ws: WebSocket): void {
		const gameState = this.gameStateManager.getCurrentState();
		this.sendMessage(ws, {
			type: "game_state_update",
			data: gameState,
		});
	}

	private findClientIdBySocket(socket: WebSocket): string | null {
		for (const [clientId, client] of this.connectedClients.entries()) {
			// This is a simplified approach - in production, you'd want a more robust way
			// to associate sockets with client IDs
			return clientId;
		}
		return null;
	}

	private generateClientId(): string {
		return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// Health check and maintenance
	public startHealthCheck(): void {
		const interval = setInterval(() => {
			this.performHealthCheck();
		}, this.config.websocket.pingInterval || 30000);

		// Store interval reference for cleanup
		(this as any).healthCheckInterval = interval;
	}

	private performHealthCheck(): void {
		const now = Date.now();
		const timeout = this.config.websocket.connectionTimeout || 60000;
		const deadClients: string[] = [];

		// Check for dead connections
		this.connectedClients.forEach((client, clientId) => {
			if (now - client.lastPing > timeout) {
				logger.warn(`Client ${clientId} timed out`);
				deadClients.push(clientId);
			}
		});

		// Remove dead clients
		deadClients.forEach((clientId) => {
			this.connectedClients.delete(clientId);
		});

		// Send ping to all clients
		this.server.clients.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.ping();
				} catch (error) {
					logger.error("Error sending ping:", error);
				}
			}
		});

		logger.debug(
			`Health check completed. Active connections: ${this.connectedClients.size}`,
		);
	}

	// Public API
	public getConnectedClients(): ConnectionState[] {
		return Array.from(this.connectedClients.values());
	}

	public getConnectionCount(): number {
		return this.connectedClients.size;
	}

	public forceDisconnectClient(clientId: string): boolean {
		const client = this.connectedClients.get(clientId);
		if (!client) {
			return false;
		}

		// Find and close the socket
		this.server.clients.forEach((ws) => {
			const socketClientId = this.findClientIdBySocket(ws);
			if (socketClientId === clientId) {
				ws.close(1000, "Forced disconnect by admin");
				return;
			}
		});

		this.connectedClients.delete(clientId);
		logger.info(`Force disconnected client: ${clientId}`);
		return true;
	}

	public async shutdown(): Promise<void> {
		logger.info("Shutting down WebSocket server...");

		// Clear health check interval
		if ((this as any).healthCheckInterval) {
			clearInterval((this as any).healthCheckInterval);
		}

		// Close all client connections
		this.server.clients.forEach((ws) => {
			ws.close(1001, "Server shutting down");
		});

		// Close server
		return new Promise((resolve) => {
			this.server.close(() => {
				logger.info("WebSocket server shut down completed");
				resolve();
			});
		});
	}
}
