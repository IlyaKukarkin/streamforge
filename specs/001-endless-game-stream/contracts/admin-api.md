# Admin API Contract

**Version**: 1.0.0
**Created**: 2025-11-11

## Overview

This contract defines HTTP admin endpoints for managing the game backend (start/stop, stats, health checks).

## Base URL

```
http://localhost:3000/admin
```

---

## GET /health

Health check endpoint for monitoring.

### Request

```
GET /admin/health
```

### Response (200 OK)

```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2025-11-11T12:34:56Z"
}
```

---

## GET /stats

Current game and backend statistics.

### Request

```
GET /admin/stats
```

### Response (200 OK)

```json
{
  "gameStatus": "RUNNING",
  "currentScore": 5250,
  "waveNumber": 8,
  "knightHealth": 75,
  "knightAttack": 25,
  "boostActive": false,
  "activeDonations": 2,
  "totalDonations": 145,
  "totalRevenue": 652.50,
  "averageDonation": 4.50,
  "uptime": 3600,
  "fps": 60,
  "websocketConnections": 1,
  "errors": 0,
  "timestamp": "2025-11-11T12:34:56Z"
}
```

---

## POST /start

Start or restart the game.

### Request

```
POST /admin/start
Content-Type: application/json

{
  "gameId": "game-001",
  "mode": "normal"
}
```

### Response (200 OK)

```json
{
  "status": "RUNNING",
  "gameId": "game-001",
  "startTime": "2025-11-11T12:34:56Z"
}
```

---

## POST /stop

Stop the game and clear state.

### Request

```
POST /admin/stop
Content-Type: application/json

{
  "reason": "Stream ended",
  "saveStats": true
}
```

### Response (200 OK)

```json
{
  "status": "STOPPED",
  "stoppedAt": "2025-11-11T12:35:56Z",
  "finalScore": 5250,
  "finalStats": {
    "totalDonations": 145,
    "totalRevenue": 652.50,
    "uptime": 3600
  }
}
```

---

## POST /pause

Pause the game (game state frozen, donations still processed).

### Request

```
POST /admin/pause
```

### Response (200 OK)

```json
{
  "status": "PAUSED",
  "pausedAt": "2025-11-11T12:35:56Z"
}
```

---

## POST /resume

Resume the game from paused state.

### Request

```
POST /admin/resume
```

### Response (200 OK)

```json
{
  "status": "RUNNING",
  "resumedAt": "2025-11-11T12:36:56Z"
}
```

---

## POST /reset

Reset game state while keeping donation log.

### Request

```
POST /admin/reset
Content-Type: application/json

{
  "keepStats": true
}
```

### Response (200 OK)

```json
{
  "status": "RUNNING",
  "resetAt": "2025-11-11T12:37:56Z",
  "gameState": {
    "knightHealth": 100,
    "score": 0,
    "wave": 1
  }
}
```

---

## Error Response (Any Endpoint)

### Response (400 Bad Request or 500 Internal Server Error)

```json
{
  "error": "INVALID_GAME_STATE",
  "message": "Cannot start game; game is already running.",
  "timestamp": "2025-11-11T12:34:56Z"
}
```

---

## Security

- All admin endpoints require an environment-based API key (header: `Authorization: Bearer SECRET_API_KEY`)
- Endpoints are only available on localhost (or specified admin host) for MVP
- All requests/responses are logged with timestamps
