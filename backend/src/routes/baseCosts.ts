import { Router } from "express";
import { ApiError, asyncHandler } from "../middleware/error.js";
import { BaseCost, Housing, Insurance, PriceHistory, Subscription, Transport, Utility } from "../models.js";
import { buildBaseCostItems, type FillSources } from "../services/logic.js";

export const baseCostsRouter = Router();

async function loadSources(userId: string): Promise<FillSources> {
  const [subscriptions, insurances, housings, utilities, transports, priceHistories] = await Promise.all([
    Subscription.find({ userId }).lean(),
    Insurance.find({ userId }).lean(),
    Housing.find({ userId }).lean(),
    Utility.find({ userId }).lean(),
    Transport.find({ userId }).lean(),
    PriceHistory.find({ userId }).lean(),
  ]);
  return {
    subscriptions: subscriptions.map((s) => ({
      id: String(s._id),
      name: s.name,
      price: s.price,
      paymentMethodId: s.paymentMethodId ? String(s.paymentMethodId) : null,
      startDate: s.startDate,
      status: s.status,
    })),
    insurances: insurances.map((i) => ({
      id: String(i._id),
      name: i.name,
      frequency: i.frequency,
      amount: i.amount,
      paymentMethodId: i.paymentMethodId ? String(i.paymentMethodId) : null,
      dueDate: i.dueDate ?? null,
      paymentDeadline: i.paymentDeadline ?? null,
    })),
    housings: housings.map((h) => ({
      id: String(h._id),
      type: h.type,
      price: h.price,
      startDate: h.startDate,
      status: h.status,
      terminationDate: h.terminationDate ?? null,
    })),
    utilities: utilities.map((u) => ({
      id: String(u._id),
      type: u.type,
      name: u.name,
      paymentMethodId: u.paymentMethodId ? String(u.paymentMethodId) : null,
      dueDay: u.dueDay ?? null,
    })),
    transports: transports.map((t) => ({
      id: String(t._id),
      type: t.type,
      amount: t.amount,
      date: t.date,
    })),
    priceHistories: priceHistories.map((p) => ({
      id: String(p._id),
      entityType: p.entityType,
      entityId: p.entityId ? String(p.entityId) : null,
      amount: p.amount,
      effectiveDate: p.effectiveDate,
    })),
  };
}

baseCostsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.month) filter.month = Number(req.query.month);
    const docs = await BaseCost.find(filter).sort({ year: -1, month: -1 });
    res.json(docs);
  }),
);

baseCostsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await BaseCost.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) throw new ApiError(404, "Az alap költség nem található", "NOT_FOUND");
    res.json(doc);
  }),
);

// Létrehozás: a Felhasználás dátuma alapján automatikus feltöltés
baseCostsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { effectiveDate } = req.body as { effectiveDate?: string };
    if (!effectiveDate) throw new ApiError(400, "A Felhasználás dátuma kötelező", "VALIDATION");
    const date = new Date(effectiveDate);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, "Érvénytelen dátum", "VALIDATION");
    const sources = await loadSources(req.userId);
    const items = buildBaseCostItems(sources, date);
    const doc = await BaseCost.create({
      userId: req.userId,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      effectiveDate: date,
      items,
    });
    res.status(201).json(doc);
  }),
);

// Frissítés (Befizetve checkbox, Fizetés dátuma, tételek szerkesztése)
baseCostsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    delete data._id;
    delete data.userId;
    const doc = await BaseCost.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!doc) throw new ApiError(404, "Az alap költség nem található", "NOT_FOUND");
    res.json(doc);
  }),
);

// Újragenerálás a forrásadatokból (a kézi pipálásokat forrás szerint megőrzi)
baseCostsRouter.post(
  "/:id/refill",
  asyncHandler(async (req, res) => {
    const doc = await BaseCost.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) throw new ApiError(404, "Az alap költség nem található", "NOT_FOUND");
    const sources = await loadSources(req.userId);
    const items = buildBaseCostItems(sources, doc.effectiveDate);
    const paidBySource = new Map(
      doc.items
        .filter((i) => i.sourceId)
        .map((i) => [`${i.sourceType}:${String(i.sourceId)}`, { paid: i.paid, paidDate: i.paidDate }]),
    );
    doc.items.splice(0, doc.items.length);
    for (const item of items) {
      const prev = paidBySource.get(`${item.sourceType}:${item.sourceId}`);
      doc.items.push({ ...item, paid: prev?.paid ?? false, paidDate: prev?.paidDate ?? null } as never);
    }
    await doc.save();
    res.json(doc);
  }),
);

baseCostsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await BaseCost.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!doc) throw new ApiError(404, "Az alap költség nem található", "NOT_FOUND");
    res.json({ ok: true });
  }),
);
