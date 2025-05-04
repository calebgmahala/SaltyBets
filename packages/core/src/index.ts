import "reflect-metadata";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { createServer } from "./server";
import { getContextFromRequest } from "./middleware/auth";

async function start() {
  const { server, pubSub } = await createServer();

  const app = express();

  // Enable CORS for your frontend
  app.use(cors({
    origin: "http://localhost:3001",
    credentials: true,
  }));

  // Parse JSON bodies
  app.use(express.json());

  // Attach Apollo middleware
  await server.start();
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => getContextFromRequest(req, pubSub),
    })
  );

  app.listen(4000, () => {
    console.log("🚀 Server ready at http://localhost:4000/graphql");
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
