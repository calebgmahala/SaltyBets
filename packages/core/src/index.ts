import "reflect-metadata";
import express from "express";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { createServer } from "./server";
import { getContextFromRequest } from "./middleware/auth";
import { logger } from "./utils/logger";

/**
 * Starts the Express server, sets up middleware, and attaches Apollo Server.
 * @returns {Promise<void>} Resolves when the server is started.
 */
async function start() {
  const { server, pubSub } = await createServer();

  const app = express();

  // ===========================================
  // Apollo GraphQL Middleware
  // ===========================================

  await server.start();
  app.use(
    "/graphql",
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => getContextFromRequest(req, pubSub),
    })
  );

  // ===========================================
  // Start Server
  // ===========================================

  app.listen(4000, () => {
    logger.success(`🚀 Server ready at ${logger.cyan("http://localhost:4000/graphql")}`);
  });
}

start().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
