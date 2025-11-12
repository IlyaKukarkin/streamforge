// Logging service for StreamForge backend
import type { Config, LogEntry, LogLevel } from "../types/index.js";

export class Logger {
	private config: Config;
	private logBuffer: LogEntry[] = [];

	constructor(config: Config) {
		this.config = config;
	}

	/**
	 * Log a message at the specified level
	 */
	log(
		level: LogLevel,
		message: string,
		meta?: Record<string, unknown>,
		context?: string,
	): void {
		// Check if log level is enabled
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			timestamp: Date.now(),
			level,
			message,
			meta,
			context,
		};

		// Add to buffer
		this.logBuffer.push(entry);

		// Console output (always enabled)
		this.writeToConsole(entry);

		// File output (if enabled)
		if (this.config.enableFileLogging) {
			this.writeToFile(entry);
		}

		// Trim buffer if it gets too large
		if (this.logBuffer.length > 1000) {
			this.logBuffer = this.logBuffer.slice(-500);
		}
	}

	/**
	 * Convenience methods for different log levels
	 */
	debug(
		message: string,
		meta?: Record<string, unknown>,
		context?: string,
	): void {
		this.log("debug", message, meta, context);
	}

	info(
		message: string,
		meta?: Record<string, unknown>,
		context?: string,
	): void {
		this.log("info", message, meta, context);
	}

	warn(
		message: string,
		meta?: Record<string, unknown>,
		context?: string,
	): void {
		this.log("warn", message, meta, context);
	}

	error(
		message: string,
		meta?: Record<string, unknown>,
		context?: string,
	): void {
		this.log("error", message, meta, context);
	}

	/**
	 * Get recent log entries
	 */
	getRecentLogs(count: number = 100): LogEntry[] {
		return this.logBuffer.slice(-count);
	}

	/**
	 * Log a donation event
	 */
	logDonation(
		donationId: string,
		eventType: string,
		viewerId: string,
		amount: number,
		status: string,
	): void {
		this.info(
			"Donation event processed",
			{
				donationId,
				eventType,
				viewerId,
				amount,
				status,
				category: "donation",
			},
			"DonationHandler",
		);
	}

	/**
	 * Log a game state change
	 */
	logGameState(
		gameId: string,
		status: string,
		score: number,
		health: number,
	): void {
		this.debug(
			"Game state updated",
			{
				gameId,
				status,
				score,
				health,
				category: "gamestate",
			},
			"GameManager",
		);
	}

	/**
	 * Log WebSocket events
	 */
	logWebSocket(event: string, clientId?: string, messageType?: string): void {
		this.debug(
			"WebSocket event",
			{
				event,
				clientId,
				messageType,
				category: "websocket",
			},
			"WebSocketServer",
		);
	}

	/**
	 * Log performance metrics
	 */
	logMetrics(metrics: Record<string, unknown>): void {
		this.info(
			"Performance metrics",
			{
				...metrics,
				category: "metrics",
			},
			"MetricsCollector",
		);
	}

	/**
	 * Check if a log level should be output
	 */
	private shouldLog(level: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3,
		};

		const currentLevel = levels[this.config.logLevel];
		const messageLevel = levels[level];

		return messageLevel >= currentLevel;
	}

	/**
	 * Write log entry to console
	 */
	private writeToConsole(entry: LogEntry): void {
		const timestamp = new Date(entry.timestamp).toISOString();
		const context = entry.context ? `[${entry.context}]` : "";
		const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";

		const message = `${timestamp} ${entry.level.toUpperCase()} ${context} ${entry.message}${meta}`;

		// Use appropriate console method
		switch (entry.level) {
			case "debug":
				console.debug(message);
				break;
			case "info":
				console.info(message);
				break;
			case "warn":
				console.warn(message);
				break;
			case "error":
				console.error(message);
				break;
		}
	}

	/**
	 * Write log entry to file
	 */
	private async writeToFile(entry: LogEntry): Promise<void> {
		try {
			const logLine =
				JSON.stringify({
					timestamp: new Date(entry.timestamp).toISOString(),
					level: entry.level,
					message: entry.message,
					context: entry.context,
					meta: entry.meta,
				}) + "\n";

			// Ensure log directory exists
			const logPath = this.config.logFile;
			const logDir = logPath.substring(0, logPath.lastIndexOf("/"));

			if (logDir) {
				try {
					await Bun.write(`${logDir}/.keep`, ""); // Create directory
				} catch (error) {
					// Directory might already exist, ignore error
				}
			}

			// Append to log file
			const file = Bun.file(logPath);
			const content = (await file.exists()) ? await file.text() : "";
			await Bun.write(logPath, content + logLine);
		} catch (error) {
			// Fallback to console if file writing fails
			console.error(`Failed to write to log file: ${error}`);
		}
	}
}

// Create singleton logger instance
let loggerInstance: Logger | null = null;

export function createLogger(config: Config): Logger {
	loggerInstance = new Logger(config);
	return loggerInstance;
}

export function getLogger(): Logger {
	if (!loggerInstance) {
		throw new Error("Logger not initialized. Call createLogger() first.");
	}
	return loggerInstance;
}

// Export singleton instance for convenience
export const logger = {
	debug: (message: string, meta?: Record<string, unknown>, context?: string) =>
		getLogger().debug(message, meta, context),
	info: (message: string, meta?: Record<string, unknown>, context?: string) =>
		getLogger().info(message, meta, context),
	warn: (message: string, meta?: Record<string, unknown>, context?: string) =>
		getLogger().warn(message, meta, context),
	error: (message: string, meta?: Record<string, unknown>, context?: string) =>
		getLogger().error(message, meta, context),
};
