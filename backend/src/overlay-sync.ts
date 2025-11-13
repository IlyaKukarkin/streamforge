// Overlay synchronization service
// Sends overlay.donation_alert events when boost is applied

import { logger } from "./services/logger.js";
import type { DonationEvent, GameState, OverlayState } from "./types/index.js";
import type { GameWebSocketServer } from "./websocket-server.js";

export interface OverlaySync {
	sendDonationAlert(donation: DonationEvent): void;
	sendGameStateUpdate(gameState: GameState): void;
	sendOverlayUpdate(overlayData: OverlayState): void;
}

export class StreamForgeOverlaySync implements OverlaySync {
	private webSocketServer: GameWebSocketServer;

	constructor(webSocketServer: GameWebSocketServer) {
		this.webSocketServer = webSocketServer;
		logger.info("Overlay sync service initialized");
	}

	public sendDonationAlert(donation: DonationEvent): void {
		logger.info("Sending donation alert to overlays", {
			donationId: donation.donationId,
			viewerName: donation.viewerName,
			amount: donation.amount,
			eventType: donation.eventType,
		});

		// Send overlay-specific update message
		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "donation_alert",
				donation: donation,
				timestamp: Date.now(),
			},
		});

		// Also send the original donation event for game clients
		this.webSocketServer.broadcastDonation(donation);
	}

	public sendGameStateUpdate(gameState: GameState): void {
		// Convert game state to overlay-friendly format
		const overlayState: OverlayState =
			this.convertGameStateToOverlay(gameState);

		logger.debug("Sending game state update to overlays", {
			score: overlayState.score,
			wave: overlayState.wave,
			knightHealth: overlayState.knightHealth,
			boostActive: overlayState.boostActive,
		});

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "game_state",
				overlayState,
				timestamp: Date.now(),
			},
		});
	}

	public sendOverlayUpdate(overlayData: OverlayState): void {
		logger.debug("Sending custom overlay update", {
			score: overlayData.score,
			boostActive: overlayData.boostActive,
		});

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "custom",
				overlayState: overlayData,
				timestamp: Date.now(),
			},
		});
	}

	public sendBoostExpiredAlert(boostType: string): void {
		logger.info("Sending boost expired alert to overlays", { boostType });

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "boost_expired",
				boostType,
				timestamp: Date.now(),
			},
		});
	}

	public sendHealthUpdate(health: number, maxHealth: number): void {
		logger.debug("Sending health update to overlays", { health, maxHealth });

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "health_update",
				health,
				maxHealth,
				healthPercentage: (health / maxHealth) * 100,
				timestamp: Date.now(),
			},
		});
	}

	public sendScoreUpdate(score: number, wave: number): void {
		logger.debug("Sending score update to overlays", { score, wave });

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "score_update",
				score,
				wave,
				timestamp: Date.now(),
			},
		});
	}

	private convertGameStateToOverlay(gameState: GameState): OverlayState {
		// Calculate boost time remaining
		let boostTimeRemaining = 0;
		if (gameState.boostActive && gameState.boostExpiry > Date.now()) {
			boostTimeRemaining = Math.max(
				0,
				(gameState.boostExpiry - Date.now()) / 1000,
			);
		}

		// Get most recent donation if available
		const recentDonation =
			gameState.activeDonations.length > 0
				? gameState.activeDonations[gameState.activeDonations.length - 1]
				: undefined;

		return {
			score: gameState.score,
			wave: gameState.wave,
			knightHealth: gameState.knightHealth,
			boostActive: gameState.boostActive,
			boostTimeRemaining,
			...(recentDonation && {
				recentDonation: {
					viewerName: recentDonation.viewerName,
					amount: recentDonation.amount,
					eventType: recentDonation.eventType,
					timestamp: recentDonation.createdAt,
				},
			}),
		} as OverlayState;
	}

	// Utility methods for common overlay operations
	public sendAlert(
		message: string,
		type: "info" | "warning" | "error" = "info",
		duration: number = 3000,
	): void {
		logger.info(`Sending ${type} alert: ${message}`);

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: "alert",
				message,
				alertType: type,
				duration,
				timestamp: Date.now(),
			},
		});
	}

	public sendCustomMessage(
		messageType: string,
		data: Record<string, unknown>,
	): void {
		logger.info(`Sending custom overlay message: ${messageType}`, data);

		this.webSocketServer.broadcastMessage({
			type: "overlay_update",
			data: {
				type: messageType,
				...data,
				timestamp: Date.now(),
			},
		});
	}
}
