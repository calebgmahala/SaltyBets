import { AppDataSource } from "../data-source";
import { Bet } from "../entities/Bet";
import { User } from "../entities/User";
import { FighterColor } from "../types/FighterColor";
import { RedisService } from "./RedisService";

export class PayoutService {
  private static instance: PayoutService;
  private redis: RedisService;
  private betRepository = AppDataSource.getRepository(Bet);
  private userRepository = AppDataSource.getRepository(User);

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  public static getInstance(): PayoutService {
    if (!PayoutService.instance) {
      PayoutService.instance = new PayoutService();
    }
    return PayoutService.instance;
  }

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

      // If no winning bets, return all money to losers
      if (winningBets.length === 0) {
        for (const bet of losingBets) {
          const user = await manager.findOne(User, {
            where: { id: bet.user.id },
          });
          if (user) {
            user.balance += bet.amount;
            await manager.save(user);
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
      }
    });
  }
}
