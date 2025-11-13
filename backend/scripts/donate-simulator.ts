#!/usr/bin/env bun
// Donation simulator for testing boost events
// Simulates BOOST events with amount $5 USD, 50% boost, 600s duration

import type { DonationEventType } from "../src/types/index.js";

interface RawDonationData {
	viewerId: string;
	viewerName: string;
	amount: number;
	message?: string;
	eventType?: DonationEventType;
	timestamp?: number;
}

interface SimulatorConfig {
	backendUrl: string;
	websocketUrl: string;
	simulatedViewers: string[];
}

class DonationSimulator {
	private config: SimulatorConfig;

	constructor(config: SimulatorConfig) {
		this.config = config;
	}

	async simulateBoostDonation(
		viewerName?: string,
		amount?: number,
	): Promise<void> {
		const donation = this.createBoostDonation(viewerName, amount);
		await this.sendDonation(donation);
	}

	async simulateHealDonation(
		viewerName?: string,
		amount?: number,
	): Promise<void> {
		const donation = this.createHealDonation(viewerName, amount);
		await this.sendDonation(donation);
	}

	async simulateSpawnEnemyDonation(
		viewerName?: string,
		amount?: number,
	): Promise<void> {
		const donation = this.createSpawnEnemyDonation(viewerName, amount);
		await this.sendDonation(donation);
	}

	async simulateSpawnDragonDonation(
		viewerName?: string,
		amount?: number,
	): Promise<void> {
		const donation = this.createSpawnDragonDonation(viewerName, amount);
		await this.sendDonation(donation);
	}

	private createBoostDonation(
		viewerName?: string,
		amount = 5.0,
	): RawDonationData {
		return {
			viewerId: this.generateViewerId(),
			viewerName: viewerName || this.getRandomViewerName(),
			amount,
			message: "Boost the knight!",
			eventType: "BOOST",
		};
	}

	private createHealDonation(
		viewerName?: string,
		amount = 2.0,
	): RawDonationData {
		return {
			viewerId: this.generateViewerId(),
			viewerName: viewerName || this.getRandomViewerName(),
			amount,
			message: "Heal the knight!",
			eventType: "HEAL",
		};
	}

	private createSpawnEnemyDonation(
		viewerName?: string,
		amount = 3.0,
	): RawDonationData {
		return {
			viewerId: this.generateViewerId(),
			viewerName: viewerName || this.getRandomViewerName(),
			amount,
			message: "Challenge the knight!",
			eventType: "SPAWN_ENEMY",
		};
	}

	private createSpawnDragonDonation(
		viewerName?: string,
		amount = 10.0,
	): RawDonationData {
		return {
			viewerId: this.generateViewerId(),
			viewerName: viewerName || this.getRandomViewerName(),
			amount,
			message: "DRAGON CHALLENGE!",
			eventType: "SPAWN_DRAGON",
		};
	}

	private async sendDonation(donationData: RawDonationData): Promise<void> {
		console.log(`[Simulator] Simulating donation:`, {
			viewer: donationData.viewerName,
			amount: `$${donationData.amount}`,
			type: donationData.eventType,
		});

		try {
			// Send via HTTP to admin API
			const response = await fetch(`${this.config.backendUrl}/api/donation`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(donationData),
			});

			if (response.ok) {
				const result = await response.json();
				console.log(`[Simulator] ✅ Donation sent successfully:`, result);
			} else {
				console.error(
					`[Simulator] ❌ Failed to send donation:`,
					response.status,
					response.statusText,
				);
			}
		} catch (error) {
			console.error(`[Simulator] ❌ Error sending donation:`, error);
		}
	}

	private generateViewerId(): string {
		return `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
	}

	private getRandomViewerName(): string {
		const names = this.config.simulatedViewers;
		return names[Math.floor(Math.random() * names.length)];
	}

	// Batch simulation methods
	async simulateRandomDonationSpree(
		count: number,
		delayMs = 2000,
	): Promise<void> {
		console.log(
			`[Simulator] Starting random donation spree: ${count} donations`,
		);

		const donationTypes: DonationEventType[] = [
			"BOOST",
			"HEAL",
			"SPAWN_ENEMY",
			"SPAWN_DRAGON",
		];

		for (let i = 0; i < count; i++) {
			const randomType =
				donationTypes[Math.floor(Math.random() * donationTypes.length)];
			const randomAmount = Math.random() * 15 + 1; // $1-$16

			console.log(`[Simulator] Donation ${i + 1}/${count}:`);

			switch (randomType) {
				case "BOOST":
					await this.simulateBoostDonation(undefined, randomAmount);
					break;
				case "HEAL":
					await this.simulateHealDonation(undefined, randomAmount);
					break;
				case "SPAWN_ENEMY":
					await this.simulateSpawnEnemyDonation(undefined, randomAmount);
					break;
				case "SPAWN_DRAGON":
					await this.simulateSpawnDragonDonation(undefined, randomAmount);
					break;
			}

			if (i < count - 1) {
				console.log(`[Simulator] Waiting ${delayMs}ms before next donation...`);
				await this.sleep(delayMs);
			}
		}

		console.log(`[Simulator] ✅ Donation spree completed!`);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Declare process for CLI args
declare const process: { argv: string[] };

// CLI Interface
async function main() {
	const config: SimulatorConfig = {
		backendUrl: "http://localhost:3000",
		websocketUrl: "ws://localhost:3001",
		simulatedViewers: [
			"StreamFan123",
			"KnightSupporter",
			"DragonSlayer",
			"BoostMaster",
			"HealBot",
			"ChallengeSeeker",
			"EpicGamer42",
			"StreamLover",
			"DonationHero",
			"GameFan2023",
		],
	};

	const simulator = new DonationSimulator(config);

	// Parse command line arguments
	// Parse command line arguments
	const args = process.argv.slice(2);
	const command = args[0] || "help";

	console.log(`[Simulator] StreamForge Donation Simulator`);
	console.log(`[Simulator] Backend: ${config.backendUrl}`);
	console.log(`[Simulator] WebSocket: ${config.websocketUrl}`);
	console.log();

	switch (command) {
		case "boost": {
			const boostAmount = parseFloat(args[1]) || 5.0;
			const boostViewer = args[2] || undefined;
			await simulator.simulateBoostDonation(boostViewer, boostAmount);
			break;
		}

		case "heal": {
			const healAmount = parseFloat(args[1]) || 2.0;
			const healViewer = args[2] || undefined;
			await simulator.simulateHealDonation(healViewer, healAmount);
			break;
		}

		case "enemy": {
			const enemyAmount = parseFloat(args[1]) || 3.0;
			const enemyViewer = args[2] || undefined;
			await simulator.simulateSpawnEnemyDonation(enemyViewer, enemyAmount);
			break;
		}

		case "dragon": {
			const dragonAmount = parseFloat(args[1]) || 10.0;
			const dragonViewer = args[2] || undefined;
			await simulator.simulateSpawnDragonDonation(dragonViewer, dragonAmount);
			break;
		}

		case "spree": {
			const spreeCount = parseInt(args[1]) || 5;
			const spreeDelay = parseInt(args[2]) || 2000;
			await simulator.simulateRandomDonationSpree(spreeCount, spreeDelay);
			break;
		}

		case "help":
		default:
			console.log(
				`Usage: bun run scripts/donate-simulator.ts <command> [args]`,
			);
			console.log();
			console.log(`Commands:`);
			console.log(
				`  boost [amount] [viewer]    - Simulate boost donation (default: $5.00)`,
			);
			console.log(
				`  heal [amount] [viewer]     - Simulate heal donation (default: $2.00)`,
			);
			console.log(
				`  enemy [amount] [viewer]    - Simulate enemy spawn (default: $3.00)`,
			);
			console.log(
				`  dragon [amount] [viewer]   - Simulate dragon spawn (default: $10.00)`,
			);
			console.log(
				`  spree [count] [delay_ms]   - Simulate random donation spree (default: 5 donations, 2000ms delay)`,
			);
			console.log(`  help                       - Show this help message`);
			console.log();
			console.log(`Examples:`);
			console.log(`  bun run scripts/donate-simulator.ts boost`);
			console.log(
				`  bun run scripts/donate-simulator.ts boost 7.50 "SuperFan"`,
			);
			console.log(`  bun run scripts/donate-simulator.ts spree 10 1000`);
			console.log(`  bun run scripts/donate-simulator.ts dragon 15.00`);
			break;
	}
}

// Run the script
main().catch(console.error);
