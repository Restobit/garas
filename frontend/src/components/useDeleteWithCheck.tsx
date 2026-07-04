import { useState } from "react";
import { useSnackbar } from "./SnackbarProvider";
import { useDelete, useUsageCheck } from "../lib/queries";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

/**
 * Törlés usage checkkel: hívd a requestDelete(id)-t, a hook megnyitja a
 * megerősítő popupot a használati helyek listájával, és megerősítés után töröl.
 */
export function useDeleteWithCheck(entity: string, usageType: string, extraInvalidate: string[] = []) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [usages, setUsages] = useState<string[] | null>(null);
  const usageCheck = useUsageCheck();
  const del = useDelete(entity, extraInvalidate);
  const { showError } = useSnackbar();

  const requestDelete = (id: string) => {
    setPendingId(id);
    setUsages(null);
    usageCheck.mutate(
      { entityType: usageType, id },
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
    <ConfirmDeleteDialog
      open={pendingId !== null}
      usages={usages}
      onCancel={() => setPendingId(null)}
      onConfirm={() => {
        if (pendingId) {
          del.mutate(pendingId, { onError: showError });
        }
        setPendingId(null);
      }}
    />
  );

  return { requestDelete, dialog };
}
