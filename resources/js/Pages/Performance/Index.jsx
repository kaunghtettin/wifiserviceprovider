import AppSurface from '@/Components/admin/AppSurface';
import PageHeader from '@/Components/admin/PageHeader';
import StatCard from '@/Components/admin/StatCard';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    MonetizationOn as IncomeIcon,
    Paid as NetIncomeIcon,
    People as CustomersIcon,
    ReceiptLong as BilledIcon,
    TrendingDown as ExpenseIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
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
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
const cleanParams = (params) =>
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));

function MetricBar({ value, color = 'primary.main' }) {
    return (
        <Stack spacing={0.6}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatPercent(value)}
            </Typography>
            <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(Number(value || 0), 100))}
                sx={{
                    height: 7,
                    borderRadius: 999,
                    bgcolor: 'rgba(148,163,184,0.16)',
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        bgcolor: color,
                    },
                }}
            />
        </Stack>
    );
}

function InsightCard({ title, branch, primaryLabel, primaryValue, helper }) {
    return (
        <AppSurface sx={{ p: 1.75, minHeight: 148 }}>
            <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                    {title}
                </Typography>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                        {branch?.name || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {branch?.code || 'No branch code'}
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        {primaryLabel}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 820 }}>
                        {primaryValue}
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {helper}
                </Typography>
            </Stack>
        </AppSurface>
    );
}

export default function PerformanceIndex({ filters, branches, canFilterBranch, summary, insights, branchPerformance, trend }) {
    const { admin_app_url } = usePage().props;
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    const applyFilters = () => {
        router.get(
            `${admin_app_url}/performance`,
            cleanParams({
                month,
                branch_id: branchId,
            }),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const resetFilters = () => {
        const nextMonth = new Date().toISOString().slice(0, 7);
        setMonth(nextMonth);
        setBranchId('');
        router.get(
            `${admin_app_url}/performance`,
            { month: nextMonth },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const statValues = useMemo(
        () => [
            {
                label: 'Income',
                value: formatCurrency(summary?.income_total),
                helper: 'Cash collected from payments in the selected month.',
                icon: <IncomeIcon fontSize="small" />,
                color: '#22c55e',
                values: trend.map((row) => Math.max(18, Math.round((Number(row.income || 0) / Math.max(Number(summary?.income_total || 0), 1)) * 42))),
            },
            {
                label: 'Expenses',
                value: formatCurrency(summary?.expense_total),
                helper: 'Operational spending recorded across visible branches.',
                icon: <ExpenseIcon fontSize="small" />,
                color: '#f59e0b',
                values: trend.map((row) => Math.max(18, Math.round((Number(row.expenses || 0) / Math.max(Number(summary?.expense_total || 0), 1)) * 42))),
            },
            {
                label: 'Net income',
                value: formatCurrency(summary?.net_income),
                helper: `${summary?.profitable_branch_count ?? 0} branch(es) are above break-even this month.`,
                icon: <NetIncomeIcon fontSize="small" />,
                color: '#3b82f6',
                values: trend.map((row) => Math.max(18, Math.round((Math.max(Number(row.net_income || 0), 0) / Math.max(Number(summary?.income_total || 0), 1)) * 42))),
            },
            {
                label: 'Active customers',
                value: `${summary?.active_customers ?? 0} / ${summary?.total_customers ?? 0}`,
                helper: `${formatPercent(summary?.active_ratio)} of visible customers are active.`,
                icon: <CustomersIcon fontSize="small" />,
                color: '#8b5cf6',
                values: trend.map((_, index) => 22 + (index % 3) * 6),
            },
            {
                label: 'Collection rate',
                value: formatPercent(summary?.collection_rate),
                helper: `Billed ${formatCurrency(summary?.billed_total)} with overdue balance ${formatCurrency(summary?.overdue_total)}.`,
                icon: <BilledIcon fontSize="small" />,
                color: '#0ea5e9',
                values: trend.map((row) => Math.max(18, Math.round(Math.min(Number(row.billed || 0) > 0 ? (Number(row.income || 0) / Number(row.billed || 1)) * 42 : 18, 42)))),
            },
        ],
        [summary, trend],
    );

    return (
        <AdminLayout title="Performance">
            <Head title="Performance" />

            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="Branch Intelligence"
                    title="Branch performance"
                    description="Compare branch income, expenses, active customer base, collection quality, and overdue pressure for the selected month."
                    actions={[
                        <TextField
                            key="month"
                            type="month"
                            label="Month"
                            value={month}
                            onChange={(event) => setMonth(event.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ minWidth: { xs: '100%', sm: 168 } }}
                        />,
                        canFilterBranch ? (
                            <TextField
                                key="branch"
                                select
                                label="Branch"
                                value={branchId}
                                onChange={(event) => setBranchId(event.target.value)}
                                sx={{ minWidth: { xs: '100%', sm: 180 } }}
                            >
                                <MenuItem value="">All branches</MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : null,
                        <Button key="apply" variant="contained" onClick={applyFilters}>
                            Apply
                        </Button>,
                        <Button key="reset" variant="text" color="inherit" onClick={resetFilters}>
                            Reset
                        </Button>,
                    ]}
                />

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.25,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            xl: 'repeat(5, minmax(0, 1fr))',
                        },
                    }}
                >
                    {statValues.map((item) => (
                        <StatCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            helper={item.helper}
                            icon={item.icon}
                            color={item.color}
                            values={item.values}
                        />
                    ))}
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.25,
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'repeat(2, minmax(0, 1fr))',
                            xl: 'repeat(4, minmax(0, 1fr))',
                        },
                    }}
                >
                    <InsightCard
                        title="Top net income"
                        branch={insights?.top_net_branch}
                        primaryLabel="Net income"
                        primaryValue={formatCurrency(insights?.top_net_branch?.net_income)}
                        helper="Best branch after subtracting expenses from current month income."
                    />
                    <InsightCard
                        title="Best collection"
                        branch={insights?.top_collection_branch}
                        primaryLabel="Collection rate"
                        primaryValue={formatPercent(insights?.top_collection_branch?.collection_rate)}
                        helper="Strongest branch at turning billed invoices into collected cash."
                    />
                    <InsightCard
                        title="Strongest active base"
                        branch={insights?.top_active_branch}
                        primaryLabel="Active ratio"
                        primaryValue={formatPercent(insights?.top_active_branch?.active_ratio)}
                        helper="Highest share of active customers inside the visible customer base."
                    />
                    <InsightCard
                        title="Highest cost pressure"
                        branch={insights?.highest_expense_branch}
                        primaryLabel="Expense ratio"
                        primaryValue={formatPercent(insights?.highest_expense_branch?.expense_ratio)}
                        helper="Branch with the largest expense load relative to collected income."
                    />
                </Box>

                <TableCard
                    title="Branch comparison"
                    description="Review financial and customer performance side by side for each visible branch."
                >
                    <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                        <Table size="small" stickyHeader sx={{ minWidth: 1320 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Branch</TableCell>
                                    <TableCell align="right">Income</TableCell>
                                    <TableCell align="right">Expenses</TableCell>
                                    <TableCell align="right">Net</TableCell>
                                    <TableCell align="right">Billed</TableCell>
                                    <TableCell>Collection</TableCell>
                                    <TableCell align="right">Overdue</TableCell>
                                    <TableCell align="right">Active</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell>Active rate</TableCell>
                                    <TableCell align="right">Income share</TableCell>
                                    <TableCell align="right">ARPU</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {branchPerformance.map((branch) => (
                                    <TableRow key={branch.id} hover>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 760 }}>{branch.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {branch.code || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(branch.income)}</TableCell>
                                        <TableCell align="right">{formatCurrency(branch.expenses)}</TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                sx={{
                                                    fontWeight: 760,
                                                    color: Number(branch.net_income || 0) >= 0 ? 'success.main' : 'error.main',
                                                }}
                                            >
                                                {formatCurrency(branch.net_income)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(branch.billed)}</TableCell>
                                        <TableCell sx={{ minWidth: 150 }}>
                                            <MetricBar value={branch.collection_rate} color="#0ea5e9" />
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(branch.overdue_balance)}</TableCell>
                                        <TableCell align="right">{branch.active_customers}</TableCell>
                                        <TableCell align="right">{branch.total_customers}</TableCell>
                                        <TableCell sx={{ minWidth: 150 }}>
                                            <MetricBar value={branch.active_ratio} color="#8b5cf6" />
                                        </TableCell>
                                        <TableCell align="right">{formatPercent(branch.income_share)}</TableCell>
                                        <TableCell align="right">{formatCurrency(branch.avg_income_per_active_customer)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </TableCard>

                <TableCard
                    title="Six month trend"
                    description="Track how billed revenue, collected income, expenses, and net result move over time for the visible scope."
                >
                    <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                        <Table size="small" stickyHeader sx={{ minWidth: 760 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Month</TableCell>
                                    <TableCell align="right">Billed</TableCell>
                                    <TableCell align="right">Income</TableCell>
                                    <TableCell align="right">Expenses</TableCell>
                                    <TableCell align="right">Net income</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trend.map((row) => (
                                    <TableRow key={row.month} hover>
                                        <TableCell>{row.month}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.billed)}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.income)}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.expenses)}</TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                sx={{
                                                    fontWeight: 760,
                                                    color: Number(row.net_income || 0) >= 0 ? 'success.main' : 'error.main',
                                                }}
                                            >
                                                {formatCurrency(row.net_income)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </TableCard>

                <AppSurface sx={{ p: 1.75 }}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 780, mb: 0.5 }}>
                                Quick reading
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Use net income to judge branch profitability, collection rate to see cash collection quality, active rate to monitor service health,
                                and overdue balance to find branches that need stronger follow-up.
                            </Typography>
                        </Box>
                        <Stack spacing={0.5} sx={{ minWidth: { lg: 320 } }}>
                            <Typography variant="body2" color="text.secondary">
                                Average income per active customer: {formatCurrency(summary?.avg_income_per_active_customer)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total overdue balance in scope: {formatCurrency(summary?.overdue_total)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active customer ratio in scope: {formatPercent(summary?.active_ratio)}
                            </Typography>
                        </Stack>
                    </Stack>
                </AppSurface>
            </Stack>
        </AdminLayout>
    );
}
