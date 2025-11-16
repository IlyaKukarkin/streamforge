# Game State Sync Contract

**Version**: 1.0.0
**Created**: 2025-11-11

## Overview

This contract defines the WebSocket protocol for continuous game state synchronization between the backend and the game client. The game sends state updates periodically; the backend forwards them to overlays and logs them.

---

## WebSocket Connection

**Endpoint**: `ws://localhost:3001/game`

### Connection Handshake

**Client → Server**:
```json
{
  "type": "connect",
  "payload": {
    "gameId": "game-001",
    "clientType": "godot-game"
  }
}
```

**Server → Client**:
```json
{
  "type": "connected",
  "payload": {
    "sessionId": "session-uuid",
    "timestamp": "2025-11-11T12:34:56Z"
  }
}
```

---

## Game State Update (Periodic)

**Direction**: Game → Backend (WebSocket)
**Event Type**: `gamestate.update`
**Frequency**: Every frame or ~100ms

```json
{
  "type": "gamestate.update",
  "payload": {
    "gameId": "game-001",
    "knightHealth": 85,
    "knightAttack": 20,
    "knightAttackBoost": 0,
    "knightX": 1250, // stationary; background scrolls to create movement illusion
    "score": 5250,
    "wave": 8,
    "activeDonations": [
      {
        "donationId": "uuid-1",
        "eventType": "BOOST",
        "status": "APPLIED",
        "expiresAt": "2025-11-11T12:44:56Z"
      }
    ],
    "enemies": [
      {
        "enemyId": "enemy-1",
        "type": "ORC",
        "health": 30,
        "x": 1600,
        "y": 300,
        "status": "ACTIVE"
      }
    ],
    "fps": 60
  },
  "timestamp": "2025-11-11T12:34:56Z"
}
```

### Fields

- **gameId**: Game instance identifier
- **knightHealth**: 0-100
- **knightAttack**: 0-100 (base)
- **knightAttackBoost**: 0-100 (percentage boost, 0 if not active)
- **knightX**: X position (stationary; background scrolls to create movement illusion)
- **score**: Total points
- **wave**: Enemy wave number
- **activeDonations**: List of currently active donation effects
- **enemies**: List of active enemies
- **fps**: Current frames per second (for monitoring)

---

## Overlay State Update

**Direction**: Backend → Overlay (HTTP/WebSocket)
**Event Type**: `overlay.update`
**Frequency**: On state change or every 500ms

```json
{
  "type": "overlay.update",
  "payload": {
    "displayMode": "SCORE",
    "score": 5250,
    "wave": 8,
    "knightHealth": 85,
    "boostActive": false,
    "boostTimeRemaining": 0,
    "lastDonation": null,
    "upcomingEnemySpawn": null
  },
  "timestamp": "2025-11-11T12:34:56Z"
}
```

### Fields

- **displayMode**: Current overlay mode (SCORE, DONATION_ALERT, BOOST_TIMER, etc.)
- **score**: Current score to display
- **wave**: Current wave
- **knightHealth**: Knight health bar value
- **boostActive**: Is boost currently active
- **boostTimeRemaining**: Seconds remaining on boost (0 if inactive)
- **lastDonation**: Most recent donation info (or null)
- **upcomingEnemySpawn**: Next scheduled enemy (or null)

---

## Donation Alert (On Donation Event)

**Direction**: Backend → Overlay (WebSocket)
**Event Type**: `overlay.donation_alert`

```json
{
  "type": "overlay.donation_alert",
  "payload": {
    "viewerName": "StreamViewer",
    "amount": 5.00,
    "eventType": "BOOST",
    "message": "StreamViewer donated $5 to boost attack 50% for 10 min!",
    "displayDuration": 3
  },
  "timestamp": "2025-11-11T12:34:56Z"
}
```

### Fields

- **viewerName**: Viewer who donated
- **amount**: Donation amount (USD)
- **eventType**: Type of event (BOOST, SPAWN_ENEMY, HEAL, SPAWN_DRAGON)
- **message**: Human-readable message for display
- **displayDuration**: Seconds to display alert (typically 3-5)

---

## Game Over Event

**Direction**: Game → Backend (WebSocket)
**Event Type**: `game.over`

```json
{
  "type": "game.over",
  "payload": {
    "gameId": "game-001",
    "finalScore": 5250,
    "survivedWaves": 8,
    "survivalTime": 3600,
    "totalDonations": 145,
    "totalRevenue": 652.50,
    "defeatedBy": "enemy-5"
  },
  "timestamp": "2025-11-11T12:34:56Z"
}
```

---

## Error Event

**Direction**: Either direction (WebSocket)
**Event Type**: `error`

```json
{
  "type": "error",
  "payload": {
    "code": "CONNECTION_ERROR",
    "message": "WebSocket connection lost",
    "details": {}
  },
  "timestamp": "2025-11-11T12:34:56Z"
}
```

---

## Heartbeat (Keep-Alive)

**Direction**: Both directions (every 30 seconds)
**Event Type**: `ping` / `pong`

```json
{
  "type": "ping",
  "timestamp": "2025-11-11T12:34:56Z"
}
```

Response:
```json
{
  "type": "pong",
  "timestamp": "2025-11-11T12:34:56Z"
}
```
