import { useTranslation } from "react-i18next";
import { CrudPage, type FormValues, type Option } from "../components/CrudPage";
import { Money } from "../components/Money";
import { useList } from "../lib/queries";
import { formatDate } from "../lib/format";
import type {
  Category,
  Housing,
  Investment,
  PaymentMethod,
  Saving,
  Store,
  Subscription,
  Transport,
  Utility,
  UtilityCategory,
} from "../lib/types";

export function usePaymentMethodOptions(): Option[] {
  const { data = [] } = useList<PaymentMethod>("payment-methods");
  return data.map((pm) => ({ value: pm._id, label: pm.name }));
}

function usePaymentMethodName(): (id: string | null) => string {
  const { data = [] } = useList<PaymentMethod>("payment-methods");
  return (id) => data.find((pm) => pm._id === id)?.name ?? "—";
}

// --- Beállítások > Fizetési mód (drag-and-drop sorrenddel) ---
export function PaymentMethodsPage() {
  return (
    <CrudPage<PaymentMethod>
      titleKey="menu.paymentMethod"
      entity="payment-methods"
      usageType="paymentMethod"
      sortable
      fields={[{ name: "name", labelKey: "fields.name", type: "text", required: true }]}
      columns={[{ key: "name", labelKey: "fields.name" }]}
    />
  );
}

// --- Beállítások > Rezsi kategória ---
export function UtilityCategoriesPage() {
  return (
    <CrudPage<UtilityCategory>
      titleKey="menu.utilityCategory"
      entity="utility-categories"
      usageType="utilityCategory"
      sortable
      fields={[{ name: "name", labelKey: "fields.name", type: "text", required: true }]}
      columns={[{ key: "name", labelKey: "fields.name" }]}
    />
  );
}

// --- Beállítások > Termék kategória (a Havi költség tételek kategóriái, korábban a Beállítások oldalon) ---
export function ProductCategoriesPage() {
  return (
    <CrudPage<Category>
      titleKey="menu.productCategory"
      entity="categories"
      usageType="category"
      fields={[{ name: "name", labelKey: "fields.name", type: "text", required: true }]}
      columns={[{ key: "name", labelKey: "fields.name" }]}
    />
  );
}

// --- Beállítások > Bolt (mentéskor is megerősítést kér) ---
export function StoresPage() {
  return (
    <CrudPage<Store>
      titleKey="menu.store"
      entity="stores"
      usageType="store"
      sortable
      confirmEditSave
      fields={[{ name: "name", labelKey: "fields.name", type: "text", required: true }]}
      columns={[{ key: "name", labelKey: "fields.name" }]}
    />
  );
}

// --- 6. Előfizetés ---
export function SubscriptionsPage() {
  const { t } = useTranslation();
  const pmOptions = usePaymentMethodOptions();
  const pmName = usePaymentMethodName();
  return (
    <CrudPage<Subscription>
      titleKey="menu.subscription"
      entity="subscriptions"
      usageType="subscription"
      defaults={{ status: "active" }}
      fields={[
        { name: "name", labelKey: "fields.name", type: "text", required: true },
        { name: "price", labelKey: "fields.price", type: "money", required: true },
        { name: "paymentMethodId", labelKey: "fields.paymentMethod", type: "select", options: pmOptions },
        { name: "startDate", labelKey: "subscription.startDate", type: "date", required: true },
        {
          name: "status",
          labelKey: "fields.status",
          type: "select",
          required: true,
          options: [
            { value: "active", label: t("status.active") },
            { value: "cancelled", label: t("status.cancelled") },
          ],
        },
      ]}
      columns={[
        { key: "name", labelKey: "fields.name" },
        { key: "price", labelKey: "fields.price", align: "right", render: (r) => <Money amount={r.price} /> },
        { key: "paymentMethodId", labelKey: "fields.paymentMethod", render: (r) => pmName(r.paymentMethodId) },
        { key: "startDate", labelKey: "subscription.startDate", render: (r) => formatDate(r.startDate) },
        { key: "status", labelKey: "fields.status", render: (r) => t(`status.${r.status}`) },
      ]}
    />
  );
}

// --- Lakhatás > Egyéb (a korábbi Lakhatás oldal tartalma: hitel / albérlet) ---
export function HousingPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Housing>
      titleKey="menu.housingOther"
      entity="housing"
      usageType="housing"
      defaults={{ status: "active" }}
      fields={[
        {
          name: "type",
          labelKey: "fields.type",
          type: "select",
          required: true,
          options: [
            { value: "loan", label: t("housing.loan") },
            { value: "rent", label: t("housing.rent") },
          ],
        },
        { name: "startDate", labelKey: "housing.startDate", type: "date", required: true },
        { name: "price", labelKey: "fields.price", type: "money", required: true },
        {
          name: "status",
          labelKey: "fields.status",
          type: "select",
          required: true,
          options: [
            { value: "active", label: t("status.active") },
            { value: "terminated", label: t("status.terminated") },
          ],
        },
        { name: "terminationDate", labelKey: "housing.terminationDate", type: "date" },
        { name: "justification", labelKey: "fields.justification", type: "multiline" },
      ]}
      columns={[
        { key: "type", labelKey: "fields.type", render: (r) => t(`housing.${r.type}`) },
        { key: "startDate", labelKey: "housing.startDate", render: (r) => formatDate(r.startDate) },
        { key: "price", labelKey: "fields.price", align: "right", render: (r) => <Money amount={r.price} /> },
        { key: "status", labelKey: "fields.status", render: (r) => t(`status.${r.status}`) },
        { key: "terminationDate", labelKey: "housing.terminationDate", render: (r) => formatDate(r.terminationDate) },
      ]}
    />
  );
}

// --- 8. Rezsi (kategória a Beállítások > Rezsi kategória dinamikus listájából) ---
export function UtilitiesPage() {
  const { t } = useTranslation();
  const pmOptions = usePaymentMethodOptions();
  const pmName = usePaymentMethodName();
  const { data: utilityCategories = [] } = useList<UtilityCategory>("utility-categories");
  const categoryOptions = utilityCategories.map((c) => ({ value: c._id, label: c.name }));
  const categoryName = (r: Utility) =>
    utilityCategories.find((c) => c._id === r.categoryId)?.name ?? (r.type ? t(`utility.${r.type}`) : "—");
  return (
    <CrudPage<Utility>
      titleKey="menu.utility"
      entity="utilities"
      usageType="utility"
      fields={[
        { name: "categoryId", labelKey: "fields.category", type: "select", required: true, options: categoryOptions },
        { name: "name", labelKey: "utility.providerName", type: "text" },
        { name: "paymentMethodId", labelKey: "fields.paymentMethod", type: "select", options: pmOptions },
        { name: "dueDay", labelKey: "utility.dueDay", type: "number" },
      ]}
      columns={[
        { key: "categoryId", labelKey: "fields.category", render: categoryName },
        { key: "name", labelKey: "utility.providerName" },
        { key: "paymentMethodId", labelKey: "fields.paymentMethod", render: (r) => pmName(r.paymentMethodId) },
        { key: "dueDay", labelKey: "utility.dueDay", render: (r) => (r.dueDay ? `${r.dueDay}.` : "—") },
      ]}
    />
  );
}

// --- Utazás (korábban Közlekedés — azonos funkcionalitás, új név) ---
const TRANSPORT_TYPES = ["bkk_pass", "ticket", "train", "bus", "plane", "ferry", "boat", "fuel"];

export function TransportPage() {
  const { t } = useTranslation();
  const typeOptions = TRANSPORT_TYPES.map((v) => ({ value: v, label: t(`transport.${v}`) }));
  return (
    <CrudPage<Transport>
      titleKey="menu.travel"
      entity="transports"
      usageType="transport"
      fields={[
        { name: "type", labelKey: "fields.type", type: "select", required: true, options: typeOptions },
        { name: "amount", labelKey: "fields.amount", type: "money", required: true },
        { name: "date", labelKey: "fields.date", type: "date", required: true },
        { name: "note", labelKey: "fields.note", type: "multiline" },
      ]}
      columns={[
        { key: "type", labelKey: "fields.type", render: (r) => t(`transport.${r.type}`) },
        {
          key: "amount",
          labelKey: "fields.amount",
          align: "right",
          render: (r) => <Money amount={r.amount} color="negative" />,
        },
        { key: "date", labelKey: "fields.date", render: (r) => formatDate(r.date) },
        { key: "note", labelKey: "fields.note" },
      ]}
    />
  );
}

// --- 12. Befektetés ---
export function InvestmentsPage() {
  const { t } = useTranslation();
  return (
    <CrudPage<Investment>
      titleKey="menu.investment"
      entity="investments"
      usageType="investment"
      defaults={{ currency: "HUF", exchangeRate: 1 }}
      beforeSubmit={(values: FormValues) => {
        // Kézi árfolyam: nincs külső API — a HUF összeg érték × árfolyam
        const currency = values.currency as string;
        const value = Number(values.value ?? 0);
        const rate = currency === "HUF" ? 1 : Number(values.exchangeRate ?? 0);
        return { ...values, exchangeRate: rate, amountInHUF: Math.round(value * rate) };
      }}
      fields={[
        { name: "name", labelKey: "investment.name", type: "text", required: true },
        { name: "value", labelKey: "investment.value", type: "number", required: true },
        {
          name: "currency",
          labelKey: "fields.currency",
          type: "select",
          required: true,
          options: [
            { value: "HUF", label: "Forint (Ft)" },
            { value: "EUR", label: "Euró (€)" },
            { value: "USD", label: "Dollár ($)" },
          ],
        },
        { name: "exchangeRate", labelKey: "investment.exchangeRate", type: "number" },
        { name: "date", labelKey: "fields.date", type: "date", required: true },
      ]}
      columns={[
        { key: "name", labelKey: "investment.name" },
        {
          key: "value",
          labelKey: "investment.value",
          align: "right",
          render: (r) => <Money amount={r.value} literalCurrency={r.currency} />,
        },
        { key: "currency", labelKey: "fields.currency" },
        {
          key: "amountInHUF",
          labelKey: "investment.amountInHUF",
          align: "right",
          render: (r) => <Money amount={r.amountInHUF} color="neutral" />,
        },
        { key: "date", labelKey: "fields.date", render: (r) => formatDate(r.date) },
      ]}
    />
  );
}

// --- 13. Megtakarítás ---
export function SavingsPage() {
  return (
    <CrudPage<Saving>
      titleKey="menu.saving"
      entity="savings"
      usageType="saving"
      fields={[
        { name: "destination", labelKey: "saving.destination", type: "text", required: true },
        { name: "amount", labelKey: "fields.amount", type: "money", required: true },
        { name: "date", labelKey: "fields.date", type: "date", required: true },
        { name: "type", labelKey: "fields.type", type: "text" },
        { name: "value", labelKey: "saving.value", type: "money" },
        { name: "duration", labelKey: "saving.duration", type: "text" },
        { name: "maturityDate", labelKey: "saving.maturityDate", type: "date" },
      ]}
      columns={[
        { key: "destination", labelKey: "saving.destination" },
        {
          key: "amount",
          labelKey: "fields.amount",
          align: "right",
          render: (r) => <Money amount={r.amount} color="positive" />,
        },
        { key: "date", labelKey: "fields.date", render: (r) => formatDate(r.date) },
        { key: "type", labelKey: "fields.type" },
        { key: "maturityDate", labelKey: "saving.maturityDate", render: (r) => formatDate(r.maturityDate) },
      ]}
    />
  );
}
