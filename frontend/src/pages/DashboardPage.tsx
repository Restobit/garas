import { useState } from "react";
import {
  Box,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Money } from "../components/Money";
import { useApp } from "../context/AppContext";
import { formatMoney, monthLabel } from "../lib/format";
import { chartColors } from "../theme";
import type { DashboardData } from "../lib/types";

/**
 * Rangsorolt vízszintes sávdiagram — egy mérték, egy szín (dataviz: sequential,
 * nem kategorikus szivárvány), direkt címkékkel, hover tooltippel.
 */
function BarList({ data, color }: { data: { name: string; amount: number }[]; color: string }) {
  const { incognito, settings } = useApp();
  const { t } = useTranslation();
  const max = Math.max(...data.map((d) => d.amount), 1);
  if (data.length === 0) {
    return <Typography color="text.secondary">{t("common.empty")}</Typography>;
  }
  return (
    <Stack spacing={1}>
      {data.map((row) => (
        <Tooltip
          key={row.name}
          title={incognito ? "" : `${row.name}: ${formatMoney(row.amount, settings?.currency ?? "HUF")}`}
          placement="right"
        >
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="body2" noWrap sx={{ maxWidth: "60%" }}>
                {row.name}
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                <Money amount={row.amount} />
              </Typography>
            </Stack>
            <Box sx={{ bgcolor: "action.hover", borderRadius: "4px", height: 10 }}>
              <Box
                sx={{
                  width: `${Math.max((row.amount / max) * 100, 2)}%`,
                  height: 10,
                  bgcolor: color,
                  borderRadius: "0 4px 4px 0",
                  ...(incognito && { filter: "blur(4px)" }),
                }}
              />
            </Box>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}

function StatTile({ label, amount, color }: { label: string; amount: number; color?: "positive" | "neutral" | "negative" }) {
  return (
    <Paper sx={{ p: 2.5, height: "100%" }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h5">
        <Money amount={amount} color={color ?? "inherit"} />
      </Typography>
    </Paper>
  );
}

// --- 1. Dashboard ---
export function DashboardPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = chartColors[theme.palette.mode];
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data } = useQuery({
    queryKey: ["dashboard", year],
    queryFn: () => api.get<DashboardData>(`/dashboard?year=${year}`),
  });

  if (!data) return <Typography color="text.secondary">{t("common.loading")}</Typography>;

  const summaryRows = [
    { key: "utility", label: t("menu.utility") },
    { key: "transport", label: t("menu.transport") },
    { key: "subscription", label: t("dashboard.subscriptions") },
    { key: "housing", label: t("menu.housing") },
    { key: "insurance", label: t("menu.insurance") },
  ] as const;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{t("menu.dashboard")}</Typography>
        <TextField
          select
          size="small"
          label={t("common.year")}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {data.availableYears.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Grid container spacing={2}>
        {/* Összesített stat csempék */}
        <Grid item xs={12} sm={6} md={3}>
          <StatTile label={t("dashboard.investmentTotal")} amount={data.investmentTotal} color="neutral" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile label={t("dashboard.savingTotal")} amount={data.savingTotal} color="positive" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={t("dashboard.yearlyIncome")}
            amount={data.months.reduce((a, m) => a + m.income, 0)}
            color="positive"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={t("dashboard.yearlyExpense")}
            amount={data.months.reduce((a, m) => a + m.expense, 0)}
            color="negative"
          />
        </Grid>

        {/* Január–December: havi Bevétel / Kiadás */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t("dashboard.monthlyTable")}
            </Typography>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("common.month")}</TableCell>
                    <TableCell align="right">{t("monthly.income")}</TableCell>
                    <TableCell align="right">{t("dashboard.expense")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.months.map((m) => (
                    <TableRow key={m.month} hover>
                      <TableCell>{monthLabel(m.month)}</TableCell>
                      <TableCell align="right">
                        <Money amount={m.income} color={m.income > 0 ? "positive" : "inherit"} />
                      </TableCell>
                      <TableCell align="right">
                        <Money amount={m.expense} color={m.expense > 0 ? "negative" : "inherit"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            {/* Melyik kategóriában költöttem a legtöbbet */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                {t("dashboard.topCategories")}
              </Typography>
              <BarList data={data.topCategories} color={colors.neutral} />
            </Paper>
            {/* Hol vásároltam a legtöbbet */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                {t("dashboard.topStores")}
              </Typography>
              <BarList data={data.topStores} color={colors.positive} />
            </Paper>
          </Stack>
        </Grid>

        {/* Éves összesítés kategóriánként */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              {t("dashboard.yearlySummary")}
            </Typography>
            <Grid container spacing={2}>
              {summaryRows.map((row) => (
                <Grid item xs={6} sm={4} md={2.4} key={row.key}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {row.label}
                    </Typography>
                    <Typography variant="h6">
                      <Money amount={data.yearlySummary[row.key]} />
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
