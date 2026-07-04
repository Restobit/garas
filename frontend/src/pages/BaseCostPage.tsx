import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useList, useUpdate } from "../lib/queries";
import { useDeleteWithCheck } from "../components/useDeleteWithCheck";
import { useSnackbar } from "../components/SnackbarProvider";
import { Money } from "../components/Money";
import { formatDate, monthLabel, toInputDate, todayInputDate } from "../lib/format";
import type { BaseCost, BaseCostItem, PaymentMethod } from "../lib/types";

/** Az Alap költség táblázat (önállóan és a Havi költség beágyazott nézetében is használt). */
export function BaseCostTable({
  baseCost,
  readOnly = false,
  onItemsChange,
}: {
  baseCost: BaseCost;
  readOnly?: boolean;
  onItemsChange?: (items: BaseCostItem[]) => void;
}) {
  const { t } = useTranslation();
  const { data: paymentMethods = [] } = useList<PaymentMethod>("payment-methods");
  const pmName = (id: string | null) => paymentMethods.find((pm) => pm._id === id)?.name ?? "—";

  const setItem = (idx: number, patch: Partial<BaseCostItem>) => {
    if (!onItemsChange) return;
    onItemsChange(baseCost.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">{t("baseCost.paid")}</TableCell>
            <TableCell>{t("fields.name")}</TableCell>
            <TableCell>{t("baseCost.dueDate")}</TableCell>
            <TableCell>{t("fields.paymentMethod")}</TableCell>
            <TableCell align="right">{t("fields.price")}</TableCell>
            <TableCell>{t("baseCost.paidDate")}</TableCell>
            {!readOnly && <TableCell align="right">{t("common.actions")}</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {baseCost.items.map((item, idx) => (
            <TableRow key={item._id ?? idx} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={item.paid}
                  disabled={readOnly}
                  onChange={(e) =>
                    // Befizetve pipáláskor a Fizetés dátuma a mai nap (utólag módosítható)
                    setItem(idx, {
                      paid: e.target.checked,
                      paidDate: e.target.checked ? (item.paidDate ?? todayInputDate()) : null,
                    })
                  }
                  inputProps={{ "aria-label": t("baseCost.paid") }}
                />
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{formatDate(item.dueDate)}</TableCell>
              <TableCell>{pmName(item.paymentMethodId)}</TableCell>
              <TableCell align="right">
                <Money amount={item.amount} />
              </TableCell>
              <TableCell>
                {readOnly ? (
                  formatDate(item.paidDate)
                ) : item.paid ? (
                  <TextField
                    type="date"
                    size="small"
                    variant="standard"
                    value={toInputDate(item.paidDate)}
                    onChange={(e) => setItem(idx, { paidDate: e.target.value })}
                  />
                ) : (
                  ""
                )}
              </TableCell>
              {!readOnly && (
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onItemsChange?.(baseCost.items.filter((_, i) => i !== idx))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {baseCost.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={readOnly ? 6 : 7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                {t("common.empty")}
              </TableCell>
            </TableRow>
          )}
          {baseCost.items.length > 0 && (
            <TableRow>
              <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
                {t("common.total")}:
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                <Money amount={baseCost.items.reduce((a, i) => a + i.amount, 0)} />
              </TableCell>
              <TableCell colSpan={readOnly ? 1 : 2} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// --- 4. Alap költség ---
export function BaseCostPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { showError, showSuccess } = useSnackbar();
  const { data: baseCosts = [] } = useList<BaseCost>("base-costs");
  const { data: paymentMethods = [] } = useList<PaymentMethod>("payment-methods");
  const update = useUpdate<BaseCost>("base-costs");
  const { requestDelete, dialog } = useDeleteWithCheck("base-costs", "baseCost");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [manualItem, setManualItem] = useState<{
    name: string;
    amount: string;
    dueDate: string;
    paymentMethodId: string;
  } | null>(null);

  const selected = baseCosts.find((b) => b._id === selectedId) ?? baseCosts[0];

  const create = useMutation({
    mutationFn: (effectiveDate: string) => api.post<BaseCost>("/base-costs", { effectiveDate }),
    onSuccess: (doc) => {
      showSuccess(t("baseCost.created"));
      setCreateDate(null);
      setSelectedId(doc._id);
      void qc.invalidateQueries({ queryKey: ["base-costs"] });
    },
    onError: showError,
  });

  const refill = useMutation({
    mutationFn: (id: string) => api.post<BaseCost>(`/base-costs/${id}/refill`, {}),
    onSuccess: () => {
      showSuccess(t("baseCost.refilled"));
      void qc.invalidateQueries({ queryKey: ["base-costs"] });
    },
    onError: showError,
  });

  const saveItems = (items: BaseCostItem[]) => {
    if (!selected) return;
    update.mutate({ _id: selected._id, items } as never, { onError: showError });
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{t("menu.baseCost")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDate(todayInputDate())}>
          {t("common.add")}
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
        <TextField
          select
          size="small"
          label={t("baseCost.select")}
          value={selected?._id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {baseCosts.map((b) => (
            <MenuItem key={b._id} value={b._id}>
              {b.year}. {monthLabel(b.month)}
            </MenuItem>
          ))}
        </TextField>
        {selected && (
          <>
            <Typography variant="body2" color="text.secondary">
              {t("baseCost.effectiveDate")}: {formatDate(selected.effectiveDate)}
            </Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => refill.mutate(selected._id)}>
              {t("baseCost.refill")}
            </Button>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setManualItem({ name: "", amount: "", dueDate: "", paymentMethodId: "" })}
            >
              {t("baseCost.addManualItem")}
            </Button>
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => requestDelete(selected._id)}>
              {t("common.delete")}
            </Button>
          </>
        )}
      </Stack>

      {selected ? (
        <BaseCostTable baseCost={selected} onItemsChange={saveItems} />
      ) : (
        <Typography color="text.secondary">{t("baseCost.noneYet")}</Typography>
      )}

      {/* Létrehozás: Felhasználás dátum → automatikus feltöltés */}
      <Dialog open={createDate !== null} onClose={() => setCreateDate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("baseCost.createTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("baseCost.createHint")}
          </Typography>
          <TextField
            type="date"
            label={t("baseCost.effectiveDate")}
            value={createDate ?? ""}
            onChange={(e) => setCreateDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDate(null)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={() => createDate && create.mutate(createDate)}
            disabled={create.isPending}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kézi tétel hozzáadása */}
      <Dialog open={manualItem !== null} onClose={() => setManualItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("baseCost.addManualItem")}</DialogTitle>
        <DialogContent>
          {manualItem && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t("fields.name")}
                value={manualItem.name}
                onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
                fullWidth
              />
              <TextField
                type="number"
                label={t("fields.price")}
                value={manualItem.amount}
                onChange={(e) => setManualItem({ ...manualItem, amount: e.target.value })}
                fullWidth
              />
              <TextField
                type="date"
                label={t("baseCost.dueDate")}
                value={manualItem.dueDate}
                onChange={(e) => setManualItem({ ...manualItem, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                select
                label={t("fields.paymentMethod")}
                value={manualItem.paymentMethodId}
                onChange={(e) => setManualItem({ ...manualItem, paymentMethodId: e.target.value })}
                fullWidth
              >
                <MenuItem value="">—</MenuItem>
                {paymentMethods.map((pm) => (
                  <MenuItem key={pm._id} value={pm._id}>
                    {pm.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualItem(null)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!selected || !manualItem?.name || !manualItem.amount) return;
              saveItems([
                ...selected.items,
                {
                  name: manualItem.name,
                  amount: Number(manualItem.amount),
                  dueDate: manualItem.dueDate || null,
                  paymentMethodId: manualItem.paymentMethodId || null,
                  paid: false,
                  paidDate: null,
                  sourceType: "manual",
                  sourceId: null,
                },
              ]);
              setManualItem(null);
            }}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {dialog}
    </Box>
  );
}
