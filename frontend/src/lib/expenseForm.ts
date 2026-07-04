/**
 * Darab × db/ár → Összeg automatikus kitöltés (Havi költség és Blokk gyors
 * rögzítés űrlapjain). Az Összeg a kitöltés után is szabadon felülírható.
 */

/** null, ha valamelyik mező üres/érvénytelen — ilyenkor nem írjuk felül az Összeget. */
export function autoAmount(quantity: unknown, unitPrice: unknown): number | null {
  if (quantity === "" || quantity === null || quantity === undefined) return null;
  if (unitPrice === "" || unitPrice === null || unitPrice === undefined) return null;
  const q = Number(quantity);
  const up = Number(unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(up)) return null;
  return q * up;
}

/** Űrlap-értékek frissítése: ha a Darab vagy a db/ár változott, az Összeg a szorzat. */
export function applyAmountAutoFill<T extends Record<string, unknown>>(values: T, changedField: string): T {
  if (changedField !== "quantity" && changedField !== "unitPrice") return values;
  const amount = autoAmount(values.quantity, values.unitPrice);
  return amount === null ? values : { ...values, amount };
}
