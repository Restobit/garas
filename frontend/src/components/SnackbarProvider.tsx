import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";

interface SnackbarContextValue {
  showError: (error: unknown) => void;
  showSuccess: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

/** Egységes API-hibamegjelenítés toastként. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; severity: "error" | "success" } | null>(null);

  const showError = useCallback((error: unknown) => {
    const text = error instanceof Error ? error.message : "Váratlan hiba történt";
    setMessage({ text, severity: "error" });
  }, []);

  const showSuccess = useCallback((text: string) => {
    setMessage({ text, severity: "success" });
  }, []);

  const value = useMemo(() => ({ showError, showSuccess }), [showError, showSuccess]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={message !== null}
        autoHideDuration={5000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={message?.severity ?? "error"} variant="filled" onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar csak SnackbarProvider alatt használható");
  return ctx;
}
