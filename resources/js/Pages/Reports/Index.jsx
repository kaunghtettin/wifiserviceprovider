import AppSurface from '@/Components/admin/AppSurface';
import PageHeader from '@/Components/admin/PageHeader';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AccountBalanceWalletRounded as ExpenseIcon,
    CalendarMonthRounded as CalendarIcon,
    PaidRounded as PaidIcon,
    ReceiptLongRounded as ReceiptLongIcon,
    SearchRounded as SearchIcon,
    TrendingUpRounded as TrendingUpIcon,
    WarningAmberRounded as WarningAmberIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    InputAdornment,
    LinearProgress,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');
const monthLabel = (value) => {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return 'Selected month';
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
};
const monthBounds = (value) => {
    const [year, month] = String(value || '').split('-').map(Number);
    if (!year || !month) return { start: '', end: '' };

    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
        start: `${value}-01`,
        end: `${value}-${String(lastDay).padStart(2, '0')}`,
    };
};

function SummaryCard({ label, value, helper, icon, tone }) {
    return (
        <AppSurface sx={{ p: 1.5, minHeight: 132 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5 }}>{value}</Typography>
                </Box>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 2.5,
                        bgcolor: `${tone}14`,
                        color: tone,
                    }}
                >
                    {icon}
                </Box>
            </Stack>
            <Typography variant="body2" color="text.secondary">{helper}</Typography>
        </AppSurface>
    );
}

function YearlyChart({ rows }) {
    const maxValue = Math.max(...rows.flatMap((row) => [row.sales, row.expenses, Math.abs(row.net_profit)]), 1);
    const height = (value) => Math.max(value ? 8 : 2, Math.round((Math.abs(Number(value || 0)) / maxValue) * 150));

    return (
        <AppSurface sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Year by month</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Collected sales, expenses, and net profit for each month.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                    {[
                        ['Sales', '#16a34a'],
                        ['Expenses', '#f59e0b'],
                        ['Net profit', '#2563eb'],
                    ].map(([label, color]) => (
                        <Stack key={label} direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </Stack>
                    ))}
                </Stack>
            </Stack>

            <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                <Stack direction="row" spacing={1.1} sx={{ minWidth: 780, height: 190, alignItems: 'flex-end' }}>
                    {rows.map((row) => (
                        <Stack key={row.month_number} spacing={0.75} sx={{ flex: 1, alignItems: 'center' }}>
                            <Stack direction="row" spacing={0.35} sx={{ height: 154, alignItems: 'flex-end' }}>
                                <Box title={`Sales: ${formatCurrency(row.sales)}`} sx={{ width: 11, height: height(row.sales), borderRadius: '5px 5px 2px 2px', bgcolor: '#16a34a' }} />
                                <Box title={`Expenses: ${formatCurrency(row.expenses)}`} sx={{ width: 11, height: height(row.expenses), borderRadius: '5px 5px 2px 2px', bgcolor: '#f59e0b' }} />
                                <Box
                                    title={`Net profit: ${formatCurrency(row.net_profit)}`}
                                    sx={{
                                        width: 11,
                                        height: height(row.net_profit),
                                        borderRadius: '5px 5px 2px 2px',
                                        bgcolor: Number(row.net_profit) >= 0 ? '#2563eb' : '#dc2626',
                                    }}
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{row.month}</Typography>
                        </Stack>
                    ))}
                </Stack>
            </Box>
        </AppSurface>
    );
}

function DailySalesChart({ rows, label }) {
    const maxValue = Math.max(...rows.map((row) => Number(row.sales || 0)), 1);

    return (
        <AppSurface sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Daily sales</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cash collected each day in {label}.
            </Typography>
            <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                <Stack direction="row" spacing={0.65} sx={{ minWidth: Math.max(rows.length * 31, 700), height: 178, alignItems: 'flex-end' }}>
                    {rows.map((row) => {
                        const barHeight = Math.max(row.sales ? 7 : 2, Math.round((Number(row.sales || 0) / maxValue) * 135));

                        return (
                            <Stack key={row.date} spacing={0.55} sx={{ flex: 1, alignItems: 'center' }}>
                                <Box
                                    title={`${row.date}: ${formatCurrency(row.sales)}`}
                                    sx={{
                                        width: '70%',
                                        minWidth: 8,
                                        maxWidth: 18,
                                        height: barHeight,
                                        borderRadius: '5px 5px 2px 2px',
                                        background: row.sales
                                            ? 'linear-gradient(180deg, #60a5fa, #2563eb)'
                                            : 'rgba(148,163,184,0.18)',
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                    {row.day}
                                </Typography>
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>
        </AppSurface>
    );
}

function ExpenseBreakdown({ title, subtitle, rows, total, color }) {
    const maxAmount = Math.max(...rows.map((row) => Number(row.amount || 0)), 1);

    return (
        <AppSurface sx={{ p: 2, height: '100%' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.75 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
                    <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
                </Box>
                <Chip size="small" label={formatCurrency(total)} sx={{ color, bgcolor: `${color}12` }} />
            </Stack>

            <Stack spacing={1.5}>
                {rows.length ? rows.map((row) => (
                    <Box key={row.category}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mb: 0.55 }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 750 }} noWrap>{row.label}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.count} record(s)</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatCurrency(row.amount)}</Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={(Number(row.amount || 0) / maxAmount) * 100}
                            sx={{
                                height: 7,
                                borderRadius: 999,
                                bgcolor: 'rgba(148,163,184,0.14)',
                                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
                            }}
                        />
                    </Box>
                )) : (
                    <Typography variant="body2" color="text.secondary">No expense records in this scope.</Typography>
                )}
            </Stack>
        </AppSurface>
    );
}

export default function ReportIndex({
    filters,
    branches,
    canFilterBranch,
    summary,
    yearlyTrend = [],
    dailySales = [],
    expenseAnalysis = {},
}) {
    const { admin_app_url } = usePage().props;
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const [periodStart, setPeriodStart] = useState(filters?.period_start || `${month}-01`);
    const [periodEnd, setPeriodEnd] = useState(filters?.period_end || `${month}-31`);
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    const yearlyTotals = useMemo(() => yearlyTrend.reduce(
        (totals, row) => ({
            sales: totals.sales + Number(row.sales || 0),
            expenses: totals.expenses + Number(row.expenses || 0),
            net: totals.net + Number(row.net_profit || 0),
        }),
        { sales: 0, expenses: 0, net: 0 },
    ), [yearlyTrend]);

    const applyFilters = () => {
        router.get(
            `${admin_app_url}/reports`,
            {
                month: month || undefined,
                period_start: periodStart || undefined,
                period_end: periodEnd || undefined,
                branch_id: branchId || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        const nextMonth = new Date().toISOString().slice(0, 7);
        const nextPeriod = monthBounds(nextMonth);
        setMonth(nextMonth);
        setPeriodStart(nextPeriod.start);
        setPeriodEnd(nextPeriod.end);
        setBranchId('');
        router.get(`${admin_app_url}/reports`, { month: nextMonth }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const cards = [
        {
            label: 'Billed revenue',
            value: formatCurrency(summary?.billed_amount),
            helper: 'Invoices generated for the selected month.',
            tone: '#2563eb',
            icon: <PaidIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'Collected sales',
            value: formatCurrency(summary?.collected_amount),
            helper: `${summary?.collection_rate ?? 0}% collection rate in this month.`,
            tone: '#16a34a',
            icon: <TrendingUpIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'Overdue balance',
            value: formatCurrency(summary?.overdue_amount),
            helper: `${summary?.overdue_count ?? 0} overdue invoice(s).`,
            tone: '#d97706',
            icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'Selected period expenses',
            value: formatCurrency(expenseAnalysis?.selected_period_total),
            helper: `${formatDate(filters?.period_start)} to ${formatDate(filters?.period_end)}.`,
            tone: '#dc2626',
            icon: <ExpenseIcon sx={{ fontSize: 18 }} />,
        },
    ];

    return (
        <AdminLayout title="Reports">
            <Head title="Reports" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Branch Analytics"
                    title="Sales, profit and expense report"
                    description={`Review ${monthLabel(filters?.month)} activity and compare expense categories for any selected period.`}
                    actions={
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                size="small"
                                type="month"
                                label="Analysis month"
                                value={month}
                                onChange={(event) => {
                                    const nextMonth = event.target.value;
                                    const nextPeriod = monthBounds(nextMonth);
                                    setMonth(nextMonth);
                                    setPeriodStart(nextPeriod.start);
                                    setPeriodEnd(nextPeriod.end);
                                }}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                size="small"
                                type="date"
                                label="Expense period from"
                                value={periodStart}
                                onChange={(event) => setPeriodStart(event.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                size="small"
                                type="date"
                                label="Expense period to"
                                value={periodEnd}
                                onChange={(event) => setPeriodEnd(event.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            {canFilterBranch ? (
                                <TextField
                                    select
                                    size="small"
                                    label="Branch"
                                    value={branchId}
                                    onChange={(event) => setBranchId(event.target.value)}
                                    sx={{ minWidth: 150 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                >
                                    <MenuItem value="">All branches</MenuItem>
                                    {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
                                </TextField>
                            ) : null}
                            <Button variant="contained" onClick={applyFilters}>Apply</Button>
                            <Button variant="text" color="inherit" onClick={resetFilters}>Reset</Button>
                        </Stack>
                    }
                />

                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' } }}>
                    {cards.map((card) => <SummaryCard key={card.label} {...card} />)}
                </Box>

                <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.35fr) minmax(0, 1fr)' } }}>
                    <YearlyChart rows={yearlyTrend} />
                    <DailySalesChart rows={dailySales} label={monthLabel(filters?.month)} />
                </Box>

                <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
                    <ExpenseBreakdown
                        title="Selected period expenses"
                        subtitle={`${formatDate(filters?.period_start)} to ${formatDate(filters?.period_end)}`}
                        rows={expenseAnalysis?.selected_period || []}
                        total={expenseAnalysis?.selected_period_total}
                        color="#dc2626"
                    />
                    <ExpenseBreakdown
                        title="All-time expense analysis"
                        subtitle="Category totals across all recorded branch expenses"
                        rows={expenseAnalysis?.all_time || []}
                        total={expenseAnalysis?.all_time_total}
                        color="#7c3aed"
                    />
                </Box>

                <TableCard
                    title={`${String(filters?.month || '').slice(0, 4)} monthly financial detail`}
                    description="Exact monthly values behind the yearly chart. Sales are collected payments; net profit is sales minus expenses."
                >
                    <Box sx={{ width: '100%', overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 680 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Month</TableCell>
                                    <TableCell align="right">Sales</TableCell>
                                    <TableCell align="right">Expenses</TableCell>
                                    <TableCell align="right">Net profit</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {yearlyTrend.map((row) => (
                                    <TableRow key={row.month_number} hover>
                                        <TableCell>{row.month}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.sales)}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.expenses)}</TableCell>
                                        <TableCell align="right">
                                            <Typography sx={{ fontWeight: 780, color: Number(row.net_profit) >= 0 ? 'success.main' : 'error.main' }}>
                                                {formatCurrency(row.net_profit)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 850 }}>Year total</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 850 }}>{formatCurrency(yearlyTotals.sales)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 850 }}>{formatCurrency(yearlyTotals.expenses)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 850, color: yearlyTotals.net >= 0 ? 'success.main' : 'error.main' }}>
                                        {formatCurrency(yearlyTotals.net)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                </TableCard>

                <AppSurface sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>Collection status</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Invoice collection health for {monthLabel(filters?.month)}, calculated as of {formatDate(filters?.as_of_date)}.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            <Chip icon={<ReceiptLongIcon />} label={`${summary?.paid_invoice_count ?? 0} paid`} />
                            <Chip icon={<CalendarIcon />} label={`${summary?.partial_invoice_count ?? 0} partial`} />
                            <Chip color="warning" label={`${summary?.unpaid_invoice_count ?? 0} unpaid/overdue`} />
                        </Stack>
                    </Stack>
                </AppSurface>
            </Stack>
        </AdminLayout>
    );
}
