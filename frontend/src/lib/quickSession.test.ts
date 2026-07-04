import { describe, expect, it } from "vitest";
import {
  addItem,
  clearSession,
  loadSession,
  removeItem,
  saveSession,
  sessionKey,
  toExpensePayload,
  updateItem,
  type QuickItem,
  type QuickSession,
} from "./quickSession";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

const item = (name: string, amount: number): QuickItem => ({
  name,
  date: "2026-06-05",
  quantity: null,
  unitPrice: null,
  amount,
  paymentMethodId: null,
  note: "",
  categoryId: null,
});

describe("quickSession (blokk gyors rögzítés munkamenet)", () => {
  it("üres munkamenettel indul", () => {
    expect(loadSession(memoryStorage(), "r1")).toEqual({ store: "", items: [] });
  });

  it("mentés és visszatöltés localStorage-ból", () => {
    const storage = memoryStorage();
    const session: QuickSession = { store: "Aldi", items: [item("kenyér", 890)] };
    saveSession(storage, "r1", session);
    expect(loadSession(storage, "r1")).toEqual(session);
  });

  it("sérült adatra üres munkamenet", () => {
    const storage = memoryStorage();
    storage.setItem(sessionKey("r1"), "{nem json");
    expect(loadSession(storage, "r1")).toEqual({ store: "", items: [] });
  });

  it("addItem / removeItem immutábilisan kezeli a listát", () => {
    let session: QuickSession = { store: "Lidl", items: [] };
    session = addItem(session, item("tej", 450));
    session = addItem(session, item("vaj", 900));
    expect(session.items).toHaveLength(2);
    session = removeItem(session, 0);
    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.name).toBe("vaj");
  });

  it("updateItem inline módosít (pl. kategória-váltás a listából)", () => {
    let session: QuickSession = { store: "Lidl", items: [item("tej", 450), item("vaj", 900)] };
    session = updateItem(session, 1, { categoryId: "cat-1" });
    expect(session.items[0]?.categoryId).toBeNull();
    expect(session.items[1]?.categoryId).toBe("cat-1");
    expect(session.items[1]?.name).toBe("vaj");
  });

  it("a payload átadja a darabszámot és a fizetési módot", () => {
    const session: QuickSession = {
      store: "Tesco",
      items: [{ ...item("chips", 1598), quantity: 2, unitPrice: 799, paymentMethodId: "pm-1" }],
    };
    const payload = toExpensePayload(session, "receipt-1");
    expect(payload[0]).toMatchObject({ quantity: 2, unitPrice: 799, paymentMethodId: "pm-1" });
  });

  it("mentés után a munkamenet törlődik", () => {
    const storage = memoryStorage();
    saveSession(storage, "r1", { store: "Aldi", items: [item("kenyér", 890)] });
    clearSession(storage, "r1");
    expect(loadSession(storage, "r1")).toEqual({ store: "", items: [] });
  });

  it("a payload minden tételhez a munkamenet boltját és a blokk id-t rendeli", () => {
    const session: QuickSession = { store: "Tesco", items: [item("chips", 799), item("csoki", 599)] };
    const payload = toExpensePayload(session, "receipt-1");
    expect(payload).toHaveLength(2);
    for (const row of payload) {
      expect(row.store).toBe("Tesco");
      expect(row.receiptId).toBe("receipt-1");
      expect(row.year).toBe(2026);
      expect(row.month).toBe(6);
    }
  });
});
