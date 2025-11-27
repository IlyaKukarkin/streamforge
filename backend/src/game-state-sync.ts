// Game state synchronization service for overlay updates
// Handles real-time broadcasting of game state to overlay clients

import type { GameStateManager } from "./game-state.js";
import { logger } from "./services/logger.js";
import type { Config } from "./types/index.js";

export interface GameStateSyncDependencies {
	gameStateManager: GameStateManager;
}

export class GameStateSyncService {
	private config: Config;
	private gameStateManager: GameStateManager;
	private overlayClients: Set<any> = new Set();
	private lastSentState: any = null;
	private syncInterval: NodeJS.Timeout | null = null;
	private isRunning: boolean = false;

	constructor(config: Config, dependencies: GameStateSyncDependencies) {
		this.config = config;
		this.gameStateManager = dependencies.gameStateManager;
		logger.info("[GameStateSync] Game state sync service initialized");
	}

	start(): void {
		if (this.isRunning) {
			logger.warn("[GameStateSync] Service already running");
			return;
		}

		this.isRunning = true;

		// Start periodic sync every 1 second for overlays
		this.syncInterval = setInterval(() => {
			this.broadcastGameState();
		}, 1000);

		logger.info(
			"[GameStateSync] Service started - broadcasting every 1 second",
		);
	}

	stop(): void {
		this.isRunning = false;

		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}

		this.overlayClients.clear();
		logger.info("[GameStateSync] Service stopped");
	}

	registerOverlayClient(client: any): void {
		this.overlayClients.add(client);

		// Send current state immediately to new client
		const currentState = this.getCurrentGameState();
		this.sendToClient(client, {
			type: "game_state_update",
			data: currentState,
		});

		logger.info(
			"[GameStateSync] New overlay client registered, total clients:",
			this.overlayClients.size,
		);
	}

	unregisterOverlayClient(client: any): void {
		this.overlayClients.delete(client);
		logger.info(
			"[GameStateSync] Overlay client unregistered, remaining clients:",
			this.overlayClients.size,
		);
	}

	broadcastGameState(): void {
		if (this.overlayClients.size === 0) {
			return;
		}

		const currentState = this.getCurrentGameState();

		if (this.hasStateChanged(currentState)) {
			const message = {
				type: "gamestate_update",
				timestamp: Date.now(),
				data: currentState,
			};

			this.broadcastToAllClients(message);
			this.lastSentState = currentState;
		}
	}

	broadcastEvent(eventType: string, eventData: any): void {
		const message = {
			type: "game_event",
			event: eventType,
			timestamp: Date.now(),
			data: eventData,
		};

		this.broadcastToAllClients(message);
		logger.debug("[GameStateSync] Broadcasted event:", eventType);
	}

	private getCurrentGameState(): any {
		const gameState = this.gameStateManager.getCurrentState();

		return {
			score: gameState.score || 0,
			kills: gameState.kills || 0,
			wave: gameState.wave || 1,
			knight: {
				health: gameState.knight?.health || 0,
				maxHealth: gameState.knight?.maxHealth || 100,
				position: gameState.knight?.position || { x: 0, y: 0 },
				alive: gameState.knight?.alive || false,
			},
			enemies: {
				active: gameState.enemies?.active || 0,
				total_spawned: gameState.enemies?.totalSpawned || 0,
			},
			boost: {
				active: gameState.boost?.active || false,
				type: gameState.boost?.type || "",
				timeRemaining: gameState.boost?.timeRemaining || 0,
			},
			status: gameState.status || "running",
			performance: {
				fps: gameState.performance?.fps || 60,
				connectionCount: this.overlayClients.size,
			},
		};
	}

	private hasStateChanged(newState: any): boolean {
		if (!this.lastSentState) {
			return true;
		}

		const prev = this.lastSentState;
		const curr = newState;

		// Check for significant changes
		return (
			prev.score !== curr.score ||
			prev.kills !== curr.kills ||
			prev.knight.health !== curr.knight.health ||
			prev.boost.active !== curr.boost.active ||
			prev.status !== curr.status ||
			prev.wave !== curr.wave
		);
	}

	private broadcastToAllClients(message: any): void {
		const messageStr = JSON.stringify(message);
		const disconnectedClients = new Set();

		this.overlayClients.forEach((client) => {
			try {
				if (client.readyState === 1) {
					client.send(messageStr);
				} else {
					disconnectedClients.add(client);
				}
			} catch (error) {
				logger.error("[GameStateSync] Error sending to client:", error);
				disconnectedClients.add(client);
			}
		});

		disconnectedClients.forEach((client) => {
			this.overlayClients.delete(client);
		});
	}

	private sendToClient(client: any, message: any): void {
		try {
			if (client.readyState === 1) {
				client.send(JSON.stringify(message));
			}
		} catch (error) {
			logger.error("[GameStateSync] Error sending to specific client:", error);
			this.overlayClients.delete(client);
		}
	}

	triggerScoreUpdate(score: number, kills: number): void {
		this.broadcastEvent("score_update", { score, kills });
	}

	triggerGameOverUpdate(finalScore: number, totalKills: number): void {
		this.broadcastEvent("game_over", {
			finalScore,
			totalKills,
			timestamp: Date.now(),
		});
	}

	getConnectedClients(): number {
		return this.overlayClients.size;
	}
}
