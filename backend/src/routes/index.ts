import { Router } from "express";
import { ApiError, asyncHandler } from "../middleware/error.js";
import {
  Attachment,
  Car,
  Category,
  Expense,
  Housing,
  Insurance,
  Investment,
  PaymentMethod,
  PriceHistory,
  Receipt,
  Saving,
  Settings,
  Sheet,
  Subscription,
  Transport,
  Utility,
} from "../models.js";
import { crudRouter } from "./crud.js";
import { baseCostsRouter } from "./baseCosts.js";
import { dashboardRouter } from "./dashboard.js";
import { filesRouter, receiptsRouter } from "./files.js";
import { checkUsage } from "../services/usageCheck.js";
import { deleteFile } from "../services/gridfs.js";

export const api = Router();

api.use("/dashboard", dashboardRouter);
api.use("/base-costs", baseCostsRouter);
api.use("/files", filesRouter);

// Blokk: speciális végpontok + generikus CRUD (lista, szerkesztés, törlés)
api.use(
  "/receipts",
  receiptsRouter,
  crudRouter(Receipt, {
    filterFields: ["processed"],
    sort: { uploadedAt: -1 },
    beforeSave: (data, isUpdate) => {
      if (isUpdate && data.processed === true && !data.processedDate) {
        data.processedDate = new Date();
      }
      if (data.processed === false) data.processedDate = null;
    },
    afterDelete: async (doc) => deleteFile(String(doc.fileId)),
  }),
);

const expensesRouter = crudRouter(Expense, {
  filterFields: ["year", "month", "categoryId", "receiptId"],
  sort: { date: -1 },
});

// Gyors rögzítés: több tétel mentése egyben (Blokk munkamenet "Mentés" gombja)
expensesRouter.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const items = (req.body as { items?: Record<string, unknown>[] }).items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Nincs mentendő tétel", "VALIDATION");
    }
    const docs = await Expense.insertMany(
      items.map((item) => {
        const data = { ...item, userId: req.userId };
        delete (data as Record<string, unknown>)._id;
        return data;
      }),
    );
    res.status(201).json(docs);
  }),
);
api.use("/expenses", expensesRouter);

api.use("/categories", crudRouter(Category, { sort: { name: 1 } }));
api.use("/payment-methods", crudRouter(PaymentMethod, { sort: { name: 1 } }));
api.use("/sheets", crudRouter(Sheet, { filterFields: ["year", "month"], sort: { year: -1, month: -1 } }));
api.use("/subscriptions", crudRouter(Subscription, { filterFields: ["status"], sort: { name: 1 } }));
api.use("/housing", crudRouter(Housing, { filterFields: ["status"] }));
api.use("/utilities", crudRouter(Utility, { sort: { type: 1 } }));
api.use("/insurances", crudRouter(Insurance, { filterFields: ["linkedType", "linkedId"], sort: { name: 1 } }));
api.use("/cars", crudRouter(Car, { sort: { purchaseDate: -1 } }));
api.use("/transports", crudRouter(Transport, { filterFields: ["type"], sort: { date: -1 } }));
api.use("/investments", crudRouter(Investment, { sort: { date: -1 } }));
api.use("/savings", crudRouter(Saving, { sort: { date: -1 } }));
api.use(
  "/price-history",
  crudRouter(PriceHistory, {
    filterFields: ["entityType", "entityId"],
    sort: { effectiveDate: -1 },
    beforeSave: (data, isUpdate) => {
      // Meglévő bejegyzés szerkesztésekor a Módosítás dátuma automatikusan frissül
      if (isUpdate) data.modifiedDate = new Date();
    },
  }),
);

// Generikus usage check a törlés-megerősítő popuphoz
api.get(
  "/usage/:entityType/:id",
  asyncHandler(async (req, res) => {
    const usages = await checkUsage(req.userId, String(req.params.entityType), String(req.params.id));
    res.json({ usages });
  }),
);

// Beállítások (nyelv, devizanem)
api.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      { $setOnInsert: { userId: req.userId } },
      { new: true, upsert: true },
    );
    res.json(settings);
  }),
);
api.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const { language, currency } = req.body as { language?: string; currency?: string };
    const settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      { $set: { ...(language ? { language } : {}), ...(currency ? { currency } : {}) } },
      { new: true, upsert: true, runValidators: true },
    );
    res.json(settings);
  }),
);
