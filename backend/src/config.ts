// Environment configuration loader for StreamForge backend

import * as dotenv from "dotenv";
import type { Config } from "./types/index.js";

// Load .env file
dotenv.config();

// Load environment variables with defaults and validation
export function loadConfig(): Config {
	const config: Config = {
		port: parseInt(process.env.PORT ?? "3000", 10),
		websocketPort: parseInt(process.env.WEBSOCKET_PORT ?? "3001", 10),
		adminApiKey:
			process.env.ADMIN_API_KEY ?? "dev-admin-key-change-in-production",
		logLevel: (process.env.LOG_LEVEL as Config["logLevel"]) ?? "info",
		logFile: process.env.LOG_FILE ?? "logs/backend.log",
		donationRateLimit: parseInt(process.env.DONATION_RATE_LIMIT ?? "10", 10),
		donationRateWindow: parseInt(
			process.env.DONATION_RATE_WINDOW ?? "60000",
			10,
		),
		donationPerUserLimit: parseInt(
			process.env.DONATION_PER_USER_LIMIT ?? "3",
			10,
		),
		boostCooldown: parseInt(process.env.BOOST_COOLDOWN ?? "1", 10),
		spawnEnemyCooldown: parseInt(process.env.SPAWN_ENEMY_COOLDOWN ?? "5", 10),
		spawnDragonCooldown: parseInt(
			process.env.SPAWN_DRAGON_COOLDOWN ?? "30",
			10,
		),
		enableMetrics: process.env.ENABLE_METRICS?.toLowerCase() === "true",
		enableFileLogging:
			process.env.ENABLE_FILE_LOGGING?.toLowerCase() === "true",
		enableCors: process.env.ENABLE_CORS?.toLowerCase() !== "false", // default true
		websocket: {
			port: parseInt(process.env.WEBSOCKET_PORT ?? "3001", 10),
			pingInterval: 30000,
			connectionTimeout: 60000,
		},
	};

	// Validate configuration
	validateConfig(config);

	return config;
}

function validateConfig(config: Config): void {
	const errors: string[] = [];

	if (config.port < 1 || config.port > 65535) {
		errors.push(`Invalid PORT: ${config.port} (must be 1-65535)`);
	}

	if (config.websocketPort < 1 || config.websocketPort > 65535) {
		errors.push(
			`Invalid WEBSOCKET_PORT: ${config.websocketPort} (must be 1-65535)`,
		);
	}

	if (config.port === config.websocketPort) {
		errors.push("PORT and WEBSOCKET_PORT cannot be the same");
	}

	if (!config.adminApiKey || config.adminApiKey.length < 8) {
		errors.push("ADMIN_API_KEY must be at least 8 characters");
	}

	if (
		config.adminApiKey === "dev-admin-key-change-in-production" &&
		Bun.env.NODE_ENV === "production"
	) {
		errors.push("ADMIN_API_KEY must be changed in production");
	}

	if (!["debug", "info", "warn", "error"].includes(config.logLevel)) {
		errors.push(`Invalid LOG_LEVEL: ${config.logLevel}`);
	}

	if (config.donationRateLimit < 1 || config.donationRateLimit > 1000) {
		errors.push(
			`Invalid DONATION_RATE_LIMIT: ${config.donationRateLimit} (must be 1-1000)`,
		);
	}

	if (config.donationRateWindow < 1000 || config.donationRateWindow > 3600000) {
		errors.push(
			`Invalid DONATION_RATE_WINDOW: ${config.donationRateWindow} (must be 1s-1h)`,
		);
	}

	if (config.donationPerUserLimit < 1 || config.donationPerUserLimit > 100) {
		errors.push(
			`Invalid DONATION_PER_USER_LIMIT: ${config.donationPerUserLimit} (must be 1-100)`,
		);
	}

	if (config.boostCooldown < 0 || config.boostCooldown > 300) {
		errors.push(
			`Invalid BOOST_COOLDOWN: ${config.boostCooldown} (must be 0-300s)`,
		);
	}

	if (config.spawnEnemyCooldown < 1 || config.spawnEnemyCooldown > 300) {
		errors.push(
			`Invalid SPAWN_ENEMY_COOLDOWN: ${config.spawnEnemyCooldown} (must be 1-300s)`,
		);
	}

	if (config.spawnDragonCooldown < 1 || config.spawnDragonCooldown > 3600) {
		errors.push(
			`Invalid SPAWN_DRAGON_COOLDOWN: ${config.spawnDragonCooldown} (must be 1-3600s)`,
		);
	}

	if (errors.length > 0) {
		throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
	}
}

// Export the config instance
export const config = loadConfig();

// Environment helpers
export const isDevelopment = Bun.env.NODE_ENV === "development";
export const isProduction = Bun.env.NODE_ENV === "production";
export const isTest = Bun.env.NODE_ENV === "test";
