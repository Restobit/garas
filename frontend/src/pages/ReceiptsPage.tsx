import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ImageIcon from "@mui/icons-material/Image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, fetchFileUrl } from "../lib/api";
import { useList, useUpdate } from "../lib/queries";
import { useDeleteWithCheck } from "../components/useDeleteWithCheck";
import { useSnackbar } from "../components/SnackbarProvider";
import { formatDate, toInputDate, todayInputDate } from "../lib/format";
import type { Receipt } from "../lib/types";

function ReceiptImage({ receiptId }: { receiptId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    void fetchFileUrl(`/receipts/${receiptId}/image`).then((u) => {
      revoked = u;
      setUrl(u);
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [receiptId]);
  if (!url) return null;
  return <img src={url} alt="Blokk" style={{ maxWidth: "100%", maxHeight: "80vh" }} />;
}

// --- 15. Blokk (feltöltés + lista) ---
export function ReceiptsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showError, showSuccess } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<"all" | "unprocessed" | "processed">(
    searchParams.get("szuro") === "feldolgozatlan" ? "unprocessed" : "all"
  );

  const { data: receipts = [] } = useList<Receipt>(
    "receipts",
    filter === "all" ? undefined : { processed: filter === "processed" }
  );
  const update = useUpdate<Receipt>("receipts");
  const { requestDelete, dialog } = useDeleteWithCheck("receipts", "receipt");
  const [preview, setPreview] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => api.upload<Receipt>("/receipts/upload", file),
    onSuccess: () => {
      showSuccess(t("receipt.uploaded"));
      void qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: showError,
  });

  const handleFile = (files: FileList | null) => {
    if (files?.[0]) upload.mutate(files[0]);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const toggleProcessed = (receipt: Receipt, processed: boolean) => {
    // Bejelöléskor a feldolgozás dátuma alapból a mai nap
    update.mutate(
      {
        _id: receipt._id,
        processed,
        processedDate: processed ? (receipt.processedDate ?? new Date().toISOString()) : null,
      },
      {
        onSuccess: () => void qc.invalidateQueries({ queryKey: ["receipts", "unprocessed-count"] }),
        onError: showError,
      }
    );
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">{t("menu.receipt")}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
            {t("receipt.upload")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PhotoCameraIcon />}
            onClick={() => cameraRef.current?.click()}
            sx={{ display: { md: "none" } }}
          >
            {t("receipt.takePhoto")}
          </Button>
        </Stack>
      </Stack>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files)} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFile(e.target.files)}
      />

      <ToggleButtonGroup
        size="small"
        exclusive
        value={filter}
        onChange={(_, v: typeof filter | null) => v && setFilter(v)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="all">{t("receipt.filterAll")}</ToggleButton>
        <ToggleButton value="unprocessed">{t("receipt.filterUnprocessed")}</ToggleButton>
        <ToggleButton value="processed">{t("receipt.filterProcessed")}</ToggleButton>
      </ToggleButtonGroup>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("receipt.image")}</TableCell>
              <TableCell>{t("receipt.uploadedAt")}</TableCell>
              <TableCell>{t("receipt.processed")}</TableCell>
              <TableCell>{t("receipt.processedDate")}</TableCell>
              <TableCell align="right">{t("common.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow
                key={receipt._id}
                hover
                sx={!receipt.processed ? { bgcolor: "action.hover" } : undefined}
              >
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton size="small" onClick={() => setPreview(receipt._id)}>
                      <ImageIcon fontSize="small" />
                    </IconButton>
                    {!receipt.processed && (
                      <Chip label={t("receipt.filterUnprocessed")} size="small" color="error" variant="outlined" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>{formatDate(receipt.uploadedAt)}</TableCell>
                <TableCell>
                  <Checkbox
                    checked={receipt.processed}
                    onChange={(e) => toggleProcessed(receipt, e.target.checked)}
                    inputProps={{ "aria-label": t("receipt.processed") }}
                  />
                </TableCell>
                <TableCell>
                  {receipt.processed && (
                    <TextField
                      type="date"
                      size="small"
                      variant="standard"
                      value={toInputDate(receipt.processedDate) || todayInputDate()}
                      onChange={(e) =>
                        update.mutate(
                          { _id: receipt._id, processedDate: e.target.value },
                          { onError: showError }
                        )
                      }
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {isDesktop && (
                    <Button
                      size="small"
                      startIcon={<EditNoteIcon />}
                      onClick={() => navigate(`/blokk/${receipt._id}/rogzites`)}
                    >
                      {t("receipt.quickEntry")}
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => requestDelete(receipt._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {receipts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t("common.empty")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={preview !== null} onClose={() => setPreview(null)} maxWidth="md">
        <DialogContent>{preview && <ReceiptImage receiptId={preview} />}</DialogContent>
      </Dialog>

      {dialog}
    </Box>
  );
}
