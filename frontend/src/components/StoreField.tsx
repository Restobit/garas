import { Autocomplete, Box, Button, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { useCreate, useList } from "../lib/queries";
import { useSnackbar } from "./SnackbarProvider";
import type { Store } from "../lib/types";

interface StoreFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  size?: "small" | "medium";
}

/**
 * Bolt mező autosuggestion-nel: a Beállítások > Bolt listából ajánl gépelés
 * közben, de listán kívüli érték is beírható — ilyenkor felkínálja a
 * "Hozzáadás a boltok listájához" opciót.
 */
export function StoreField({ value, onChange, label, helperText, size }: StoreFieldProps) {
  const { t } = useTranslation();
  const { data: stores = [] } = useList<Store>("stores");
  const createStore = useCreate<Store>("stores");
  const { showError, showSuccess } = useSnackbar();

  const trimmed = value.trim();
  const isKnown = stores.some((s) => s.name.toLocaleLowerCase("hu-HU") === trimmed.toLocaleLowerCase("hu-HU"));

  return (
    <Box>
      <Autocomplete
        freeSolo
        options={stores.map((s) => s.name)}
        inputValue={value}
        onInputChange={(_, newValue) => onChange(newValue)}
        renderInput={(params) => (
          <TextField {...params} label={label ?? t("expense.store")} helperText={helperText} size={size} fullWidth />
        )}
      />
      {trimmed !== "" && !isKnown && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={createStore.isPending}
          onClick={() =>
            createStore.mutate(
              { name: trimmed } as Partial<Store>,
              { onSuccess: () => showSuccess(t("store.addedToList")), onError: showError },
            )
          }
        >
          {t("store.addToList")}
        </Button>
      )}
    </Box>
  );
}
