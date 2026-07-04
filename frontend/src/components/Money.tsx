import { Box } from "@mui/material";
import { useApp } from "../context/AppContext";
import { formatMoney, type Currency } from "../lib/format";

interface MoneyProps {
  amount: number;
  /** Ha a tétel saját pénznemben van (pl. Befektetés), nincs átváltás. */
  literalCurrency?: Currency;
  color?: "positive" | "negative" | "neutral" | "inherit";
}

/**
 * Pénzösszeg megjelenítése: a Beállítások devizaneme szerint formázva,
 * inkognitó módban elhomályosítva.
 */
export function Money({ amount, literalCurrency, color = "inherit" }: MoneyProps) {
  const { incognito, settings } = useApp();
  const text = literalCurrency
    ? new Intl.NumberFormat("hu-HU", {
        style: "currency",
        currency: literalCurrency,
        maximumFractionDigits: literalCurrency === "HUF" ? 0 : 2,
      }).format(amount)
    : formatMoney(amount, settings?.currency ?? "HUF");

  const colorValue =
    color === "positive"
      ? "success.main"
      : color === "negative"
        ? "error.main"
        : color === "neutral"
          ? "primary.main"
          : "inherit";

  return (
    <Box
      component="span"
      data-testid="money"
      sx={{
        color: colorValue,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...(incognito && {
          filter: "blur(7px)",
          userSelect: "none",
        }),
      }}
    >
      {text}
    </Box>
  );
}
