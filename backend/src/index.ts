// Main entry point for StreamForge backend server
import { loadConfig } from './config.js';
import { createLogger, logger } from './services/logger.js';
import { GameStateManager } from './game-state.js';
import { DonationQueue } from './donation-queue.js';
import { RateLimiter } from './middleware/rate-limiter.js';
import { AdminApiServer } from './admin-api.js';

// Simple WebSocket server implementation
import WebSocket, { WebSocketServer } from 'ws';
import type { WebSocketMessage } from './types/index.js';

class StreamForgeServer {
  private config: any;
  private gameStateManager: GameStateManager;
  private donationQueue: DonationQueue;
  private rateLimiter: RateLimiter;
  private adminApiServer: AdminApiServer;
  private wsServer: WebSocketServer;
  private connectedClients: Set<WebSocket> = new Set();

  constructor() {
    // Load configuration
    this.config = loadConfig();
    
    // Initialize logger
    createLogger(this.config);
    
    // Initialize services
    this.gameStateManager = new GameStateManager();
    this.donationQueue = new DonationQueue(this.config);
    this.rateLimiter = new RateLimiter(this.config);
    
    // Initialize servers
    this.adminApiServer = new AdminApiServer(this.config, {
      gameStateManager: this.gameStateManager,
      donationQueue: this.donationQueue,
      rateLimiter: this.rateLimiter,
    });

    // Initialize WebSocket server
    this.wsServer = new WebSocketServer({
      port: this.config.websocket?.port || this.config.websocketPort || 3001,
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    logger.info('Setting up WebSocket server...');

    this.wsServer.on('connection', (ws: WebSocket, request: any) => {
      const clientIP = request.socket.remoteAddress || 'unknown';
      logger.info(`New WebSocket connection from ${clientIP}`);
      
      this.connectedClients.add(ws);

      // Send initial game state
      this.sendToClient(ws, {
        type: 'connection_established',
        data: {
          gameState: this.gameStateManager.getState(),
          timestamp: Date.now(),
        },
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', { error: (error as Error).message });
        }
      });

      ws.on('close', () => {
        this.connectedClients.delete(ws);
        logger.info(`WebSocket client disconnected. Active connections: ${this.connectedClients.size}`);
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket client error:', { error: error.message });
        this.connectedClients.delete(ws);
      });
    });

    this.wsServer.on('error', (error: Error) => {
      logger.error('WebSocket server error:', { error: error.message });
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: WebSocketMessage): void {
    logger.debug('Received WebSocket message:', { type: message.type });

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: { timestamp: Date.now() },
        });
        break;

      case 'game_state_update':
        if (message.data) {
          try {
            // Update game state and broadcast to other clients
            this.gameStateManager.updateState(message.data as any);
            this.broadcastGameState(ws); // Exclude sender
          } catch (error) {
            logger.error('Error updating game state:', { error: (error as Error).message });
          }
        }
        break;

      case 'client_info':
        logger.info('Client identified:', message.data);
        break;

      default:
        logger.warn('Unknown WebSocket message type:', { type: message.type });
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending WebSocket message:', { error: (error as Error).message });
      }
    }
  }

  private broadcastToAll(message: WebSocketMessage, excludeClient?: WebSocket): void {
    this.connectedClients.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }

  private broadcastGameState(excludeClient?: WebSocket): void {
    const gameState = this.gameStateManager.getState();
    this.broadcastToAll({
      type: 'game_state_broadcast',
      data: gameState,
    }, excludeClient);
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting StreamForge server...');

      // Start admin API server
      await this.adminApiServer.start();

      // WebSocket server is already running
      const wsPort = this.config.websocket?.port || this.config.websocketPort || 3001;
      logger.info(`WebSocket server started on port ${wsPort}`);

      // Setup donation processing
      this.setupDonationProcessing();

      logger.info('StreamForge server started successfully!');
      logger.info(`Admin API: http://localhost:${this.config.port}`);
      logger.info(`WebSocket: ws://localhost:${wsPort}`);
      logger.info(`Overlay: http://localhost:${this.config.port}/overlay`);
      
    } catch (error) {
      logger.error('Failed to start server:', { error: (error as Error).message });
      throw error;
    }
  }

  private setupDonationProcessing(): void {
    // Process donations from queue every second
    setInterval(() => {
      const donation = this.donationQueue.dequeue();
      if (donation) {
        logger.info('Processing donation:', {
          viewerName: donation.viewerName,
          amount: donation.amount,
          eventType: donation.eventType,
        });

        // Mark as processed
        this.donationQueue.markDonationProcessed(donation.donationId);

        // Broadcast donation event to all clients
        this.broadcastToAll({
          type: 'donation_event',
          data: donation,
        });

        // Update game state based on donation type
        this.processDonationEffect(donation);
      }
    }, 1000);
  }

  private processDonationEffect(donation: any): void {
    try {
      const gameState = this.gameStateManager.getState();
      
      switch (donation.eventType) {
        case 'speed_boost':
        case 'damage_boost':
        case 'shield':
          // These are handled by the Godot game client
          // Just log for now
          logger.info(`Applied ${donation.eventType} effect`);
          break;

        case 'health_boost':
          // Restore health based on donation amount
          const healAmount = Math.min(donation.amount * 2, 100 - gameState.knightHealth);
          if (healAmount > 0) {
            this.gameStateManager.updateState({
              knightHealth: gameState.knightHealth + healAmount,
            });
          }
          break;

        case 'enemy_wave':
          // Increase score for enemy waves (representing difficulty)
          this.gameStateManager.updateState({
            score: gameState.score + donation.amount,
          });
          break;

        default:
          logger.warn('Unknown donation event type:', { eventType: donation.eventType });
      }

      // Broadcast updated game state
      this.broadcastGameState();
      
    } catch (error) {
      logger.error('Error processing donation effect:', { error: (error as Error).message });
    }
  }

  public async stop(): Promise<void> {
    logger.info('Stopping StreamForge server...');

    try {
      // Stop admin API server
      await this.adminApiServer.stop();

      // Close all WebSocket connections
      this.connectedClients.forEach((client) => {
        client.close(1001, 'Server shutting down');
      });

      // Close WebSocket server
      this.wsServer.close();

      logger.info('StreamForge server stopped successfully');
    } catch (error) {
      logger.error('Error stopping server:', { error: (error as Error).message });
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const server = new StreamForgeServer();

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled rejection:', { reason, promise });
    process.exit(1);
  });

  try {
    await server.start();
  } catch (error) {
    logger.error('Failed to start server:', { error: (error as Error).message });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start StreamForge server:', error);
    process.exit(1);
  });
}

export { StreamForgeServer };