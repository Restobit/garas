import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMediaQuery, type PaletteMode } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { Settings } from "../lib/types";

interface AppContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
  incognito: boolean;
  toggleIncognito: () => void;
  settings: Settings | undefined;
  updateSettings: (patch: Partial<Pick<Settings, "language" | "currency">>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const { i18n } = useTranslation();
  const qc = useQueryClient();

  // Téma: alapból a rendszerbeállítás, a kapcsoló felülírja (perzisztensen)
  const [modeOverride, setModeOverride] = useState<PaletteMode | null>(
    () => (localStorage.getItem("garas.themeMode") as PaletteMode | null) ?? null,
  );
  const mode: PaletteMode = modeOverride ?? (systemDark ? "dark" : "light");
  const toggleMode = useCallback(() => {
    const next: PaletteMode = mode === "dark" ? "light" : "dark";
    setModeOverride(next);
    localStorage.setItem("garas.themeMode", next);
  }, [mode]);

  // Inkognitó mód: perzisztens, munkameneteken átívelően
  const [incognito, setIncognito] = useState(() => localStorage.getItem("garas.incognito") === "true");
  const toggleIncognito = useCallback(() => {
    setIncognito((prev) => {
      localStorage.setItem("garas.incognito", String(!prev));
      return !prev;
    });
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Settings>("/settings"),
  });

  useEffect(() => {
    if (settings?.language && settings.language !== i18n.language) {
      void i18n.changeLanguage(settings.language);
      localStorage.setItem("garas.language", settings.language);
    }
  }, [settings?.language, i18n]);

  const updateSettings = useCallback(
    async (patch: Partial<Pick<Settings, "language" | "currency">>) => {
      await api.put<Settings>("/settings", patch);
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    [qc],
  );

  const value = useMemo(
    () => ({ mode, toggleMode, incognito, toggleIncognito, settings, updateSettings }),
    [mode, toggleMode, incognito, toggleIncognito, settings, updateSettings],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp csak AppProvider alatt használható");
  return ctx;
}
