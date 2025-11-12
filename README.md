# StreamForge: Endless Game Stream

An interactive 2D endless side-scroller where viewers can donate to influence gameplay through real-time events. Built with Godot 4 (GDScript) for the game and Bun + TypeScript for the backend service.

## 🎮 Features

- **Endless 2D Gameplay**: Knight character walks right, fighting enemies and accumulating score
- **Donation-Driven Events**: Viewers can donate to boost the knight or spawn challenging enemies
- **Real-time Streaming**: WebSocket integration for live game state updates
- **OBS Integration**: HTML overlays for displaying donation alerts and game stats
- **Rate Limiting**: Anti-spam protection with configurable cooldowns
- **Admin Controls**: HTTP endpoints for managing game state and viewing metrics

## 🏗️ Architecture

```
streamforge/
├── game/                  # Godot 4 project (pure GDScript)
│   ├── scenes/           # Game scenes and UI
│   ├── scripts/          # GDScript game logic
│   └── assets/           # Sprites and sounds
├── backend/              # Bun + TypeScript service
│   ├── src/             # Backend source code
│   ├── overlays/        # HTML overlays for OBS
│   └── scripts/         # Demo donation simulator
└── docs/                # Additional documentation
```

## 🚀 Quick Start

### Prerequisites

- [Godot 4.3+](https://godotengine.org/download)
- [Bun 1.0+](https://bun.sh)
- [OBS Studio](https://obsproject.com) (for streaming)

### Option 1: Automated Setup (Recommended)

```powershell
# First-time setup
.\setup.ps1

# Start full development environment
Start-FullStack
```

### Option 2: Manual Setup

```powershell
# Install dependencies
bun install

# Start backend
bun run dev

# Open game (in separate terminal)
bun run game:open
```

### Available Scripts

From project root, you can now run:

```powershell
# Development
bun run dev              # Start backend in development mode
bun run start            # Start backend in production mode
bun run build            # Build backend for production
bun run setup            # Install all dependencies

# Testing & Quality
bun run lint             # Lint backend code
bun run test             # Run backend tests
bun run type-check       # TypeScript type checking

# PowerShell Functions (after loading .\scripts.ps1)
Start-FullStack          # Start backend + open game
Start-Backend            # Start backend server
Open-Game                # Open game in Godot Editor
Build-Backend            # Build backend with full validation
Show-Status              # Show project status and available commands
```

### 3. Development Workflow

The project includes PowerShell scripts for streamlined development:

```powershell
# Load development functions
.\scripts.ps1

# or use the batch file for persistent session
.\dev.bat

# Check project status
Show-Status

# Start everything for development
Start-FullStack

# Stop development environment
Stop-FullStack
```

### 4. Configure OBS

Add Browser Source pointing to:
- Score overlay: `http://localhost:3000/overlays/score.html`
- Donation alerts: `http://localhost:3000/overlays/donation-alert.html`

## 📡 API Endpoints

### Admin API (Port 3000)

- `GET /admin/health` - Health check
- `GET /admin/stats` - Game statistics
- `POST /admin/start` - Start game
- `POST /admin/stop` - Stop game
- `POST /admin/pause` - Pause game
- `POST /admin/resume` - Resume game
- `POST /admin/reset` - Reset game state

### WebSocket (Port 3001)

- Game connects to `/game` for state synchronization
- Real-time donation events and state updates

## 🎯 User Stories

### MVP (Priority 1)
- **Play Endless Game**: Knight walks right, fights enemies, accumulates score

### Enhanced Features (Priority 2+)
- **Donation Boost**: Viewers donate to boost knight attack (50% for 10 minutes)
- **Donation Challenge**: Viewers donate to spawn difficult enemies (dragons)

## 🔧 Development

### Backend Development

```bash
cd backend
bun dev          # Start with hot reload
bun lint         # Check code style
bun type-check   # TypeScript validation
```

### Game Development

Open `game/project.godot` in Godot Editor. The project uses pure GDScript with:
- Static typing enabled
- Comprehensive warnings configured
- WebSocket client for backend communication

## 🚢 Deployment

### Local Development
Use PM2 or Docker Compose for local multi-service setup.

### Production (VPS)
See `docs/DEPLOYMENT.md` for complete VPS setup instructions including:
- Docker containers
- Process management
- Firewall configuration
- OBS Studio headless setup

## 📋 Configuration

Key configuration files:
- `backend/.env` - Environment variables
- `game/project.godot` - Godot project settings
- `backend/package.json` - Dependencies and scripts

## 🤝 Contributing

1. Follow the constitution principles (see `.specify/memory/constitution.md`)
2. Use the task-based workflow (see `specs/001-endless-game-stream/tasks.md`)
3. Test changes with the demo donation simulator
4. Update documentation for any API changes

## 📄 License

ISC License - see LICENSE file for details.

---

**Status**: MVP Implementation Phase  
**Last Updated**: 2025-11-12  
**Documentation**: See `specs/001-endless-game-stream/` for detailed specifications