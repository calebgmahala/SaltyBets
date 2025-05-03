import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Authorized,
  Subscription,
  Root,
  Ctx,
} from "type-graphql";
import { BetService } from "../services/BetService";
import { FighterColor } from "../types/FighterColor";
import { SecurityLevel } from "../types/SecurityLevel";
import { Context, SubscriptionKeys } from "../types/Context";
import { MatchTotalsDto } from "../dtos/MatchTotalsDto";
import { Bet } from "../entities/Bet";
import { logger } from "../utils/logger";

/**
 * BetResolver handles all GraphQL operations related to bets, including queries, user/admin mutations, and subscriptions.
 *
 * @class BetResolver
 * @implements {Resolver}
 */
@Resolver()
export class BetResolver {
  // ============================================
  // Properties
  // ============================================
  private betService: BetService;

  /**
   * Initializes the BetResolver and its BetService instance.
   */
  constructor() {
    this.betService = BetService.getInstance();
  }

  // ============================================
  // Queries
  // ============================================

  /**
   * Gets the current match totals for all bets.
   *
   * @returns {Promise<MatchTotalsDto>} The match totals DTO
   */
  @Authorized()
  @Query(() => MatchTotalsDto)
  async getMatchTotals(): Promise<MatchTotalsDto> {
    logger.debug("Fetching current match totals for all bets");
    return this.betService.getMatchTotals();
  }

  /**
   * Gets the current user's bet for the current match, if any.
   *
   * @param {Context} context - The request context
   * @returns {Promise<Bet | null>} The user's bet or null if none
   */
  @Authorized()
  @Query(() => Bet, { nullable: true })
  async getMyBet(@Ctx() context: Context): Promise<Bet | null> {
    logger.debug(`Fetching bet for user ${logger.cyan(context.user!.id)}`);
    return this.betService.getUserBet(context.user!.id);
  }

  // ============================================
  // User Mutations
  // ============================================

  /**
   * Places a bet for the current user.
   *
   * @param {number} amount - The bet amount
   * @param {FighterColor} fighterColor - The color of the fighter to bet on
   * @param {Context} context - The request context
   * @returns {Promise<boolean>} True if the bet was placed successfully
   */
  @Authorized()
  @Mutation(() => Boolean)
  async placeBet(
    @Arg("amount") amount: number,
    @Arg("fighterColor") fighterColor: FighterColor,
    @Ctx() context: Context
  ): Promise<boolean> {
    logger.info(
      `User ${logger.cyan(
        context.user!.id
      )} placing bet of amount ${logger.cyan(amount)} on ${logger.cyan(
        fighterColor
      )}`
    );
    const result = await this.betService.placeBet(
      context.user!,
      amount,
      fighterColor
    );

    // Schedule throttled update to totals
    await this.betService.scheduleTotalsUpdate(async (totals) => {
      await context.pubSub.publish(SubscriptionKeys.BetTotals, totals);
    });

    if (result) {
      logger.success(
        `Bet placed successfully for user ${logger.cyan(context.user!.id)}`
      );
    } else {
      logger.warn(
        `Failed to place bet for user ${logger.cyan(context.user!.id)}`
      );
    }
    return result;
  }

  /**
   * Cancels a bet for the current user.
   *
   * @param {number} amount - The amount to cancel
   * @param {Context} context - The request context
   * @returns {Promise<boolean>} True if the bet was cancelled successfully
   */
  @Authorized()
  @Mutation(() => Boolean)
  async cancelBet(
    @Arg("amount") amount: number,
    @Ctx() context: Context
  ): Promise<boolean> {
    logger.info(
      `User ${logger.cyan(
        context.user!.id
      )} cancelling bet of amount ${logger.cyan(amount)}`
    );
    const result = await this.betService.cancelBet(context.user!, amount);

    // Schedule throttled update to totals
    await this.betService.scheduleTotalsUpdate(async (totals) => {
      await context.pubSub.publish(SubscriptionKeys.BetTotals, totals);
    });

    if (result) {
      logger.success(
        `Bet cancelled successfully for user ${logger.cyan(context.user!.id)}`
      );
    } else {
      logger.warn(
        `Failed to cancel bet for user ${logger.cyan(context.user!.id)}`
      );
    }
    return result;
  }

  // ============================================
  // Admin Mutations
  // ============================================

  /**
   * Finalizes all bets for a given match. Only admins or payout managers can perform this action.
   *
   * @param {string} matchId - The match ID
   * @returns {Promise<boolean>} True if bets were finalized
   */
  @Authorized([SecurityLevel.ADMIN, SecurityLevel.PAYOUT_MANAGER])
  @Mutation(() => Boolean)
  async finalizeBets(@Arg("matchId") matchId: string): Promise<boolean> {
    logger.info(`Finalizing bets for match ${logger.cyan(matchId)}`);
    await this.betService.finalizeBets(matchId);
    logger.success(`Bets finalized for match ${logger.cyan(matchId)}`);
    return true;
  }

  // ============================================
  // Subscriptions
  // ============================================

  /**
   * Subscription for when bet totals are updated.
   *
   * @param {MatchTotalsDto} totals - The updated match totals
   * @returns {Promise<MatchTotalsDto>} The updated match totals
   */
  @Subscription(() => MatchTotalsDto, {
    topics: SubscriptionKeys.BetTotals,
  })
  async betTotalsUpdated(
    @Root() totals: MatchTotalsDto
  ): Promise<MatchTotalsDto> {
    logger.debug("Bet totals updated via subscription");
    return totals;
  }
}
