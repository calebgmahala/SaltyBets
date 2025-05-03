import { RedisService } from "./RedisService";
import { PeriodStatsDto } from "../dtos/PeriodStatsDto";

export class PeriodStatsService {
  private static instance: PeriodStatsService;
  private redis: RedisService;

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  public static getInstance(): PeriodStatsService {
    if (!PeriodStatsService.instance) {
      PeriodStatsService.instance = new PeriodStatsService();
    }
    return PeriodStatsService.instance;
  }

  private getKey(userId: string, stat: string): string {
    return `period:${userId}:${stat}`;
  }

  public async incrementWins(
    userId: string,
    amount: number = 1
  ): Promise<void> {
    await this.redis.getClient().incrby(this.getKey(userId, "wins"), amount);
  }

  public async incrementLosses(
    userId: string,
    amount: number = 1
  ): Promise<void> {
    await this.redis.getClient().incrby(this.getKey(userId, "losses"), amount);
  }

  public async incrementRevenueGained(
    userId: string,
    amount: number
  ): Promise<void> {
    await this.redis
      .getClient()
      .incrbyfloat(this.getKey(userId, "revenueGained"), amount);
  }

  public async incrementRevenueLost(
    userId: string,
    amount: number
  ): Promise<void> {
    await this.redis
      .getClient()
      .incrbyfloat(this.getKey(userId, "revenueLost"), amount);
  }

  public async getStats(userId: string): Promise<PeriodStatsDto> {
    const [wins, losses, revenueGained, revenueLost] = await this.redis
      .getClient()
      .mget(
        this.getKey(userId, "wins"),
        this.getKey(userId, "losses"),
        this.getKey(userId, "revenueGained"),
        this.getKey(userId, "revenueLost")
      );

    const baseStats = {
      wins: parseInt(wins || "0"),
      losses: parseInt(losses || "0"),
      revenueGained: parseFloat(revenueGained || "0"),
      revenueLost: parseFloat(revenueLost || "0"),
    };

    // Calculate derived stats
    const totalGames = baseStats.wins + baseStats.losses;
    const winPercentage =
      totalGames === 0 ? 0 : (baseStats.wins / totalGames) * 100;
    const grossRevenue = baseStats.revenueGained - baseStats.revenueLost;

    return {
      ...baseStats,
      winPercentage,
      grossRevenue,
    };
  }

  public async resetStats(userId: string): Promise<void> {
    const keys = [
      this.getKey(userId, "wins"),
      this.getKey(userId, "losses"),
      this.getKey(userId, "revenueGained"),
      this.getKey(userId, "revenueLost"),
    ];

    await this.redis.getClient().del(...keys);
  }
}
