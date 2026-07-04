import { Box, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useSnackbar } from "../components/SnackbarProvider";

// --- Beállítások (a kategóriakezelés a Beállítások > Termék kategória almenübe került) ---
export function SettingsPage() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();
  const { showError, showSuccess } = useSnackbar();

  const save = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch)
      .then(() => showSuccess(t("common.saved")))
      .catch(showError);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("menu.settings")}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <TextField
                select
                label={t("settings.language")}
                value={settings?.language ?? "hu"}
                onChange={(e) => save({ language: e.target.value as "hu" | "en" })}
                helperText={t("settings.languageHint")}
                fullWidth
              >
                <MenuItem value="hu">Magyar</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>
              <TextField
                select
                label={t("settings.currency")}
                value={settings?.currency ?? "HUF"}
                onChange={(e) => save({ currency: e.target.value as "HUF" | "EUR" | "USD" })}
                helperText={t("settings.currencyHint")}
                fullWidth
              >
                <MenuItem value="HUF">Forint (Ft)</MenuItem>
                <MenuItem value="EUR">Euró (€)</MenuItem>
                <MenuItem value="USD">Dollár ($)</MenuItem>
              </TextField>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
