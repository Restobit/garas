import { useState, type ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Collapse,
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
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import PedalBikeIcon from "@mui/icons-material/PedalBike";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SavingsIcon from "@mui/icons-material/Savings";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaymentsIcon from "@mui/icons-material/Payments";
import CategoryIcon from "@mui/icons-material/Category";
import SellIcon from "@mui/icons-material/Sell";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "../auth/useOptionalClerk";
import { useApp } from "../context/AppContext";
import { useUnprocessedCount } from "../lib/queries";
import { formatDate } from "../lib/format";

const DRAWER_WIDTH = 248;

interface MenuLeaf {
  key: string;
  path: string;
  icon: ReactNode;
}

interface MenuNode extends Omit<MenuLeaf, "path"> {
  /** Ha nincs path, az elem csak lenyitható csoport (nincs saját oldala). */
  path?: string;
  children?: MenuLeaf[];
}

/**
 * Hierarchikus menü: a path nélküli elemek lenyitható kategóriák, a path-osak
 * önálló oldalak — a Lakhatás és a Beállítások mindkettő (saját oldal + almenü).
 */
const MENU_ITEMS: MenuNode[] = [
  { key: "dashboard", path: "/", icon: <DashboardIcon /> },
  { key: "receipt", path: "/blokk", icon: <ReceiptLongIcon /> },
  { key: "priceHistory", path: "/artortenet", icon: <HistoryIcon /> },
  {
    key: "budget",
    icon: <AccountBalanceWalletIcon />,
    children: [
      { key: "subscription", path: "/elofizetes", icon: <SubscriptionsIcon /> },
      { key: "baseCost", path: "/alap-koltseg", icon: <TableChartIcon /> },
      { key: "monthly", path: "/havi-koltseg", icon: <CalendarMonthIcon /> },
    ],
  },
  {
    key: "finance",
    icon: <PaymentsIcon />,
    children: [
      { key: "income", path: "/bevetel", icon: <AttachMoneyIcon /> },
      { key: "investment", path: "/befektetes", icon: <TrendingUpIcon /> },
      { key: "saving", path: "/megtakaritas", icon: <SavingsIcon /> },
    ],
  },
  {
    key: "housing",
    icon: <HomeIcon />,
    children: [
      { key: "utility", path: "/rezsi", icon: <BoltIcon /> },
      // Egyéb: a korábbi Lakhatás oldal tartalma (hitel / albérlet)
      { key: "housingOther", path: "/lakhatas", icon: <HomeIcon /> },
    ],
  },
  { key: "insurance", path: "/biztositas", icon: <ShieldIcon /> },

  {
    key: "transport",
    icon: <DirectionsBusIcon />,
    children: [
      { key: "travel", path: "/utazas", icon: <FlightTakeoffIcon /> },
      { key: "car", path: "/auto", icon: <DirectionsCarIcon /> },
      { key: "motorcycle", path: "/motor", icon: <TwoWheelerIcon /> },
      { key: "bicycle", path: "/kerekpar", icon: <PedalBikeIcon /> },
    ],
  },
  {
    key: "settings",
    path: "/beallitasok",
    icon: <SettingsIcon />,
    children: [
      { key: "paymentMethod", path: "/beallitasok/fizetesi-mod", icon: <CreditCardIcon /> },
      { key: "utilityCategory", path: "/beallitasok/rezsi-kategoria", icon: <CategoryIcon /> },
      { key: "productCategory", path: "/beallitasok/termek-kategoria", icon: <SellIcon /> },
      { key: "store", path: "/beallitasok/bolt", icon: <StorefrontIcon /> },
    ],
  },
];

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

  // Az aktív oldalt tartalmazó csoportok induláskor nyitva
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {};
    for (const item of MENU_ITEMS) {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) open[item.key] = true;
    }
    return open;
  });
  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const isSelected = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const go = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const renderLeaf = (item: MenuLeaf, indent = false) => (
    <ListItemButton
      key={item.key}
      selected={isSelected(item.path)}
      onClick={() => go(item.path)}
      sx={{ borderRadius: 2, mx: 1, my: 0.25, ...(indent && { pl: 4 }) }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
      <ListItemText primary={t(`menu.${item.key}`)} />
    </ListItemButton>
  );

  const drawer = (
    <Box sx={{ overflowY: "auto", marginTop: "4rem" }}>
      <List>
        {MENU_ITEMS.map((item) => {
          if (!item.children) return renderLeaf(item as MenuLeaf);
          const open = Boolean(openGroups[item.key]);
          return (
            <Box key={item.key}>
              <ListItemButton
                // Saját oldallal rendelkező szülő (Lakhatás, Beállítások): kattintásra navigál,
                // a nyíl nyit/zár; oldal nélküli kategória kattintásra csak nyit/zár.
                selected={item.path ? location.pathname === item.path : false}
                onClick={() => {
                  if (item.path) {
                    go(item.path);
                    if (!open) toggleGroup(item.key);
                  } else {
                    toggleGroup(item.key);
                  }
                }}
                sx={{ borderRadius: 2, mx: 1, my: 0.25 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={t(`menu.${item.key}`)} />
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={`${t(`menu.${item.key}`)} ${t("common.expand")}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(item.key);
                  }}
                >
                  {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </ListItemButton>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <List disablePadding>{item.children.map((child) => renderLeaf(child, true))}</List>
              </Collapse>
            </Box>
          );
        })}
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

          {isDesktop && (
            <Toolbar>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  padding: 1,
                }}
              >
                <Typography variant="h5" color="primary">
                  {t("app.name")} - {t("app.acronym")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("app.subtitle")}
                </Typography>
              </Box>
            </Toolbar>
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
