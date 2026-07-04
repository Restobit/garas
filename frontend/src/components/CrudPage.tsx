import { useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
import { useTranslation } from "react-i18next";
import { useCreate, useList, useUpdate } from "../lib/queries";
import { useDeleteWithCheck } from "./useDeleteWithCheck";
import { useSnackbar } from "./SnackbarProvider";
import type { BaseDoc } from "../lib/types";

export interface Option {
  value: string;
  label: string;
}

export type FormValues = Record<string, unknown>;

export interface FieldDef {
  name: string;
  labelKey: string;
  type: "text" | "number" | "money" | "date" | "select" | "multiline" | "checkbox" | "custom";
  options?: Option[] | ((values: FormValues) => Option[]);
  required?: boolean;
  renderCustom?: (values: FormValues, setValue: (name: string, value: unknown) => void) => ReactNode;
}

export interface ColumnDef<T> {
  key: string;
  labelKey: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

interface CrudPageProps<T extends BaseDoc> {
  titleKey: string;
  entity: string;
  usageType: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  defaults?: FormValues;
  /** Mentés előtti átalakítás (pl. számított mezők). */
  beforeSubmit?: (values: FormValues) => FormValues;
  headerExtra?: ReactNode;
}

function fieldValue(values: FormValues, name: string): string {
  const v = values[name];
  if (v === null || v === undefined) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  return String(v);
}

export function FormFields({
  fields,
  values,
  setValue,
}: {
  fields: FieldDef[];
  values: FormValues;
  setValue: (name: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {fields.map((field) => {
        if (field.type === "custom") {
          return <Box key={field.name}>{field.renderCustom?.(values, setValue)}</Box>;
        }
        if (field.type === "checkbox") {
          return (
            <FormControlLabel
              key={field.name}
              control={
                <Checkbox
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setValue(field.name, e.target.checked)}
                />
              }
              label={t(field.labelKey)}
            />
          );
        }
        if (field.type === "select") {
          const options = typeof field.options === "function" ? field.options(values) : (field.options ?? []);
          return (
            <TextField
              key={field.name}
              select
              label={t(field.labelKey)}
              value={fieldValue(values, field.name)}
              required={field.required}
              onChange={(e) => setValue(field.name, e.target.value)}
              fullWidth
            >
              {!field.required && <MenuItem value="">—</MenuItem>}
              {options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return (
          <TextField
            key={field.name}
            label={t(field.labelKey)}
            type={
              field.type === "date" ? "date" : field.type === "text" || field.type === "multiline" ? "text" : "number"
            }
            multiline={field.type === "multiline"}
            minRows={field.type === "multiline" ? 2 : undefined}
            value={fieldValue(values, field.name)}
            required={field.required}
            onChange={(e) => setValue(field.name, e.target.value)}
            InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
            fullWidth
          />
        );
      })}
    </Stack>
  );
}

export function normalizeForSubmit(values: FormValues, fields: FieldDef[]): FormValues {
  const out: FormValues = { ...values };
  for (const field of fields) {
    const raw = out[field.name];
    if (field.type === "number" || field.type === "money") {
      out[field.name] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
    }
    if (field.type === "date" && (raw === "" || raw === undefined)) out[field.name] = null;
    if (field.type === "select" && raw === "") out[field.name] = null;
  }
  return out;
}

export function CrudPage<T extends BaseDoc>({
  titleKey,
  entity,
  usageType,
  fields,
  columns,
  defaults = {},
  beforeSubmit,
  headerExtra,
}: CrudPageProps<T>) {
  const { t } = useTranslation();
  const { data: rows = [], isLoading } = useList<T>(entity);
  const create = useCreate<T>(entity);
  const update = useUpdate<T>(entity);
  const { requestDelete, dialog } = useDeleteWithCheck(entity, usageType);
  const { showError, showSuccess } = useSnackbar();

  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);

  const openCreate = () => {
    setEditing(null);
    setValues({ ...defaults });
  };
  const openEdit = (row: T) => {
    setEditing(row);
    setValues({ ...(row as unknown as FormValues) });
  };
  const close = () => setValues(null);

  const submit = () => {
    if (!values) return;
    let data = normalizeForSubmit(values, fields);
    if (beforeSubmit) data = beforeSubmit(data);
    const onError = showError;
    const onSuccess = () => {
      showSuccess(t("common.saved"));
      close();
    };
    if (editing) {
      update.mutate({ ...(data as Partial<T>), _id: editing._id }, { onSuccess, onError });
    } else {
      create.mutate(data as Partial<T>, { onSuccess, onError });
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{t(titleKey)}</Typography>
        <Stack direction="row" spacing={1}>
          {headerExtra}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            {t("common.add")}
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align}>
                  {t(col.labelKey)}
                </TableCell>
              ))}
              <TableCell align="right">{t("common.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row._id} hover>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align}>
                    {col.render ? col.render(row) : String((row as unknown as FormValues)[col.key] ?? "")}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton size="small" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => requestDelete(row._id)} aria-label={t("common.delete")}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{isLoading ? t("common.loading") : t("common.empty")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={values !== null} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t("common.edit") : t("common.add")}</DialogTitle>
        <DialogContent>
          {values && (
            <FormFields
              fields={fields}
              values={values}
              setValue={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={submit}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {dialog}
    </Box>
  );
}
