import { describe, expect, it } from "vitest";
import {
  buildBaseCostItems,
  dayInMonth,
  formatDateHu,
  isDueInMonth,
  resolveAmount,
  usageInterval,
  type FillSources,
} from "./logic.js";

const d = (s: string) => new Date(s);

describe("resolveAmount (ártörténet feloldás)", () => {
  const points = [
    { id: "a", amount: 9000, effectiveDate: d("2023-05-01") },
    { id: "b", amount: 11000, effectiveDate: d("2024-02-01") },
    { id: "c", amount: 12500, effectiveDate: d("2025-01-01") },
  ];

  it("a dátumon érvényes (legutóbbi életbe lépett) árat adja vissza", () => {
    expect(resolveAmount(5000, points, d("2024-06-15"))).toBe(11000);
    expect(resolveAmount(5000, points, d("2025-03-01"))).toBe(12500);
  });

  it("az életbelépés napján már az új ár érvényes", () => {
    expect(resolveAmount(5000, points, d("2024-02-01"))).toBe(11000);
  });

  it("ártörténet nélkül (vagy csak jövőbeli árakkal) az alapár érvényes", () => {
    expect(resolveAmount(5000, [], d("2024-06-15"))).toBe(5000);
    expect(resolveAmount(5000, points, d("2023-01-01"))).toBe(5000);
  });

  it("rendezetlen bemenetre is helyes", () => {
    expect(resolveAmount(5000, [...points].reverse(), d("2024-06-15"))).toBe(11000);
  });
});

describe("usageInterval (törlés előtti usage check intervallum)", () => {
  const points = [
    { id: "a", amount: 9000, effectiveDate: d("2023-05-01") },
    { id: "b", amount: 11000, effectiveDate: d("2024-02-01") },
    { id: "c", amount: 12500, effectiveDate: d("2025-01-01") },
  ];

  it("köztes bejegyzés: a következő ár életbelépéséig tart", () => {
    const interval = usageInterval(points, "b");
    expect(interval).toEqual({ from: d("2024-02-01"), to: d("2025-01-01") });
  });

  it("utolsó bejegyzés: nyitott végű intervallum", () => {
    expect(usageInterval(points, "c")).toEqual({ from: d("2025-01-01"), to: null });
  });

  it("ismeretlen id-ra null", () => {
    expect(usageInterval(points, "x")).toBeNull();
  });
});

describe("formatDateHu", () => {
  it("yyyy.MM.dd formátum", () => {
    expect(formatDateHu(d("2024-02-01"))).toBe("2024.02.01");
    expect(formatDateHu(d("2025-12-31"))).toBe("2025.12.31");
  });
});

describe("isDueInMonth (biztosítás gyakoriság)", () => {
  it("havi gyakoriság minden hónapban esedékes", () => {
    expect(isDueInMonth("monthly", d("2024-01-10"), 2026, 6)).toBe(true);
  });

  it("negyedéves csak minden 3. hónapban", () => {
    expect(isDueInMonth("quarterly", d("2026-01-10"), 2026, 4)).toBe(true);
    expect(isDueInMonth("quarterly", d("2026-01-10"), 2026, 5)).toBe(false);
    expect(isDueInMonth("quarterly", d("2026-01-10"), 2026, 7)).toBe(true);
  });

  it("éves csak az évfordulós hónapban", () => {
    expect(isDueInMonth("annual", d("2024-06-10"), 2026, 6)).toBe(true);
    expect(isDueInMonth("annual", d("2024-06-10"), 2026, 7)).toBe(false);
  });

  it("horgony előtti hónapban nem esedékes", () => {
    expect(isDueInMonth("quarterly", d("2026-06-10"), 2026, 3)).toBe(false);
  });
});

describe("dayInMonth", () => {
  it("a referencia nap átkerül a célhónapba", () => {
    expect(dayInMonth(2026, 6, d("2024-01-10"))).toEqual(new Date(2026, 5, 10));
  });

  it("hónapvégére csonkol (jan 31 → feb 28)", () => {
    expect(dayInMonth(2026, 2, d("2024-01-31"))).toEqual(new Date(2026, 1, 28));
  });
});

describe("buildBaseCostItems (Alap költség automatikus feltöltés)", () => {
  const empty: FillSources = {
    subscriptions: [],
    insurances: [],
    housings: [],
    utilities: [],
    transports: [],
    priceHistories: [],
  };

  it("aktív előfizetés bekerül, lemondott és jövőbeli nem", () => {
    const items = buildBaseCostItems(
      {
        ...empty,
        subscriptions: [
          {
            id: "s1",
            name: "youtube premium",
            price: 2300,
            paymentMethodId: "pm1",
            startDate: d("2023-06-17"),
            status: "active",
          },
          {
            id: "s2",
            name: "netflix",
            price: 4990,
            paymentMethodId: null,
            startDate: d("2023-01-05"),
            status: "cancelled",
          },
          {
            id: "s3",
            name: "spotify",
            price: 1990,
            paymentMethodId: null,
            startDate: d("2027-01-01"),
            status: "active",
          },
        ],
      },
      d("2026-06-01"),
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "youtube premium",
      amount: 2300,
      sourceType: "subscription",
      sourceId: "s1",
    });
    expect(items[0]?.dueDate).toEqual(new Date(2026, 5, 17));
  });

  it("az ártörténet felülírja az előfizetés alapárát", () => {
    const items = buildBaseCostItems(
      {
        ...empty,
        subscriptions: [
          {
            id: "s1",
            name: "Signal",
            price: 9000,
            paymentMethodId: null,
            startDate: d("2023-01-01"),
            status: "active",
          },
        ],
        priceHistories: [
          { id: "p1", entityType: "service", entityId: "s1", amount: 11000, effectiveDate: d("2024-02-01") },
        ],
      },
      d("2026-06-01"),
    );
    expect(items[0]?.amount).toBe(11000);
  });

  it("rezsi tétel csak ártörténet-árral kerül be", () => {
    const items = buildBaseCostItems(
      {
        ...empty,
        utilities: [
          { id: "u1", type: "water", name: "", paymentMethodId: null, dueDay: 15 },
          { id: "u2", type: "gas", name: "", paymentMethodId: null, dueDay: null },
        ],
        priceHistories: [
          { id: "p1", entityType: "utility", entityId: "u1", amount: 6500, effectiveDate: d("2025-01-01") },
        ],
      },
      d("2026-06-01"),
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: "Víz", amount: 6500, sourceType: "utility" });
    expect(items[0]?.dueDate).toEqual(new Date(2026, 5, 15));
  });

  it("megszűnt lakhatás nem kerül be, aktív igen", () => {
    const items = buildBaseCostItems(
      {
        ...empty,
        housings: [
          {
            id: "h1",
            type: "rent",
            price: 180000,
            startDate: d("2024-01-01"),
            status: "active",
            terminationDate: null,
          },
          {
            id: "h2",
            type: "loan",
            price: 120000,
            startDate: d("2020-01-01"),
            status: "terminated",
            terminationDate: d("2023-12-31"),
          },
        ],
      },
      d("2026-06-01"),
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: "Albérlet", amount: 180000 });
  });

  it("negyedéves biztosítás csak az esedékes hónapban kerül be", () => {
    const insurance = {
      id: "i1",
      name: "Signal",
      frequency: "quarterly",
      amount: 11000,
      paymentMethodId: "pm1",
      dueDate: d("2026-03-10"),
      paymentDeadline: d("2026-03-10"),
    };
    expect(buildBaseCostItems({ ...empty, insurances: [insurance] }, d("2026-06-01"))).toHaveLength(1);
    expect(buildBaseCostItems({ ...empty, insurances: [insurance] }, d("2026-07-01"))).toHaveLength(0);
  });

  it("közlekedés tétel csak az adott hónapból kerül be", () => {
    const items = buildBaseCostItems(
      {
        ...empty,
        transports: [
          { id: "t1", type: "bkk_pass", amount: 8950, date: d("2026-06-05") },
          { id: "t2", type: "train", amount: 4200, date: d("2026-05-20") },
        ],
      },
      d("2026-06-01"),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.amount).toBe(8950);
  });
});
