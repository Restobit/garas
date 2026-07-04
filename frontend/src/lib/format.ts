export type Currency = "HUF" | "EUR" | "USD";

export interface DisplayRates {
  EUR: number;
  USD: number;
}

export const DEFAULT_RATES: DisplayRates = { EUR: 400, USD: 360 };

const LOCALE: Record<Currency, string> = { HUF: "hu-HU", EUR: "de-DE", USD: "en-US" };

/**
 * Pénzösszeg formázása ezres tagolással. A tárolt érték mindig HUF;
 * EUR/USD megjelenítésnél a Beállításokban megadott kézi árfolyammal váltunk.
 */
export function formatMoney(
  amountHuf: number,
  currency: Currency = "HUF",
  rates: DisplayRates = DEFAULT_RATES,
): string {
  const value = currency === "HUF" ? amountHuf : amountHuf / rates[currency];
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "HUF" ? 0 : 2,
  }).format(value);
}

/** yyyy.MM.dd formátumú dátum. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd}`;
}

/** Dátum input értékhez (yyyy-MM-dd). */
export function toInputDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayInputDate(): string {
  return toInputDate(new Date());
}

export const MONTH_NAMES_HU = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
] as const;

export function monthLabel(month: number): string {
  return MONTH_NAMES_HU[month - 1] ?? String(month);
}
