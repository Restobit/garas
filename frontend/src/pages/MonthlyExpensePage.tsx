import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";
import { useCreate, useList, useUpdate } from "../lib/queries";
import { useDeleteWithCheck } from "../components/useDeleteWithCheck";
import { useSnackbar } from "../components/SnackbarProvider";
import { FormFields, normalizeForSubmit, type FieldDef, type FormValues } from "../components/CrudPage";
import { FileField } from "../components/FileField";
import { Money } from "../components/Money";
import { StoreField } from "../components/StoreField";
import { CategorySelect } from "../components/CategorySelect";
import { BaseCostTable } from "./BaseCostPage";
import { formatDate, monthLabel, todayInputDate } from "../lib/format";
import { applyAmountAutoFill } from "../lib/expenseForm";
import type { BaseCost, Category, Expense, PaymentMethod, Sheet } from "../lib/types";

/** Alap költség tételeinek összege (a kapcsolt lenyíló címkéjéhez és az Összesen sorhoz). */
function baseCostSum(baseCost: BaseCost): number {
  return baseCost.items.reduce((a, i) => a + i.amount, 0);
}

// --- 2. Havi költség ---
export function MonthlyExpensePage() {
  const { t } = useTranslation();
  const { showError, showSuccess } = useSnackbar();

  const { data: sheets = [] } = useList<Sheet>("sheets");
  const { data: baseCosts = [] } = useList<BaseCost>("base-costs");
  const { data: categories = [] } = useList<Category>("categories");
  const { data: paymentMethods = [] } = useList<PaymentMethod>("payment-methods");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sheets.find((s) => s._id === selectedId) ?? sheets[0];

  const { data: expenses = [] } = useList<Expense>(
    "expenses",
    { year: selected?.year ?? 0, month: selected?.month ?? 0 },
    { enabled: Boolean(selected) },
  );

  const createSheet = useCreate<Sheet>("sheets");
  const updateSheet = useUpdate<Sheet>("sheets");
  const createExpense = useCreate<Expense>("expenses");
  const updateExpense = useUpdate<Expense>("expenses");
  const { requestDelete, dialog: deleteDialog } = useDeleteWithCheck("expenses", "expense");
  const { requestDelete: requestSheetDelete, dialog: sheetDeleteDialog } = useDeleteWithCheck("sheets", "sheet");

  const linkedBaseCost = baseCosts.find((b) => b._id === selected?.baseCostId) ?? null;

  // Új hónap létrehozása
  const now = new Date();
  const [newSheet, setNewSheet] = useState<{ year: string; month: string; baseCostId: string } | null>(null);

  // Tétel űrlap
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseValues, setExpenseValues] = useState<FormValues | null>(null);

  const expenseFields: FieldDef[] = useMemo(
    () => [
      { name: "name", labelKey: "expense.name", type: "text", required: true },
      { name: "date", labelKey: "fields.date", type: "date", required: true },
      {
        name: "store",
        labelKey: "expense.store",
        type: "custom",
        renderCustom: (values, setValue) => (
          <StoreField value={(values.store as string) ?? ""} onChange={(v) => setValue("store", v)} />
        ),
      },
      { name: "quantity", labelKey: "fields.quantity", type: "number" },
      { name: "unitPrice", labelKey: "fields.unitPrice", type: "number" },
      { name: "amount", labelKey: "fields.amount", type: "money", required: true },
      {
        name: "paymentMethodId",
        labelKey: "fields.paymentMethod",
        type: "select",
        options: paymentMethods.map((pm) => ({ value: pm._id, label: pm.name })),
      },
      { name: "note", labelKey: "fields.note", type: "multiline" },
      {
        name: "categoryId",
        labelKey: "fields.category",
        type: "custom",
        renderCustom: (values, setValue) => (
          <CategorySelect
            value={(values.categoryId as string) ?? null}
            onChange={(id) => setValue("categoryId", id)}
            fullWidth
          />
        ),
      },
      {
        name: "attachmentIds",
        labelKey: "expense.attachments",
        type: "custom",
        renderCustom: (values, setValue) => (
          <FileField
            label={t("expense.attachments")}
            value={(values.attachmentIds as string[]) ?? []}
            onChange={(ids) => setValue("attachmentIds", ids)}
            multiple
          />
        ),
      },
    ],
    [paymentMethods, t],
  );

  const submitExpense = () => {
    if (!expenseValues || !selected) return;
    const data = normalizeForSubmit(expenseValues, expenseFields);
    data.year = selected.year;
    data.month = selected.month;
    const onSuccess = () => {
      showSuccess(t("common.saved"));
      setExpenseValues(null);
    };
    if (editingExpense) {
      updateExpense.mutate(
        { ...(data as Partial<Expense>), _id: editingExpense._id },
        { onSuccess, onError: showError },
      );
    } else {
      createExpense.mutate(data as Partial<Expense>, { onSuccess, onError: showError });
    }
  };

  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const categoryName = (id: string | null) => categories.find((c) => c._id === id)?.name ?? "—";
  const paymentMethodName = (id: string | null) => paymentMethods.find((pm) => pm._id === id)?.name ?? "—";

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{t("menu.monthly")}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() =>
            setNewSheet({ year: String(now.getFullYear()), month: String(now.getMonth() + 1), baseCostId: "" })
          }
        >
          {t("monthly.createSheet")}
        </Button>
      </Stack>

      {/* Szabad váltás a létrehozott hónapok között (múltbeli és jövőbeli is) */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label={t("monthly.selectSheet")}
          value={selected?._id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {sheets.map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.year}. {monthLabel(s.month)}
            </MenuItem>
          ))}
        </TextField>
        {selected && (
          <>
            <TextField
              size="small"
              type="number"
              label={t("monthly.income")}
              defaultValue={selected.income}
              key={selected._id}
              onBlur={(e) =>
                updateSheet.mutate({ _id: selected._id, income: Number(e.target.value || 0) }, { onError: showError })
              }
              sx={{ width: 180 }}
            />
            <Typography variant="body2" color="text.secondary">
              {t("common.delete")}:{" "}
              <IconButton size="small" color="error" onClick={() => requestSheetDelete(selected._id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Typography>
          </>
        )}
      </Stack>

      {selected ? (
        <Stack spacing={2}>
          {/* Kapcsolt Alap költség: csak olvasható táblázat */}
          <Accordion defaultExpanded={false} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t("monthly.linkedBaseCost")}
                {linkedBaseCost ? ` — ${linkedBaseCost.year}. ${monthLabel(linkedBaseCost.month)}` : ""}
                {" | "}
                {t("common.total")}: <Money amount={total} color="neutral" />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {linkedBaseCost ? (
                <BaseCostTable baseCost={linkedBaseCost} readOnly />
              ) : (
                <Typography color="text.secondary">{t("monthly.noBaseCost")}</Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Tényleges havi költségtételek */}
          <Paper>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 0 }}>
              <Typography variant="subtitle1">{t("monthly.items")}</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseValues({ date: todayInputDate(), attachmentIds: [] });
                }}
              >
                {t("common.add")}
              </Button>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("expense.name")}</TableCell>
                    <TableCell>{t("fields.date")}</TableCell>
                    <TableCell>{t("expense.store")}</TableCell>
                    <TableCell align="right">{t("fields.quantity")}</TableCell>
                    <TableCell align="right">{t("fields.unitPrice")}</TableCell>
                    <TableCell align="right">{t("fields.amount")}</TableCell>
                    <TableCell>{t("fields.paymentMethod")}</TableCell>
                    <TableCell>{t("fields.category")}</TableCell>
                    <TableCell>{t("fields.note")}</TableCell>
                    <TableCell align="right">{t("common.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense._id} hover>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>{expense.store}</TableCell>
                      <TableCell align="right">{expense.quantity ?? "—"}</TableCell>
                      <TableCell align="right">
                        {expense.unitPrice !== null ? <Money amount={expense.unitPrice} /> : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Money amount={expense.amount} color="neutral" />
                      </TableCell>
                      <TableCell>{paymentMethodName(expense.paymentMethodId)}</TableCell>
                      <TableCell>{categoryName(expense.categoryId)}</TableCell>
                      <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {expense.note}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingExpense(expense);
                            setExpenseValues({ ...expense });
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => requestDelete(expense._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        {t("common.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                  {expenses.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="right" sx={{ fontWeight: 600 }}>
                        {t("common.total")}:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        <Money amount={total} color="negative" />
                      </TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      ) : (
        <Typography color="text.secondary">{t("monthly.noneYet")}</Typography>
      )}

      {/* Új hónap létrehozása */}
      <Dialog open={newSheet !== null} onClose={() => setNewSheet(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("monthly.createSheet")}</DialogTitle>
        <DialogContent>
          {newSheet && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                type="number"
                label={t("common.year")}
                value={newSheet.year}
                onChange={(e) => setNewSheet({ ...newSheet, year: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label={t("common.month")}
                value={newSheet.month}
                onChange={(e) => setNewSheet({ ...newSheet, month: e.target.value })}
                fullWidth
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={String(i + 1)}>
                    {monthLabel(i + 1)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={t("monthly.linkedBaseCost")}
                value={newSheet.baseCostId}
                onChange={(e) => setNewSheet({ ...newSheet, baseCostId: e.target.value })}
                fullWidth
              >
                <MenuItem value="">—</MenuItem>
                {baseCosts.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.year}. {monthLabel(b.month)} — <Money amount={baseCostSum(b)} />
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSheet(null)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!newSheet) return;
              createSheet.mutate(
                {
                  year: Number(newSheet.year),
                  month: Number(newSheet.month),
                  baseCostId: newSheet.baseCostId || null,
                } as Partial<Sheet>,
                {
                  onSuccess: (doc) => {
                    showSuccess(t("common.saved"));
                    setNewSheet(null);
                    setSelectedId(doc._id);
                  },
                  onError: showError,
                },
              );
            }}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tétel hozzáadás/szerkesztés */}
      <Dialog open={expenseValues !== null} onClose={() => setExpenseValues(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingExpense ? t("common.edit") : t("common.add")}</DialogTitle>
        <DialogContent>
          {expenseValues && (
            <FormFields
              fields={expenseFields}
              values={expenseValues}
              setValue={(name, value) =>
                setExpenseValues((prev) => applyAmountAutoFill({ ...prev, [name]: value }, name))
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpenseValues(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={submitExpense}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {deleteDialog}
      {sheetDeleteDialog}
    </Box>
  );
}
