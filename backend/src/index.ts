import mongoose from "mongoose";
import { config } from "./config.js";
import { createApp } from "./app.js";

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB kapcsolódva:", config.mongoUri);
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Garas HKR API fut a ${config.port} porton`);
    if (!config.clerkSecretKey) {
      console.warn("FIGYELEM: nincs CLERK_SECRET_KEY — fejlesztői auth mód aktív (x-dev-user header)");
    }
  });
}

main().catch((err) => {
  console.error("Indítási hiba:", err);
  process.exit(1);
});
