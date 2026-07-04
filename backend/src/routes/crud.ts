import { Router, type Request } from "express";
import type { Model } from "mongoose";
import { ApiError, asyncHandler } from "../middleware/error.js";

export interface CrudOptions {
  /** Query paraméterek, amikkel a lista szűrhető (pl. year, month, processed). */
  filterFields?: string[];
  /** Mentés előtti transzformáció (create és update egyaránt). */
  beforeSave?: (data: Record<string, unknown>, isUpdate: boolean) => void;
  /** Törlés utáni takarítás (pl. GridFS fájl törlése). */
  afterDelete?: (doc: Record<string, unknown>) => Promise<void>;
  sort?: Record<string, 1 | -1>;
}

function listFilter(req: Request, filterFields: string[]): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId: req.userId };
  for (const field of filterFields) {
    const raw = req.query[field];
    if (raw === undefined || raw === "") continue;
    const value = String(raw);
    if (value === "true" || value === "false") filter[field] = value === "true";
    else if (/^\d+$/.test(value) && ["year", "month"].includes(field)) filter[field] = Number(value);
    else filter[field] = value;
  }
  return filter;
}

/** Generikus, userId-ra szűrt CRUD router. */
export function crudRouter(model: Model<any>, options: CrudOptions = {}): Router {
  const router = Router();
  const { filterFields = [], beforeSave, afterDelete, sort = { createdAt: -1 } } = options;

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const docs = await model.find(listFilter(req, filterFields)).sort(sort);
      res.json(docs);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const doc = await model.findOne({ _id: req.params.id, userId: req.userId });
      if (!doc) throw new ApiError(404, "Nem található", "NOT_FOUND");
      res.json(doc);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = { ...req.body, userId: req.userId };
      delete data._id;
      beforeSave?.(data, false);
      const doc = await model.create(data);
      res.status(201).json(doc);
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const data = { ...req.body };
      delete data._id;
      delete data.userId;
      beforeSave?.(data, true);
      const doc = await model.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $set: data },
        { new: true, runValidators: true },
      );
      if (!doc) throw new ApiError(404, "Nem található", "NOT_FOUND");
      res.json(doc);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const doc = await model.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      if (!doc) throw new ApiError(404, "Nem található", "NOT_FOUND");
      await afterDelete?.(doc.toObject());
      res.json({ ok: true });
    }),
  );

  return router;
}
