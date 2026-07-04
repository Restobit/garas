import { useRef, useState } from "react";
import { Button, Chip, Stack, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useTranslation } from "react-i18next";
import { api, fetchFileUrl } from "../lib/api";
import { useSnackbar } from "./SnackbarProvider";
import type { Attachment } from "../lib/types";

export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.gif,.xlsx,.doc,.docx";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface FileFieldProps {
  label: string;
  /** Csatolmány id-k (egy vagy több). */
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
}

/** Dokumentum csatolás: pdf, jpg, png, xlsx, doc/docx, gif — max 5 MB / fájl. */
export function FileField({ label, value, onChange, multiple = false }: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { showError } = useSnackbar();
  const [names, setNames] = useState<Record<string, string>>({});

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        showError(new Error(t("files.tooLarge", { name: file.name })));
        continue;
      }
      try {
        const attachment = await api.upload<Attachment>("/files", file);
        setNames((prev) => ({ ...prev, [attachment._id]: attachment.filename }));
        onChange(multiple ? [...value, attachment._id] : [attachment._id]);
      } catch (err) {
        showError(err);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const openFile = async (id: string) => {
    try {
      window.open(await fetchFileUrl(`/files/${id}`), "_blank");
    } catch (err) {
      showError(err);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {value.map((id) => (
          <Chip
            key={id}
            label={names[id] ?? t("files.attachment")}
            onClick={() => void openFile(id)}
            onDelete={() => onChange(value.filter((v) => v !== id))}
            size="small"
          />
        ))}
        <Button size="small" startIcon={<AttachFileIcon />} onClick={() => inputRef.current?.click()}>
          {t("files.upload")}
        </Button>
      </Stack>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ATTACHMENT_ACCEPT}
        multiple={multiple}
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </Stack>
  );
}
