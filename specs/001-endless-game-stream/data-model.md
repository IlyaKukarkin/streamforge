# Data Model: Endless Game Stream

**Created**: 2025-11-11
**Feature**: Endless Game Stream

## Entities

### Game State
Represents the current state of the game instance.

**Fields**:
- `gameId`: string (unique identifier for game instance)
- `status`: enum (RUNNING, PAUSED, STOPPED)
- `knightHealth`: number (0-100)
- `knightAttack`: number (base attack power, 0-100)
- `score`: number (total points, incremented as knight progresses)
- `wave`: number (enemy wave counter)
- `boostActive`: boolean (is attack boost active)
- `boostExpiry`: timestamp (when boost expires)
- `activeDonations`: array of DonationEvent (currently active/queued events)
- `startTime`: timestamp
- `lastUpdated`: timestamp

**Validation Rules**:
- `knightHealth` must be 0-100; resets to 100 on death
- `knightAttack` must be 0-100; restored to base after boost expiry
- `score` must be non-negative
- `boostActive` is false when `boostExpiry` <= current time

**State Transitions**:
- RUNNING → PAUSED (manual pause)
- PAUSED → RUNNING (manual resume)
- RUNNING → STOPPED (game over or shutdown)
- Any state → RUNNING (reset game)

---

### Donation Event
Represents a viewer-triggered donation and its effect on the game.

**Fields**:
- `donationId`: string (unique identifier, UUID)
- `viewerId`: string (viewer identifier)
- `viewerName`: string (viewer display name)
- `amount`: number (donation amount in USD)
- `eventType`: enum (BOOST, SPAWN_ENEMY, HEAL, SPAWN_DRAGON)
- `status`: enum (PENDING, APPLIED, FAILED, EXPIRED)
- `createdAt`: timestamp
- `appliedAt`: timestamp (when event was applied to game)
- `expiresAt`: timestamp (when event effect expires, if applicable)
- `parameters`: object (type-specific parameters, e.g., `{ boostPercent: 50, durationSeconds: 600 }`)
- `metadata`: object (optional metadata, e.g., `{ platform: "streamlabs", originalId: "..." }`)

**Validation Rules**:
- `amount` must be > 0
- `viewerId` and `viewerName` must not be empty
- `eventType` must be one of the defined enum values
- `status` transitions: PENDING → (APPLIED or FAILED) → (optionally EXPIRED)
- `expiresAt` must be > `appliedAt` if applicable

**State Transitions**:
- PENDING → APPLIED (successfully applied to game)
- PENDING → FAILED (error applying to game)
- APPLIED → EXPIRED (after `expiresAt` time passes)
- FAILED (terminal state)

---

### Enemy
Represents an enemy in the game.

**Fields**:
- `enemyId`: string (unique identifier)
- `type`: enum (GOBLIN, ORC, DRAGON, BOSS)
- `health`: number (current health, 0-100)
- `maxHealth`: number (base health, 0-100)
- `attack`: number (attack power, 0-50)
- `x`: number (x position on screen)
- `y`: number (y position on screen)
- `status`: enum (ACTIVE, DEFEATED, DESPAWNED)
- `defeatedBy`: string (donationId that defeated this enemy, if applicable)
- `createdAt`: timestamp
- `defeatedAt`: timestamp (when defeated)

**Validation Rules**:
- `health` must be 0 to `maxHealth`
- `type` determines base `maxHealth` and `attack`
- `x`, `y` must be within game viewport bounds
- `status` transitions: ACTIVE → (DEFEATED or DESPAWNED)

**Type-Specific Attributes**:
- GOBLIN: maxHealth=20, attack=5
- ORC: maxHealth=40, attack=10
- DRAGON: maxHealth=100, attack=30 (spawned via donation)
- BOSS: maxHealth=200, attack=50 (special events)

---

### Knight (Player Character)
Represents the knight character controlled by the game logic.

**Fields**:
- `knightId`: string (always "knight_main" for MVP)
- `health`: number (0-100)
- `maxHealth`: number (always 100)
- `attack`: number (base attack, 0-100, default 20)
- `attackBoost`: number (percentage boost, 0-100, default 0)
- `effectiveAttack`: number (calculated: attack * (1 + attackBoost/100))
- `x`: number (x position, always moves right)
- `y`: number (y position, fixed middle of screen)
- `status`: enum (ALIVE, DEFEATED)
- `defeatedBy`: string (enemyId that defeated knight)

**Validation Rules**:
- `health` is 0-100; death when health <= 0
- `attack` is 0-100
- `attackBoost` is 0-100; reset to 0 after boost expiry
- `effectiveAttack` is always calculated, never set directly
- `x` always increments (right movement)

---

### Overlay State
Represents the current state of the OBS overlay display.

**Fields**:
- `overlayId`: string (unique identifier)
- `displayMode`: enum (SCORE, DONATION_ALERT, BOOST_TIMER, ENEMY_SPAWN)
- `currentScore`: number
- `currentBoost`: object (if active: `{ percent: 50, secondsRemaining: 120 }`)
- `lastDonation`: object (if recent: `{ viewerName: "User123", eventType: "BOOST", amount: 5 }`)
- `nextEnemySpawn`: timestamp (next scheduled enemy spawn)
- `lastUpdated`: timestamp

**Validation Rules**:
- `displayMode` changes based on game events
- `currentBoost.secondsRemaining` must be > 0
- `lastUpdated` should be recent (< 1 second old for live overlay)

---

## Relationships

```text
GameState
├── Knight (1:1)
├── Enemy[] (1:many)
└── DonationEvent[] (1:many)

DonationEvent
└── Enemy (0:1, if eventType == SPAWN_ENEMY)

OverlayState
└── GameState (1:1, mirrors current state)
```

---

## Data Persistence (MVP)

- **GameState**: In-memory (lost on restart; acceptable for prototype)
- **DonationEvent**: Logged to file (for audit/debugging)
- **Enemy**: In-memory (part of GameState)
- **Knight**: In-memory (part of GameState)
- **OverlayState**: In-memory, synced with GameState

**Future (Stabilization)**:
- PostgreSQL or similar for persistent storage
- Redis for cache/queue
- Event store for audit trail
