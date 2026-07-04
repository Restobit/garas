import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, fetchFileUrl } from "../lib/api";
import { useList } from "../lib/queries";
import { useSnackbar } from "../components/SnackbarProvider";
import { Money } from "../components/Money";
import { formatDate, todayInputDate } from "../lib/format";
import {
  addItem,
  clearSession,
  loadSession,
  removeItem,
  saveSession,
  toExpensePayload,
  type QuickItem,
  type QuickSession,
} from "../lib/quickSession";
import type { Category, Expense } from "../lib/types";

const EMPTY_ITEM: QuickItem = {
  name: "",
  date: todayInputDate(),
  unitPrice: null,
  amount: 0,
  note: "",
  categoryId: null,
};

// --- 3. Gyors adatbeviteli nézet (kizárólag desktop, split-screen) ---
export function QuickEntryPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const { id: receiptId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showError, showSuccess } = useSnackbar();
  const { data: categories = [] } = useList<Category>("categories");

  const [session, setSession] = useState<QuickSession>(() => loadSession(localStorage, receiptId));
  const [draft, setDraft] = useState<QuickItem>({ ...EMPTY_ITEM });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveSession(localStorage, receiptId, session);
  }, [session, receiptId]);

  useEffect(() => {
    let url: string | null = null;
    void fetchFileUrl(`/receipts/${receiptId}/image`)
      .then((u) => {
        url = u;
        setImageUrl(u);
      })
      .catch(showError);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [receiptId, showError]);

  const total = useMemo(() => session.items.reduce((a, i) => a + i.amount, 0), [session.items]);

  const save = useMutation({
    mutationFn: () => api.post<Expense[]>("/expenses/batch", { items: toExpensePayload(session, receiptId) }),
    onSuccess: () => {
      // Mentés után a localStorage-lista ürül, a munkamenet lezárul
      clearSession(localStorage, receiptId);
      showSuccess(t("quickEntry.savedAll"));
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      navigate("/blokk");
    },
    onError: showError,
  });

  if (!isDesktop) {
    return <Alert severity="info">{t("quickEntry.desktopOnly")}</Alert>;
  }

  const addDraft = () => {
    if (!draft.name || !draft.amount) return;
    setSession((prev) => addItem(prev, { ...draft, amount: Number(draft.amount) }));
    setDraft({ ...EMPTY_ITEM, date: draft.date, categoryId: draft.categoryId });
    nameRef.current?.focus();
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("quickEntry.title")}
      </Typography>
      <Grid container spacing={2}>
        {/* Bal: blokk kép nagyítható/pásztázható nézetben */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 1, position: "sticky", top: 80 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <IconButton size="small" onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}>
                <ZoomInIcon />
              </IconButton>
              <IconButton size="small" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
                <ZoomOutIcon />
              </IconButton>
            </Stack>
            <Box sx={{ overflow: "auto", maxHeight: "70vh" }}>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Blokk"
                  style={{ width: `${zoom * 100}%`, display: "block" }}
                />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Jobb: gyors beviteli űrlap + ideiglenes lista */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <TextField
              label={t("quickEntry.store")}
              value={session.store}
              onChange={(e) => setSession((prev) => ({ ...prev, store: e.target.value }))}
              helperText={t("quickEntry.storeHint")}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Stack
              spacing={1.5}
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                addDraft();
              }}
            >
              <TextField
                inputRef={nameRef}
                label={t("fields.name")}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                size="small"
                required
              />
              <Stack direction="row" spacing={1.5}>
                <TextField
                  type="date"
                  label={t("fields.date")}
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t("fields.unitPrice")}
                  value={draft.unitPrice ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, unitPrice: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t("fields.amount")}
                  value={draft.amount || ""}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
                  size="small"
                  required
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label={t("fields.note")}
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  size="small"
                  fullWidth
                />
                <TextField
                  select
                  label={t("fields.category")}
                  value={draft.categoryId ?? ""}
                  onChange={(e) => setDraft({ ...draft, categoryId: e.target.value || null })}
                  size="small"
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">—</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Button type="submit" variant="outlined" startIcon={<AddIcon />}>
                {t("quickEntry.addItem")}
              </Button>
            </Stack>

            <Table size="small" sx={{ mt: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t("fields.name")}</TableCell>
                  <TableCell>{t("fields.date")}</TableCell>
                  <TableCell align="right">{t("fields.amount")}</TableCell>
                  <TableCell>{t("fields.category")}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {session.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell align="right">
                      <Money amount={item.amount} />
                    </TableCell>
                    <TableCell>{categories.find((c) => c._id === item.categoryId)?.name ?? "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setSession((prev) => removeItem(prev, idx))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {session.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 2, color: "text.secondary" }}>
                      {t("quickEntry.emptyList")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Typography>
                {t("common.total")}: <Money amount={total} />
              </Typography>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={session.items.length === 0 || save.isPending}
                onClick={() => save.mutate()}
              >
                {t("common.save")}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
