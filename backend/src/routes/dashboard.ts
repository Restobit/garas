import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { BaseCost, Category, Expense, Investment, Saving, Sheet, Transport } from "../models.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const year = Number(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const [expenses, baseCosts, sheets, investments, savings, transports, categories] = await Promise.all([
      Expense.find({ userId, year }).lean(),
      BaseCost.find({ userId, year }).lean(),
      Sheet.find({ userId, year }).lean(),
      Investment.find({ userId, date: { $gte: yearStart, $lt: yearEnd } }).lean(),
      Saving.find({ userId, date: { $gte: yearStart, $lt: yearEnd } }).lean(),
      Transport.find({ userId, date: { $gte: yearStart, $lt: yearEnd } }).lean(),
      Category.find({ userId }).lean(),
    ]);

    // Havi bevétel / kiadás (kiadás = havi tételek + alap költség tételek)
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
    }));
    for (const s of sheets) {
      const m = months[s.month - 1];
      if (m) m.income += s.income ?? 0;
    }
    for (const e of expenses) {
      const m = months[e.month - 1];
      if (m) m.expense += e.amount;
    }
    for (const b of baseCosts) {
      const m = months[b.month - 1];
      if (m) m.expense += b.items.reduce((a, i) => a + i.amount, 0);
    }

    // Kategóriánkénti költés (Havi költség tételekből)
    const categoryNames = new Map(categories.map((c) => [String(c._id), c.name]));
    const byCategory = new Map<string, number>();
    const byStore = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.categoryId ? (categoryNames.get(String(e.categoryId)) ?? "Ismeretlen") : "Nincs kategória";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + e.amount);
      const store = e.store || "Ismeretlen hely";
      byStore.set(store, (byStore.get(store) ?? 0) + e.amount);
    }
    const topCategories = [...byCategory.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    const topStores = [...byStore.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Éves összesítés kategóriánként (Alap költség tételek forrás szerint + Közlekedés)
    const bySource = { utility: 0, subscription: 0, housing: 0, insurance: 0 };
    for (const b of baseCosts) {
      for (const item of b.items) {
        if (item.sourceType && item.sourceType in bySource) {
          bySource[item.sourceType as keyof typeof bySource] += item.amount;
        }
      }
    }
    const transportTotal = transports.reduce((a, t) => a + t.amount, 0);

    // Elérhető évek a legördülőhöz
    const yearSets = await Promise.all([
      Sheet.distinct("year", { userId }),
      Expense.distinct("year", { userId }),
      BaseCost.distinct("year", { userId }),
    ]);
    const availableYears = [...new Set([...yearSets.flat(), new Date().getFullYear()])].sort((a, b) => b - a);

    res.json({
      year,
      availableYears,
      months,
      topCategories,
      topStores,
      investmentTotal: investments.reduce((a, i) => a + i.amountInHUF, 0),
      savingTotal: savings.reduce((a, s) => a + s.amount, 0),
      yearlySummary: {
        utility: bySource.utility,
        transport: transportTotal,
        subscription: bySource.subscription,
        housing: bySource.housing,
        insurance: bySource.insurance,
      },
    });
  }),
);
