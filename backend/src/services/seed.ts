import type { NextFunction, Request, Response } from "express";
import { Category, PaymentMethod, Settings } from "../models.js";

const SEED_CATEGORIES = ["energiaital", "cukros üdítő", "chips", "keksz", "csoki"];
const SEED_PAYMENT_METHODS = ["Gránit", "Revolut", "SZÉP", "Erste"];

const seededUsers = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

async function seedUser(userId: string): Promise<void> {
  // Upsert tételenként, hogy a párhuzamos első kérések ne duplikáljanak
  await Promise.all([
    ...SEED_CATEGORIES.map((name) =>
      Category.updateOne({ userId, name }, { $setOnInsert: { userId, name, isSeed: true } }, { upsert: true }),
    ),
    ...SEED_PAYMENT_METHODS.map((name) =>
      PaymentMethod.updateOne({ userId, name }, { $setOnInsert: { userId, name, isSeed: true } }, { upsert: true }),
    ),
    Settings.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true }),
  ]);
}

/** Első kéréskor létrehozza a felhasználó kezdő kategóriáit, fizetési módjait és beállításait. */
export async function ensureSeedData(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!seededUsers.has(userId)) {
      let promise = inFlight.get(userId);
      if (!promise) {
        promise = seedUser(userId).finally(() => inFlight.delete(userId));
        inFlight.set(userId, promise);
      }
      await promise;
      seededUsers.add(userId);
    }
    next();
  } catch (err) {
    next(err);
  }
}
