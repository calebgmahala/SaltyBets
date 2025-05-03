import { createServer } from "./server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { getContextFromRequest } from "./middleware/auth";

async function start() {
  const { server, pubSub } = await createServer();

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
      return getContextFromRequest(req, pubSub);
    },
  });

  console.log(`🚀 Server ready at ${url}`);
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
