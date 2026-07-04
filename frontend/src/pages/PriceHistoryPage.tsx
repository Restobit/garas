import { useTranslation } from "react-i18next";
import { CrudPage, type FormValues, type Option } from "../components/CrudPage";
import { Money } from "../components/Money";
import { useList } from "../lib/queries";
import { formatDate } from "../lib/format";
import type { Housing, Insurance, PriceHistoryEntry, Subscription, Utility } from "../lib/types";

const ENTITY_TYPES = ["service", "insurance", "transport", "utility", "loan", "rent"];

// --- 14. Ártörténet ---
export function PriceHistoryPage() {
  const { t } = useTranslation();
  const { data: subscriptions = [] } = useList<Subscription>("subscriptions");
  const { data: insurances = [] } = useList<Insurance>("insurances");
  const { data: utilities = [] } = useList<Utility>("utilities");
  const { data: housings = [] } = useList<Housing>("housing");

  const entityOptions = (values: FormValues): Option[] => {
    switch (values.entityType) {
      case "service":
        return subscriptions.map((s) => ({ value: s._id, label: s.name }));
      case "insurance":
        return insurances.map((i) => ({ value: i._id, label: i.name }));
      case "utility":
        return utilities.map((u) => ({ value: u._id, label: u.name || t(`utility.${u.type}`) }));
      case "loan":
        return housings
          .filter((h) => h.type === "loan")
          .map((h) => ({ value: h._id, label: `${t("housing.loan")} (${formatDate(h.startDate)})` }));
      case "rent":
        return housings
          .filter((h) => h.type === "rent")
          .map((h) => ({ value: h._id, label: `${t("housing.rent")} (${formatDate(h.startDate)})` }));
      default:
        return [];
    }
  };

  const entityName = (row: PriceHistoryEntry): string => {
    const list: { _id: string; label: string }[] = [
      ...subscriptions.map((s) => ({ _id: s._id, label: s.name })),
      ...insurances.map((i) => ({ _id: i._id, label: i.name })),
      ...utilities.map((u) => ({ _id: u._id, label: u.name || t(`utility.${u.type}`) })),
      ...housings.map((h) => ({ _id: h._id, label: t(`housing.${h.type}`) })),
    ];
    return list.find((e) => e._id === row.entityId)?.label ?? "—";
  };

  return (
    <CrudPage<PriceHistoryEntry>
      titleKey="menu.priceHistory"
      entity="price-history"
      usageType="priceHistory"
      defaults={{ addedDate: new Date().toISOString() }}
      fields={[
        {
          name: "entityType",
          labelKey: "fields.category",
          type: "select",
          required: true,
          options: ENTITY_TYPES.map((v) => ({ value: v, label: t(`priceHistory.${v}`) })),
        },
        { name: "entityId", labelKey: "priceHistory.entity", type: "select", options: entityOptions },
        { name: "amount", labelKey: "fields.amount", type: "money", required: true },
        { name: "justification", labelKey: "fields.justification", type: "multiline" },
        { name: "effectiveDate", labelKey: "priceHistory.effectiveDate", type: "date", required: true },
      ]}
      columns={[
        { key: "entityType", labelKey: "fields.category", render: (r) => t(`priceHistory.${r.entityType}`) },
        { key: "entityId", labelKey: "priceHistory.entity", render: entityName },
        { key: "amount", labelKey: "fields.amount", align: "right", render: (r) => <Money amount={r.amount} /> },
        { key: "justification", labelKey: "fields.justification" },
        { key: "addedDate", labelKey: "priceHistory.addedDate", render: (r) => formatDate(r.addedDate) },
        { key: "effectiveDate", labelKey: "priceHistory.effectiveDate", render: (r) => formatDate(r.effectiveDate) },
        { key: "modifiedDate", labelKey: "priceHistory.modifiedDate", render: (r) => formatDate(r.modifiedDate) },
      ]}
    />
  );
}
