/**
 * BetService - Handles all betting-related operations including placing bets,
 * canceling bets, and managing bet totals. Uses Redis for real-time operations
 * and PostgreSQL for persistent storage.
 */
import { RedisService } from "./RedisService";
import { User } from "../entities/User";
import { FighterColor } from "../types/FighterColor";
import { AppDataSource } from "../data-source";
import { Bet } from "../entities/Bet";
import { Match } from "../entities/Match";
import { MatchTotalsDto } from "../dtos/MatchTotalsDto";
import { readFileSync } from "fs";
import { join } from "path";

export class BetService {
  // Singleton instance
  private static instance: BetService;

  // Redis and database repositories
  private redis: RedisService;
  private betRepository = AppDataSource.getRepository(Bet);
  private matchRepository = AppDataSource.getRepository(Match);

  // Lua scripts for atomic Redis operations
  private placeBetScript: string;
  private cancelBetScript: string;

  // Cache and update management
  private lastUpdateTime: number = 0;
  private updateTimeout: NodeJS.Timeout | null = null;
  private pendingUpdate: boolean = false;
  private lastTotals: MatchTotalsDto | null = null;
  private readonly UPDATE_THROTTLE_MS = 100; // Throttle updates to every 100ms

  // Match finalization
  private finalizationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly FINALIZATION_DELAY_MS = 45000; // 45 seconds

  // Private constructor for singleton pattern
  private constructor() {
    this.redis = RedisService.getInstance();

    // Load Lua scripts for atomic Redis operations
    this.placeBetScript = readFileSync(
      join(__dirname, "../scripts/redis/place_bet.lua"),
      "utf8"
    );
    this.cancelBetScript = readFileSync(
      join(__dirname, "../scripts/redis/cancel_bet.lua"),
      "utf8"
    );
  }

  /**
   * Get the singleton instance of BetService
   */
  public static getInstance(): BetService {
    if (!BetService.instance) {
      BetService.instance = new BetService();
    }
    return BetService.instance;
  }

  // ============= Redis Key Management =============
  private getUserBetKey(userId: string): string {
    return `bet:active:user:${userId}`;
  }

  private getMatchTotalKey(color: FighterColor): string {
    return `bet:active:total:${color}`;
  }

  private getUserBalanceKey(userId: string): string {
    return `user:balance:${userId}`;
  }

  // ============= Bet Operations =============
  /**
   * Places a bet for a user on a specific fighter color
   * @param user - The user placing the bet
   * @param amount - The amount to bet
   * @param fighterColor - The fighter color to bet on
   * @returns Promise<boolean> - True if bet was placed successfully
   * @throws Error if bet amount is invalid or user has insufficient balance
   */
  async placeBet(
    user: User,
    amount: number,
    fighterColor: FighterColor
  ): Promise<boolean> {
    // Validate bet amount (must be in increments of 5 or 25 cents)
    if (!this.isValidBetAmount(amount)) {
      throw new Error(
        "Invalid bet amount. Must be in increments of 5 or 25 cents."
      );
    }

    const client = this.redis.getClient();
    const balanceKey = this.getUserBalanceKey(user.id);
    const betKey = this.getUserBetKey(user.id);
    const totalKey = this.getMatchTotalKey(fighterColor);

    try {
      const result = await client.evalsha(
        (await client.script("LOAD", this.placeBetScript)) as string,
        3, // number of keys
        balanceKey,
        betKey,
        totalKey,
        amount.toString(),
        fighterColor
      );

      if (result[0] === "err") {
        switch (result[1]) {
          case "INSUFFICIENT_BALANCE":
            throw new Error("Insufficient balance");
          default:
            throw new Error("Unknown error");
        }
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancels a user's existing bet
   * @param user - The user canceling the bet
   * @param amount - The amount to cancel
   * @returns Promise<boolean> - True if bet was canceled successfully
   * @throws Error if no bet exists or cancel amount is invalid
   */
  async cancelBet(user: User, amount: number): Promise<boolean> {
    // Validate cancel amount
    if (!this.isValidBetAmount(amount)) {
      throw new Error(
        "Invalid cancel amount. Must be in increments of 5 or 25 cents."
      );
    }

    const client = this.redis.getClient();
    const balanceKey = this.getUserBalanceKey(user.id);
    const betKey = this.getUserBetKey(user.id);

    try {
      const result = await client.evalsha(
        (await client.script("LOAD", this.cancelBetScript)) as string,
        2, // number of keys
        balanceKey,
        betKey,
        amount.toString()
      );

      if (result[0] === "err") {
        switch (result[1]) {
          case "NO_BET":
            throw new Error("No bet found to cancel");
          case "INSUFFICIENT_BET":
            throw new Error("Cannot cancel more than the current bet amount");
          default:
            throw new Error("Unknown error");
        }
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finalizes all active bets for a match and updates user balances
   * @param matchId - The ID of the match being finalized
   */
  async finalizeBets(matchId: string): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      // Get all active bets from Redis
      const keys = await this.redis.getClient().keys(this.getUserBetKey("*"));
      const bets = await Promise.all(
        keys.map(async (key) => {
          const userId = key.split(":")[3]; // Extract userId from key
          const betData = await this.redis.getClient().hgetall(key);
          return {
            userId,
            amount: parseFloat(betData.amount),
            color: betData.color as FighterColor,
          };
        })
      );

      // Create bet records in database and update final balances
      for (const bet of bets) {
        const user = await manager.findOne(User, { where: { id: bet.userId } });
        if (!user) continue;

        // Calculate final balance by subtracting the bet amount from current balance
        user.balance = user.balance - bet.amount;
        await manager.save(user);

        // Create bet record
        const betRecord = new Bet();
        betRecord.amount = bet.amount;
        betRecord.fighterColor = bet.color;
        betRecord.user = user;
        betRecord.match = manager.create(Match, { id: matchId });
        await manager.save(betRecord);
      }

      // Clear Redis data
      const balanceKeys = bets.map((bet) => this.getUserBalanceKey(bet.userId));

      // Only perform Redis deletions if we have keys to delete
      const redisDeletions = [];

      if (keys.length > 0) {
        redisDeletions.push(this.redis.getClient().del(...keys));
      }

      if (balanceKeys.length > 0) {
        redisDeletions.push(this.redis.getClient().del(...balanceKeys));
      }

      // Always clear the match total keys
      redisDeletions.push(
        this.redis.getClient().del(this.getMatchTotalKey(FighterColor.BLUE)),
        this.redis.getClient().del(this.getMatchTotalKey(FighterColor.RED))
      );

      await Promise.all(redisDeletions);
    });
  }

  // ============= Query Methods =============
  /**
   * Gets a user's current active bet on the current match
   * @param userId - The ID of the user
   * @returns Promise<UserBetDto | null> - The user's bet or null if no active bet
   */
  async getUserBet(userId: string): Promise<Bet | null> {
    const currentMatch = await this.matchRepository.findOne({
      order: { createdAt: "DESC" },
    });

    if (!currentMatch) {
      return null;
    }

    const bet = await this.betRepository.findOne({
      where: {
        user: { id: userId },
        match: { id: currentMatch.id },
      },
    });

    return bet;
  }

  /**
   * Gets the current total bets for both fighters
   * @returns Promise<MatchTotalsDto> - The current betting totals
   */
  async getMatchTotals(): Promise<MatchTotalsDto> {
    const [blueTotal, redTotal] = await Promise.all([
      this.redis.getClient().get(this.getMatchTotalKey(FighterColor.BLUE)),
      this.redis.getClient().get(this.getMatchTotalKey(FighterColor.RED)),
    ]);

    return {
      blue: parseFloat(blueTotal || "0"),
      red: parseFloat(redTotal || "0"),
    };
  }

  // ============= Helper Methods =============
  /**
   * Validates if a bet amount is in the correct increments
   * @param amount - The amount to validate
   * @returns boolean - True if the amount is valid
   */
  private isValidBetAmount(amount: number): boolean {
    // Check if amount is a positive number in increments of 5 cents
    return amount > 0 && Math.abs(amount % 0.05) < 0.001;
  }

  /**
   * Determines if the match totals should be updated
   * @returns Promise<boolean> - True if totals should be updated
   */
  private async shouldUpdateTotals(): Promise<boolean> {
    const currentTotals = await this.getMatchTotals();

    // If this is the first update or totals have changed
    if (
      !this.lastTotals ||
      currentTotals.blue !== this.lastTotals.blue ||
      currentTotals.red !== this.lastTotals.red
    ) {
      this.lastTotals = currentTotals;
      return true;
    }
    return false;
  }

  /**
   * Schedules an update of the match totals with throttling
   * @param callback - Function to call when totals are updated
   */
  public async scheduleTotalsUpdate(
    callback: (totals: MatchTotalsDto) => Promise<void>
  ): Promise<void> {
    const now = Date.now();
    this.pendingUpdate = true;

    // If we're within the throttle window, schedule the update
    if (now - this.lastUpdateTime < this.UPDATE_THROTTLE_MS) {
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }
      this.updateTimeout = setTimeout(async () => {
        await this.processPendingUpdate(callback);
      }, this.UPDATE_THROTTLE_MS);
      return;
    }

    // If we're outside the throttle window, process immediately
    await this.processPendingUpdate(callback);
  }

  /**
   * Processes a pending totals update
   * @param callback - Function to call with the updated totals
   */
  private async processPendingUpdate(
    callback: (totals: MatchTotalsDto) => Promise<void>
  ): Promise<void> {
    if (!this.pendingUpdate) return;

    const shouldUpdate = await this.shouldUpdateTotals();
    if (shouldUpdate) {
      const totals = await this.getMatchTotals();
      await callback(totals);
    }

    this.lastUpdateTime = Date.now();
    this.pendingUpdate = false;
    this.updateTimeout = null;
  }

  /**
   * Schedules automatic finalization of bets for a match
   * @param matchId - The ID of the match to finalize
   */
  scheduleFinalization(matchId: string): void {
    // Clear any existing timeout for this match
    this.cancelFinalization(matchId);

    // Set a new timeout
    const timeout = setTimeout(async () => {
      try {
        await this.finalizeBets(matchId);
      } catch (error) {
        console.error(`Failed to finalize bets for match ${matchId}:`, error);
      } finally {
        this.finalizationTimeouts.delete(matchId);
      }
    }, this.FINALIZATION_DELAY_MS);

    this.finalizationTimeouts.set(matchId, timeout);
  }

  /**
   * Cancels scheduled finalization for a match
   * @param matchId - The ID of the match to cancel finalization for
   */
  cancelFinalization(matchId: string): void {
    const timeout = this.finalizationTimeouts.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.finalizationTimeouts.delete(matchId);
    }
  }
}
