import {
  Resolver,
  Query,
  Mutation,
  Authorized,
  FieldResolver,
  Root,
  Arg,
  Float,
} from "type-graphql";
import { Match } from "../entities/Match";
import { SecurityLevel } from "../types/SecurityLevel";
import { AppDataSource } from "../data-source";
import { SaltyBoyService } from "../services/SaltyBoyService";
import { User } from "../entities/User";
import { FighterColor } from "../types/FighterColor";
import { PayoutService } from "../services/PayoutService";
import { Bet } from "../entities/Bet";
import { BetService } from "../services/BetService";
import { Fighter } from "../entities/Fighter";
import { SaltyBoyMatch } from "../types/saltyboy";
import { logger } from "../utils/logger";

/**
 * MatchResolver class handles all GraphQL operations related to matches.
 * This includes creating/ending matches, fetching match data, and managing related entities.
 *
 * @class MatchResolver
 * @implements {Resolver<Match>}
 */
@Resolver(() => Match)
export class MatchResolver {
  // Service instances
  private saltyBoyService = SaltyBoyService.getInstance();
  private matchRepository = AppDataSource.getRepository(Match);
  private payoutService = PayoutService.getInstance();
  private betService = BetService.getInstance();

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Determines the winner's color based on the winner ID and match fighter IDs.
   *
   * @private
   * @param {Match} match - The match to check
   * @param {number} winnerId - The ID of the winning fighter
   * @returns {FighterColor} The color of the winning fighter (RED or BLUE)
   * @throws {Error} If the winner ID doesn't match either fighter
   */
  private getWinnerColor(match: Match, winnerId: number): FighterColor {
    logger.debug(
      `Determining winner color for match ${logger.cyan(
        match.id
      )} with winner ID ${logger.cyan(winnerId)}`
    );
    if (winnerId === match.fighterRedId) {
      logger.debug(
        `Winner is ${logger.red("RED")} fighter (ID: ${logger.cyan(winnerId)})`
      );
      return FighterColor.RED;
    }
    if (winnerId === match.fighterBlueId) {
      logger.debug(
        `Winner is ${logger.blue("BLUE")} fighter (ID: ${logger.cyan(
          winnerId
        )})`
      );
      return FighterColor.BLUE;
    }
    logger.error(
      `Invalid winner ID ${logger.cyan(winnerId)} for match ${logger.cyan(
        match.id
      )}`
    );
    throw new Error("Winner ID does not match either fighter in this match.");
  }

  // ===========================================
  // Queries
  // ===========================================

  /**
   * Fetches the most recent match in the system.
   * This is typically used to get the current active match.
   *
   * @returns {Promise<Match | null>} The most recent match or null if none exist
   * @example
   * // Get the current match
   * const currentMatch = await matchResolver.getCurrentMatch();
   */
  @Query(() => Match, {
    nullable: true,
    description:
      "Get the most recent match in the system. Returns null if no matches exist. (Usually the current match)",
  })
  async getCurrentMatch(): Promise<Match | null> {
    logger.debug("Fetching current match");
    const matches = await this.matchRepository.find({
      order: { createdAt: "DESC" },
      take: 1,
    });
    const currentMatch = matches[0] || null;
    logger.debug(
      `Current match: ${currentMatch ? logger.cyan(currentMatch.id) : "none"}`
    );
    return currentMatch;
  }

  // ===========================================
  // Mutations
  // ===========================================

  /**
   * Creates a new match by fetching the current match from Salty Boy API.
   * This operation will:
   * 1. End any existing match (via endMatch mutation)
   * 2. Process payouts for the ended match
   * 3. Create a new match with the current Salty Boy data
   *
   * @returns {Promise<Match>} The newly created match
   * @throws {Error} If the Salty Boy API hasn't updated the current match
   * @requires ADMIN or PAYOUT_MANAGER permissions
   */
  @Authorized([SecurityLevel.ADMIN, SecurityLevel.PAYOUT_MANAGER])
  @Mutation(() => Match, {
    description:
      "Create a new match by fetching the current match from the Salty Boy API. " +
      "This will automatically end any existing match (via endMatch mutation) " +
      "and process payouts before creating a new one. " +
      "Requires ADMIN or PAYOUT_MANAGER permissions.",
  })
  async createMatch(
    @Arg("winner", {
      nullable: true,
      description:
        "The winner of the fight. (This should only be added in the event of a mismatch)",
    })
    winner?: FighterColor
  ): Promise<Match> {
    logger.info("Creating new match");
    const { data, hash } = await this.saltyBoyService.getCurrentMatch();

    // Check if a match with this hash already exists
    const existingMatch = await this.matchRepository.findOne({
      where: { id: hash },
    });

    if (existingMatch) {
      logger.warn(`Match with hash ${logger.cyan(hash)} already exists`);
      throw new Error(
        "The Salty Boy API has not updated the current match yet. Please try again later."
      );
    }

    const currentMatch = await this.getCurrentMatch();
    if (currentMatch) {
      logger.info(
        `Ending current match ${logger.cyan(
          currentMatch.id
        )} before creating new match`
      );
      await this.endMatch(currentMatch.id, winner);
    }

    logger.debug(`Creating match with hash ${logger.cyan(hash)}`);
    const match = this.matchRepository.create({
      id: hash,
      winner: null,
      fighterBlueId: data.fighter_blue_info.id,
      fighterRedId: data.fighter_red_info.id,
    });

    await this.matchRepository.save(match);
    logger.success(`Created new match ${logger.cyan(match.id)}`);

    // Schedule automatic bet finalization
    this.betService.scheduleFinalization(hash);
    logger.debug(`Scheduled bet finalization for match ${logger.cyan(hash)}`);

    return match;
  }

  /**
   * Ends an existing match by determining the winner and processing payouts.
   * This involves:
   * 1. Fetching the latest match data from Salty Boy
   * 2. Determining the winner
   * 3. Processing payouts for all bets
   *
   * @param {string} matchId - The ID of the match to end
   * @returns {Promise<Match>} The updated match with winner set
   * @throws {Error} If match not found or already concluded
   * @requires ADMIN or PAYOUT_MANAGER permissions
   */
  @Authorized([SecurityLevel.ADMIN, SecurityLevel.PAYOUT_MANAGER])
  @Mutation(() => Match, {
    description:
      "End an existing match by determining the winner and processing payouts. " +
      "This will fetch the latest match data from Salty Boy to determine the winner. " +
      "Requires ADMIN or PAYOUT_MANAGER permissions.",
  })
  async endMatch(
    @Arg("matchId", { description: "The ID of the match to end" })
    matchId: string,
    @Arg("winner", {
      nullable: true,
      description:
        "The winner of the fight. (This should only be added in the event of a mismatch)",
    })
    winner?: FighterColor
  ): Promise<Match> {
    logger.info(`Ending match ${logger.cyan(matchId)}`);
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      logger.error(`Match ${logger.cyan(matchId)} not found`);
      throw new Error("Match not found");
    }

    if (match.winner !== null) {
      logger.warn(`Match ${logger.cyan(matchId)} has already been concluded`);
      throw new Error("Match has already been concluded");
    }

    let data: SaltyBoyMatch | undefined;
    let hash: string;

    // Get latest match data from Salty Boy
    logger.debug(`Fetching next latest match data for ${logger.cyan(matchId)}`);
    const nextLatestMatch = await this.saltyBoyService.getNextLatestMatch();
    data = nextLatestMatch.data;
    hash = nextLatestMatch.hash;

    // If the current match hash doesn't match our match ID, recrawl
    if (!this.saltyBoyService.compareMatchHashes(hash, matchId)) {
      logger.warn(
        `Match hash mismatch for ${logger.cyan(matchId)} and ${logger.cyan(
          hash
        )}, attempting to crawl latest match`
      );
      const currentCrawledMatchId = await this.saltyBoyService.getLatestSaltyBoyMatchId();
      const latestCrawledMatch = await this.saltyBoyService.crawlLatestMatch();
      if (!latestCrawledMatch) {
        logger.error(
          `Failed to crawl latest match for ${logger.cyan(matchId)}`
        );
        throw new Error("Failed to crawl latest match");
      }
      data = latestCrawledMatch.data;
      hash = latestCrawledMatch.hash;
      // If we still can't match the hashes after crawling, something is wrong
      // This can happen if the Salty Boy API hasn't updated yet or if there's a sync issue
      if (!this.saltyBoyService.compareMatchHashes(hash, matchId)) {
        if (!winner) {
          logger.error(
            `Latest match hash ${logger.cyan(
              hash
            )} does not match match ID ${logger.cyan(matchId)}`
          );
          logger.debug(`Resetting latest match ID to ${logger.cyan(currentCrawledMatchId)}`);
          // Reset latest match ID to null since we can't verify the match
          await this.saltyBoyService.setLatestSaltyBoyMatchId(currentCrawledMatchId.toString());
          throw new Error(
            "Latest match hash does not match match ID. Please provide a winner to end this match manually"
          );
        }
        // Clear data and hash since they don't match our match ID and we're using a manual winner
        data = undefined;
        hash = undefined;
        logger.warn(
          `Latest match hash ${logger.cyan(
            hash
          )} does not match match ID ${logger.cyan(
            matchId
          )}. Using manually specified winner`
        );
      }
    }

    logger.debug(`Setting latest match ID to ${logger.cyan(data.id)}`);
    this.saltyBoyService.setLatestSaltyBoyMatchId(nextLatestMatch.data.id.toString());

    // Update match winner
    logger.debug(`Determining winner for match ${logger.cyan(matchId)}`);
    const winnerColor = data ? this.getWinnerColor(match, data.winner) : winner;
    match.winner = winnerColor;
    match.externalId = data?.id;

    await this.matchRepository.save(match);
    logger.success(
      `Match ${logger.cyan(matchId)} ended with winner: ${logger.cyan(
        winnerColor
      )}`
    );

    // Process payouts
    logger.debug(`Processing payouts for match ${logger.cyan(matchId)}`);
    await this.payoutService.calculateAndDistributePayouts(
      matchId,
      winnerColor
    );
    logger.success(`Payouts processed for match ${logger.cyan(matchId)}`);

    return match;
  }

  // ===========================================
  // Field Resolvers
  // ===========================================

  /**
   * Resolves the blue fighter for a match by fetching from Salty Boy API.
   *
   * @param {Match} match - The match to get the blue fighter for
   * @returns {Promise<Fighter>} The blue fighter
   */
  @FieldResolver(() => Fighter, {
    description: "Get the blue fighter for this match from Salty Boy API",
  })
  async fighterBlue(@Root() match: Match): Promise<Fighter> {
    logger.debug(`Fetching blue fighter for match ${logger.cyan(match.id)}`);
    return await this.saltyBoyService.getFighterById(match.fighterBlueId);
  }

  /**
   * Resolves the red fighter for a match by fetching from Salty Boy API.
   *
   * @param {Match} match - The match to get the red fighter for
   * @returns {Promise<Fighter>} The red fighter
   */
  @FieldResolver(() => Fighter, {
    description: "Get the red fighter for this match from Salty Boy API",
  })
  async fighterRed(@Root() match: Match): Promise<Fighter> {
    logger.debug(`Fetching red fighter for match ${logger.cyan(match.id)}`);
    return await this.saltyBoyService.getFighterById(match.fighterRedId);
  }

  /**
   * Resolves all users who have placed bets on a match.
   *
   * @param {Match} match - The match to get participants for
   * @returns {Promise<User[]>} Array of users who placed bets
   */
  @FieldResolver(() => [User], {
    description: "Get all users who have placed bets on this match",
  })
  async participants(@Root() match: Match): Promise<User[]> {
    logger.debug(`Fetching participants for match ${logger.cyan(match.id)}`);
    const bets = await AppDataSource.getRepository(Match)
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.bets", "bet")
      .leftJoinAndSelect("bet.user", "user")
      .where("match.id = :matchId", { matchId: match.id })
      .getOne();

    if (!bets) {
      logger.debug(`No participants found for match ${logger.cyan(match.id)}`);
      return [];
    }
    logger.debug(
      `Found ${logger.cyan(
        bets.bets.length
      )} participants for match ${logger.cyan(match.id)}`
    );
    return bets.bets.map((bet) => bet.user);
  }

  /**
   * Calculates the total amount of bets placed on the blue fighter.
   *
   * @param {Match} match - The match to calculate bets for
   * @returns {Promise<number>} Total amount bet on blue fighter
   */
  @FieldResolver(() => Float, {
    description: "Get the total amount of bets placed on the blue fighter",
  })
  async totalBlueBets(@Root() match: Match): Promise<number> {
    logger.debug(
      `Calculating total blue bets for match ${logger.cyan(match.id)}`
    );
    const result = await AppDataSource.getRepository(Bet)
      .createQueryBuilder("bet")
      .select("COALESCE(SUM(bet.amount), 0)", "total")
      .where("bet.matchId = :matchId", { matchId: match.id })
      .andWhere("bet.fighterColor = :color", { color: FighterColor.BLUE })
      .getRawOne();

    const total = parseFloat(result?.total || "0");
    logger.debug(
      `Total blue bets for match ${logger.cyan(match.id)}: ${logger.cyan(
        total
      )}`
    );
    return total;
  }

  /**
   * Calculates the total amount of bets placed on the red fighter.
   *
   * @param {Match} match - The match to calculate bets for
   * @returns {Promise<number>} Total amount bet on red fighter
   */
  @FieldResolver(() => Float, {
    description: "Get the total amount of bets placed on the red fighter",
  })
  async totalRedBets(@Root() match: Match): Promise<number> {
    logger.debug(
      `Calculating total red bets for match ${logger.cyan(match.id)}`
    );
    const result = await AppDataSource.getRepository(Bet)
      .createQueryBuilder("bet")
      .select("COALESCE(SUM(bet.amount), 0)", "total")
      .where("bet.matchId = :matchId", { matchId: match.id })
      .andWhere("bet.fighterColor = :color", { color: FighterColor.RED })
      .getRawOne();

    const total = parseFloat(result?.total || "0");
    logger.debug(
      `Total red bets for match ${logger.cyan(match.id)}: ${logger.cyan(total)}`
    );
    return total;
  }
}
