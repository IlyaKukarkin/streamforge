// Donation event handler for processing incoming donation events
// Parses donation events and routes them to the game via WebSocket

import { logger } from "./services/logger.js";
import type {
	DonationEvent,
	DonationEventParameters,
	DonationEventType,
	EnemyType,
} from "./types/index.js";

export interface DonationHandler {
	processDonation(donationData: RawDonationData): Promise<DonationEvent>;
	validateDonation(donationData: RawDonationData): boolean;
}

export interface RawDonationData {
	donationId?: string;
	viewerId: string;
	viewerName: string;
	amount: number;
	message?: string;
	eventType?: DonationEventType;
	timestamp?: number;
}

export class StreamForgeDonationHandler implements DonationHandler {
	constructor() {
		logger.info("Donation handler initialized");
	}

	public async processDonation(
		donationData: RawDonationData,
	): Promise<DonationEvent> {
		logger.info("Processing donation", {
			viewerName: donationData.viewerName,
			amount: donationData.amount,
			eventType: donationData.eventType,
		});

		// Validate the donation data
		if (!this.validateDonation(donationData)) {
			throw new Error("Invalid donation data provided");
		}

		// Generate donation ID if not provided
		const donationId = donationData.donationId || this.generateDonationId();

		// Determine event type based on amount if not specified
		const eventType =
			donationData.eventType || this.determineEventType(donationData.amount);

		// Create the donation event
		const donationEvent: DonationEvent = {
			donationId,
			viewerId: donationData.viewerId,
			viewerName: donationData.viewerName,
			amount: donationData.amount,
			eventType,
			status: "PENDING",
			createdAt: donationData.timestamp || Date.now(),
			parameters: this.generateEventParameters(eventType, donationData.amount),
			metadata: {
				originalMessage: donationData.message || "",
				processedAt: Date.now(),
			},
		};

		logger.info("Donation event created", {
			donationId: donationEvent.donationId,
			eventType: donationEvent.eventType,
			parameters: donationEvent.parameters,
		});

		return donationEvent;
	}

	public validateDonation(donationData: RawDonationData): boolean {
		// Check required fields
		if (
			!donationData.viewerId ||
			!donationData.viewerName ||
			!donationData.amount
		) {
			logger.error("Missing required donation fields", {
				viewerId: donationData.viewerId,
				viewerName: donationData.viewerName,
				amount: donationData.amount,
			});
			return false;
		}

		// Validate amount is positive
		if (donationData.amount <= 0) {
			logger.error("Donation amount must be positive", {
				amount: donationData.amount,
			});
			return false;
		}

		// Validate viewer name is not empty
		if (donationData.viewerName.trim().length === 0) {
			logger.error("Viewer name cannot be empty");
			return false;
		}

		// Validate event type if provided
		if (
			donationData.eventType &&
			!this.isValidEventType(donationData.eventType)
		) {
			logger.error("Invalid event type", { eventType: donationData.eventType });
			return false;
		}

		return true;
	}

	private determineEventType(amount: number): DonationEventType {
		// Simple amount-based event type determination
		// This can be made more sophisticated later
		if (amount >= 10) {
			return "SPAWN_DRAGON";
		} else if (amount >= 5) {
			return "BOOST";
		} else if (amount >= 2) {
			return "SPAWN_ENEMY";
		} else {
			return "HEAL";
		}
	}

	private generateEventParameters(
		eventType: DonationEventType,
		amount: number,
	): DonationEventParameters {
		switch (eventType) {
			case "BOOST":
				return {
					boostPercent: 50, // 50% attack boost
					durationSeconds: 600, // 10 minutes
				};
			case "SPAWN_ENEMY":
				return {
					enemyType: (amount >= 3 ? "ORC" : "GOBLIN") as EnemyType,
				};
			case "SPAWN_DRAGON":
				return {
					enemyType: "DRAGON" as EnemyType,
				};
			case "HEAL":
				return {
					healAmount: Math.min(25, amount * 5), // 5 HP per dollar, max 25
				};
			default:
				return {};
		}
	}

	private isValidEventType(eventType: string): eventType is DonationEventType {
		return ["BOOST", "SPAWN_ENEMY", "HEAL", "SPAWN_DRAGON"].includes(eventType);
	}

	private generateDonationId(): string {
		// Generate a simple UUID-like ID
		return `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
