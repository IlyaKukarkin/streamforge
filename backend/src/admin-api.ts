// HTTP API server for admin controls and monitoring
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type { Config } from './types/index.js';
import { logger } from './services/logger.js';
import { GameStateManager } from './game-state.js';
import { DonationQueue } from './donation-queue.js';
import { RateLimiter } from './middleware/rate-limiter.js';

export interface AdminApiDependencies {
  gameStateManager: GameStateManager;
  donationQueue: DonationQueue;
  rateLimiter: RateLimiter;
}

export class AdminApiServer {
  private app: express.Application;
  private config: Config;
  private dependencies: AdminApiDependencies;
  private server: any;

  constructor(config: Config, dependencies: AdminApiDependencies) {
    this.config = config;
    this.dependencies = dependencies;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    if (this.config.enableCors) {
      this.app.use(cors());
    }

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // API key authentication middleware
    this.app.use('/api', this.authenticateApiKey.bind(this));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, { ip: req.ip });
      next();
    });
  }

  private authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'] || req.query['api_key'];
    
    if (apiKey !== this.config.adminApiKey) {
      logger.warn('Unauthorized API access attempt', { 
        ip: req.ip, 
        path: req.path,
        providedKey: typeof apiKey === 'string' ? apiKey.substring(0, 8) + '...' : 'none'
      });
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    next();
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // API routes (require authentication)
    this.app.get('/api/status', this.handleGetStatus.bind(this));
    this.app.get('/api/game-state', this.handleGetGameState.bind(this));
    this.app.put('/api/game-state', this.handleUpdateGameState.bind(this));
    this.app.post('/api/game-state/reset', this.handleResetGame.bind(this));
    
    this.app.get('/api/donations/queue', this.handleGetDonationQueue.bind(this));
    this.app.post('/api/donations/test', this.handleTestDonation.bind(this));
    this.app.delete('/api/donations/clear', this.handleClearDonationQueue.bind(this));
    
    this.app.get('/api/rate-limits', this.handleGetRateLimits.bind(this));
    this.app.delete('/api/rate-limits/reset', this.handleResetRateLimits.bind(this));

    // Overlay endpoint (for OBS browser sources)
    this.app.get('/overlay', this.handleGetOverlay.bind(this));

    // Error handling
    this.app.use(this.handleError.bind(this));
  }

  // Route handlers
  private handleHealthCheck(req: Request, res: Response): void {
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
    });
  }

  private handleGetStatus(req: Request, res: Response): void {
    try {
      const gameState = this.dependencies.gameStateManager.getState();
      const queueStats = this.dependencies.donationQueue.getQueueStats();
      
      res.json({
        server: {
          uptime: process.uptime(),
          timestamp: Date.now(),
        },
        gameState,
        donationQueue: queueStats,
      });
    } catch (error) {
      logger.error('Error getting server status:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleGetGameState(req: Request, res: Response): void {
    try {
      const gameState = this.dependencies.gameStateManager.getState();
      res.json(gameState);
    } catch (error) {
      logger.error('Error getting game state:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleUpdateGameState(req: Request, res: Response): void {
    try {
      const updates = req.body;
      this.dependencies.gameStateManager.updateState(updates);
      const newState = this.dependencies.gameStateManager.getState();
      
      logger.info('Game state updated via API', { updates });
      res.json(newState);
    } catch (error) {
      logger.error('Error updating game state:', error as Error);
      res.status(400).json({ error: 'Invalid game state update' });
    }
  }

  private handleResetGame(req: Request, res: Response): void {
    try {
      this.dependencies.gameStateManager.resetGame();
      this.dependencies.donationQueue.clearQueue();
      
      const gameState = this.dependencies.gameStateManager.getState();
      
      logger.info('Game reset via API');
      res.json({
        success: true,
        gameState,
      });
    } catch (error) {
      logger.error('Error resetting game:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleGetDonationQueue(req: Request, res: Response): void {
    try {
      const queueData = this.dependencies.donationQueue.getQueueData();
      res.json(queueData);
    } catch (error) {
      logger.error('Error getting donation queue:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleTestDonation(req: Request, res: Response): void {
    try {
      const { username = 'TestUser', amount = 5.0, eventType = 'speed_boost', message = 'Test donation' } = req.body;
      
      // Create test donation
      const testDonation = {
        donationId: `test_${Date.now()}`,
        username,
        amount: Number(amount),
        eventType,
        message,
        timestamp: Date.now(),
        processed: false,
        parameters: {},
      };

      // Add to queue
      this.dependencies.donationQueue.enqueueDonation(testDonation);
      
      logger.info('Test donation created:', testDonation);
      res.json({
        success: true,
        donation: testDonation,
      });
    } catch (error) {
      logger.error('Error creating test donation:', error as Error);
      res.status(400).json({ error: 'Invalid test donation data' });
    }
  }

  private handleClearDonationQueue(req: Request, res: Response): void {
    try {
      this.dependencies.donationQueue.clearQueue();
      
      logger.info('Donation queue cleared via API');
      res.json({ success: true });
    } catch (error) {
      logger.error('Error clearing donation queue:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleGetRateLimits(req: Request, res: Response): void {
    try {
      const rateLimitStats = this.dependencies.rateLimiter.getStats();
      res.json(rateLimitStats);
    } catch (error) {
      logger.error('Error getting rate limit stats:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleResetRateLimits(req: Request, res: Response): void {
    try {
      this.dependencies.rateLimiter.resetAllLimits();
      
      logger.info('Rate limits reset via API');
      res.json({ success: true });
    } catch (error) {
      logger.error('Error resetting rate limits:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleGetOverlay(req: Request, res: Response): void {
    try {
      // Serve HTML overlay for OBS
      const overlayHtml = this.generateOverlayHtml();
      res.setHeader('Content-Type', 'text/html');
      res.send(overlayHtml);
    } catch (error) {
      logger.error('Error serving overlay:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private generateOverlayHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StreamForge Game Overlay</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: transparent;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
        .game-stats {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.7);
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #fff;
        }
        .stat-item {
            margin: 5px 0;
            font-size: 18px;
        }
        .donation-alert {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            display: none;
            animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
    </style>
</head>
<body>
    <div class="game-stats" id="gameStats">
        <div class="stat-item">Score: <span id="score">0</span></div>
        <div class="stat-item">Health: <span id="health">100</span>/100</div>
        <div class="stat-item">Wave: <span id="wave">1</span></div>
        <div class="stat-item">Boost: <span id="boost">None</span></div>
    </div>

    <div class="donation-alert" id="donationAlert">
        <h2 id="donorName">Anonymous</h2>
        <p id="donationAmount">$0.00</p>
        <p id="donationEffect">Speed Boost!</p>
        <p id="donationMessage">Thank you!</p>
    </div>

    <script>
        // Connect to WebSocket for real-time updates
        const wsUrl = 'ws://localhost:${this.config.websocket.port}';
        let ws = null;

        function connectWebSocket() {
            try {
                ws = new WebSocket(wsUrl);
                
                ws.onopen = function() {
                    console.log('Connected to game server');
                    ws.send(JSON.stringify({
                        type: 'client_info',
                        data: { type: 'overlay' }
                    }));
                };

                ws.onmessage = function(event) {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                };

                ws.onclose = function() {
                    console.log('Disconnected from game server');
                    setTimeout(connectWebSocket, 3000); // Retry connection
                };

                ws.onerror = function(error) {
                    console.error('WebSocket error:', error);
                };
            } catch (error) {
                console.error('Failed to connect to WebSocket:', error);
                setTimeout(connectWebSocket, 3000);
            }
        }

        function handleWebSocketMessage(message) {
            switch (message.type) {
                case 'game_state_update':
                case 'game_state_broadcast':
                    updateGameStats(message.data);
                    break;
                case 'donation_event':
                    showDonationAlert(message.data);
                    break;
            }
        }

        function updateGameStats(gameState) {
            document.getElementById('score').textContent = gameState.score || 0;
            document.getElementById('health').textContent = gameState.knightHealth || 100;
            document.getElementById('wave').textContent = gameState.wave || 1;
            
            const boostText = gameState.boostActive ? 'Active' : 'None';
            document.getElementById('boost').textContent = boostText;
        }

        function showDonationAlert(donation) {
            const alert = document.getElementById('donationAlert');
            
            document.getElementById('donorName').textContent = donation.username || 'Anonymous';
            document.getElementById('donationAmount').textContent = '$' + (donation.amount || 0).toFixed(2);
            document.getElementById('donationEffect').textContent = getEffectDisplayName(donation.eventType);
            document.getElementById('donationMessage').textContent = donation.message || 'Thank you!';
            
            alert.style.display = 'block';
            
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000); // Show for 5 seconds
        }

        function getEffectDisplayName(eventType) {
            const names = {
                'speed_boost': 'Speed Boost!',
                'damage_boost': 'Damage Boost!',
                'health_boost': 'Health Boost!',
                'shield': 'Shield Protection!',
                'enemy_wave': 'Enemy Wave!'
            };
            return names[eventType] || 'Special Effect!';
        }

        // Start WebSocket connection
        connectWebSocket();
    </script>
</body>
</html>`;
  }

  private handleError(error: Error, req: Request, res: Response, next: NextFunction): void {
    logger.error('API error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          logger.info(`Admin API server started on port ${this.config.port}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('Admin API server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Admin API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}