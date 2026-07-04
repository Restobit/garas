import { useTranslation } from "react-i18next";
import { TextField, MenuItem, Stack } from "@mui/material";
import { CrudPage, type FormValues } from "../components/CrudPage";
import { FileField } from "../components/FileField";
import { Money } from "../components/Money";
import { useList } from "../lib/queries";
import { formatDate } from "../lib/format";
import { usePaymentMethodOptions } from "./SimplePages";
import type { Car, Housing, Insurance } from "../lib/types";

const FREQUENCIES = ["monthly", "quarterly", "semiannual", "annual"];

// --- 9. Biztosítás ---
export function InsurancePage() {
  const { t } = useTranslation();
  const pmOptions = usePaymentMethodOptions();
  const { data: cars = [] } = useList<Car>("cars");
  const { data: housings = [] } = useList<Housing>("housing");

  const linkedOptions = (values: FormValues) => {
    if (values.linkedType === "car") return cars.map((c) => ({ value: c._id, label: c.name }));
    if (values.linkedType === "home")
      return housings.map((h) => ({
        value: h._id,
        label: `${t(`housing.${h.type}`)} (${formatDate(h.startDate)})`,
      }));
    return [];
  };

  return (
    <CrudPage<Insurance>
      titleKey="menu.insurance"
      entity="insurances"
      usageType="insurance"
      defaults={{ frequency: "monthly" }}
      fields={[
        { name: "name", labelKey: "insurance.name", type: "text", required: true },
        {
          name: "frequency",
          labelKey: "insurance.frequency",
          type: "select",
          required: true,
          options: FREQUENCIES.map((f) => ({ value: f, label: t(`frequency.${f}`) })),
        },
        { name: "amount", labelKey: "fields.amount", type: "money", required: true },
        { name: "paymentMethodId", labelKey: "fields.paymentMethod", type: "select", options: pmOptions },
        { name: "dueDate", labelKey: "insurance.dueDate", type: "date" },
        { name: "paymentDeadline", labelKey: "insurance.paymentDeadline", type: "date" },
        {
          name: "linked",
          labelKey: "insurance.linked",
          type: "custom",
          renderCustom: (values, setValue) => (
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                label={t("insurance.linkedType")}
                value={(values.linkedType as string) ?? ""}
                onChange={(e) => {
                  setValue("linkedType", e.target.value || null);
                  setValue("linkedId", null);
                  setValue("linkedName", "");
                }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="car">{t("insurance.linkedCar")}</MenuItem>
                <MenuItem value="motor">{t("insurance.linkedMotor")}</MenuItem>
                <MenuItem value="home">{t("insurance.linkedHome")}</MenuItem>
                <MenuItem value="person">{t("insurance.linkedPerson")}</MenuItem>
              </TextField>
              {values.linkedType === "person" || values.linkedType === "motor" ? (
                // Motorhoz még nincs kapcsolható nyilvántartás (placeholder oldal) — név megadásával kapcsolódik
                <TextField
                  fullWidth
                  label={t(values.linkedType === "person" ? "insurance.linkedPersonName" : "insurance.linkedMotorName")}
                  value={(values.linkedName as string) ?? ""}
                  onChange={(e) => setValue("linkedName", e.target.value)}
                />
              ) : values.linkedType ? (
                <TextField
                  select
                  fullWidth
                  label={t("insurance.linkedEntity")}
                  value={(values.linkedId as string) ?? ""}
                  onChange={(e) => setValue("linkedId", e.target.value || null)}
                >
                  <MenuItem value="">—</MenuItem>
                  {linkedOptions(values).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
            </Stack>
          ),
        },
        {
          name: "documentId",
          labelKey: "insurance.document",
          type: "custom",
          renderCustom: (values, setValue) => (
            <FileField
              label={t("insurance.document")}
              value={values.documentId ? [values.documentId as string] : []}
              onChange={(ids) => setValue("documentId", ids[0] ?? null)}
            />
          ),
        },
        {
          name: "invoiceId",
          labelKey: "insurance.invoice",
          type: "custom",
          renderCustom: (values, setValue) => (
            <FileField
              label={t("insurance.invoice")}
              value={values.invoiceId ? [values.invoiceId as string] : []}
              onChange={(ids) => setValue("invoiceId", ids[0] ?? null)}
            />
          ),
        },
        { name: "note", labelKey: "fields.note", type: "multiline" },
      ]}
      columns={[
        { key: "name", labelKey: "insurance.name" },
        { key: "frequency", labelKey: "insurance.frequency", render: (r) => t(`frequency.${r.frequency}`) },
        { key: "amount", labelKey: "fields.amount", align: "right", render: (r) => <Money amount={r.amount} /> },
        { key: "dueDate", labelKey: "insurance.dueDate", render: (r) => formatDate(r.dueDate) },
        { key: "paymentDeadline", labelKey: "insurance.paymentDeadline", render: (r) => formatDate(r.paymentDeadline) },
        {
          key: "linkedType",
          labelKey: "insurance.linked",
          render: (r) =>
            r.linkedType === "person"
              ? `${t("insurance.linkedPerson")}: ${r.linkedName}`
              : r.linkedType === "motor"
                ? r.linkedName
                  ? `${t("insurance.linkedMotor")}: ${r.linkedName}`
                  : t("insurance.linkedMotor")
                : r.linkedType
                  ? t(`insurance.linked${r.linkedType === "car" ? "Car" : "Home"}`)
                  : "—",
        },
      ]}
    />
  );
}
