import { useState, type ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TableChartIcon from "@mui/icons-material/TableChart";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import HomeIcon from "@mui/icons-material/Home";
import BoltIcon from "@mui/icons-material/Bolt";
import ShieldIcon from "@mui/icons-material/Shield";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SavingsIcon from "@mui/icons-material/Savings";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "../auth/useOptionalClerk";
import { useApp } from "../context/AppContext";
import { useUnprocessedCount } from "../lib/queries";
import { formatDate } from "../lib/format";

const DRAWER_WIDTH = 248;

const MENU_ITEMS = [
  { key: "dashboard", path: "/", icon: <DashboardIcon /> },
  { key: "monthly", path: "/havi-koltseg", icon: <CalendarMonthIcon /> },
  { key: "baseCost", path: "/alap-koltseg", icon: <TableChartIcon /> },
  { key: "paymentMethod", path: "/fizetesi-mod", icon: <CreditCardIcon /> },
  { key: "subscription", path: "/elofizetes", icon: <SubscriptionsIcon /> },
  { key: "housing", path: "/lakhatas", icon: <HomeIcon /> },
  { key: "utility", path: "/rezsi", icon: <BoltIcon /> },
  { key: "insurance", path: "/biztositas", icon: <ShieldIcon /> },
  { key: "car", path: "/auto", icon: <DirectionsCarIcon /> },
  { key: "transport", path: "/kozlekedes", icon: <DirectionsBusIcon /> },
  { key: "investment", path: "/befektetes", icon: <TrendingUpIcon /> },
  { key: "saving", path: "/megtakaritas", icon: <SavingsIcon /> },
  { key: "priceHistory", path: "/artortenet", icon: <HistoryIcon /> },
  { key: "receipt", path: "/blokk", icon: <ReceiptLongIcon /> },
  { key: "settings", path: "/beallitasok", icon: <SettingsIcon /> },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { mode, toggleMode, incognito, toggleIncognito } = useApp();
  const { data: unprocessed } = useUnprocessedCount();
  const user = useUser();

  const drawer = (
    <Box sx={{ overflowY: "auto" }}>
      <Toolbar>
        <Box>
          <Typography variant="h5" color="primary">
            {t("app.name")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("app.subtitle")}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {MENU_ITEMS.map((item) => (
          <ListItemButton
            key={item.key}
            selected={item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            sx={{ borderRadius: 2, mx: 1, my: 0.25 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={t(`menu.${item.key}`)} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ gap: 0.5 }}>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label={t("header.menu")}>
              <MenuIcon />
            </IconButton>
          )}
          {!isDesktop && (
            <Typography variant="h6" color="primary" sx={{ mr: 1 }}>
              {t("app.name")}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={mode === "dark" ? t("header.lightMode") : t("header.darkMode")}>
            <IconButton onClick={toggleMode} aria-label={t("header.themeToggle")}>
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t("header.incognito")}>
            <IconButton
              onClick={toggleIncognito}
              color={incognito ? "primary" : "default"}
              aria-label={t("header.incognito")}
              data-testid="incognito-toggle"
            >
              {incognito ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary" sx={{ mx: 1, display: { xs: "none", sm: "block" } }}>
            {formatDate(new Date())}
          </Typography>
          <Tooltip title={t("header.notifications")}>
            <IconButton onClick={() => navigate("/blokk?szuro=feldolgozatlan")} aria-label={t("header.notifications")}>
              <Badge badgeContent={unprocessed?.count ?? 0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={t("header.profile")}>
            <IconButton onClick={() => navigate("/profil")} aria-label={t("header.profile")}>
              <Avatar src={user?.imageUrl} sx={{ width: 32, height: 32 }} alt={user?.fullName ?? ""} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", border: 0 },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
