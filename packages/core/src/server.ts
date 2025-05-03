import "reflect-metadata";
import { ApolloServer } from "@apollo/server";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver";
import { AppDataSource } from "./data-source";
import { AuthorizationService } from "./services/AuthorizationService";
import { BetResolver } from "./resolvers/BetResolver";
import { createPubSub } from "@graphql-yoga/subscription";
import { MatchResolver } from "./resolvers/MatchResolver";
import * as path from "path";

export async function createServer() {
  // Create PubSub instance
  const pubSub = createPubSub();

  // Build TypeGraphQL executable schema
  const schema = await buildSchema({
    resolvers: [UserResolver, BetResolver, MatchResolver],
    validate: true,
    authChecker: AuthorizationService.authChecker,
    pubSub, // Add PubSub to the schema
    emitSchemaFile: {
      path: path.join(__dirname, "../schema.gql"),
      sortedSchema: true, // sort schema lexicographically
    },
  });

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
  });

  // Initialize database connection
  await AppDataSource.initialize();

  return { server, pubSub };
}
