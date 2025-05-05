import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Context, Subscriptions } from "../types/Context";
import { AuthorizationService } from "../services/AuthorizationService";
import { Request } from "express";
import { PubSub } from "@graphql-yoga/subscription";
import { logger } from "../utils/logger";

/**
 * Builds the GraphQL context from the Express request and PubSub instance.
 * @param {Request} req - The Express request object.
 * @param {PubSub<Subscriptions>} pubSub - The PubSub instance for subscriptions.
 * @returns {Promise<Context>} The constructed context object.
 */
export async function getContextFromRequest(
  req: Request,
  pubSub: PubSub<Subscriptions>
): Promise<Context> {
  const context: Context = { user: null, req, pubSub };

  // Get the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return context;
  }

  // Extract the token (assuming Bearer token)
  const token = authHeader.split(" ")[1];
  if (!token) {
    return context;
  }

  try {
    const userId = await AuthorizationService.verifyToken(token);
    if (!userId) {
      return context;
    }

    const user = await AppDataSource.manager.findOne(User, {
      where: { id: userId },
    });

    if (user) {
      context.user = user;
    }
  } catch (error) {
    logger.error("Error authenticating user:", error);
  }

  return context;
}
