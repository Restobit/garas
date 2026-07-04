import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { clerkGuard, requireUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { ensureSeedData } from "./services/seed.js";
import { api } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: "Garas HKR API" });
  });

  app.use("/api", clerkGuard, requireUser, ensureSeedData, api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
