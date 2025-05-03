import { User } from "../entities/User";
import { SecurityLevel } from "../types/SecurityLevel";
import { AppDataSource } from "../data-source";
import * as jwt from "jsonwebtoken";
import { RedisService } from "./RedisService";
import { AuthChecker } from "type-graphql";
import { Context } from "../types/Context";

export class AuthorizationService {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key";
  private static readonly TOKEN_EXPIRY = "24h";

  // Authentication Methods
  static async generateToken(user: User): Promise<string> {
    return jwt.sign({ userId: user.id }, this.JWT_SECRET, {
      expiresIn: this.TOKEN_EXPIRY,
    });
  }

  static async verifyToken(token: string): Promise<string | null> {
    try {
      // Check if token is blacklisted in Redis
      try {
        if (await RedisService.getInstance().isTokenBlacklisted(token)) {
          return null;
        }
      } catch (redisError) {
        console.warn(
          "Redis connection error during token verification:",
          redisError
        );
        // Continue with JWT verification even if Redis check fails
      }

      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }

  static async validateCredentials(
    username: string,
    password: string
  ): Promise<User | null> {
    const user = await AppDataSource.manager.findOne(User, {
      where: { username },
    });

    if (!user) {
      return null;
    }

    const isValid = await user.validatePassword(password);
    return isValid ? user : null;
  }

  static async blacklistToken(token: string): Promise<void> {
    await RedisService.getInstance().blacklistToken(token);
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    return await RedisService.getInstance().isTokenBlacklisted(token);
  }

  // Authorization Methods
  static canCreateUser(user: User): boolean {
    return (
      user.securityLevel === SecurityLevel.ADMIN ||
      user.securityLevel === SecurityLevel.PAYOUT_MANAGER
    );
  }

  static canUpdateUserProperties(
    updatingUser: User,
    targetUser: User,
    input: any
  ): boolean {
    // Admin can update anything
    if (updatingUser.securityLevel === SecurityLevel.ADMIN) {
      return true;
    }

    // Managers can only update balance and periodStart
    if (updatingUser.securityLevel === SecurityLevel.PAYOUT_MANAGER) {
      const allowedFields = ["balance", "periodStart"];
      return Object.keys(input).every((key) => allowedFields.includes(key));
    }

    // Users can only update their own basic info
    if (updatingUser.id === targetUser.id) {
      const allowedFields = ["alias", "username", "password"];
      return Object.keys(input).every((key) => allowedFields.includes(key));
    }

    return false;
  }

  // Auth Checker for TypeGraphQL
  static authChecker: AuthChecker<Context> = async ({ context }, roles) => {
    try {
      const { user } = context;

      // If no user, not authenticated
      if (!user) {
        console.warn("No user found in context");
        return false;
      }

      // If no roles specified, just check if user is authenticated
      if (!roles || roles.length === 0) {
        return true;
      }

      // Check if user has any of the required roles
      return roles.some((role) => user.securityLevel === role);
    } catch (error) {
      console.error("Error in authChecker:", error);
      return false;
    }
  };
}
