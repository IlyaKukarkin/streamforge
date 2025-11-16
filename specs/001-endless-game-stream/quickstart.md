# Quickstart: Endless Game Stream

**Created**: 2025-11-11
**Feature**: Endless Game Stream MVP

## Overview

This guide walks you through setting up and running the endless game stream MVP on a local machine or VPS.

## Prerequisites

- **Godot 4** (download from https://godotengine.org)
- **Bun** (v1.x, install from https://bun.sh)
- **Node.js** (v18+, for TypeScript tooling) or Bun alone
- **OBS Studio** (optional, for streaming overlays; download from https://obsproject.com)
- **Git** (for cloning the repo)

## Installation

### 1. Clone the Repository

```bash
git clone <repo-url> streamforge
cd streamforge
git checkout 001-endless-game-stream
```

### 2. Install Backend Dependencies

```bash
cd backend
bun install
```

### 3. Open Godot Project

```bash
cd game
# Open Godot 4 and load the project folder
godot --editor
```

### 4. Build Overlay Assets (Optional)

```bash
cd backend/overlays
# Overlays are static HTML; no build required
ls -la
```

## Running Locally

### Start the Backend

```bash
cd backend
bun run dev
```

Expected output:
```
Backend running on http://localhost:3000
Admin API: http://localhost:3000/admin
WebSocket: ws://localhost:3001/game
Overlay Server: http://localhost:3002/overlay
```

### Start the Game

In Godot editor:
1. Open `game/scenes/Game.tscn`
2. Click "Play" (F5)
3. The game connects to the backend WebSocket automatically

Expected: Game starts, knight appears to move to the right (background and obstacles scroll; knight remains stationary), score displays.

### Simulate Donations (Demo Script)

In a new terminal:

```bash
cd backend/scripts
bun run donate-simulator.ts
```

The script simulates random donations every 5 seconds. Watch the game:
- 50% chance: BOOST (attack +50% for 10 min)
- 30% chance: SPAWN_ENEMY (ORC)
- 20% chance: SPAWN_DRAGON

### Check Admin Stats

```bash
curl -H "Authorization: Bearer dev-secret-key" http://localhost:3000/admin/stats
```

Expected output:
```json
{
  "gameStatus": "RUNNING",
  "currentScore": 2500,
  "waveNumber": 5,
  "totalDonations": 12,
  "totalRevenue": 48.50,
  ...
}
```

## Running with OBS Overlays

### 1. Setup OBS Browser Source

In OBS:
1. Create a new Browser Source
2. Set URL: `http://localhost:3002/overlay/score`
3. Width: 400px, Height: 100px
4. Add to scene

### 2. Start Overlay Server

The backend already serves overlays at `/overlay/*`. No additional setup needed.

### 3. Capture Godot Window

In OBS:
1. Create a new Window Capture source
2. Select the Godot editor window (or game window if exported)
3. Add to scene below overlay

### 4. Stream or Record

Click "Start Recording" or stream to Twitch/other platform.

## Deployment to VPS

### 1. Prepare VPS (Ubuntu 22.04+)

```bash
# SSH into VPS
ssh user@vps-ip

# Install dependencies
sudo apt-get update
sudo apt-get install -y curl git

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Godot (optional, if running game on VPS)
# Download and extract Godot 4 binary
```

### 2. Clone and Deploy Backend

```bash
git clone <repo-url> streamforge
cd streamforge/backend
bun install --production
```

### 3. Setup Environment Variables

Create `.env`:
```bash
ADMIN_API_KEY=your-secure-secret-key
PORT=3000
WEBSOCKET_PORT=3001
OVERLAY_PORT=3002
LOG_FILE=/var/log/streamforge/game.log
```

### 4. Start with PM2 or Docker

**Option A: PM2**

```bash
bun install -g pm2

pm2 start pm2.config.js --name streamforge-backend
pm2 start game/Dockerfile --name streamforge-game  # or use native binary
pm2 save
pm2 startup
```

**Option B: Docker**

```bash
docker-compose up -d
```

### 5. Setup Firewall (if needed)

```bash
sudo ufw allow 3000/tcp  # Admin API
sudo ufw allow 3001/tcp  # Game WebSocket
sudo ufw allow 3002/tcp  # Overlay Server
```

### 6. Point OBS to VPS

In OBS overlay browser source, use:
```
http://<vps-ip>:3002/overlay/score
```

## Demo Scenario

1. **Terminal 1**: Start backend (`bun run dev`)
2. **Terminal 2**: Start game (Godot editor, F5)
3. **Terminal 3**: Run donation simulator (`bun run donate-simulator.ts`)
4. **OBS**: Add browser source + window capture, start recording
5. **Observe**:
   - Donations appear in simulation output
   - Game reacts: score changes, enemies spawn, boosts apply
   - Overlay updates in real-time
   - Admin stats API shows donation counts

## Troubleshooting

### Game Won't Connect to Backend

- Check backend is running: `curl http://localhost:3000/admin/health`
- Check WebSocket URL in game code: `ws://localhost:3001/game`
- Check firewall: `sudo ufw status`

### No Donations Received

- Check donation simulator is running: `bun run donate-simulator.ts`
- Check backend logs: `tail -f logs/backend.log`
- Check game logs: Godot console should show donation events

### Overlay Not Appearing in OBS

- Check overlay server: `curl http://localhost:3002/overlay/score`
- Check browser source URL is correct
- Check OBS browser source permissions

### High Latency or Lag

- Check game FPS: Admin stats should show `fps: 60`
- Check network latency: `ping localhost`
- Check CPU usage: `top` or `htop`

## Next Steps

- Customize donation events in `backend/src/donation-events.ts`
- Add more enemy types in `game/scripts/enemy.gd`
- Integrate real Streamlabs/Twitch API in stabilization phase
- Add comprehensive testing suite
- Monitor production metrics (CPU, memory, error rates)

## Files & Directories

```
backend/
├── src/
│   ├── server.ts           # Main backend server
│   ├── donation-events.ts  # Event handling
│   ├── game-state.ts       # Game state management
│   └── websocket.ts        # WebSocket bridge
├── overlays/
│   ├── score.html          # Score overlay
│   └── donation-alert.html # Donation alert overlay
├── scripts/
│   └── donate-simulator.ts # Demo donation simulator
├── Dockerfile              # Backend container
├── pm2.config.js          # PM2 config
└── package.json

game/
├── scenes/
│   ├── Game.tscn           # Main game scene
│   ├── Knight.tscn         # Knight character
│   └── Enemy.tscn          # Enemy prefab
├── scripts/
│   ├── game.gd             # Main game script
│   ├── knight.gd           # Knight logic
│   └── enemy.gd            # Enemy logic
├── assets/
│   ├── sprites/            # Game sprites (knight, enemies)
│   └── sounds/             # Sound effects (optional)
└── Dockerfile              # Game container (optional)
```
