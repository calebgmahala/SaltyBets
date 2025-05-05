import { AppDataSource } from "../data-source";
import { Bet } from "../entities/Bet";
import { User } from "../entities/User";
import { FighterColor } from "../types/FighterColor";
import { logger } from "../utils/logger";

export class PayoutService {
  private static instance: PayoutService;

  public static getInstance(): PayoutService {
    if (!PayoutService.instance) {
      PayoutService.instance = new PayoutService();
    }
    return PayoutService.instance;
  }

  // ============================================
  // Payout Logic
  // ============================================

  /**
   * Calculates and distributes payouts for a match.
   * If there are no bets on the winning side, all users get their money back and no stats are updated.
   *
   * @param {string} matchId - The ID of the match
   * @param {FighterColor} winner - The winning fighter color
   * @returns {Promise<void>}
   */
  async calculateAndDistributePayouts(
    matchId: string,
    winner: FighterColor
  ): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      // Get all bets for this match
      const bets = await manager.find(Bet, {
        where: { match: { id: matchId } },
        relations: ["user"],
      });

      // Separate winning and losing bets
      const winningBets = bets.filter((bet) => bet.fighterColor === winner);
      const losingBets = bets.filter((bet) => bet.fighterColor !== winner);

      // Calculate total pools
      const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
      const losingPool = losingBets.reduce((sum, bet) => sum + bet.amount, 0);

      // If no winning bets, return all money to everyone and do not update stats
      if (winningBets.length === 0) {
        logger.info(
          `No bets on winning side (${logger.cyan(winner)}) for match ${logger.cyan(matchId)}. Refunding all bets.`
        );
        for (const bet of bets) {
          const user = await manager.findOne(User, {
            where: { id: bet.user.id },
          });
          if (user) {
            user.balance += bet.amount;
            await manager.save(user);
            logger.debug(
              `Refunded ${logger.cyan(bet.amount)} to user ${logger.cyan(user.id)} for match ${logger.cyan(matchId)}`
            );
          }
        }
        return;
      }

      // Calculate and distribute payouts to winners
      for (const bet of winningBets) {
        const user = await manager.findOne(User, {
          where: { id: bet.user.id },
        });
        if (!user) continue;

        // Calculate share of losing pool
        const shareOfLosingPool = (bet.amount / winningPool) * losingPool;
        const totalPayout = bet.amount + shareOfLosingPool;

        // Update user's balance and stats
        user.balance += totalPayout;
        user.totalWins += 1;
        user.totalRevenueGained += shareOfLosingPool;
        await manager.save(user);
        logger.debug(
          `Paid out ${logger.cyan(totalPayout)} to winner ${logger.cyan(user.id)} (bet: ${logger.cyan(bet.amount)}) for match ${logger.cyan(matchId)}`
        );
      }

      // Update stats for losers
      for (const bet of losingBets) {
        const user = await manager.findOne(User, {
          where: { id: bet.user.id },
        });
        if (!user) continue;

        user.totalLosses += 1;
        user.totalRevenueLost += bet.amount;
        await manager.save(user);
        logger.debug(
          `Updated loss stats for user ${logger.cyan(user.id)} (lost: ${logger.cyan(bet.amount)}) for match ${logger.cyan(matchId)}`
        );
      }
    });
  }
}
