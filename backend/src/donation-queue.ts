// FIFO donation event queue with rate limiting and cooldown tracking
import type {
	Config,
	DonationEvent,
	DonationEventType,
} from "./types/index.js";
import { logger } from "./services/logger.js";

interface CooldownState {
	lastEventTime: number;
	cooldownUntil: number;
}

export class DonationQueue {
	private queue: DonationEvent[] = [];
	private cooldowns: Map<DonationEventType, CooldownState> = new Map();
	private config: Config;
	private processing = false;
	private totalProcessedCount = 0;

	constructor(config: Config) {
		this.config = config;
		this.initializeCooldowns();
	}

	/**
	 * Add donation event to queue
	 */
	enqueue(donation: DonationEvent): { success: boolean; reason?: string } {
		// Check event type cooldown
		if (!this.canProcessEventType(donation.eventType)) {
			const cooldown = this.cooldowns.get(donation.eventType);
			const remainingMs = cooldown ? cooldown.cooldownUntil - Date.now() : 0;

			return {
				success: false,
				reason: `Event type ${donation.eventType} is on cooldown for ${Math.ceil(remainingMs / 1000)}s`,
			};
		}

		// Add to queue
		this.queue.push(donation);

		// Update cooldown
		this.updateCooldown(donation.eventType);

		return { success: true };
	}

	/**
	 * Remove and return next donation from queue
	 */
	dequeue(): DonationEvent | null {
		const donation = this.queue.shift() || null;
		if (donation) {
			this.totalProcessedCount++;
		}
		return donation;
	}

	/**
	 * Peek at next donation without removing it
	 */
	peek(): DonationEvent | null {
		return this.queue[0] || null;
	}

	/**
	 * Get current queue length
	 */
	length(): number {
		return this.queue.length;
	}

	/**
	 * Check if queue is empty
	 */
	isEmpty(): boolean {
		return this.queue.length === 0;
	}

	/**
	 * Clear all donations from queue
	 */
	clear(): void {
		this.queue = [];
	}

	/**
	 * Get all donations in queue (for admin purposes)
	 */
	getAll(): DonationEvent[] {
		return [...this.queue];
	}

	/**
	 * Remove specific donation by ID
	 */
	remove(donationId: string): boolean {
		const initialLength = this.queue.length;
		this.queue = this.queue.filter((d) => d.donationId !== donationId);
		return this.queue.length < initialLength;
	}

	/**
	 * Check if event type can be processed (not on cooldown)
	 */
	canProcessEventType(eventType: DonationEventType): boolean {
		const cooldown = this.cooldowns.get(eventType);
		if (!cooldown) return true;

		return Date.now() >= cooldown.cooldownUntil;
	}

	/**
	 * Get cooldown status for all event types
	 */
	getCooldownStatus(): Record<
		DonationEventType,
		{
			active: boolean;
			remainingMs: number;
			lastEventTime: number;
		}
	> {
		const now = Date.now();
		const status: Record<string, any> = {};

		for (const [eventType, cooldown] of this.cooldowns.entries()) {
			const remainingMs = Math.max(0, cooldown.cooldownUntil - now);
			status[eventType] = {
				active: remainingMs > 0,
				remainingMs,
				lastEventTime: cooldown.lastEventTime,
			};
		}

		return status as Record<
			DonationEventType,
			{
				active: boolean;
				remainingMs: number;
				lastEventTime: number;
			}
		>;
	}

	/**
	 * Reset all cooldowns (admin function)
	 */
	resetCooldowns(): void {
		this.initializeCooldowns();
	}

	/**
	 * Get queue statistics
	 */
	getStats(): {
		queueLength: number;
		totalProcessed: number;
		eventTypeCounts: Record<DonationEventType, number>;
		oldestDonationAge: number;
	} {
		const eventTypeCounts: Record<string, number> = {
			BOOST: 0,
			SPAWN_ENEMY: 0,
			HEAL: 0,
			SPAWN_DRAGON: 0,
		};

		let oldestAge = 0;
		const now = Date.now();

		for (const donation of this.queue) {
			eventTypeCounts[donation.eventType]++;

			const age = now - donation.createdAt;
			if (age > oldestAge) {
				oldestAge = age;
			}
		}

		// Get total processed from counter
		const totalProcessed = this.totalProcessedCount;

		return {
			queueLength: this.queue.length,
			totalProcessed,
			eventTypeCounts: eventTypeCounts as Record<DonationEventType, number>,
			oldestDonationAge: oldestAge,
		};
	}

	/**
	 * Process queue with async handler
	 */
	async processQueue(
		handler: (donation: DonationEvent) => Promise<void>,
	): Promise<void> {
		if (this.processing) {
			return; // Already processing
		}

		this.processing = true;

		try {
			while (!this.isEmpty()) {
				const donation = this.dequeue();
				if (!donation) break;

				try {
					await handler(donation);
				} catch (error) {
					logger.error(
						`Failed to process donation ${donation.donationId}:`,
						error,
					);
					// Continue processing other donations
				}
			}
		} finally {
			this.processing = false;
		}
	}

	/**
	 * Initialize cooldown tracking for all event types
	 */
	private initializeCooldowns(): void {
		const eventTypes: DonationEventType[] = [
			"BOOST",
			"SPAWN_ENEMY",
			"HEAL",
			"SPAWN_DRAGON",
		];

		for (const eventType of eventTypes) {
			this.cooldowns.set(eventType, {
				lastEventTime: 0,
				cooldownUntil: 0,
			});
		}
	}

	/**
	 * Update cooldown for specific event type
	 */
	private updateCooldown(eventType: DonationEventType): void {
		const now = Date.now();
		const cooldownMs = this.getCooldownForEventType(eventType) * 1000;

		this.cooldowns.set(eventType, {
			lastEventTime: now,
			cooldownUntil: now + cooldownMs,
		});
	}

	/**
	 * Get cooldown duration for event type in seconds
	 */
	private getCooldownForEventType(eventType: DonationEventType): number {
		switch (eventType) {
			case "BOOST":
				return this.config.boostCooldown;
			case "SPAWN_ENEMY":
				return this.config.spawnEnemyCooldown;
			case "SPAWN_DRAGON":
				return this.config.spawnDragonCooldown;
			case "HEAL":
				return this.config.boostCooldown; // Same as boost for now
			default:
				return 5; // Default 5 second cooldown
		}
	}
}

// Singleton instance
let queueInstance: DonationQueue | null = null;

export function createDonationQueue(config: Config): DonationQueue {
	queueInstance = new DonationQueue(config);
	return queueInstance;
}

export function getDonationQueue(): DonationQueue {
	if (!queueInstance) {
		throw new Error(
			"DonationQueue not initialized. Call createDonationQueue() first.",
		);
	}
	return queueInstance;
}
