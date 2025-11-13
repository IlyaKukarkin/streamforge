// Event processor for applying donation events to game state
// Handles rate-limiting, cooldowns, and business logic for each event type

import type { DonationQueue } from "./donation-queue.js";
import type { GameStateManager } from "./game-state.js";
import { logger } from "./services/logger.js";
import type {
	Config,
	DonationEvent,
	DonationEventType,
	GameState,
} from "./types/index.js";

export interface EventProcessor {
	processEvent(event: DonationEvent): Promise<ProcessResult>;
	canProcessEvent(event: DonationEvent): boolean;
	getQueueStatus(): QueueStatus;
}

export interface ProcessResult {
	success: boolean;
	eventId: string;
	reason?: string;
	gameState?: GameState;
}

export interface QueueStatus {
	pendingEvents: number;
	totalProcessed: number;
	eventTypeCooldowns: Record<DonationEventType, number>; // seconds remaining
}

export class StreamForgeEventProcessor implements EventProcessor {
	private donationQueue: DonationQueue;
	private gameStateManager: GameStateManager;
	private processingInterval: NodeJS.Timeout | null = null;
	private isProcessing = false;

	constructor(
		_config: Config,
		gameStateManager: GameStateManager,
		donationQueue: DonationQueue,
	) {
		this.gameStateManager = gameStateManager;
		this.donationQueue = donationQueue;

		// Start processing donations at regular intervals
		this.startProcessing();

		logger.info("Event processor initialized", {
			processingInterval: "1000ms",
			supportedEvents: ["BOOST", "SPAWN_ENEMY", "HEAL", "SPAWN_DRAGON"],
		});
	}

	public async processEvent(event: DonationEvent): Promise<ProcessResult> {
		logger.info("Processing donation event", {
			donationId: event.donationId,
			eventType: event.eventType,
			viewerName: event.viewerName,
			amount: event.amount,
		});

		// Check if we can process this event type (cooldowns, etc.)
		if (!this.canProcessEvent(event)) {
			const result: ProcessResult = {
				success: false,
				eventId: event.donationId,
				reason: `Event type ${event.eventType} is on cooldown or rate limited`,
			};

			logger.warn("Event rejected due to cooldown", {
				donationId: result.eventId,
				reason: result.reason,
			});
			return result;
		}

		// Add to queue
		const queueResult = this.donationQueue.enqueue(event);
		if (!queueResult.success) {
			return {
				success: false,
				eventId: event.donationId,
				reason: queueResult.reason || "Unknown queue error",
			};
		}

		logger.info("Event queued successfully", {
			donationId: event.donationId,
			queueLength: this.donationQueue.length(),
		});

		return {
			success: true,
			eventId: event.donationId,
			gameState: this.gameStateManager.getState(),
		};
	}

	public canProcessEvent(_event: DonationEvent): boolean {
		// For now, we'll rely on the donation queue's cooldown logic
		// In a real implementation, we might have additional business rules here
		return true; // The queue will handle cooldowns internally
	}

	public getQueueStatus(): QueueStatus {
		// This is a simplified implementation
		// In a real system, we'd track more detailed cooldown info
		return {
			pendingEvents: this.donationQueue.length(),
			totalProcessed: 0, // Would need to track this
			eventTypeCooldowns: {
				BOOST: 0,
				SPAWN_ENEMY: 0,
				HEAL: 0,
				SPAWN_DRAGON: 0,
			},
		};
	}

	private startProcessing(): void {
		this.processingInterval = setInterval(() => {
			this.processNextEvent();
		}, 1000); // Process every second

		logger.info("Started event processing loop");
	}

	private async processNextEvent(): Promise<void> {
		if (this.isProcessing || this.donationQueue.isEmpty()) {
			return;
		}

		this.isProcessing = true;

		try {
			const event = this.donationQueue.dequeue();
			if (!event) {
				return;
			}

			logger.info("Processing queued event", {
				donationId: event.donationId,
				eventType: event.eventType,
			});

			// Apply the event to game state based on type
			const gameState = await this.applyEventToGameState(event);

			// Note: Event status tracking would need mutable event objects
			// For now, we just log that the event was applied
			logger.debug("Event marked as applied", {
				donationId: event.donationId,
				appliedAt: Date.now(),
			});

			logger.info("Event applied successfully", {
				donationId: event.donationId,
				newGameState: {
					boostActive: gameState.boostActive,
					knightAttack: gameState.knightAttack,
					knightHealth: gameState.knightHealth,
				},
			});
		} catch (error) {
			logger.error("Error processing event", { error });
		} finally {
			this.isProcessing = false;
		}
	}

	private async applyEventToGameState(
		event: DonationEvent,
	): Promise<GameState> {
		logger.debug("Applying event to game state", {
			eventType: event.eventType,
			parameters: event.parameters,
		});

		switch (event.eventType) {
			case "BOOST":
				return this.applyBoostEvent(event);

			case "HEAL":
				return this.applyHealEvent(event);

			case "SPAWN_ENEMY":
			case "SPAWN_DRAGON":
				// These will be implemented when we add enemy spawning
				logger.info("Enemy spawning not yet implemented", {
					eventType: event.eventType,
				});
				return this.gameStateManager.getState();

			default:
				logger.warn("Unknown event type", { eventType: event.eventType });
				return this.gameStateManager.getState();
		}
	}

	private applyBoostEvent(event: DonationEvent): GameState {
		const boostPercent = event.parameters.boostPercent || 50;
		const durationSeconds = event.parameters.durationSeconds || 600; // 10 minutes default

		logger.info("Applying boost", {
			boostPercent,
			durationSeconds,
			donationId: event.donationId,
		});

		return this.gameStateManager.applyBoost(durationSeconds, boostPercent);
	}

	private applyHealEvent(event: DonationEvent): GameState {
		const healAmount = event.parameters.healAmount || 25;
		const currentHealth = this.gameStateManager.getState().knightHealth;
		const newHealth = Math.min(100, currentHealth + healAmount);

		logger.info("Applying heal", {
			healAmount,
			currentHealth,
			newHealth,
			donationId: event.donationId,
		});

		return this.gameStateManager.updateKnightHealth(newHealth);
	}

	public stop(): void {
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = null;
			logger.info("Event processing stopped");
		}
	}
}
