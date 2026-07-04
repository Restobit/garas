import { Box, Paper, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import { useTranslation } from "react-i18next";

/** Üres placeholder oldal (Motor, Kerékpár) — a részletes mezőstruktúra később készül el. */
export function ComingSoonPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t(titleKey)}
      </Typography>
      <Paper sx={{ p: 6, textAlign: "center" }}>
        <ConstructionIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          {t("common.comingSoon")}
        </Typography>
      </Paper>
    </Box>
  );
}
