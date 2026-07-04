/**
 * Blokk gyors rögzítés munkamenet: a tételek a "Mentés"-ig csak a böngésző
 * localStorage-ában élnek, a szerverre a Mentés gomb küldi be őket egyben.
 */

export interface QuickItem {
  name: string;
  date: string; // yyyy-MM-dd
  quantity: number | null;
  unitPrice: number | null; // db/ár
  amount: number;
  paymentMethodId: string | null;
  note: string;
  categoryId: string | null;
}

export interface QuickSession {
  store: string;
  items: QuickItem[];
}

const KEY_PREFIX = "garas.quickentry.";

export function sessionKey(receiptId: string): string {
  return `${KEY_PREFIX}${receiptId}`;
}

export function loadSession(storage: Pick<Storage, "getItem">, receiptId: string): QuickSession {
  try {
    const raw = storage.getItem(sessionKey(receiptId));
    if (raw) {
      const parsed = JSON.parse(raw) as QuickSession;
      if (typeof parsed.store === "string" && Array.isArray(parsed.items)) return parsed;
    }
  } catch {
    // sérült adat: üres munkamenet
  }
  return { store: "", items: [] };
}

export function saveSession(storage: Pick<Storage, "setItem">, receiptId: string, session: QuickSession): void {
  storage.setItem(sessionKey(receiptId), JSON.stringify(session));
}

export function clearSession(storage: Pick<Storage, "removeItem">, receiptId: string): void {
  storage.removeItem(sessionKey(receiptId));
}

export function addItem(session: QuickSession, item: QuickItem): QuickSession {
  return { ...session, items: [...session.items, item] };
}

export function removeItem(session: QuickSession, index: number): QuickSession {
  return { ...session, items: session.items.filter((_, i) => i !== index) };
}

/** Már felvett tétel módosítása a listában (pl. inline kategória-váltás). */
export function updateItem(session: QuickSession, index: number, patch: Partial<QuickItem>): QuickSession {
  return {
    ...session,
    items: session.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
  };
}

/** A mentéskor a szervernek küldött tételek: a bolt a munkamenetből öröklődik. */
export function toExpensePayload(session: QuickSession, receiptId: string): Record<string, unknown>[] {
  return session.items.map((item) => {
    const date = new Date(item.date);
    return {
      name: item.name,
      date: item.date,
      store: session.store,
      quantity: item.quantity ?? null,
      unitPrice: item.unitPrice,
      amount: item.amount,
      paymentMethodId: item.paymentMethodId ?? null,
      note: item.note,
      categoryId: item.categoryId,
      receiptId,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  });
}
