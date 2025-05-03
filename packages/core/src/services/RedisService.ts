import Redis from "ioredis";

export class RedisService {
  private static instance: RedisService;
  private redis: Redis;

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      // Enable auto-reconnect
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    return this.redis;
  }

  public async blacklistToken(
    token: string,
    ttlSeconds: number = 86400
  ): Promise<void> {
    // Store token with TTL (default 24 hours)
    await this.redis.set(`blacklist:${token}`, "1", "EX", ttlSeconds);
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.exists(`blacklist:${token}`);
    return result === 1;
  }

  public async removeBlacklistedToken(token: string): Promise<void> {
    await this.redis.del(`blacklist:${token}`);
  }
}
