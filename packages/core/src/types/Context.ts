import { Request } from "express";
import { User } from "../entities/User";
import { PubSub } from "@graphql-yoga/subscription";
import { MatchTotalsDto } from "../dtos/MatchTotalsDto";

export enum SubscriptionKeys {
  BetTotals = "BET_TOTALS",
}

export interface Subscriptions {
  [SubscriptionKeys.BetTotals]: [MatchTotalsDto];
  [key: string]: [any];
}

/**
 * The GraphQL context shared across resolvers.
 * @property {User | null} user - The authenticated user, if any.
 * @property {Request} req - The Express request object.
 * @property {PubSub<Subscriptions>} pubSub - The PubSub instance for subscriptions.
 */
export interface Context {
  user: User | null;
  req: Request;
  pubSub: PubSub<Subscriptions>;
}
