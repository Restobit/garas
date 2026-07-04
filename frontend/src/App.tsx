import { useEffect } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Layout } from "./components/Layout";
import { AppProvider, useApp } from "./context/AppContext";
import { SnackbarProvider } from "./components/SnackbarProvider";
import { clerkEnabled, useGetToken } from "./auth/useOptionalClerk";
import { setTokenGetter } from "./lib/api";
import { buildTheme } from "./theme";
import { DashboardPage } from "./pages/DashboardPage";
import { MonthlyExpensePage } from "./pages/MonthlyExpensePage";
import { BaseCostPage } from "./pages/BaseCostPage";
import {
  HousingPage,
  InvestmentsPage,
  PaymentMethodsPage,
  ProductCategoriesPage,
  SavingsPage,
  StoresPage,
  SubscriptionsPage,
  TransportPage,
  UtilitiesPage,
  UtilityCategoriesPage,
} from "./pages/SimplePages";
import { IncomePage } from "./pages/IncomePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { InsurancePage } from "./pages/InsurancePage";
import { CarsPage } from "./pages/CarsPage";
import { PriceHistoryPage } from "./pages/PriceHistoryPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { QuickEntryPage } from "./pages/QuickEntryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";

function TokenBridge() {
  const getToken = useGetToken();
  useEffect(() => {
    setTokenGetter(getToken);
    return () => setTokenGetter(null);
  }, [getToken]);
  return null;
}

function ThemedApp() {
  const { mode } = useApp();
  return (
    <ThemeProvider theme={buildTheme(mode)}>
      <CssBaseline />
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/havi-koltseg" element={<MonthlyExpensePage />} />
          <Route path="/alap-koltseg" element={<BaseCostPage />} />
          <Route path="/elofizetes" element={<SubscriptionsPage />} />
          <Route path="/bevetel" element={<IncomePage />} />
          <Route path="/lakhatas" element={<HousingPage />} />
          <Route path="/rezsi" element={<UtilitiesPage />} />
          <Route path="/biztositas" element={<InsurancePage />} />
          <Route path="/auto" element={<CarsPage />} />
          <Route path="/utazas" element={<TransportPage />} />
          <Route path="/motor" element={<ComingSoonPage titleKey="menu.motorcycle" />} />
          <Route path="/kerekpar" element={<ComingSoonPage titleKey="menu.bicycle" />} />
          <Route path="/befektetes" element={<InvestmentsPage />} />
          <Route path="/megtakaritas" element={<SavingsPage />} />
          <Route path="/artortenet" element={<PriceHistoryPage />} />
          <Route path="/blokk" element={<ReceiptsPage />} />
          <Route path="/blokk/:id/rogzites" element={<QuickEntryPage />} />
          <Route path="/beallitasok" element={<SettingsPage />} />
          <Route path="/beallitasok/fizetesi-mod" element={<PaymentMethodsPage />} />
          <Route path="/beallitasok/rezsi-kategoria" element={<UtilityCategoriesPage />} />
          <Route path="/beallitasok/termek-kategoria" element={<ProductCategoriesPage />} />
          <Route path="/beallitasok/bolt" element={<StoresPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          {/* Régi útvonalak átirányítása */}
          <Route path="/kozlekedes" element={<Navigate to="/utazas" replace />} />
          <Route path="/fizetesi-mod" element={<Navigate to="/beallitasok/fizetesi-mod" replace />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default function App() {
  const inner = (
    <AppProvider>
      <SnackbarProvider>
        <ThemedApp />
      </SnackbarProvider>
    </AppProvider>
  );
  if (!clerkEnabled) return inner;
  return (
    <>
      <TokenBridge />
      <SignedIn>{inner}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
