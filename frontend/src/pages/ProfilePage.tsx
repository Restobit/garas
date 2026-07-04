import { Alert, Box, Paper, Typography } from "@mui/material";
import { UserProfile } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { clerkEnabled } from "../auth/useOptionalClerk";

/**
 * 17. Profil — a Clerk saját profilkezelőjét használjuk (email, jelszó,
 * profilkép módosítás), így nincs duplikált profil-adatkezelés.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("menu.profile")}
      </Typography>
      {clerkEnabled ? (
        <UserProfile routing="hash" />
      ) : (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info">{t("profile.devMode")}</Alert>
        </Paper>
      )}
    </Box>
  );
}
