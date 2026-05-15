import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.SERVER_PORT, () => {
  console.log(`VerMeat API is running on http://127.0.0.1:${env.SERVER_PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
