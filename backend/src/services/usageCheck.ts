import { BaseCost, Expense, Income, Insurance, PriceHistory, Sheet, Store, Subscription, Utility, UtilityCategory } from "../models.js";
import { formatDateHu, usageInterval } from "./logic.js";
import { ApiError } from "../middleware/error.js";

const SOURCE_TYPE_OF_ENTITY: Record<string, string> = {
  subscription: "subscription",
  insurance: "insurance",
  housing: "housing",
  utility: "utility",
  transport: "transport",
};

function ym(year: number, month: number): string {
  return `${year}.${String(month).padStart(2, "0")}`;
}

/**
 * Generikus "hol van használatban" ellenőrzés törlés előtt.
 * Magyar nyelvű leírásokat ad vissza, amiket a megerősítő popup listáz.
 */
export async function checkUsage(userId: string, entityType: string, id: string): Promise<string[]> {
  const usages: string[] = [];

  switch (entityType) {
    case "category": {
      const rows = await Expense.find({ userId, categoryId: id }).lean();
      const byMonth = new Map<string, number>();
      for (const r of rows) byMonth.set(ym(r.year, r.month), (byMonth.get(ym(r.year, r.month)) ?? 0) + 1);
      for (const [key, count] of [...byMonth.entries()].sort()) {
        usages.push(`Havi költség — ${key} hónap (${count} tétel)`);
      }
      break;
    }

    case "paymentMethod": {
      const subs = await Subscription.find({ userId, paymentMethodId: id }).lean();
      for (const s of subs) usages.push(`Előfizetés — ${s.name}`);
      const ins = await Insurance.find({ userId, paymentMethodId: id }).lean();
      for (const i of ins) usages.push(`Biztosítás — ${i.name}`);
      const utils = await Utility.find({ userId, paymentMethodId: id }).lean();
      for (const u of utils) usages.push(`Rezsi — ${u.name || "tétel"}`);
      const bcs = await BaseCost.find({ userId, "items.paymentMethodId": id }).lean();
      for (const b of bcs) usages.push(`Alap költség — ${ym(b.year, b.month)}`);
      const exps = await Expense.find({ userId, paymentMethodId: id }).lean();
      for (const e of exps) usages.push(`Havi költség tétel — ${e.name} (${ym(e.year, e.month)})`);
      break;
    }

    case "store": {
      const store = await Store.findOne({ _id: id, userId }).lean();
      if (!store) throw new ApiError(404, "A bolt nem található", "NOT_FOUND");
      const rows = await Expense.find({ userId, store: store.name }).lean();
      const byMonth = new Map<string, number>();
      for (const r of rows) byMonth.set(ym(r.year, r.month), (byMonth.get(ym(r.year, r.month)) ?? 0) + 1);
      for (const [key, count] of [...byMonth.entries()].sort()) {
        usages.push(`Havi költség — ${key} hónap (${count} tétel)`);
      }
      break;
    }

    case "utilityCategory": {
      const utils = await Utility.find({ userId, categoryId: id }).lean();
      for (const u of utils) usages.push(`Rezsi — ${u.name || "tétel"}`);
      break;
    }

    case "priceHistory": {
      const entry = await PriceHistory.findOne({ _id: id, userId }).lean();
      if (!entry) throw new ApiError(404, "Az ártörténet-bejegyzés nem található", "NOT_FOUND");
      const siblings = await PriceHistory.find({
        userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
      }).lean();
      const interval = usageInterval(
        siblings.map((s) => ({
          id: String(s._id),
          amount: s.amount,
          effectiveDate: s.effectiveDate,
        })),
        String(entry._id),
      );
      if (interval) {
        const filter: Record<string, unknown> = {
          userId,
          effectiveDate: { $gte: interval.from, ...(interval.to ? { $lt: interval.to } : {}) },
        };
        if (entry.entityId) filter["items.sourceId"] = entry.entityId;
        const affected = await BaseCost.find(filter).lean();
        if (affected.length > 0) {
          const toText = interval.to ? formatDateHu(interval.to) : "a mai nap";
          usages.push(`A törölni kívánt ár ${formatDateHu(interval.from)} és ${toText} között használatban van.`);
          for (const b of affected) usages.push(`Alap költség — ${ym(b.year, b.month)}`);
        }
      }
      // Fizetés ártörténet-bejegyzésre Bevétel hivatkozhat
      const incomes = await Income.find({ userId, priceHistoryId: id }).lean();
      for (const inc of incomes) usages.push(`Bevétel — ${inc.companyName || "Fizetés"}`);
      break;
    }

    case "subscription":
    case "insurance":
    case "housing":
    case "utility":
    case "transport": {
      const sourceType = SOURCE_TYPE_OF_ENTITY[entityType];
      const bcs = await BaseCost.find({
        userId,
        items: { $elemMatch: { sourceType, sourceId: id } },
      }).lean();
      for (const b of bcs) usages.push(`Alap költség — ${ym(b.year, b.month)}`);
      const prices = await PriceHistory.find({ userId, entityId: id }).lean();
      for (const p of prices) {
        usages.push(`Ártörténet — ${formatDateHu(p.effectiveDate)}-től érvényes ár`);
      }
      if (entityType === "insurance") break;
      break;
    }

    case "car": {
      const ins = await Insurance.find({ userId, linkedType: "car", linkedId: id }).lean();
      for (const i of ins) usages.push(`Biztosítás — ${i.name}`);
      break;
    }

    case "baseCost": {
      const sheets = await Sheet.find({ userId, baseCostId: id }).lean();
      for (const s of sheets) usages.push(`Havi költség — ${ym(s.year, s.month)}`);
      break;
    }

    case "receipt": {
      const rows = await Expense.find({ userId, receiptId: id }).lean();
      for (const r of rows) usages.push(`Havi költség tétel — ${r.name} (${ym(r.year, r.month)})`);
      break;
    }

    case "attachment": {
      const rows = await Expense.find({ userId, attachmentIds: id }).lean();
      for (const r of rows) usages.push(`Havi költség tétel — ${r.name} (${ym(r.year, r.month)})`);
      const insDoc = await Insurance.find({
        userId,
        $or: [{ documentId: id }, { invoiceId: id }],
      }).lean();
      for (const i of insDoc) usages.push(`Biztosítás — ${i.name}`);
      break;
    }

    default:
      // Nem hivatkozott entitástípus (pl. expense, investment, saving): nincs használat.
      break;
  }

  return usages;
}
