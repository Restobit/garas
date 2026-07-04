import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  type SxProps,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useCreate, useList } from "../lib/queries";
import { useSnackbar } from "./SnackbarProvider";
import { capitalizeFirst } from "../lib/format";
import type { Category } from "../lib/types";

const NEW_OPTION = "__new__";

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  label?: string;
  size?: "small" | "medium";
  fullWidth?: boolean;
  sx?: SxProps;
}

/**
 * Kategória lenyíló, a lista alján "Új kategória hozzáadása…" opcióval —
 * az új kategória neve mindig kezdő nagybetűvel mentődik.
 */
export function CategorySelect({ value, onChange, label, size, fullWidth, sx }: CategorySelectProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useList<Category>("categories");
  const createCategory = useCreate<Category>("categories");
  const { showError, showSuccess } = useSnackbar();
  const [newName, setNewName] = useState<string | null>(null);

  const saveNew = () => {
    const name = capitalizeFirst(newName ?? "");
    if (!name) return;
    createCategory.mutate(
      { name } as Partial<Category>,
      {
        onSuccess: (doc) => {
          showSuccess(t("common.saved"));
          setNewName(null);
          onChange(doc._id);
        },
        onError: showError,
      },
    );
  };

  return (
    <>
      <TextField
        select
        label={label ?? t("fields.category")}
        value={value ?? ""}
        size={size}
        fullWidth={fullWidth}
        sx={sx}
        onChange={(e) => {
          if (e.target.value === NEW_OPTION) {
            setNewName("");
          } else {
            onChange(e.target.value || null);
          }
        }}
      >
        <MenuItem value="">—</MenuItem>
        {categories.map((c) => (
          <MenuItem key={c._id} value={c._id}>
            {c.name}
          </MenuItem>
        ))}
        <MenuItem value={NEW_OPTION} sx={{ fontStyle: "italic" }}>
          {t("category.addNew")}
        </MenuItem>
      </TextField>

      <Dialog open={newName !== null} onClose={() => setNewName(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("category.newTitle")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label={t("fields.name")}
            value={newName ?? ""}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveNew();
              }
            }}
            helperText={t("category.capitalizeHint")}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewName(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={saveNew} disabled={createCategory.isPending}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
