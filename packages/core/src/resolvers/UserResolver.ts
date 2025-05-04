import {
  Resolver,
  FieldResolver,
  Root,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Query,
} from "type-graphql";
import { User } from "../entities/User";
import { CreateUserInputDto, UpdateUserInputDto } from "../dtos/UserInputDto";
import { AppDataSource } from "../data-source";
import { AuthorizationService } from "../services/AuthorizationService";
import { Context } from "../types/Context";
import { SecurityLevel } from "../types/SecurityLevel";
import { PeriodStatsService } from "../services/PeriodStatsService";
import { PeriodStatsDto } from "../dtos/PeriodStatsDto";
import * as bcryptjs from "bcryptjs";
import { Match } from "../entities/Match";
import { logger } from "../utils/logger";

/**
 * UserResolver handles all GraphQL operations related to users, including authentication, CRUD, and computed fields.
 *
 * @class UserResolver
 * @implements {Resolver<User>}
 */
@Resolver(() => User)
export class UserResolver {
  // ============================================
  // Properties
  // ============================================
  private userRepository = AppDataSource.getRepository(User);
  private periodStatsService = PeriodStatsService.getInstance();

  // ============================================
  // Computed Field Resolvers
  // ============================================

  /**
   * Calculates the win percentage for a user.
   *
   * @param {User} user - The user entity
   * @returns {number} The win percentage (0-100)
   */
  @FieldResolver()
  winPercentage(@Root() user: User): number {
    logger.debug(`Calculating win percentage for user ${logger.cyan(user.id)}`);
    const totalGames = user.totalWins + user.totalLosses;
    if (totalGames === 0) return 0;
    return (user.totalWins / totalGames) * 100;
  }

  /**
   * Calculates the gross revenue for a user.
   *
   * @param {User} user - The user entity
   * @returns {number} The gross revenue
   */
  @FieldResolver()
  grossRevenue(@Root() user: User): number {
    logger.debug(`Calculating gross revenue for user ${logger.cyan(user.id)}`);
    return user.totalRevenueGained - user.totalRevenueLost;
  }

  /**
   * Retrieves period statistics for a user.
   *
   * @param {User} user - The user entity
   * @returns {Promise<PeriodStatsDto>} The period statistics DTO
   */
  @FieldResolver(() => PeriodStatsDto)
  async periodStats(@Root() user: User): Promise<PeriodStatsDto> {
    logger.debug(`Fetching period stats for user ${logger.cyan(user.id)}`);
    return this.periodStatsService.getStats(user.id);
  }

  /**
   * Retrieves all matches a user has bet on.
   *
   * @param {User} user - The user entity
   * @returns {Promise<Match[]>} Array of matches
   */
  @FieldResolver(() => [Match])
  async matches(@Root() user: User): Promise<Match[]> {
    logger.debug(`Fetching matches for user ${logger.cyan(user.id)}`);
    const bets = await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.bets", "bet")
      .leftJoinAndSelect("bet.match", "match")
      .where("user.id = :userId", { userId: user.id })
      .getOne();

    if (!bets) {
      logger.warn(`No bets found for user ${logger.cyan(user.id)}`);
      return [];
    }
    return bets.bets.map((bet) => bet.match);
  }

  // ============================================
  // Queries
  // ============================================

  /**
   * Fetches a user by ID.
   *
   * @param {string} id - The user ID
   * @returns {Promise<User | null>} The user or null if not found
   */
  @Authorized()
  @Query(() => User, { nullable: true })
  async user(
    @Ctx() { user }: Context,
    @Arg("id", { nullable: true }) id?: string
  ): Promise<User | null> {
    logger.debug(`Fetching user by ID ${logger.cyan(id)}`);
    const foundUser = await this.userRepository.findOne({ where: { id: id ?? user.id } });
    if (!foundUser) {
      logger.warn(`User not found for ID ${logger.cyan(id)}`);
    }
    return foundUser;
  }

  /**
   * Fetches all users, ordered by alias.
   *
   * @returns {Promise<User[]>} Array of users
   */
  @Authorized()
  @Query(() => [User])
  async users(): Promise<User[]> {
    logger.debug("Fetching all users ordered by alias");
    return await this.userRepository.find({
      order: {
        alias: "ASC",
      },
    });
  }

  // ============================================
  // Authentication Mutations
  // ============================================

  /**
   * Authenticates a user and returns a JWT token.
   *
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<string>} JWT token
   * @throws {Error} If credentials are invalid
   */
  @Mutation(() => String)
  async login(
    @Arg("username") username: string,
    @Arg("password") password: string
  ): Promise<string> {
    logger.info(`Attempting login for username ${logger.cyan(username)}`);
    const user = await AuthorizationService.validateCredentials(
      username,
      password
    );
    if (!user) {
      logger.error(`Invalid credentials for username ${logger.cyan(username)}`);
      throw new Error("Invalid credentials");
    }
    logger.success(`User ${logger.cyan(user.id)} logged in successfully`);
    return AuthorizationService.generateToken(user);
  }

  /**
   * Logs out a user by blacklisting their token.
   *
   * @param {Context} ctx - The request context
   * @returns {Promise<boolean>} True if logout was successful
   */
  @Authorized()
  @Mutation(() => Boolean)
  async logout(@Ctx() { req }: Context): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn("No authorization header found during logout");
      return false;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      logger.warn("No token found in authorization header during logout");
      return false;
    }

    await AuthorizationService.blacklistToken(token);
    logger.success("User logged out and token blacklisted");
    return true;
  }

  // ============================================
  // CRUD Mutations
  // ============================================

  /**
   * Creates a new user.
   *
   * @param {CreateUserInputDto} input - The user creation input
   * @param {Context} ctx - The request context
   * @returns {Promise<User>} The created user
   * @throws {Error} If unauthorized
   */
  @Authorized()
  @Mutation(() => User)
  async createUser(
    @Arg("input") input: CreateUserInputDto,
    @Ctx() { user }: Context
  ): Promise<User> {
    logger.info(
      `User ${logger.cyan(
        user.id
      )} attempting to create a new user with alias ${logger.cyan(input.alias)}`
    );
    if (!AuthorizationService.canCreateUser(user)) {
      logger.error(
        `Unauthorized user creation attempt by user ${logger.cyan(user.id)}`
      );
      throw new Error("Unauthorized to create users");
    }

    const newUser = this.userRepository.create(input);
    const savedUser = await this.userRepository.save(newUser);
    logger.success(
      `User ${logger.cyan(savedUser.id)} created successfully by ${logger.cyan(
        user.id
      )}`
    );
    return savedUser;
  }

  /**
   * Updates an existing user.
   *
   * @param {string | null} id - The user ID (optional, defaults to current user)
   * @param {UpdateUserInputDto} input - The update input
   * @param {Context} ctx - The request context
   * @returns {Promise<User>} The updated user
   * @throws {Error} If user not found or unauthorized
   */
  @Authorized()
  @Mutation(() => User)
  async updateUser(
    @Arg("id", { nullable: true }) id: string | null,
    @Arg("input") input: UpdateUserInputDto,
    @Ctx() { user }: Context
  ): Promise<User> {
    const targetUserId = id || user.id;
    logger.info(
      `User ${logger.cyan(user.id)} attempting to update user ${logger.cyan(
        targetUserId
      )}`
    );
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      logger.error(`User not found for update: ${logger.cyan(targetUserId)}`);
      throw new Error("User not found");
    }

    if (
      !AuthorizationService.canUpdateUserProperties(user, targetUser, input)
    ) {
      logger.error(
        `Unauthorized update attempt by user ${logger.cyan(
          user.id
        )} on user ${logger.cyan(targetUserId)}`
      );
      throw new Error("Unauthorized to update these properties");
    }

    if (input.password) {
      logger.debug(
        `Hashing new password for user ${logger.cyan(targetUserId)}`
      );
      input.password = await bcryptjs.hash(input.password, 10);
    }

    Object.assign(targetUser, input);
    const updatedUser = await this.userRepository.save(targetUser);
    logger.success(
      `User ${logger.cyan(
        updatedUser.id
      )} updated successfully by ${logger.cyan(user.id)}`
    );
    return updatedUser;
  }

  /**
   * Deletes a user by ID. Only admins can delete users.
   *
   * @param {string} id - The user ID
   * @param {Context} ctx - The request context
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {Error} If not admin or user not found
   */
  @Authorized()
  @Mutation(() => Boolean)
  async deleteUser(
    @Arg("id") id: string,
    @Ctx() { user }: Context
  ): Promise<boolean> {
    logger.info(
      `User ${logger.cyan(user.id)} attempting to delete user ${logger.cyan(
        id
      )}`
    );
    if (user.securityLevel !== SecurityLevel.ADMIN) {
      logger.error(
        `Unauthorized delete attempt by user ${logger.cyan(
          user.id
        )} (not admin)`
      );
      throw new Error("Only admins can delete users");
    }

    const result = await this.userRepository.delete(id);
    if (result.affected !== 0) {
      logger.success(
        `User ${logger.cyan(id)} deleted successfully by admin ${logger.cyan(
          user.id
        )}`
      );
      return true;
    } else {
      logger.warn(`User ${logger.cyan(id)} not found for deletion`);
      return false;
    }
  }
}
