// Type definitions for StreamForge backend
// All entities and interfaces used across the application

export interface Config {
	readonly port: number;
	readonly websocketPort: number;
	readonly adminApiKey: string;
	readonly logLevel: "debug" | "info" | "warn" | "error";
	readonly logFile: string;
	readonly donationRateLimit: number;
	readonly donationRateWindow: number;
	readonly donationPerUserLimit: number;
	readonly boostCooldown: number;
	readonly spawnEnemyCooldown: number;
	readonly spawnDragonCooldown: number;
	readonly enableMetrics: boolean;
	readonly enableFileLogging: boolean;
	readonly enableCors: boolean;
	readonly websocket: {
		readonly port: number;
		readonly pingInterval: number;
		readonly connectionTimeout: number;
	};
}

export type GameStatus = "RUNNING" | "PAUSED" | "STOPPED";

export interface GameState {
	readonly gameId: string;
	readonly status: GameStatus;
	readonly knightHealth: number; // 0-100
	readonly knightAttack: number; // base attack, 0-100
	readonly score: number; // non-negative
	readonly wave: number; // enemy wave counter
	readonly boostActive: boolean;
	readonly boostExpiry: number; // timestamp
	readonly activeDonations: DonationEvent[];
	readonly pendingEnemySpawns: PendingEnemySpawn[]; // enemies to spawn
	readonly startTime: number; // timestamp
	readonly lastUpdated: number; // timestamp
}

export type DonationEventType =
	| "BOOST"
	| "SPAWN_ENEMY"
	| "HEAL"
	| "SPAWN_DRAGON";
export type DonationStatus = "PENDING" | "APPLIED" | "FAILED" | "EXPIRED";

export interface DonationEvent {
	readonly donationId: string; // UUID
	readonly viewerId: string;
	readonly viewerName: string;
	readonly amount: number; // USD, > 0
	readonly eventType: DonationEventType;
	readonly status: DonationStatus;
	readonly createdAt: number; // timestamp
	readonly appliedAt?: number; // timestamp
	readonly expiresAt?: number; // timestamp
	readonly parameters: DonationEventParameters;
	readonly metadata?: Record<string, unknown>;
}

export interface DonationEventParameters {
	readonly boostPercent?: number; // for BOOST events
	readonly durationSeconds?: number; // for timed effects
	readonly enemyType?: EnemyType; // for SPAWN_ENEMY events
	readonly healAmount?: number; // for HEAL events
}

export type EnemyType = "GOBLIN" | "ORC" | "DRAGON" | "BOSS";
export type EnemyStatus = "ACTIVE" | "DEFEATED" | "DESPAWNED";

export interface Enemy {
	readonly enemyId: string;
	readonly type: EnemyType;
	readonly health: number; // 0 to maxHealth
	readonly maxHealth: number;
	readonly attack: number; // 0-50
	readonly x: number; // position
	readonly y: number; // position
	readonly status: EnemyStatus;
	readonly defeatedBy?: string; // donationId
	readonly createdAt: number; // timestamp
	readonly defeatedAt?: number; // timestamp
}

export interface PendingEnemySpawn {
	readonly spawnId: string;
	readonly enemyType: EnemyType;
	readonly donorName: string;
	readonly donationId: string;
	readonly createdAt: number; // timestamp when spawn was requested
}

export interface Knight {
	readonly knightId: string;
	readonly health: number; // 0-100, resets to 100 on death
	readonly baseAttack: number; // 20 default
	readonly currentAttack: number; // baseAttack + boosts
	readonly x: number; // position
	readonly y: number; // position
	readonly status: "ALIVE" | "DEAD";
	readonly boostActive: boolean;
	readonly boostExpiry: number; // timestamp
	readonly lastUpdated: number;
}

export interface OverlayState {
	readonly score: number;
	readonly wave: number;
	readonly knightHealth: number;
	readonly boostActive: boolean;
	readonly boostTimeRemaining: number; // seconds
	readonly recentDonation?: {
		readonly viewerName: string;
		readonly amount: number;
		readonly eventType: DonationEventType;
		readonly timestamp: number;
	};
}

// WebSocket message types
export interface WebSocketMessage {
	readonly type: string;
	readonly payload?: unknown;
	readonly data?: unknown; // Alternative payload field
	readonly timestamp?: number;
}

// Additional WebSocket types
export interface ConnectionState {
	readonly id: string;
	readonly ip: string;
	readonly connectedAt: number;
	lastPing: number;
	isAlive: boolean;
	clientType: string;
}

export interface GameStateUpdate {
	readonly knightHealth?: number;
	readonly score?: number;
	readonly wave?: number;
	readonly status?: GameStatus;
}

export interface StatsUpdate {
	readonly score: number;
	readonly kills: number;
	readonly damage_dealt: number;
	readonly damage_taken: number;
}

export interface DonationNotification {
	readonly donationId: string;
	readonly username: string;
	readonly amount: number;
	readonly eventType: DonationEventType;
	readonly message: string;
}

export interface ConnectMessage extends WebSocketMessage {
	readonly type: "connect";
	readonly payload: {
		readonly gameId: string;
		readonly clientType: "godot-game" | "overlay" | "admin";
	};
}

export interface ConnectedMessage extends WebSocketMessage {
	readonly type: "connected";
	readonly payload: {
		readonly sessionId: string;
		readonly timestamp: number;
	};
}

export interface DonationReceivedMessage extends WebSocketMessage {
	readonly type: "donation.received";
	readonly payload: DonationEvent;
}

export interface GameStateUpdateMessage extends WebSocketMessage {
	readonly type: "gamestate.update";
	readonly payload: GameState;
}

export interface OverlayUpdateMessage extends WebSocketMessage {
	readonly type: "overlay.update";
	readonly payload: OverlayState;
}

export interface DonationAlertMessage extends WebSocketMessage {
	readonly type: "donation.alert";
	readonly payload: {
		readonly viewerName: string;
		readonly amount: number;
		readonly eventType: DonationEventType;
		readonly message: string;
	};
}

// HTTP API types
export interface HealthCheckResponse {
	readonly status: "healthy" | "unhealthy";
	readonly uptime: number; // seconds
	readonly timestamp: number;
}

export interface GameStats {
	readonly game: {
		readonly status: GameStatus;
		readonly score: number;
		readonly knightHealth: number;
		readonly wave: number;
		readonly boostActive: boolean;
		readonly activeEnemies: number;
	};
	readonly donations: {
		readonly totalReceived: number;
		readonly totalAmount: number;
		readonly averageAmount: number;
		readonly queueLength: number;
	};
	readonly performance: {
		readonly uptime: number;
		readonly memoryUsage: string;
		readonly eventLatency: string;
	};
}

// Rate limiting types
export interface RateLimitEntry {
	readonly count: number;
	readonly windowStart: number; // timestamp
	readonly lastRequest: number; // timestamp
}

export interface RateLimitState {
	readonly global: RateLimitEntry;
	readonly users: Map<string, RateLimitEntry>;
}

// Logging types
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
	readonly timestamp: number;
	readonly level: LogLevel;
	readonly message: string;
	readonly meta?: Record<string, unknown>;
	readonly context?: string;
}

// Error types
export class StreamForgeError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "StreamForgeError";
	}
}

export class ValidationError extends StreamForgeError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "VALIDATION_ERROR", 400, details);
		this.name = "ValidationError";
	}
}

export class RateLimitError extends StreamForgeError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "RATE_LIMIT_EXCEEDED", 429, details);
		this.name = "RateLimitError";
	}
}

export class GameStateError extends StreamForgeError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "GAME_STATE_ERROR", 422, details);
		this.name = "GameStateError";
	}
}
