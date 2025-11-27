# Donation Event API Contract

**Version**: 1.0.0
**Created**: 2025-11-11

## Overview

This contract defines the JSON protocol for donation events between the backend and the game. Donations trigger in-game effects via WebSocket messages.

## Request: Donation Received

**Direction**: Backend → Game (WebSocket)
**Event Type**: `donation.received`

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
    },
    "metadata": {
      "platform": "streamlabs",
      "originalId": "external-id-123"
    }
  },
  "timestamp": "2025-11-11T12:34:56Z"
}
```

### Fields

- **type**: Always `"donation.received"`
- **payload.donationId**: Unique identifier (UUID v4)
- **payload.viewerId**: Platform-specific viewer ID
- **payload.viewerName**: Viewer display name
- **payload.amount**: Donation amount (USD, >= 0.01)
- **payload.eventType**: One of `BOOST`, `SPAWN_ENEMY`, `HEAL`, `SPAWN_DRAGON`
- **payload.parameters**: Type-specific parameters (see Event Types below)
- **payload.metadata**: Optional platform metadata
- **timestamp**: ISO 8601 timestamp (UTC)

---

## Response: Donation Processed

**Direction**: Game → Backend (WebSocket)
**Event Type**: `donation.processed`

```json
{
  "type": "donation.processed",
  "payload": {
    "donationId": "uuid-string",
    "status": "APPLIED",
    "appliedAt": "2025-11-11T12:34:57Z",
    "gameState": {
      "knightAttack": 30,
      "knightHealth": 95,
      "score": 1250,
      "wave": 3,
      "boostActive": true,
      "boostExpiry": "2025-11-11T12:44:57Z"
    }
  },
  "timestamp": "2025-11-11T12:34:57Z"
}
```

### Fields

- **type**: Always `"donation.processed"`
- **payload.donationId**: Echo of request donationId
- **payload.status**: `APPLIED`, `FAILED`, or `QUEUED`
- **payload.appliedAt**: Timestamp when effect was applied
- **payload.gameState**: Current game state after applying effect
- **timestamp**: ISO 8601 timestamp (UTC)

---

## Event Types & Parameters

### BOOST
Increases knight's attack by a percentage for a duration.

```json
{
  "eventType": "BOOST",
  "parameters": {
    "boostPercent": 50,
    "durationSeconds": 600
  }
}
```

- **boostPercent**: 0-100 (default 50)
- **durationSeconds**: > 0 (default 600 = 10 minutes)

---

### SPAWN_ENEMY
Spawns a standard enemy to challenge the knight.

```json
{
  "eventType": "SPAWN_ENEMY",
  "parameters": {
    "enemyType": "ORC",
    "priority": "high"
  }
}
```

- **enemyType**: One of `GOBLIN`, `ORC`, `BOSS` (default `ORC`)
- **priority**: `low`, `normal`, `high` (affects queue order)

---

### HEAL
Restores knight's health by an amount or percentage.

```json
{
  "eventType": "HEAL",
  "parameters": {
    "amount": 20
  }
}
```

- **amount**: 1-100 (absolute health restored)

---

### SPAWN_DRAGON
Spawns a special dragon enemy (harder, higher rewards).

```json
{
  "eventType": "SPAWN_DRAGON",
  "parameters": {
    "difficulty": "normal"
  }
}
```

- **difficulty**: `easy`, `normal`, `hard`

---

## Error Response

**Direction**: Either direction (WebSocket)
**Event Type**: `error`

```json
{
  "type": "error",
  "payload": {
    "code": "DONATION_PROCESSING_FAILED",
    "message": "Donation could not be applied; knight is already boosted.",
    "details": {
      "donationId": "uuid-string",
      "reason": "RATE_LIMITED"
    }
  },
  "timestamp": "2025-11-11T12:34:57Z"
}
```

### Error Codes

- `DONATION_PROCESSING_FAILED`: General failure to apply donation
- `RATE_LIMITED`: Donation rejected due to rate limiting
- `INVALID_PAYLOAD`: Malformed request
- `GAME_NOT_RUNNING`: Game is not in RUNNING state
- `UNKNOWN_EVENT_TYPE`: eventType not recognized

---

## Rate Limiting

- Max 10 donations per 60 seconds (global)
- Max 3 donations per 60 seconds per user
- Excess donations are queued or rejected with `RATE_LIMITED` error

---

## Cooldowns

- BOOST: Only one active boost at a time; new boosts queue or fail
- SPAWN_ENEMY: Max 1 enemy spawn per 5 seconds
- SPAWN_DRAGON: Max 1 dragon per 30 seconds
