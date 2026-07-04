export interface BaseDoc {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category extends BaseDoc {
  name: string;
  isSeed: boolean;
}

export interface PaymentMethod extends BaseDoc {
  name: string;
  isSeed: boolean;
}

export interface Expense extends BaseDoc {
  year: number;
  month: number;
  name: string;
  date: string;
  store: string;
  unitPrice: number | null;
  amount: number;
  note: string;
  categoryId: string | null;
  attachmentIds: string[];
  receiptId: string | null;
}

export interface Receipt extends BaseDoc {
  fileId: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  processed: boolean;
  processedDate: string | null;
}

export interface Attachment extends BaseDoc {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface BaseCostItem {
  _id?: string;
  name: string;
  dueDate: string | null;
  paymentMethodId: string | null;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  sourceType: "subscription" | "insurance" | "housing" | "utility" | "transport" | "manual";
  sourceId: string | null;
}

export interface BaseCost extends BaseDoc {
  year: number;
  month: number;
  effectiveDate: string;
  items: BaseCostItem[];
}

export interface Sheet extends BaseDoc {
  year: number;
  month: number;
  baseCostId: string | null;
  income: number;
}

export interface Subscription extends BaseDoc {
  name: string;
  price: number;
  paymentMethodId: string | null;
  startDate: string;
  status: "active" | "cancelled";
}

export interface Housing extends BaseDoc {
  type: "loan" | "rent";
  startDate: string;
  price: number;
  status: "active" | "terminated";
  terminationDate: string | null;
  justification: string;
}

export interface Utility extends BaseDoc {
  type: "water" | "electricity" | "gas" | "internet";
  name: string;
  paymentMethodId: string | null;
  dueDay: number | null;
}

export interface Insurance extends BaseDoc {
  name: string;
  frequency: "monthly" | "quarterly" | "semiannual" | "annual";
  amount: number;
  paymentMethodId: string | null;
  dueDate: string | null;
  paymentDeadline: string | null;
  documentId: string | null;
  invoiceId: string | null;
  note: string;
  linkedType: "car" | "home" | "person" | null;
  linkedId: string | null;
  linkedName: string;
}

export interface CarEntry {
  _id?: string;
  date: string;
  amount: number;
  note: string;
}

export interface Car extends BaseDoc {
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  serviceRecords: CarEntry[];
  purchases: CarEntry[];
  km: number;
  totalSpent: number;
}

export interface Transport extends BaseDoc {
  type: "bkk_pass" | "ticket" | "train" | "bus" | "plane" | "ferry" | "boat" | "fuel";
  amount: number;
  date: string;
  note: string;
}

export interface Investment extends BaseDoc {
  name: string;
  value: number;
  currency: "HUF" | "EUR" | "USD";
  exchangeRate: number;
  amountInHUF: number;
  date: string;
}

export interface Saving extends BaseDoc {
  destination: string;
  amount: number;
  date: string;
  type: string;
  value: number | null;
  duration: string;
  maturityDate: string | null;
}

export interface PriceHistoryEntry extends BaseDoc {
  entityType: "service" | "insurance" | "transport" | "utility" | "loan" | "rent";
  entityId: string | null;
  amount: number;
  justification: string;
  addedDate: string;
  effectiveDate: string;
  modifiedDate: string | null;
}

export interface Settings extends BaseDoc {
  language: "hu" | "en";
  currency: "HUF" | "EUR" | "USD";
}

export interface DashboardData {
  year: number;
  availableYears: number[];
  months: { month: number; income: number; expense: number }[];
  topCategories: { name: string; amount: number }[];
  topStores: { name: string; amount: number }[];
  investmentTotal: number;
  savingTotal: number;
  yearlySummary: {
    utility: number;
    transport: number;
    subscription: number;
    housing: number;
    insurance: number;
  };
}
