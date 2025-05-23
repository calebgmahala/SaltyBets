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
import { logger } from "../utils/logger";

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
  private readonly FINALIZATION_DELAY_MS = 35000; // 45 seconds

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

  // ============= Bet Operations =============
  /**
   * Places a bet for a user on a specific fighter color
   * @param user - The user placing the bet
   * @param amount - The amount to bet
   * @param fighterColor - The fighter color to bet on
   * @returns Promise<boolean> - True if bet was placed successfully
   * @throws Error if bet amount is invalid, user has insufficient balance, no match is active, or bets are finalized
   */
  async placeBet(
    user: User,
    amount: number,
    fighterColor: FighterColor
  ): Promise<boolean> {
    logger.debug(
      `Attempting to place bet for user ${logger.cyan(user.id)}: amount=${logger.cyan(amount)}, color=${logger.cyan(fighterColor)}`
    );

    // ============================================
    // Match Status Validation
    // ============================================
    /**
     * Fetch the current match and ensure betting is allowed.
     * Throws if there is no current match or if bets are finalized (winner is set).
     */
    const currentMatch = await this.matchRepository.findOne({ where: {}, order: { createdAt: "DESC" } });
    if (!currentMatch) {
      logger.warn(`No current match found. Cannot place bet for user ${logger.cyan(user.id)}`);
      throw new Error("No current match available for betting");
    }
    if (currentMatch.winner !== null && currentMatch.winner !== undefined) {
      logger.warn(`Bets are finalized for match ${logger.cyan(currentMatch.id)}. Cannot place bet for user ${logger.cyan(user.id)}`);
      throw new Error("Bets are finalized for the current match");
    }

    // ============================================
    // Bet Amount and Balance Validation
    // ============================================
    // Validate bet amount (must be in increments of 5 or 25 cents)
    if (!this.isValidBetAmount(amount)) {
      logger.warn(
        `Invalid bet amount ${logger.red(amount)} for user ${logger.cyan(user.id)}. Must be in increments of 5 or 25 cents.`
      );
      throw new Error(
        "Invalid bet amount. Must be in increments of 5 or 25 cents."
      );
    }

    // Check available balance: DB balance - in-progress bets >= amount
    const client = this.redis.getClient();
    const betKey = this.getUserBetKey(user.id);
    const totalKey = this.getMatchTotalKey(fighterColor);

    // Fetch user's DB balance
    const dbBalance = user.balance;
    // Fetch in-progress bet from Redis
    const betData = await client.hgetall(betKey);
    const inProgressBet = betData && betData.amount ? parseFloat(betData.amount) : 0;
    const available = dbBalance - inProgressBet;
    if (available < amount) {
      logger.warn(
        `User ${logger.cyan(user.id)} has insufficient available balance. DB balance: ${logger.cyan(dbBalance)}, in-progress: ${logger.cyan(inProgressBet)}, requested: ${logger.cyan(amount)}`
      );
      throw new Error("Insufficient available balance");
    }

    try {
      const result = await client.evalsha(
        (await client.script("LOAD", this.placeBetScript)) as string,
        2, // number of keys
        betKey,
        totalKey,
        amount.toString(),
        fighterColor
      );

      if (result[0] === "err") {
        switch (result[1]) {
          case "INSUFFICIENT_BALANCE":
            logger.warn(
              `User ${logger.cyan(user.id)} has insufficient balance to place bet of ${logger.cyan(amount)}.`
            );
            throw new Error("Insufficient balance");
          default:
            logger.error(
              `Unknown error placing bet for user ${logger.cyan(user.id)}: ${logger.red(result[1])}`
            );
            throw new Error("Unknown error");
        }
      }

      logger.success(
        `Bet placed successfully for user ${logger.cyan(user.id)}: amount=${logger.cyan(amount)}, color=${logger.cyan(fighterColor)}`
      );
      return true;
    } catch (error) {
      logger.error(
        `Error placing bet for user ${logger.cyan(user.id)}: ${logger.red(error instanceof Error ? error.message : error)}`
      );
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
    logger.debug(
      `Attempting to cancel bet for user ${logger.cyan(user.id)}: amount=${logger.cyan(amount)}`
    );
    // Validate cancel amount
    if (!this.isValidBetAmount(amount)) {
      logger.warn(
        `Invalid cancel amount ${logger.red(amount)} for user ${logger.cyan(user.id)}. Must be in increments of 5 or 25 cents.`
      );
      throw new Error(
        "Invalid cancel amount. Must be in increments of 5 or 25 cents."
      );
    }

    const client = this.redis.getClient();
    const betKey = this.getUserBetKey(user.id);

    try {
      const result = await client.evalsha(
        (await client.script("LOAD", this.cancelBetScript)) as string,
        1, // number of keys
        betKey,
        amount.toString()
      );

      if (result[0] === "err") {
        switch (result[1]) {
          case "NO_BET":
            logger.warn(
              `No active bet found to cancel for user ${logger.cyan(user.id)}.`
            );
            throw new Error("No bet found to cancel");
          case "INSUFFICIENT_BET":
            logger.warn(
              `User ${logger.cyan(user.id)} attempted to cancel more than current bet amount.`
            );
            throw new Error("Cannot cancel more than the current bet amount");
          default:
            logger.error(
              `Unknown error canceling bet for user ${logger.cyan(user.id)}: ${logger.red(result[1])}`
            );
            throw new Error("Unknown error");
        }
      }

      logger.success(
        `Bet canceled successfully for user ${logger.cyan(user.id)}: amount=${logger.cyan(amount)}`
      );
      return true;
    } catch (error) {
      logger.error(
        `Error canceling bet for user ${logger.cyan(user.id)}: ${logger.red(error instanceof Error ? error.message : error)}`
      );
      throw error;
    }
  }

  /**
   * Finalizes all active bets for a match and updates user balances
   * @param matchId - The ID of the match being finalized
   */
  async finalizeBets(matchId: string): Promise<void> {
    logger.info(
      `Finalizing bets for match ${logger.cyan(matchId)}`
    );
    await AppDataSource.transaction(async (manager) => {
      // Get all active bets from Redis
      const keys = await this.redis.getClient().keys(this.getUserBetKey("*"));
      logger.debug(
        `Found ${logger.cyan(keys.length)} active bet keys in Redis for match ${logger.cyan(matchId)}`
      );
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
      logger.debug(
        `Processing ${logger.cyan(bets.length)} bets for match ${logger.cyan(matchId)}`
      );
      // Create bet records in database and update final balances
      for (const bet of bets) {
        const user = await manager.findOne(User, { where: { id: bet.userId } });
        if (!user) {
          logger.warn(
            `User ${logger.cyan(bet.userId)} not found in database during finalization for match ${logger.cyan(matchId)}`
          );
          continue;
        }
        // Calculate final balance by subtracting the bet amount from current balance
        user.balance = user.balance - bet.amount;
        await manager.save(user);
        logger.info(
          `Updated balance for user ${logger.cyan(user.id)}: new balance=${logger.cyan(user.balance)}`
        );
        // Create bet record
        const betRecord = new Bet();
        betRecord.amount = bet.amount;
        betRecord.fighterColor = bet.color;
        betRecord.user = user;
        betRecord.match = manager.create(Match, { id: matchId });
        await manager.save(betRecord);
        logger.success(
          `Saved bet record for user ${logger.cyan(user.id)}: amount=${logger.cyan(bet.amount)}, color=${logger.cyan(bet.color)}, match=${logger.cyan(matchId)}`
        );
      }
      // Clear Redis data
      const redisDeletions = [];
      if (keys.length > 0) {
        logger.debug(
          `Deleting ${logger.cyan(keys.length)} bet keys from Redis for match ${logger.cyan(matchId)}`
        );
        redisDeletions.push(this.redis.getClient().del(...keys));
      }
      // Always clear the match total keys
      logger.debug(
        `Clearing match total keys for match ${logger.cyan(matchId)}`
      );
      redisDeletions.push(
        this.redis.getClient().del(this.getMatchTotalKey(FighterColor.BLUE)),
        this.redis.getClient().del(this.getMatchTotalKey(FighterColor.RED))
      );
      await Promise.all(redisDeletions);
      logger.success(
        `Finalized bets and cleared Redis for match ${logger.cyan(matchId)}`
      );
    });
  }

  // ============= Query Methods =============
  /**
   * Gets a user's current active bet on the current match
   * @param userId - The ID of the user
   * @returns Promise<UserBetDto | null> - The user's bet or null if no active bet
   */
  async getUserBet(userId: string): Promise<Bet | null> {
    logger.debug(
      `Fetching user bet for user ${logger.cyan(userId)}`
    );
    const currentMatch = await this.matchRepository.findOne({
      order: { createdAt: "DESC" },
    });

    if (!currentMatch) {
      logger.info(
        `No current match found when fetching bet for user ${logger.cyan(userId)}`
      );
      return null;
    }

    const bet = await this.betRepository.findOne({
      where: {
        user: { id: userId },
        match: { id: currentMatch.id },
      },
    });

    if (bet) {
      logger.debug(
        `Found bet for user ${logger.cyan(userId)} on match ${logger.cyan(currentMatch.id)}: amount=${logger.cyan(bet.amount)}, color=${logger.cyan(bet.fighterColor)}`
      );
    } else {
      logger.info(
        `No active bet found for user ${logger.cyan(userId)} on match ${logger.cyan(currentMatch.id)}`
      );
    }
    return bet;
  }

  /**
   * Gets the current total bets for both fighters
   * @returns Promise<MatchTotalsDto> - The current betting totals
   */
  async getMatchTotals(): Promise<MatchTotalsDto> {
    logger.debug(`Fetching current match totals from Redis`);
    const [blueTotal, redTotal] = await Promise.all([
      this.redis.getClient().get(this.getMatchTotalKey(FighterColor.BLUE)),
      this.redis.getClient().get(this.getMatchTotalKey(FighterColor.RED)),
    ]);

    logger.info(
      `Current match totals: blue=${logger.cyan(blueTotal || 0)}, red=${logger.cyan(redTotal || 0)}`
    );
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
    const valid = amount > 0 && Math.abs(amount % 0.05) < 0.001;
    if (!valid) {
      logger.debug(
        `Bet amount validation failed: ${logger.red(amount)}`
      );
    }
    return valid;
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
      logger.debug(
        `Match totals changed or first update. Previous: blue=${logger.cyan(this.lastTotals?.blue ?? 'N/A')}, red=${logger.cyan(this.lastTotals?.red ?? 'N/A')}. Current: blue=${logger.cyan(currentTotals.blue)}, red=${logger.cyan(currentTotals.red)}`
      );
      this.lastTotals = currentTotals;
      return true;
    }
    logger.debug(`Match totals unchanged. No update needed.`);
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
    logger.debug(
      `Scheduling totals update. Now: ${logger.cyan(now)}, LastUpdate: ${logger.cyan(this.lastUpdateTime)}`
    );

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
    if (!this.pendingUpdate) {
      logger.debug(`No pending update to process.`);
      return;
    }

    const shouldUpdate = await this.shouldUpdateTotals();
    if (shouldUpdate) {
      const totals = await this.getMatchTotals();
      logger.info(
        `Processing pending totals update: blue=${logger.cyan(totals.blue)}, red=${logger.cyan(totals.red)}`
      );
      await callback(totals);
    }

    this.lastUpdateTime = Date.now();
    this.pendingUpdate = false;
    this.updateTimeout = null;
    logger.debug(
      `Processed pending update. LastUpdateTime set to ${logger.cyan(this.lastUpdateTime)}`
    );
  }

  /**
   * Schedules automatic finalization of bets for a match
   * @param matchId - The ID of the match to finalize
   */
  scheduleFinalization(matchId: string): void {
    // Clear any existing timeout for this match
    this.cancelFinalization(matchId);
    
    logger.info(
      `Scheduling automatic bet finalization for match ${logger.cyan(matchId)} in ${logger.cyan(this.FINALIZATION_DELAY_MS / 1000)} seconds.`
    );

    // Set a new timeout
    const timeout = setTimeout(async () => {
      try {
        await this.finalizeBets(matchId);
      } catch (error) {
        logger.error(
          `Failed to finalize bets for match ${logger.cyan(matchId)}: ${logger.red(error instanceof Error ? error.message : error)}`
        );
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
    logger.info(
      `Canceling scheduled finalization for match ${logger.cyan(matchId)}`
    );
    const timeout = this.finalizationTimeouts.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.finalizationTimeouts.delete(matchId);
    }
  }
}
