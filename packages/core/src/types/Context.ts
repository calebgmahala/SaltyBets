import { IncomingMessage } from "http";
import { User } from "../entities/User";
import { PubSub } from "@graphql-yoga/subscription";
import { FighterColor } from "./FighterColor";
import { MatchTotalsDto } from "../dtos/MatchTotalsDto";

export enum SubscriptionKeys {
  BetTotals = "BET_TOTALS",
}

export interface Subscriptions {
  [SubscriptionKeys.BetTotals]: [MatchTotalsDto];
  [key: string]: [any];
}

export interface Context {
  user: User | null;
  req: IncomingMessage;
  pubSub: PubSub<Subscriptions>;
}
