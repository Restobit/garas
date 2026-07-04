import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "./SnackbarProvider";
import { useDelete, useUsageCheck } from "../lib/queries";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

/**
 * Kétlépcsős törlés: 1. "Biztos, hogy törölni szeretné?" (Igen/Mégse),
 * 2. usage check popup a használati helyekkel, végleges megerősítés után törlés.
 * Hívd a requestDelete(id)-t, a hook kezeli a popupokat.
 */
export function useDeleteWithCheck(entity: string, usageType: string, extraInvalidate: string[] = []) {
  const { t } = useTranslation();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [stage, setStage] = useState<"confirm" | "usage">("confirm");
  const [usages, setUsages] = useState<string[] | null>(null);
  const usageCheck = useUsageCheck();
  const del = useDelete(entity, extraInvalidate);
  const { showError } = useSnackbar();

  const requestDelete = (id: string) => {
    setPendingId(id);
    setStage("confirm");
    setUsages(null);
  };

  const cancel = () => setPendingId(null);

  const proceedToUsageCheck = () => {
    if (!pendingId) return;
    setStage("usage");
    usageCheck.mutate(
      { entityType: usageType, id: pendingId },
      {
        onSuccess: (data) => setUsages(data.usages),
        onError: (err) => {
          showError(err);
          setPendingId(null);
        },
      },
    );
  };

  const dialog = (
    <>
      <Dialog open={pendingId !== null && stage === "confirm"} onClose={cancel} maxWidth="xs" fullWidth>
        <DialogTitle>{t("common.delete")}</DialogTitle>
        <DialogContent>
          <Typography>{t("common.confirmDeleteQuestion")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel}>{t("common.cancel")}</Button>
          <Button color="error" variant="contained" onClick={proceedToUsageCheck}>
            {t("common.yes")}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDeleteDialog
        open={pendingId !== null && stage === "usage"}
        usages={usages}
        onCancel={cancel}
        onConfirm={() => {
          if (pendingId) {
            del.mutate(pendingId, { onError: showError });
          }
          setPendingId(null);
        }}
      />
    </>
  );

  return { requestDelete, dialog };
}
