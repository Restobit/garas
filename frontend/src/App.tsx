import { useEffect } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Route, Routes } from "react-router-dom";
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
  SavingsPage,
  SubscriptionsPage,
  TransportPage,
  UtilitiesPage,
} from "./pages/SimplePages";
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
          <Route path="/fizetesi-mod" element={<PaymentMethodsPage />} />
          <Route path="/elofizetes" element={<SubscriptionsPage />} />
          <Route path="/lakhatas" element={<HousingPage />} />
          <Route path="/rezsi" element={<UtilitiesPage />} />
          <Route path="/biztositas" element={<InsurancePage />} />
          <Route path="/auto" element={<CarsPage />} />
          <Route path="/kozlekedes" element={<TransportPage />} />
          <Route path="/befektetes" element={<InvestmentsPage />} />
          <Route path="/megtakaritas" element={<SavingsPage />} />
          <Route path="/artortenet" element={<PriceHistoryPage />} />
          <Route path="/blokk" element={<ReceiptsPage />} />
          <Route path="/blokk/:id/rogzites" element={<QuickEntryPage />} />
          <Route path="/beallitasok" element={<SettingsPage />} />
          <Route path="/profil" element={<ProfilePage />} />
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
