/**
 * Tiszta (adatbázis-független) üzleti logika — vitest-tel egységtesztelve.
 */

export interface PricePoint {
  id: string;
  amount: number;
  effectiveDate: Date;
}

/** Az adott napon érvényes ár: a legkésőbbi, még nem jövőbeli ártörténet-bejegyzés. */
export function resolveAmount(baseAmount: number, points: PricePoint[], at: Date): number {
  const applicable = points
    .filter((p) => p.effectiveDate.getTime() <= at.getTime())
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
  const last = applicable[applicable.length - 1];
  return last ? last.amount : baseAmount;
}

/**
 * Egy ártörténet-bejegyzés érvényességi intervalluma: az életbelépésétől a
 * következő (ugyanahhoz az entitáshoz tartozó) bejegyzés életbelépéséig tart.
 */
export function usageInterval(points: PricePoint[], targetId: string): { from: Date; to: Date | null } | null {
  const sorted = [...points].sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
  const idx = sorted.findIndex((p) => p.id === targetId);
  if (idx === -1) return null;
  const current = sorted[idx];
  if (!current) return null;
  const next = sorted[idx + 1];
  return { from: current.effectiveDate, to: next ? next.effectiveDate : null };
}

export function formatDateHu(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd}`;
}

/** Két dátum közti egész hónapok száma (év*12+hónap különbség). */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** A referencia-dátum napja átemelve a célhónapba (hónapvégére csonkolva). */
export function dayInMonth(year: number, month: number, refDate: Date | null): Date {
  const day = refDate ? refDate.getDate() : 1;
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

/** Esedékes-e az adott gyakoriságú tétel a célhónapban (a horgony-dátumhoz képest)? */
export function isDueInMonth(frequency: string, anchor: Date | null, year: number, month: number): boolean {
  const every = FREQUENCY_MONTHS[frequency] ?? 1;
  if (every === 1 || !anchor) return true;
  const diff = monthsBetween(anchor, new Date(year, month - 1, 1));
  return diff >= 0 && diff % every === 0;
}

export interface BaseCostItemDraft {
  name: string;
  dueDate: Date | null;
  paymentMethodId: string | null;
  amount: number;
  paid: boolean;
  paidDate: Date | null;
  sourceType: "subscription" | "insurance" | "housing" | "utility" | "transport";
  sourceId: string;
}

export interface FillSources {
  subscriptions: {
    id: string;
    name: string;
    price: number;
    paymentMethodId: string | null;
    startDate: Date;
    status: string;
  }[];
  insurances: {
    id: string;
    name: string;
    frequency: string;
    amount: number;
    paymentMethodId: string | null;
    dueDate: Date | null;
    paymentDeadline: Date | null;
  }[];
  housings: {
    id: string;
    type: string;
    price: number;
    startDate: Date;
    status: string;
    terminationDate: Date | null;
  }[];
  utilities: {
    id: string;
    type: string;
    name: string;
    paymentMethodId: string | null;
    dueDay: number | null;
  }[];
  transports: { id: string; type: string; amount: number; date: Date }[];
  priceHistories: {
    id: string;
    entityType: string;
    entityId: string | null;
    amount: number;
    effectiveDate: Date;
  }[];
}

const UTILITY_LABELS: Record<string, string> = {
  water: "Víz",
  electricity: "Villany",
  gas: "Gáz",
  internet: "Internet",
};

const HOUSING_LABELS: Record<string, string> = { loan: "Hitel", rent: "Albérlet" };

function pricePointsFor(
  histories: FillSources["priceHistories"],
  entityType: string | string[],
  entityId: string,
): PricePoint[] {
  const types = Array.isArray(entityType) ? entityType : [entityType];
  return histories
    .filter((h) => types.includes(h.entityType) && h.entityId === entityId)
    .map((h) => ({ id: h.id, amount: h.amount, effectiveDate: h.effectiveDate }));
}

/**
 * Alap költség automatikus feltöltése: a Felhasználás dátumán érvényes
 * Előfizetés, Biztosítás, Lakhatás, Rezsi és Közlekedés tételekből.
 * Az árakat az Ártörténet felülbírálhatja (a dátumon érvényes ár nyer).
 */
export function buildBaseCostItems(sources: FillSources, effectiveDate: Date): BaseCostItemDraft[] {
  const year = effectiveDate.getFullYear();
  const month = effectiveDate.getMonth() + 1;
  const items: BaseCostItemDraft[] = [];

  for (const s of sources.subscriptions) {
    if (s.status !== "active" || s.startDate.getTime() > effectiveDate.getTime()) continue;
    items.push({
      name: s.name,
      dueDate: dayInMonth(year, month, s.startDate),
      paymentMethodId: s.paymentMethodId,
      amount: resolveAmount(s.price, pricePointsFor(sources.priceHistories, "service", s.id), effectiveDate),
      paid: false,
      paidDate: null,
      sourceType: "subscription",
      sourceId: s.id,
    });
  }

  for (const i of sources.insurances) {
    if (!isDueInMonth(i.frequency, i.dueDate, year, month)) continue;
    items.push({
      name: i.name,
      dueDate: dayInMonth(year, month, i.paymentDeadline ?? i.dueDate),
      paymentMethodId: i.paymentMethodId,
      amount: resolveAmount(i.amount, pricePointsFor(sources.priceHistories, "insurance", i.id), effectiveDate),
      paid: false,
      paidDate: null,
      sourceType: "insurance",
      sourceId: i.id,
    });
  }

  for (const h of sources.housings) {
    const started = h.startDate.getTime() <= effectiveDate.getTime();
    const terminated =
      h.status === "terminated" && h.terminationDate !== null && h.terminationDate.getTime() < effectiveDate.getTime();
    if (!started || terminated) continue;
    items.push({
      name: HOUSING_LABELS[h.type] ?? h.type,
      dueDate: dayInMonth(year, month, h.startDate),
      paymentMethodId: null,
      amount: resolveAmount(h.price, pricePointsFor(sources.priceHistories, ["loan", "rent"], h.id), effectiveDate),
      paid: false,
      paidDate: null,
      sourceType: "housing",
      sourceId: h.id,
    });
  }

  for (const u of sources.utilities) {
    const amount = resolveAmount(0, pricePointsFor(sources.priceHistories, "utility", u.id), effectiveDate);
    if (amount <= 0) continue; // rezsihez árat az Ártörténet ad
    items.push({
      name: u.name || UTILITY_LABELS[u.type] || u.type,
      dueDate: u.dueDay ? new Date(year, month - 1, u.dueDay) : null,
      paymentMethodId: u.paymentMethodId,
      amount,
      paid: false,
      paidDate: null,
      sourceType: "utility",
      sourceId: u.id,
    });
  }

  for (const t of sources.transports) {
    if (t.date.getFullYear() !== year || t.date.getMonth() + 1 !== month) continue;
    items.push({
      name: `Közlekedés (${t.type})`,
      dueDate: t.date,
      paymentMethodId: null,
      amount: t.amount,
      paid: false,
      paidDate: null,
      sourceType: "transport",
      sourceId: t.id,
    });
  }

  return items;
}
