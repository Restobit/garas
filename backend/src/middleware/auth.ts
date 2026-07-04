import type { NextFunction, Request, Response } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { config } from "../config.js";
import { ApiError } from "./error.js";

declare module "express-serve-static-core" {
  interface Request {
    userId: string;
  }
}

export const clerkGuard = config.clerkSecretKey
  ? clerkMiddleware({
      secretKey: config.clerkSecretKey,
      publishableKey: config.clerkPublishableKey || undefined,
    })
  : (_req: Request, _res: Response, next: NextFunction): void => next();

/**
 * Clerk JWT alapú azonosítás. Ha nincs CLERK_SECRET_KEY (és nem éles a
 * környezet), fejlesztői mód: az x-dev-user header (vagy "dev-user") azonosít —
 * így a lokális futtatás és az E2E teszt Clerk fiók nélkül is működik.
 */
export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (config.clerkSecretKey) {
    const { userId } = getAuth(req);
    if (!userId) {
      next(new ApiError(401, "Bejelentkezés szükséges", "UNAUTHORIZED"));
      return;
    }
    req.userId = userId;
  } else {
    req.userId = req.header("x-dev-user") ?? "dev-user";
  }
  next();
}
