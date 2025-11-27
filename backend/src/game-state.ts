// Game state management service
import type {
	DonationEvent,
	EnemyType,
	GameState,
	GameStatus,
} from "./types/index.js";

export class GameStateManager {
	private static readonly BASE_KNIGHT_ATTACK = 20;
	private gameState: GameState;
	private listeners: Set<(state: GameState) => void> = new Set();

	constructor(gameId: string = "game-001") {
		this.gameState = this.createInitialState(gameId);
	}

	/**
	 * Get current game state
	 */
	getState(): GameState {
		return { ...this.gameState };
	}

	/**
	 * Update game state and notify listeners
	 */
	private setState(updates: Partial<GameState>): void {
		this.gameState = {
			...this.gameState,
			...updates,
			lastUpdated: Date.now(),
		};

		// Notify all listeners
		this.listeners.forEach((listener) => {
			try {
				listener(this.getState());
			} catch (error) {
				console.error("Error in state listener:", error);
			}
		});
	}

	/**
	 * Subscribe to state changes
	 */
	subscribe(listener: (state: GameState) => void): () => void {
		this.listeners.add(listener);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Start the game
	 */
	startGame(): GameState {
		this.setState({
			status: "RUNNING",
			startTime: Date.now(),
		});
		return this.getState();
	}

	/**
	 * Pause the game
	 */
	pauseGame(): GameState {
		this.setState({ status: "PAUSED" });
		return this.getState();
	}

	/**
	 * Resume the game
	 */
	resumeGame(): GameState {
		this.setState({ status: "RUNNING" });
		return this.getState();
	}

	/**
	 * Stop the game
	 */
	stopGame(): GameState {
		this.setState({ status: "STOPPED" });
		return this.getState();
	}

	/**
	 * Reset game to initial state
	 */
	resetGame(): GameState {
		const newState = this.createInitialState(this.gameState.gameId);
		this.gameState = newState;

		// Notify listeners
		this.listeners.forEach((listener) => {
			try {
				listener(this.getState());
			} catch (error) {
				console.error("Error in state listener:", error);
			}
		});

		return this.getState();
	}

	/**
	 * Update knight health
	 */
	updateKnightHealth(health: number): GameState {
		const clampedHealth = Math.max(0, Math.min(100, health));

		// If knight dies, reset game
		if (clampedHealth === 0) {
			return this.resetGame();
		}

		this.setState({ knightHealth: clampedHealth });
		return this.getState();
	}

	/**
	 * Update knight attack
	 */
	updateKnightAttack(attack: number): GameState {
		const clampedAttack = Math.max(0, Math.min(100, attack));
		this.setState({ knightAttack: clampedAttack });
		return this.getState();
	}

	/**
	 * Update score
	 */
	updateScore(score: number): GameState {
		const newScore = Math.max(0, score);
		this.setState({ score: newScore });
		return this.getState();
	}

	/**
	 * Increment score
	 */
	addScore(points: number): GameState {
		return this.updateScore(this.gameState.score + points);
	}

	/**
	 * Increment wave counter
	 */
	nextWave(): GameState {
		this.setState({ wave: this.gameState.wave + 1 });
		return this.getState();
	}

	/**
	 * Apply boost effect
	 */
	applyBoost(durationSeconds: number, boostPercent: number = 50): GameState {
		const baseAttack = GameStateManager.BASE_KNIGHT_ATTACK; // Knight base attack from clarifications
		const boostedAttack = Math.round(baseAttack * (1 + boostPercent / 100));
		const expiryTime = Date.now() + durationSeconds * 1000;

		// If boost is already active, extend duration (from clarifications)
		const currentExpiry = this.gameState.boostExpiry;
		const finalExpiry =
			this.gameState.boostActive && currentExpiry > Date.now()
				? currentExpiry + durationSeconds * 1000 // Extend existing boost
				: expiryTime; // New boost

		this.setState({
			knightAttack: boostedAttack,
			boostActive: true,
			boostExpiry: finalExpiry,
		});

		return this.getState();
	}

	/**
	 * Remove boost effect (when expired)
	 */
	removeBoost(): GameState {
		const baseAttack = GameStateManager.BASE_KNIGHT_ATTACK; // Knight base attack
		this.setState({
			knightAttack: baseAttack,
			boostActive: false,
			boostExpiry: 0,
		});

		return this.getState();
	}

	/**
	 * Check if boost has expired and remove it
	 */
	checkBoostExpiry(): GameState {
		if (
			this.gameState.boostActive &&
			Date.now() >= this.gameState.boostExpiry
		) {
			return this.removeBoost();
		}
		return this.getState();
	}

	/**
	 * Add donation to active list
	 */
	addActiveDonation(donation: DonationEvent): GameState {
		const activeDonations = [...this.gameState.activeDonations, donation];
		this.setState({ activeDonations });
		return this.getState();
	}

	/**
	 * Remove donation from active list
	 */
	removeDonation(donationId: string): GameState {
		const activeDonations = this.gameState.activeDonations.filter(
			(d) => d.donationId !== donationId,
		);
		this.setState({ activeDonations });
		return this.getState();
	}

	/**
	 * Update from game client (Godot)
	 */
	updateFromGame(updates: {
		knightHealth?: number;
		score?: number;
		wave?: number;
		status?: GameStatus;
	}): GameState {
		const validatedUpdates: Partial<GameState> = {};

		if (updates.knightHealth !== undefined) {
			validatedUpdates.knightHealth = Math.max(
				0,
				Math.min(100, updates.knightHealth),
			);
		}

		if (updates.score !== undefined) {
			validatedUpdates.score = Math.max(0, updates.score);
		}

		if (updates.wave !== undefined) {
			validatedUpdates.wave = Math.max(1, updates.wave);
		}

		if (updates.status !== undefined) {
			validatedUpdates.status = updates.status;
		}

		// Check for knight death
		if (validatedUpdates.knightHealth === 0) {
			return this.resetGame();
		}

		this.setState(validatedUpdates);
		return this.getState();
	}

	/**
	 * Get game statistics
	 */
	getStats(): {
		uptime: number;
		totalDonations: number;
		currentScore: number;
		currentWave: number;
	} {
		const uptime =
			this.gameState.startTime > 0
				? Math.floor((Date.now() - this.gameState.startTime) / 1000)
				: 0;

		return {
			uptime,
			totalDonations: this.gameState.activeDonations.length,
			currentScore: this.gameState.score,
			currentWave: this.gameState.wave,
		};
	}

	/**
	 * Add enemy spawn to pending list
	 */
	addEnemySpawn(
		enemyType: string,
		donorName: string,
		donationId: string,
	): GameState {
		const spawnId = `spawn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const newSpawn = {
			spawnId,
			enemyType: enemyType as EnemyType, // Will be validated in game
			donorName,
			donationId,
			createdAt: Date.now(),
		};

		const pendingEnemySpawns = [...this.gameState.pendingEnemySpawns, newSpawn];
		this.setState({ pendingEnemySpawns });
		return this.getState();
	}

	/**
	 * Remove enemy spawn from pending list (after game processes it)
	 */
	removeEnemySpawn(spawnId: string): GameState {
		const pendingEnemySpawns = this.gameState.pendingEnemySpawns.filter(
			(spawn) => spawn.spawnId !== spawnId,
		);
		this.setState({ pendingEnemySpawns });
		return this.getState();
	}

	/**
	 * Create initial game state
	 */
	private createInitialState(gameId: string): GameState {
		return {
			gameId,
			status: "STOPPED",
			knightHealth: 100,
			knightAttack: GameStateManager.BASE_KNIGHT_ATTACK, // Base attack from clarifications
			score: 0,
			wave: 1,
			boostActive: false,
			boostExpiry: 0,
			activeDonations: [],
			pendingEnemySpawns: [],
			startTime: 0,
			lastUpdated: Date.now(),
		};
	}
}

// Singleton instance
let gameStateInstance: GameStateManager | null = null;

export function createGameStateManager(gameId?: string): GameStateManager {
	gameStateInstance = new GameStateManager(gameId);
	return gameStateInstance;
}

export function getGameStateManager(): GameStateManager {
	if (!gameStateInstance) {
		throw new Error(
			"GameStateManager not initialized. Call createGameStateManager() first.",
		);
	}
	return gameStateInstance;
}
export function getGameStateManager(): GameStateManager {
	if (!gameStateInstance) {
		throw new Error(
			"GameStateManager not initialized. Call createGameStateManager() first.",
		);
	}
	return gameStateInstance;
}
export function getGameStateManager(): GameStateManager {
	if (!gameStateInstance) {
		throw new Error(
			"GameStateManager not initialized. Call createGameStateManager() first.",
		);
	}
	return gameStateInstance;
}
