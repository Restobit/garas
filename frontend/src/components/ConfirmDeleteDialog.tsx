import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { useTranslation } from "react-i18next";

interface ConfirmDeleteDialogProps {
  open: boolean;
  usages: string[] | null; // null = még töltődik
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Globális törlés-megerősítő popup: kilistázza, hol van használatban az elem,
 * vagy jelzi, hogy "Még nincs sehol használva".
 */
export function ConfirmDeleteDialog({ open, usages, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t("common.confirmDeleteTitle")}</DialogTitle>
      <DialogContent>
        {usages === null ? (
          <Typography color="text.secondary">{t("common.loading")}</Typography>
        ) : usages.length === 0 ? (
          <Typography align="center" sx={{ py: 3, fontWeight: 600 }} color="text.secondary">
            {t("common.notUsedAnywhere")}
          </Typography>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("common.usedAt")}
            </Alert>
            <List dense>
              {usages.map((usage, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <LinkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={usage} />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={usages === null}>
          {t("common.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
