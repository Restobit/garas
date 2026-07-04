import { createTheme, type PaletteMode } from "@mui/material";

/**
 * Fehér–zöld–kék paletta, visszafogott piros kizárólag kiadás/túllépés jelzésére.
 * A chart-színek dataviz-validáltak (CVD-biztos, kontraszt OK mindkét témában).
 */
export const chartColors = {
  light: { positive: "#2e7d32", neutral: "#1565c0", negative: "#c62828" },
  dark: { positive: "#43a047", neutral: "#1e88e5", negative: "#e53935" },
} as const;

export function buildTheme(mode: PaletteMode) {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#1e88e5" : "#1565c0" },
      success: { main: dark ? "#43a047" : "#2e7d32" },
      error: { main: dark ? "#e53935" : "#c62828" },
      background: dark
        ? { default: "#0d1319", paper: "#12181f" }
        : { default: "#f6f8fa", paper: "#ffffff" },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h5: { fontWeight: 700, letterSpacing: "-0.02em" },
      h6: { fontWeight: 600, letterSpacing: "-0.01em" },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.4)"
              : "0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)",
          },
        },
      },
      MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiTableCell: { styleOverrides: { root: { borderColor: dark ? "#1f2937" : "#eef2f6" } } },
    },
  });
}
