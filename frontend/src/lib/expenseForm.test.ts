import { describe, expect, it } from "vitest";
import { applyAmountAutoFill, autoAmount } from "./expenseForm";

describe("autoAmount (Darab × db/ár)", () => {
  it("kitöltött mezőknél a szorzatot adja", () => {
    expect(autoAmount(2, 799)).toBe(1598);
    expect(autoAmount("3", "450")).toBe(1350);
  });

  it("üres vagy érvénytelen mezőnél null", () => {
    expect(autoAmount("", 799)).toBeNull();
    expect(autoAmount(2, null)).toBeNull();
    expect(autoAmount(undefined, 100)).toBeNull();
    expect(autoAmount("abc", 100)).toBeNull();
  });
});

describe("applyAmountAutoFill (űrlap Összeg automatikus kitöltése)", () => {
  it("Darab vagy db/ár változásakor kitölti az Összeget", () => {
    expect(applyAmountAutoFill({ quantity: 2, unitPrice: 799, amount: 0 }, "quantity").amount).toBe(1598);
    expect(applyAmountAutoFill({ quantity: 2, unitPrice: 799, amount: 0 }, "unitPrice").amount).toBe(1598);
  });

  it("az Összeg kézi szerkesztését nem írja felül", () => {
    expect(applyAmountAutoFill({ quantity: 2, unitPrice: 799, amount: 1500 }, "amount").amount).toBe(1500);
  });

  it("hiányos mezőknél nem nyúl az Összeghez", () => {
    expect(applyAmountAutoFill({ quantity: "", unitPrice: 799, amount: 500 }, "quantity").amount).toBe(500);
  });
});
