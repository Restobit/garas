import { describe, expect, it } from "vitest";
import { capitalizeFirst, formatDate, formatMoney, monthLabel, toInputDate } from "./format";

describe("capitalizeFirst (új kategória neve)", () => {
  it("kezdő nagybetűt ad, magyar ékezettel is", () => {
    expect(capitalizeFirst("energiaital")).toBe("Energiaital");
    expect(capitalizeFirst("édesség")).toBe("Édesség");
  });

  it("levágja a szóközöket, üresre üreset ad", () => {
    expect(capitalizeFirst("  chips ")).toBe("Chips");
    expect(capitalizeFirst("   ")).toBe("");
  });

  it("a már nagybetűs nevet nem rontja el", () => {
    expect(capitalizeFirst("Keksz")).toBe("Keksz");
  });
});

describe("formatMoney", () => {
  it("forintot ezres tagolással, tizedesek nélkül formáz", () => {
    const text = formatMoney(1234567);
    expect(text).toContain("Ft");
    // nem törő szóközös ezres tagolás
    expect(text.replace(/ | /g, " ")).toContain("1 234 567");
  });

  it("EUR megjelenítés kézi árfolyammal vált", () => {
    const text = formatMoney(40000, "EUR", { EUR: 400, USD: 360 });
    expect(text).toContain("100");
    expect(text).toContain("€");
  });

  it("USD megjelenítés kézi árfolyammal vált", () => {
    expect(formatMoney(36000, "USD", { EUR: 400, USD: 360 })).toContain("100");
  });
});

describe("formatDate", () => {
  it("yyyy.MM.dd formátum", () => {
    expect(formatDate("2026-06-05")).toBe("2026.06.05");
  });
  it("üres/érvénytelen értékre üres string", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("nem-datum")).toBe("");
  });
});

describe("toInputDate", () => {
  it("yyyy-MM-dd formátum input mezőhöz", () => {
    expect(toInputDate("2026-06-05T10:00:00.000Z")).toBe("2026-06-05");
  });
});

describe("monthLabel", () => {
  it("magyar hónapnevek", () => {
    expect(monthLabel(1)).toBe("Január");
    expect(monthLabel(12)).toBe("December");
  });
});
