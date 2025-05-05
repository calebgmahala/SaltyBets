import axios from "axios";
import { RedisService } from "./RedisService";
import { Fighter } from "../entities/Fighter";
import {
  SaltyBoyMatch,
  SaltyBoyMatchListResponse,
  SaltyBoyCurrentMatchResponse,
  SaltyBoyFighter,
} from "../types/saltyboy";
import { logger } from "../utils/logger";

export class SaltyBoyService {
  private static instance: SaltyBoyService;
  private baseUrl = "https://salty-boy.com/api";
  private redis: RedisService;

  private constructor() {
    this.redis = RedisService.getInstance();
    logger.debug("Initializing SaltyBoyService");
  }

  public static getInstance(): SaltyBoyService {
    if (!SaltyBoyService.instance) {
      logger.debug("Creating new SaltyBoyService instance");
      SaltyBoyService.instance = new SaltyBoyService();
    }
    return SaltyBoyService.instance;
  }

  private createMatchHash(
    fighterBlueId: number,
    fighterRedId: number,
    identifier: string
  ): string {
    logger.debug(
      `Creating match hash for fighters ${logger.cyan(
        fighterBlueId
      )} and ${logger.cyan(fighterRedId)} with identifier ${logger.cyan(
        identifier
      )}`
    );
    return `${fighterBlueId}-${fighterRedId}-${identifier}`;
  }

  public compareMatchHashes(hash1: string, hash2: string): boolean {
    logger.debug(
      `Comparing match hashes ${logger.cyan(hash1)} and ${logger.cyan(hash2)}`
    );
    const [blue1, red1] = hash1.split("-");
    const [blue2, red2] = hash2.split("-");
    const result = blue1 === blue2 && red1 === red2;
    logger.debug(`Hash comparison result: ${logger.cyan(result)}`);
    return result;
  }

  /**
   * Returns the Redis key used to store the latest Salty Boy match ID.
   * @returns {string} The Redis key for the latest Salty Boy match ID
   */
  private getLatestSaltyBoyMatchKey(): string {
    return "match:latest:id";
  }

  /**
   * Fetches the latest Salty Boy match ID from Redis.
   * @returns {Promise<number | null>} The latest match ID or null if not found
   */
  async getLatestSaltyBoyMatchId(): Promise<number | null> {
    logger.debug("Fetching latest Salty Boy match ID from Redis");
    const matchId = await this.redis.getClient().get(this.getLatestSaltyBoyMatchKey());
    logger.debug(`Latest Salty Boy match ID: ${matchId ? logger.cyan(matchId) : "none"}`);
    return matchId ? parseInt(matchId) : null;
  }

  /**
   * Sets the latest Salty Boy match ID in Redis.
   * @param {string} matchId - The match ID to set as the latest
   * @returns {Promise<void>}
   */
  async setLatestSaltyBoyMatchId(matchId: string): Promise<void> {
    logger.debug(`Setting latest Salty Boy match ID to ${logger.cyan(matchId)}`);
    await this.redis.getClient().set(this.getLatestSaltyBoyMatchKey(), matchId);
  }

  async getMatchById(matchId: string): Promise<SaltyBoyMatch> {
    logger.debug(`Fetching match with ID ${logger.cyan(matchId)}`);
    try {
      const response = await axios.get<SaltyBoyMatch>(
        `${this.baseUrl}/match/${matchId}/`
      );
      logger.debug(`Successfully fetched match ${logger.cyan(matchId)}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching match ${logger.cyan(matchId)}:`, error);
      throw new Error("Failed to fetch match from Salty Boy API");
    }
  }

  async getCurrentMatch(): Promise<{
    data: SaltyBoyCurrentMatchResponse;
    hash: string;
  }> {
    logger.debug("Fetching current match info");
    try {
      const response = await axios.get<SaltyBoyCurrentMatchResponse>(
        `${this.baseUrl}/current_match_info/`
      );
      const { fighter_blue_info, fighter_red_info, updated_at } = response.data;
      // ============================================
      // Validate fighter info presence
      // ============================================
      if (!fighter_blue_info || !fighter_red_info) {
        logger.error("Missing fighter info in Salty Boy API response, most likely the match is an exhibition match");
        throw new Error("Current match data is missing fighter information");
      }
      const actualHash = this.createMatchHash(
        fighter_blue_info.id,
        fighter_red_info.id,
        updated_at
      );
      logger.debug(
        `Current match hash: ${logger.cyan(
          actualHash
        )} with fighters ${logger.cyan(fighter_blue_info.id)} and ${logger.cyan(
          fighter_red_info.id
        )}`
      );
      return { data: response.data, hash: actualHash };
    } catch (error) {
      logger.error("Error fetching current match:", error);
      throw new Error("Failed to fetch current match from Salty Boy API. The match may be an exhibition match.");
    }
  }

  async crawlLatestMatch(): Promise<{
    data: SaltyBoyMatch;
    hash: string;
  } | null> {
    logger.debug("Crawling latest match");
    try {
      // First get the total count of matches
      const countResponse = await axios.get<SaltyBoyMatchListResponse>(
        `${this.baseUrl}/match/`,
        {
          params: {
            page_size: 1,
            page: 0,
          },
        }
      );

      const totalCount = countResponse.data.count;
      logger.debug(`Total match count: ${logger.cyan(totalCount)}`);
      if (!totalCount) {
        logger.warn("No matches found in the system");
        return null;
      }

      // Calculate the last page (100 items per page)
      const pageSize = 100;
      const lastPage = Math.ceil(totalCount / pageSize);
      logger.debug(`Fetching last page ${logger.cyan(lastPage)} of matches`);

      // Get the last page of matches
      const response = await axios.get<SaltyBoyMatchListResponse>(
        `${this.baseUrl}/match/`,
        {
          params: {
            page_size: pageSize,
            page: lastPage - 1,
          },
        }
      );

      if (
        !response.data ||
        !response.data.results ||
        !response.data.results.length
      ) {
        logger.warn("No matches found in the last page");
        return null;
      }

      // Get the last match from the results
      const latestMatch =
        response.data.results[response.data.results.length - 1];
      const { fighter_blue, fighter_red, date } = latestMatch;
      const hash = this.createMatchHash(fighter_blue, fighter_red, date);

      logger.debug(
        `Found latest match with hash ${logger.cyan(hash)} and ID ${logger.cyan(
          latestMatch.id
        )}`
      );

      await this.setLatestSaltyBoyMatchId(latestMatch.id.toString());

      return {
        data: latestMatch,
        hash,
      };
    } catch (error) {
      logger.error("Error crawling latest match:", error);
      return null;
    }
  }

  async getFighterById(id: number): Promise<Fighter> {
    logger.debug(`Fetching fighter with ID ${logger.cyan(id)}`);
    try {
      const response = await axios.get<SaltyBoyFighter>(
        `${this.baseUrl}/fighter/${id}/`
      );
      const fighterData = response.data;

      const fighter = new Fighter();
      fighter.id = fighterData.id;
      fighter.name = fighterData.name;
      fighter.tier = fighterData.tier;
      fighter.prevTier = fighterData.prev_tier;
      fighter.elo = fighterData.elo;
      fighter.tierElo = fighterData.tier_elo;
      fighter.bestStreak = fighterData.best_streak;
      fighter.createdTime = new Date(fighterData.created_time);
      fighter.lastUpdated = new Date(fighterData.last_updated);

      logger.debug(
        `Successfully fetched fighter ${logger.cyan(
          fighter.name
        )} (ID: ${logger.cyan(fighter.id)})`
      );

      return fighter;
    } catch (error) {
      logger.error(`Error getting fighter by ID ${logger.cyan(id)}:`, error);
      throw error;
    }
  }

  async getNextLatestMatch(): Promise<{
    data: SaltyBoyMatch;
    hash: string;
  } | null> {
    logger.debug("Fetching next latest match");
    try {
      let latestMatchId = await this.getLatestSaltyBoyMatchId();
      if (!latestMatchId) {
        logger.warn("No latest match ID found");
        const latestCrawledMatch = await this.crawlLatestMatch();
        latestMatchId = latestCrawledMatch?.data.id;
      }

      const nextMatchId = latestMatchId + 1;
      logger.debug(`Fetching match with ID ${logger.cyan(nextMatchId)}`);

      const response = await axios.get<SaltyBoyMatch>(
        `${this.baseUrl}/match/${nextMatchId}/`
      );

      const { fighter_blue, fighter_red, date } = response.data;
      const hash = this.createMatchHash(fighter_blue, fighter_red, date);

      logger.debug(
        `Found next match with hash ${logger.cyan(hash)} and ID ${logger.cyan(
          nextMatchId
        )}`
      );

      return {
        data: response.data,
        hash,
      };
    } catch (error) {
      logger.error("Latest match not found, or error fetching next match:", error);
      return null;
    }
  }
}
