# Backend Service

Bun + TypeScript backend service for StreamForge endless game stream. Handles donation events, WebSocket communication with the game, and serves HTML overlays for OBS.

## 🏗️ Architecture

- **WebSocket Server** (Port 3001): Real-time communication with Godot game
- **HTTP Admin API** (Port 3000): Control endpoints and health checks  
- **Static File Server**: Serves HTML overlays for OBS browser sources
- **Donation Queue**: In-memory FIFO queue with rate limiting and cooldowns
- **Logging Service**: File + stdout logging with JSON format

## 🚀 Quick Start

### Prerequisites

- [Bun 1.0+](https://bun.sh)
- Node.js 18+ (for TypeScript tooling)

### Installation

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
bun install
```

### Development

```bash
bun dev          # Start with hot reload
bun lint         # ESLint code checking
bun type-check   # TypeScript validation
bun build        # Build for production
```

### Production

```bash
bun start        # Start production server
# or with PM2:
pm2 start pm2.config.js
```

## 📡 API Reference

### Admin Endpoints

All admin endpoints require `Authorization: Bearer {ADMIN_API_KEY}` header.

#### Health Check
```http
GET /admin/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2025-11-12T12:34:56Z"
}
```

#### Game Statistics
```http
GET /admin/stats
```

Response:
```json
{
  "game": {
    "status": "RUNNING",
    "score": 1250,
    "knightHealth": 85,
    "wave": 12,
    "boostActive": true,
    "activeEnemies": 3
  },
  "donations": {
    "totalReceived": 45,
    "totalAmount": 127.50,
    "averageAmount": 2.83,
    "queueLength": 2
  },
  "performance": {
    "uptime": 7200,
    "memoryUsage": "45.2 MB",
    "eventLatency": "120ms"
  }
}
```

#### Game Control
```http
POST /admin/start    # Start game
POST /admin/stop     # Stop game  
POST /admin/pause    # Pause game
POST /admin/resume   # Resume game
POST /admin/reset    # Reset game state
```

### WebSocket Events

#### Game Connection
```javascript
// Connect to ws://localhost:3001/game
const ws = new WebSocket('ws://localhost:3001/game');

// Handshake
ws.send(JSON.stringify({
  type: 'connect',
  payload: {
    gameId: 'game-001',
    clientType: 'godot-game'
  }
}));
```

#### Donation Events (Backend → Game)
```json
{
  "type": "donation.received",
  "payload": {
    "donationId": "uuid-string",
    "viewerId": "user_123", 
    "viewerName": "StreamViewer",
    "amount": 5.00,
    "eventType": "BOOST",
    "parameters": {
      "boostPercent": 50,
      "durationSeconds": 600
    }
  },
  "timestamp": "2025-11-12T12:34:56Z"
}
```

#### Game State Updates (Game → Backend)
```json
{
  "type": "gamestate.update",
  "payload": {
    "gameId": "game-001",
    "status": "RUNNING",
    "knightHealth": 85,
    "knightAttack": 30,
    "score": 1250,
    "wave": 12,
    "boostActive": true,
    "boostExpiry": "2025-11-12T12:44:56Z",
    "activeEnemies": [
      {
        "enemyId": "enemy-001",
        "type": "GOBLIN",
        "health": 15,
        "x": 450,
        "y": 300
      }
    ]
  },
  "timestamp": "2025-11-12T12:34:56Z"
}
```

## 🎮 Demo Scripts

### Donation Simulator

Simulate donation events for testing:

```bash
cd scripts
bun donate-simulator.ts

# Options:
bun donate-simulator.ts --type=BOOST --amount=5
bun donate-simulator.ts --type=SPAWN_DRAGON --amount=10
bun donate-simulator.ts --viewer="TestUser" --amount=2.50
```

## 🔧 Configuration

### Environment Variables

```bash
# Server ports
PORT=3000                    # Admin API port
WEBSOCKET_PORT=3001         # WebSocket server port

# Security  
ADMIN_API_KEY=your-secret   # Admin API authentication

# Logging
LOG_LEVEL=info              # debug, info, warn, error
LOG_FILE=logs/backend.log   # Log file path

# Rate Limiting
DONATION_RATE_LIMIT=10      # Max donations per window
DONATION_RATE_WINDOW=60000  # Window size in ms
DONATION_PER_USER_LIMIT=3   # Max per user per window

# Cooldowns (seconds)
BOOST_COOLDOWN=1           # Boost event cooldown
SPAWN_ENEMY_COOLDOWN=5     # Enemy spawn cooldown  
SPAWN_DRAGON_COOLDOWN=30   # Dragon spawn cooldown
```

### TypeScript Configuration

The project uses strict TypeScript with:
- ES2022 target
- ESNext modules  
- Strict null checks
- No implicit any
- Full type checking enabled

### ESLint Rules

- TypeScript ESLint recommended
- Prettier integration
- No unused variables
- Consistent naming conventions

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts           # Main entry point
│   ├── server.ts          # WebSocket server
│   ├── admin-api.ts       # HTTP admin endpoints
│   ├── donation-handler.ts # Donation event processing
│   ├── game-state.ts      # Game state management
│   ├── donation-queue.ts  # FIFO queue with rate limiting
│   ├── middleware/        # Express middleware
│   ├── services/          # Logging, metrics, etc.
│   └── types/            # TypeScript type definitions
├── overlays/             # HTML files for OBS
├── scripts/              # Demo and utility scripts
├── logs/                 # Log files (gitignored)
└── dist/                 # Built output (gitignored)
```

## 🚢 Deployment

### Docker

```bash
docker build -t streamforge-backend .
docker run -p 3000:3000 -p 3001:3001 streamforge-backend
```

### PM2 (Process Manager)

```bash
pm2 start pm2.config.js
pm2 logs streamforge-backend
pm2 restart streamforge-backend
```

### Systemd Service

```bash
sudo cp streamforge-backend.service /etc/systemd/system/
sudo systemctl enable streamforge-backend
sudo systemctl start streamforge-backend
```

## 🐛 Troubleshooting

### Common Issues

**WebSocket connection fails**
- Check firewall settings for port 3001
- Verify WebSocket server is running: `netstat -an | grep 3001`

**High memory usage**
- Check donation queue length: `GET /admin/stats`
- Restart service if queue is stuck: `POST /admin/reset`

**Slow event processing**
- Check event latency in stats
- Reduce donation rate limits in .env
- Monitor logs for error patterns

### Debug Mode

```bash
LOG_LEVEL=debug bun dev
```

### Health Checks

```bash
# Quick health check
curl http://localhost:3000/admin/health

# Detailed stats
curl -H "Authorization: Bearer your-admin-key" \
     http://localhost:3000/admin/stats
```

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Add type definitions for new entities
3. Update API documentation for endpoint changes
4. Test with donation simulator before committing
5. Run linting: `bun lint`

---

**Next Steps**: See `../game/README.md` for Godot setup and `../docs/DEPLOYMENT.md` for production deployment.