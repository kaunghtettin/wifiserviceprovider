import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PageHeader from '@/Components/admin/PageHeader';
import StatusBadge from '@/Components/admin/StatusBadge';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Box,
    Button,
    InputAdornment,
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
import {
    CheckCircleOutline as CheckCircleOutlineIcon,
    Paid as PaidIcon,
    Search as SearchIcon,
    TrendingUp as TrendingUpIcon,
    WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { useState } from 'react';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');
const formatMonth = (value) => (value ? String(value).slice(0, 7) : '-');

export default function ReportIndex({ filters, branches, canFilterBranch, summary, overdueInvoices }) {
    const { admin_app_url } = usePage().props;
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    const cards = [
        {
            label: 'Billed revenue',
            value: formatCurrency(summary?.billed_amount),
            helper: 'Invoices generated for the selected month.',
            tone: 'primary',
            icon: <PaidIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'Collected cash',
            value: formatCurrency(summary?.collected_amount),
            helper: `${summary?.collection_rate ?? 0}% collection rate in this period.`,
            tone: 'success',
            icon: <TrendingUpIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'Overdue balance',
            value: formatCurrency(summary?.overdue_amount),
            helper: `${summary?.overdue_count ?? 0} overdue invoice(s) still need follow-up.`,
            tone: 'warning',
            icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'Paid invoices',
            value: summary?.paid_invoice_count ?? 0,
            helper: `${summary?.partial_invoice_count ?? 0} partial and ${summary?.unpaid_invoice_count ?? 0} unpaid/overdue invoices remain.`,
            tone: 'success',
            icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
        },
    ];

    const applyFilters = () => {
        router.get(
            `${admin_app_url}/reports`,
            {
                month: month || undefined,
                branch_id: branchId || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        const defaultMonth = new Date().toISOString().slice(0, 7);
        setMonth(defaultMonth);
        setBranchId('');
        router.get(
            `${admin_app_url}/reports`,
            { month: defaultMonth },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const toneStyles = {
        primary: { bg: 'rgba(59,130,246,0.10)', color: '#2563eb' },
        success: { bg: 'rgba(34,197,94,0.10)', color: '#15803d' },
        warning: { bg: 'rgba(245,158,11,0.12)', color: '#b45309' },
        danger: { bg: 'rgba(239,68,68,0.10)', color: '#b91c1c' },
    };

    return (
        <AdminLayout title="Reports">
            <Head title="Reports" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Billing"
                    title="Collection report"
                    description="Review invoice collection, overdue exposure, and billing follow-up for the selected month. Use the Performance page for branch comparison and trend analysis."
                    actions={
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                type="month"
                                label="Month"
                                value={month}
                                onChange={(event) => setMonth(event.target.value)}
                                InputLabelProps={{ shrink: true }}
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
                                    {branches.map((branch) => (
                                        <MenuItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            ) : null}
                            <Button variant="outlined" onClick={applyFilters}>
                                Apply
                            </Button>
                            <Button variant="text" color="inherit" onClick={resetFilters}>
                                Reset
                            </Button>
                        </Stack>
                    }
                />

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            xl: 'repeat(4, minmax(0, 1fr))',
                        },
                    }}
                >
                    {cards.map((card) => {
                        const tone = toneStyles[card.tone] || toneStyles.primary;

                        return (
                            <AppSurface key={card.label} sx={{ p: 1.5 }}>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {card.label}
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5 }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            display: 'grid',
                                            placeItems: 'center',
                                            borderRadius: '10px',
                                            bgcolor: tone.bg,
                                            color: tone.color,
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                    {card.helper}
                                </Typography>
                            </AppSurface>
                        );
                    })}
                </Box>

                <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
                    <AppSurface sx={{ flex: 1, p: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                            Collection status
                        </Typography>
                        <Stack spacing={1.1}>
                            {[
                                ['Paid invoices', summary?.paid_invoice_count ?? 0, 'Invoices fully collected within the selected invoice month.'],
                                ['Partial invoices', summary?.partial_invoice_count ?? 0, 'Invoices with some cash collected but balance still remaining.'],
                                ['Unpaid or overdue', summary?.unpaid_invoice_count ?? 0, 'Invoices that still need collection action from the team.'],
                                ['Collection rate', `${summary?.collection_rate ?? 0}%`, 'Share of monthly billed value already collected as cash.'],
                            ].map(([label, value, helper]) => (
                                <Box
                                    key={label}
                                    sx={{
                                        p: 1.25,
                                        borderRadius: '10px',
                                        bgcolor: 'rgba(148,163,184,0.06)',
                                        border: '1px solid rgba(148,163,184,0.08)',
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary">
                                        {label}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.35, mb: 0.25 }}>
                                        {value}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {helper}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    </AppSurface>

                    <TableCard
                        title="Overdue watchlist"
                        description="Largest unpaid balances that need branch follow-up."
                        sx={{ flex: 1 }}
                    >
                        {overdueInvoices?.length ? (
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Due</TableCell>
                                        <TableCell>Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {overdueInvoices.map((invoice) => (
                                        <TableRow key={invoice.id} hover>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 760 }}>{invoice.invoice_number}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {invoice.branch?.name || formatMonth(invoice.invoice_month)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 700 }}>{invoice.customer?.name || '-'}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {invoice.customer?.customer_code || invoice.customer?.phone || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(invoice.due_date)}</TableCell>
                                            <TableCell>{formatCurrency(invoice.balance_amount)}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={invoice.status} label={invoice.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <EmptyState
                                compact
                                icon={<WarningAmberIcon />}
                                title="No overdue invoices"
                                description="The current selection has no overdue exposure yet."
                            />
                        )}
                    </TableCard>
                </Stack>

                <AppSurface sx={{ p: 1.75 }}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 780, mb: 0.5 }}>
                                Report focus
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This page now focuses on invoice collection, overdue exposure, and billing follow-up. Open the Performance page when you want
                                branch ranking, income versus expense comparison, active customer analysis, and multi-month performance trends.
                            </Typography>
                        </Box>
                        <Box sx={{ alignSelf: { lg: 'center' } }}>
                            <Button variant="outlined" onClick={() => router.get(`${admin_app_url}/performance`, { month, branch_id: branchId || undefined })}>
                                Open Performance
                            </Button>
                        </Box>
                    </Stack>
                </AppSurface>
            </Stack>
        </AdminLayout>
    );
}
