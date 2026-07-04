import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const opts = { timestamps: true } as const;

function userField() {
  return { type: String, required: true, index: true } as const;
}

// --- Kategória (Havi költség tételekhez, felhasználónként) ---
const categorySchema = new Schema(
  {
    userId: userField(),
    name: { type: String, required: true },
    isSeed: { type: Boolean, default: false },
  },
  opts,
);

// --- Fizetési mód ---
const paymentMethodSchema = new Schema(
  {
    userId: userField(),
    name: { type: String, required: true },
    isSeed: { type: Boolean, default: false },
  },
  opts,
);

// --- Havi költség tétel ---
const expenseSchema = new Schema(
  {
    userId: userField(),
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    store: { type: String, default: "" },
    unitPrice: { type: Number, default: null },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    attachmentIds: [{ type: Schema.Types.ObjectId, ref: "Attachment" }],
    receiptId: { type: Schema.Types.ObjectId, ref: "Receipt", default: null },
  },
  opts,
);
expenseSchema.index({ userId: 1, year: 1, month: 1 });

// --- Blokk ---
const receiptSchema = new Schema(
  {
    userId: userField(),
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false },
    processedDate: { type: Date, default: null },
  },
  opts,
);

// --- Csatolmány (GridFS-re mutató metaadat) ---
const attachmentSchema = new Schema(
  {
    userId: userField(),
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  opts,
);

// --- Alap költség ---
const baseCostItemSchema = new Schema(
  {
    name: { type: String, required: true },
    dueDate: { type: Date, default: null },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    sourceType: {
      type: String,
      enum: ["subscription", "insurance", "housing", "utility", "transport", "manual"],
      default: "manual",
    },
    sourceId: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: true },
);

const baseCostSchema = new Schema(
  {
    userId: userField(),
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    effectiveDate: { type: Date, required: true },
    items: [baseCostItemSchema],
  },
  opts,
);
baseCostSchema.index({ userId: 1, year: 1, month: 1 });

// --- Havi költség hónap (lap) ---
const sheetSchema = new Schema(
  {
    userId: userField(),
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    baseCostId: { type: Schema.Types.ObjectId, ref: "BaseCost", default: null },
    income: { type: Number, default: 0 },
  },
  opts,
);
sheetSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

// --- Előfizetés ---
const subscriptionSchema = new Schema(
  {
    userId: userField(),
    name: { type: String, required: true },
    price: { type: Number, required: true },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    startDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
  },
  opts,
);

// --- Lakhatás ---
const housingSchema = new Schema(
  {
    userId: userField(),
    type: { type: String, enum: ["loan", "rent"], required: true },
    startDate: { type: Date, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["active", "terminated"], default: "active" },
    terminationDate: { type: Date, default: null },
    justification: { type: String, default: "" },
  },
  opts,
);

// --- Rezsi ---
const utilitySchema = new Schema(
  {
    userId: userField(),
    type: { type: String, enum: ["water", "electricity", "gas", "internet"], required: true },
    name: { type: String, default: "" },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    dueDay: { type: Number, min: 1, max: 28, default: null },
  },
  opts,
);

// --- Biztosítás ---
const insuranceSchema = new Schema(
  {
    userId: userField(),
    name: { type: String, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "quarterly", "semiannual", "annual"],
      default: "monthly",
    },
    amount: { type: Number, required: true },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    dueDate: { type: Date, default: null },
    paymentDeadline: { type: Date, default: null },
    documentId: { type: Schema.Types.ObjectId, ref: "Attachment", default: null },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Attachment", default: null },
    note: { type: String, default: "" },
    linkedType: { type: String, enum: ["car", "home", "person", null], default: null },
    linkedId: { type: Schema.Types.ObjectId, default: null },
    linkedName: { type: String, default: "" },
  },
  opts,
);

// --- Autó ---
const carEntrySchema = new Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { _id: true },
);

const carSchema = new Schema(
  {
    userId: userField(),
    name: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    purchasePrice: { type: Number, required: true },
    serviceRecords: [carEntrySchema],
    purchases: [carEntrySchema],
    km: { type: Number, default: 0 },
  },
  { ...opts, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);
carSchema.virtual("totalSpent").get(function () {
  const sum = (list: { amount: number }[]) => list.reduce((a, e) => a + e.amount, 0);
  return sum(this.serviceRecords) + sum(this.purchases);
});

// --- Közlekedés ---
const transportSchema = new Schema(
  {
    userId: userField(),
    type: {
      type: String,
      enum: ["bkk_pass", "ticket", "train", "bus", "plane", "ferry", "boat", "fuel"],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  opts,
);

// --- Befektetés ---
const investmentSchema = new Schema(
  {
    userId: userField(),
    name: { type: String, required: true },
    value: { type: Number, required: true },
    currency: { type: String, enum: ["HUF", "EUR", "USD"], default: "HUF" },
    exchangeRate: { type: Number, default: 1 },
    amountInHUF: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  opts,
);

// --- Megtakarítás ---
const savingSchema = new Schema(
  {
    userId: userField(),
    destination: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    type: { type: String, default: "" },
    value: { type: Number, default: null },
    duration: { type: String, default: "" },
    maturityDate: { type: Date, default: null },
  },
  opts,
);

// --- Ártörténet ---
const priceHistorySchema = new Schema(
  {
    userId: userField(),
    entityType: {
      type: String,
      enum: ["service", "insurance", "transport", "utility", "loan", "rent"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, default: null },
    amount: { type: Number, required: true },
    justification: { type: String, default: "" },
    addedDate: { type: Date, default: Date.now },
    effectiveDate: { type: Date, required: true },
    modifiedDate: { type: Date, default: null },
  },
  opts,
);
priceHistorySchema.index({ userId: 1, entityType: 1, entityId: 1, effectiveDate: 1 });

// --- Beállítások ---
const settingsSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    language: { type: String, enum: ["hu", "en"], default: "hu" },
    currency: { type: String, enum: ["HUF", "EUR", "USD"], default: "HUF" },
  },
  opts,
);

function model<S extends Schema>(name: string, schema: S): Model<InferSchemaType<S>> {
  return mongoose.model<InferSchemaType<S>>(name, schema);
}

export const Category = model("Category", categorySchema);
export const PaymentMethod = model("PaymentMethod", paymentMethodSchema);
export const Expense = model("Expense", expenseSchema);
export const Receipt = model("Receipt", receiptSchema);
export const Attachment = model("Attachment", attachmentSchema);
export const BaseCost = model("BaseCost", baseCostSchema);
export const Sheet = model("MonthlyExpenseSheet", sheetSchema);
export const Subscription = model("Subscription", subscriptionSchema);
export const Housing = model("Housing", housingSchema);
export const Utility = model("Utility", utilitySchema);
export const Insurance = model("Insurance", insuranceSchema);
export const Car = model("Car", carSchema);
export const Transport = model("Transport", transportSchema);
export const Investment = model("Investment", investmentSchema);
export const Saving = model("Saving", savingSchema);
export const PriceHistory = model("PriceHistory", priceHistorySchema);
export const Settings = model("Settings", settingsSchema);
