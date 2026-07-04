import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useTranslation } from "react-i18next";
import { useCreate, useList, useUpdate } from "../lib/queries";
import { useDeleteWithCheck } from "../components/useDeleteWithCheck";
import { useSnackbar } from "../components/SnackbarProvider";
import { Money } from "../components/Money";
import { formatDate, todayInputDate, toInputDate } from "../lib/format";
import type { Car, CarEntry, Insurance } from "../lib/types";

interface CarForm {
  name: string;
  purchaseDate: string;
  purchasePrice: string;
  km: string;
  serviceRecords: CarEntry[];
  purchases: CarEntry[];
}

function EntryEditor({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: CarEntry[];
  onChange: (entries: CarEntry[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">{title}</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onChange([...entries, { date: todayInputDate(), amount: 0, note: "" }])}
        >
          {t("common.add")}
        </Button>
      </Stack>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {entries.map((entry, idx) => (
          <Stack key={idx} direction="row" spacing={1} alignItems="center">
            <TextField
              type="date"
              size="small"
              value={toInputDate(entry.date)}
              onChange={(e) =>
                onChange(entries.map((en, i) => (i === idx ? { ...en, date: e.target.value } : en)))
              }
            />
            <TextField
              type="number"
              size="small"
              label={t("fields.amount")}
              value={entry.amount}
              onChange={(e) =>
                onChange(
                  entries.map((en, i) => (i === idx ? { ...en, amount: Number(e.target.value) } : en))
                )
              }
              sx={{ width: 130 }}
            />
            <TextField
              size="small"
              label={t("fields.note")}
              value={entry.note}
              onChange={(e) =>
                onChange(entries.map((en, i) => (i === idx ? { ...en, note: e.target.value } : en)))
              }
              fullWidth
            />
            <IconButton size="small" onClick={() => onChange(entries.filter((_, i) => i !== idx))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// --- 10. Autó ---
export function CarsPage() {
  const { t } = useTranslation();
  const { data: cars = [] } = useList<Car>("cars");
  const create = useCreate<Car>("cars");
  const update = useUpdate<Car>("cars");
  const { requestDelete, dialog } = useDeleteWithCheck("cars", "car");
  const { showError, showSuccess } = useSnackbar();

  const [editing, setEditing] = useState<Car | null>(null);
  const [form, setForm] = useState<CarForm | null>(null);
  const [detail, setDetail] = useState<Car | null>(null);

  const { data: linkedInsurances = [] } = useList<Insurance>(
    "insurances",
    { linkedType: "car", linkedId: detail?._id ?? "" },
    { enabled: detail !== null }
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", purchaseDate: todayInputDate(), purchasePrice: "", km: "", serviceRecords: [], purchases: [] });
  };
  const openEdit = (car: Car) => {
    setEditing(car);
    setForm({
      name: car.name,
      purchaseDate: toInputDate(car.purchaseDate),
      purchasePrice: String(car.purchasePrice),
      km: String(car.km),
      serviceRecords: car.serviceRecords,
      purchases: car.purchases,
    });
  };

  const submit = () => {
    if (!form) return;
    const data = {
      name: form.name,
      purchaseDate: form.purchaseDate,
      purchasePrice: Number(form.purchasePrice),
      km: Number(form.km || 0),
      serviceRecords: form.serviceRecords,
      purchases: form.purchases,
    };
    const onSuccess = () => {
      showSuccess(t("common.saved"));
      setForm(null);
      setDetail(null);
    };
    if (editing) update.mutate({ ...data, _id: editing._id } as never, { onSuccess, onError: showError });
    else create.mutate(data as never, { onSuccess, onError: showError });
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{t("menu.car")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t("common.add")}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("fields.name")}</TableCell>
              <TableCell>{t("car.purchaseDate")}</TableCell>
              <TableCell align="right">{t("car.purchasePrice")}</TableCell>
              <TableCell align="right">{t("car.km")}</TableCell>
              <TableCell align="right">{t("car.totalSpent")}</TableCell>
              <TableCell align="right">{t("common.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cars.map((car) => (
              <TableRow key={car._id} hover>
                <TableCell>{car.name}</TableCell>
                <TableCell>{formatDate(car.purchaseDate)}</TableCell>
                <TableCell align="right"><Money amount={car.purchasePrice} /></TableCell>
                <TableCell align="right">{car.km.toLocaleString("hu-HU")} km</TableCell>
                <TableCell align="right"><Money amount={car.totalSpent} color="negative" /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton size="small" onClick={() => setDetail(car)} aria-label={t("car.details")}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => openEdit(car)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => requestDelete(car._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {cars.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t("common.empty")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Szerkesztő dialógus */}
      <Dialog open={form !== null} onClose={() => setForm(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? t("common.edit") : t("common.add")}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t("fields.name")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  type="date"
                  label={t("car.purchaseDate")}
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t("car.purchasePrice")}
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t("car.km")}
                  value={form.km}
                  onChange={(e) => setForm({ ...form, km: e.target.value })}
                  fullWidth
                />
              </Stack>
              <EntryEditor
                title={t("car.serviceRecords")}
                entries={form.serviceRecords}
                onChange={(serviceRecords) => setForm({ ...form, serviceRecords })}
              />
              <EntryEditor
                title={t("car.purchases")}
                entries={form.purchases}
                onChange={(purchases) => setForm({ ...form, purchases })}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={submit}>{t("common.save")}</Button>
        </DialogActions>
      </Dialog>

      {/* Részletes nézet: költések + kapcsolt biztosítások (csak olvasható) */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>{detail?.name}</DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={3}>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t("car.purchaseDate")}</Typography>
                  <Typography>{formatDate(detail.purchaseDate)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t("car.purchasePrice")}</Typography>
                  <Typography><Money amount={detail.purchasePrice} /></Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t("car.km")}</Typography>
                  <Typography>{detail.km.toLocaleString("hu-HU")} km</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t("car.totalSpent")}</Typography>
                  <Typography><Money amount={detail.totalSpent} color="negative" /></Typography>
                </Box>
              </Stack>

              {([
                [t("car.serviceRecords"), detail.serviceRecords],
                [t("car.purchases"), detail.purchases],
              ] as const).map(([title, entries]) => (
                <Box key={title}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        {entries.map((entry, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell align="right"><Money amount={entry.amount} /></TableCell>
                            <TableCell>{entry.note}</TableCell>
                          </TableRow>
                        ))}
                        {entries.length === 0 && (
                          <TableRow>
                            <TableCell align="center" sx={{ color: "text.secondary" }}>
                              {t("common.empty")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("car.linkedInsurances")}</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("insurance.name")}</TableCell>
                        <TableCell>{t("insurance.frequency")}</TableCell>
                        <TableCell align="right">{t("fields.amount")}</TableCell>
                        <TableCell>{t("insurance.dueDate")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {linkedInsurances.map((ins) => (
                        <TableRow key={ins._id}>
                          <TableCell>{ins.name}</TableCell>
                          <TableCell>{t(`frequency.${ins.frequency}`)}</TableCell>
                          <TableCell align="right"><Money amount={ins.amount} /></TableCell>
                          <TableCell>{formatDate(ins.dueDate)}</TableCell>
                        </TableRow>
                      ))}
                      {linkedInsurances.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>
                            {t("common.empty")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>{t("common.close")}</Button>
        </DialogActions>
      </Dialog>

      {dialog}
    </Box>
  );
}
