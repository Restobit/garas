import { Stack, TextField, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";
import { CrudPage, type FormValues } from "../components/CrudPage";
import { Money } from "../components/Money";
import { useApp } from "../context/AppContext";
import { useList } from "../lib/queries";
import { formatDate, formatMoney, toInputDate } from "../lib/format";
import type { Income, PriceHistoryEntry } from "../lib/types";

// --- Bevétel (Pénzügy) ---
export function IncomePage() {
  const { t } = useTranslation();
  const { settings } = useApp();
  // Fizetés kategóriánál az ár az Ártörténet "Fizetés" bejegyzéseiből választható
  const { data: salaryEntries = [] } = useList<PriceHistoryEntry>("price-history", { entityType: "fizetes" });

  const salaryLabel = (entry: PriceHistoryEntry) =>
    `${formatDate(entry.effectiveDate)} — ${formatMoney(entry.amount, settings?.currency ?? "HUF")}`;

  const salaryAmount = (priceHistoryId: string | null) =>
    salaryEntries.find((e) => e._id === priceHistoryId)?.amount ?? null;

  return (
    <CrudPage<Income>
      titleKey="menu.income"
      entity="incomes"
      usageType="income"
      defaults={{ category: "fizetes" }}
      beforeSubmit={(values: FormValues) => {
        // A másik kategória mezőit ürítjük, hogy ne maradjon vegyes adat
        if (values.category === "fizetes") {
          return { ...values, source: "", amount: null, note: "", date: null };
        }
        return { ...values, companyName: "", startDate: null, priceHistoryId: null };
      }}
      fields={[
        {
          name: "category",
          labelKey: "fields.category",
          type: "select",
          required: true,
          options: [
            { value: "fizetes", label: t("income.fizetes") },
            { value: "egyeb", label: t("income.egyeb") },
          ],
        },
        {
          name: "categoryFields",
          labelKey: "fields.category",
          type: "custom",
          renderCustom: (values, setValue) =>
            values.category === "egyeb" ? (
              <Stack spacing={2}>
                <TextField
                  label={t("income.source")}
                  value={(values.source as string) ?? ""}
                  onChange={(e) => setValue("source", e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t("fields.amount")}
                  value={values.amount ?? ""}
                  onChange={(e) => setValue("amount", e.target.value === "" ? null : Number(e.target.value))}
                  required
                  fullWidth
                />
                <TextField
                  label={t("fields.note")}
                  value={(values.note as string) ?? ""}
                  onChange={(e) => setValue("note", e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  type="date"
                  label={t("fields.date")}
                  value={toInputDate(values.date as string | null)}
                  onChange={(e) => setValue("date", e.target.value || null)}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <TextField
                  label={t("income.companyName")}
                  value={(values.companyName as string) ?? ""}
                  onChange={(e) => setValue("companyName", e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  type="date"
                  label={t("income.startDate")}
                  value={toInputDate(values.startDate as string | null)}
                  onChange={(e) => setValue("startDate", e.target.value || null)}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
                <TextField
                  select
                  label={t("fields.price")}
                  value={(values.priceHistoryId as string) ?? ""}
                  onChange={(e) => setValue("priceHistoryId", e.target.value || null)}
                  helperText={t("income.priceHint")}
                  fullWidth
                >
                  <MenuItem value="">—</MenuItem>
                  {salaryEntries.map((entry) => (
                    <MenuItem key={entry._id} value={entry._id}>
                      {salaryLabel(entry)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            ),
        },
      ]}
      columns={[
        { key: "category", labelKey: "fields.category", render: (r) => t(`income.${r.category}`) },
        {
          key: "name",
          labelKey: "fields.name",
          render: (r) => (r.category === "fizetes" ? r.companyName : r.source),
        },
        {
          key: "amount",
          labelKey: "fields.amount",
          align: "right",
          render: (r) => {
            const amount = r.category === "fizetes" ? salaryAmount(r.priceHistoryId) : r.amount;
            return amount !== null ? <Money amount={amount} color="positive" /> : "—";
          },
        },
        {
          key: "date",
          labelKey: "fields.date",
          render: (r) => formatDate(r.category === "fizetes" ? r.startDate : r.date),
        },
        { key: "note", labelKey: "fields.note" },
      ]}
    />
  );
}
