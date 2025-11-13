// WebSocket server for real-time communication with Godot game

import type { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import type { GameStateManager } from "./game-state.js";
import { logger } from "./services/logger.js";
import type {
	Config,
	ConnectionState,
	DonationEvent,
	GameState,
	GameStateUpdate,
	StatsUpdate,
	WebSocketMessage,
} from "./types/index.js";

export class GameWebSocketServer {
	private server: WebSocketServer;
	private config: Config;
	private gameStateManager: GameStateManager;
	// private donationQueue: DonationQueue; // Removed unused property
	private connectedClients: Map<string, ConnectionState> = new Map();
	private socketToClient: Map<WebSocket, string> = new Map(); // Map sockets to client IDs
	private messageHandlers: Map<
		string,
		(clientId: string, ws: WebSocket, message: WebSocketMessage) => void
	> = new Map();

	constructor(config: Config, gameStateManager: GameStateManager) {
		this.config = config;
		this.gameStateManager = gameStateManager;

		// Initialize WebSocket server
		this.server = new WebSocketServer({
			port: config.websocket.port,
			perMessageDeflate: false,
		});

		this.setupMessageHandlers();
		this.setupEventListeners();

		// Subscribe to game state changes using observer pattern
		this.gameStateManager.subscribe((gameState) => {
			this.broadcastGameState(gameState);
		});

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
		this.messageHandlers.set(
			"donation_received",
			this.handleDonationReceived.bind(this),
		);
	}

	private setupEventListeners(): void {
		this.server.on("connection", this.handleConnection.bind(this));
		this.server.on("error", this.handleServerError.bind(this));
	}

	private handleConnection(ws: WebSocket, request: IncomingMessage): void {
		const clientId = this.generateClientId();
		const clientIP =
			(request as IncomingMessage)?.socket?.remoteAddress || "unknown";

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
		this.socketToClient.set(ws, clientId); // Track socket-to-client mapping

		// Setup client-specific handlers
		ws.on("message", (data: Buffer) => {
			this.handleMessage(clientId, ws, data);
		});

		ws.on("close", (code: number, reason: Buffer) => {
			this.handleDisconnection(clientId, code, reason.toString());
			this.socketToClient.delete(ws); // Clean up socket mapping
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
				gameState: this.gameStateManager.getState(),
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
			logger.error(`Error parsing message from ${clientId}:`, { error });
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
			this.gameStateManager.updateFromGame(update);

			logger.debug(`Game state updated by ${clientId}:`, { update });
		} catch (error) {
			logger.error(`Error handling game state update from ${clientId}:`, {
				error,
			});
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
			// Stats updates could be handled by updating game state
			this.gameStateManager.updateFromGame({
				score: stats.score,
			});

			logger.debug(`Stats updated by ${clientId}:`, { stats });
		} catch (error) {
			logger.error(`Error handling stats update from ${clientId}:`, { error });
			this.sendError(ws, "Failed to update stats");
		}
	}

	private handlePing(clientId: string, ws: WebSocket): void {
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

	private handleDonationReceived(
		clientId: string,
		_ws: WebSocket,
		message: WebSocketMessage,
	): void {
		try {
			const donationData = message.data as DonationEvent;

			logger.info(`Donation received from ${clientId}:`, {
				donationId: donationData.donationId,
				viewerName: donationData.viewerName,
				amount: donationData.amount,
				eventType: donationData.eventType,
			});

			// Broadcast the donation to all connected clients (including the game)
			this.broadcastDonation(donationData);
		} catch (error) {
			logger.error(`Error handling donation from ${clientId}:`, { error });
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
		logger.error(`WebSocket error for client ${clientId}:`, { error });
		this.connectedClients.delete(clientId);
	}

	private handleServerError(error: Error): void {
		logger.error("WebSocket server error:", { error });
	}

	// Broadcasting methods
	public broadcastDonation(donation: DonationEvent): void {
		const message: WebSocketMessage = {
			type: "donation_event",
			data: donation,
		};

		this.broadcast(message);
		logger.info(`Broadcasted donation event:`, {
			eventType: donation.eventType,
			amount: donation.amount,
			viewerName: donation.viewerName,
		});
	}

	public broadcastGameState(gameState: GameState): void {
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

		this.server.clients.forEach((ws) => {
			const clientId = this.socketToClient.get(ws);
			const client = clientId ? this.connectedClients.get(clientId) : null;

			// Skip if client type should be excluded
			if (options.excludeType && client?.clientType === options.excludeType) {
				return;
			}

			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(messageStr);
				} catch (error) {
					logger.error(`Error sending message to client ${clientId}:`, {
						error,
					});
					if (clientId) deadClients.push(clientId);
				}
			} else {
				if (clientId) deadClients.push(clientId);
			}
		});

		// Clean up dead connections
		deadClients.forEach((clientId) => {
			this.connectedClients.delete(clientId);
			// Also remove from reverse map
			for (const [socket, id] of this.socketToClient.entries()) {
				if (id === clientId) {
					this.socketToClient.delete(socket);
					break;
				}
			}
			logger.debug(`Removed dead client: ${clientId}`);
		});
	}

	private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
		if (ws.readyState === WebSocket.OPEN) {
			try {
				ws.send(JSON.stringify(message));
			} catch (error) {
				logger.error("Error sending message to client:", { error });
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
		const gameState = this.gameStateManager.getState();
		this.sendMessage(ws, {
			type: "game_state_update",
			data: gameState,
		});
	}

	private findClientIdBySocket(socket: WebSocket): string | null {
		return this.socketToClient.get(socket) || null;
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
		(
			this as unknown as { healthCheckInterval: NodeJS.Timeout }
		).healthCheckInterval = interval;
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
					logger.error("Error sending ping:", { error });
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

	// Public API for external donation events
	public receiveDonationEvent(donationData: DonationEvent): void {
		logger.info("External donation event received:", {
			donationId: donationData.donationId,
			viewerName: donationData.viewerName,
			amount: donationData.amount,
			eventType: donationData.eventType,
		});

		// Broadcast the donation to all connected clients
		this.broadcastDonation(donationData);
	}

	// Public API for broadcasting messages
	public broadcastMessage(
		message: WebSocketMessage,
		options: { excludeType?: string } = {},
	): void {
		this.broadcast(message, options);
	}

	public async shutdown(): Promise<void> {
		logger.info("Shutting down WebSocket server...");

		// Clear health check interval
		const self = this as unknown as { healthCheckInterval?: NodeJS.Timeout };
		if (self.healthCheckInterval) {
			clearInterval(self.healthCheckInterval);
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
