// Rate limiting middleware for donation events
import type { Config, RateLimitEntry } from "../types/index.js";
import { RateLimitError } from "../types/index.js";

export class RateLimiter {
	private config: Config;
	private globalState: RateLimitEntry;
	private userStates: Map<string, RateLimitEntry> = new Map();
	private cleanupInterval: ReturnType<typeof setInterval>;

	constructor(config: Config) {
		this.config = config;
		this.globalState = {
			count: 0,
			windowStart: Date.now(),
			lastRequest: Date.now(),
		};

		// Clean up old user states periodically
		this.cleanupInterval = setInterval(() => {
			this.cleanupOldStates();
		}, 60000); // Every minute
	}

	/**
	 * Dispose of the rate limiter and clean up resources
	 */
	dispose(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}

	/**
	 * Check if a donation request should be allowed
	 */
	checkLimit(userId: string): { allowed: boolean; error?: RateLimitError } {
		const now = Date.now();

		// Check global rate limit
		if (!this.isWithinGlobalLimit(now)) {
			return {
				allowed: false,
				error: new RateLimitError("Global donation rate limit exceeded", {
					limit: this.config.donationRateLimit,
					window: this.config.donationRateWindow,
					type: "global",
				}),
			};
		}

		// Check per-user rate limit
		if (!this.isWithinUserLimit(userId, now)) {
			return {
				allowed: false,
				error: new RateLimitError("User donation rate limit exceeded", {
					limit: this.config.donationPerUserLimit,
					window: this.config.donationRateWindow,
					type: "user",
					userId,
				}),
			};
		}

		return { allowed: true };
	}

	/**
	 * Record a successful donation (increment counters)
	 */
	recordDonation(userId: string): void {
		const now = Date.now();

		// Update global counter
		this.updateGlobalCounter(now);

		// Update user counter
		this.updateUserCounter(userId, now);
	}

	/**
	 * Get current rate limit status
	 */
	getStatus(): {
		global: RateLimitEntry & { remaining: number };
		totalUsers: number;
	} {
		const now = Date.now();
		this.updateGlobalCounter(now); // Ensure current window

		return {
			global: {
				...this.globalState,
				remaining: Math.max(
					0,
					this.config.donationRateLimit - this.globalState.count,
				),
			},
			totalUsers: this.userStates.size,
		};
	}

	/**
	 * Get user-specific rate limit status
	 */
	getUserStatus(userId: string): RateLimitEntry & { remaining: number } {
		const now = Date.now();
		const userState = this.getUserState(userId, now);

		return {
			...userState,
			remaining: Math.max(
				0,
				this.config.donationPerUserLimit - userState.count,
			),
		};
	}

	/**
	 * Reset all rate limits (admin function)
	 */
	reset(): void {
		this.globalState = {
			count: 0,
			windowStart: Date.now(),
			lastRequest: Date.now(),
		};
		this.userStates.clear();
	}

	/**
	 * Check if request is within global rate limit
	 */
	private isWithinGlobalLimit(now: number): boolean {
		this.updateGlobalCounter(now);
		return this.globalState.count < this.config.donationRateLimit;
	}

	/**
	 * Check if request is within user rate limit
	 */
	private isWithinUserLimit(userId: string, now: number): boolean {
		const userState = this.getUserState(userId, now);
		return userState.count < this.config.donationPerUserLimit;
	}

	/**
	 * Update global rate limit counter
	 */
	private updateGlobalCounter(now: number): void {
		// Reset window if expired
		if (now - this.globalState.windowStart >= this.config.donationRateWindow) {
			this.globalState = {
				count: 0,
				windowStart: now,
				lastRequest: now,
			};
		}
	}

	/**
	 * Update user rate limit counter
	 */
	private updateUserCounter(userId: string, now: number): void {
		const { count, ...rest } = this.getUserState(userId, now);

		this.userStates.set(userId, {
			...rest,
			lastRequest: now,
			count: count + 1,
		});
	}

	/**
	 * Get or create user rate limit state
	 */
	private getUserState(userId: string, now: number): RateLimitEntry {
		let userState = this.userStates.get(userId);

		if (!userState) {
			userState = {
				count: 0,
				windowStart: now,
				lastRequest: now,
			};
		} else {
			// Reset user window if expired
			if (now - userState.windowStart >= this.config.donationRateWindow) {
				userState = {
					count: 0,
					windowStart: now,
					lastRequest: now,
				};
			}
		}

		return userState;
	}

	/**
	 * Clean up old user states to prevent memory leaks
	 */
	private cleanupOldStates(): void {
		const now = Date.now();
		const maxAge = this.config.donationRateWindow * 2; // Keep states for 2 windows

		for (const [userId, state] of this.userStates.entries()) {
			if (now - state.lastRequest > maxAge) {
				this.userStates.delete(userId);
			}
		}
	}
}

/**
 * Create rate limiter instance
 */
export function createRateLimiter(config: Config): RateLimiter {
	return new RateLimiter(config);
}
