import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PaginatedTableFooter from '@/Components/admin/PaginatedTableFooter';
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
import { ReceiptLong as ReceiptLongIcon, Search as SearchIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import { useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');
const formatMonth = (value) => (value ? String(value).slice(0, 7) : '-');

export default function ReportOverdue({ filters, branches, canFilterBranch, summary, overdueAging, overdueInvoices, canManageCustomers }) {
    const { admin_app_url } = usePage().props;
    const rows = useMemo(() => overdueInvoices?.data || [], [overdueInvoices]);
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const [branchId, setBranchId] = useState(filters?.branch_id || '');
    const [query, setQuery] = useState(filters?.q || '');
    const perPage = Number(filters?.per_page || overdueInvoices?.per_page || 15);

    const applyFilters = () => {
        router.get(
            `${admin_app_url}/reports/overdue`,
            {
                month: month || undefined,
                branch_id: branchId || undefined,
                q: query || undefined,
                per_page: perPage,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        const defaultMonth = new Date().toISOString().slice(0, 7);
        setMonth(defaultMonth);
        setBranchId('');
        setQuery('');
        router.get(
            `${admin_app_url}/reports/overdue`,
            { month: defaultMonth, per_page: perPage },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const openCustomer = (customerId) => {
        if (!customerId || !canManageCustomers) return;

        router.get(`${admin_app_url}/customers/${customerId}`);
    };

    return (
        <AdminLayout title="Overdue List">
            <Head title="Overdue List" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Billing"
                    title="Overdue list"
                    description={`Outstanding invoices overdue as of ${formatDate(filters?.as_of_date)}. Future due dates are excluded.`}
                    actions={
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="text"
                                color="inherit"
                                onClick={() =>
                                    router.get(`${admin_app_url}/reports`, {
                                        month: month || undefined,
                                        branch_id: branchId || undefined,
                                    })
                                }
                            >
                                Back To Report
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
                            md: 'repeat(3, minmax(0, 1fr))',
                        },
                    }}
                >
                    <AppSurface sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Overdue invoices
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5, mb: 0.5 }}>
                            {summary?.count ?? 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Invoice rows currently overdue in the selected scope.
                        </Typography>
                    </AppSurface>
                    <AppSurface sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Affected customers
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5, mb: 0.5 }}>
                            {summary?.customer_count ?? 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Unique customers requiring collection follow-up.
                        </Typography>
                    </AppSurface>
                    <AppSurface sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Overdue balance
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5, mb: 0.5 }}>
                            {formatCurrency(summary?.balance_amount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total outstanding overdue balance.
                        </Typography>
                    </AppSurface>
                    {(overdueAging || []).map((bucket) => (
                        <AppSurface key={bucket.key} sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {bucket.label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5, mb: 0.5 }}>
                                {bucket.customer_count ?? 0} customer(s)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Overdue balance {formatCurrency(bucket.balance_amount)}
                            </Typography>
                        </AppSurface>
                    ))}
                </Box>

                <TableCard
                    title="Overdue invoices"
                    description={`${overdueInvoices?.from || 0}-${overdueInvoices?.to || 0} of ${overdueInvoices?.total || 0} overdue invoice records in the current view.`}
                    toolbar={
                        <>
                            <TextField
                                size="small"
                                label="Search"
                                placeholder="Invoice, customer, code, phone"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') applyFilters();
                                }}
                                sx={{ minWidth: { xs: '100%', sm: 220 } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                size="small"
                                type="month"
                                label="Month"
                                value={month}
                                onChange={(event) => setMonth(event.target.value)}
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
                        </>
                    }
                >
                    {rows.length ? (
                        <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Due</TableCell>
                                        <TableCell align="right">Days overdue</TableCell>
                                        <TableCell>Month</TableCell>
                                        <TableCell align="right">Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((invoice) => (
                                        <TableRow key={invoice.id} hover>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 760 }}>{invoice.invoice_number || '-'}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {invoice.branch?.name || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={() => openCustomer(invoice.customer?.id)}
                                                    disabled={!invoice.customer?.id || !canManageCustomers}
                                                    sx={{
                                                        width: '100%',
                                                        p: 0,
                                                        m: 0,
                                                        border: 0,
                                                        bgcolor: 'transparent',
                                                        textAlign: 'left',
                                                        color: 'inherit',
                                                        cursor: invoice.customer?.id && canManageCustomers ? 'pointer' : 'default',
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 700,
                                                            transition: 'color 0.18s ease',
                                                            '&:hover': {
                                                                color: invoice.customer?.id && canManageCustomers ? 'primary.main' : 'inherit',
                                                            },
                                                        }}
                                                    >
                                                        {invoice.customer?.name || '-'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {invoice.customer?.customer_code || invoice.customer?.phone || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(invoice.due_date)}</TableCell>
                                            <TableCell align="right">{invoice.days_overdue ?? '-'}</TableCell>
                                            <TableCell>{formatMonth(invoice.invoice_month)}</TableCell>
                                            <TableCell align="right">{formatCurrency(invoice.balance_amount)}</TableCell>
                                            <TableCell>
                                                <StatusBadge status="overdue" label="overdue" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : (
                        <EmptyState
                            compact
                            icon={<WarningAmberIcon />}
                            title="No overdue invoices"
                            description="The current selection has no overdue exposure yet."
                        />
                    )}
                    <PaginatedTableFooter pagination={overdueInvoices} baseUrl={`${admin_app_url}/reports/overdue`} filters={filters} />
                </TableCard>

                <AppSurface sx={{ p: 1.5 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 780, mb: 0.35 }}>
                                Follow-up note
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Prioritize the oldest balances first, then open the customer record to generate invoices or record payment when your role permits it.
                            </Typography>
                        </Box>
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<ReceiptLongIcon />}
                                onClick={() =>
                                    router.get(`${admin_app_url}/reports`, {
                                        month: month || undefined,
                                        branch_id: branchId || undefined,
                                    })
                                }
                            >
                                Open Collection Report
                            </Button>
                        </Box>
                    </Stack>
                </AppSurface>
            </Stack>
        </AdminLayout>
    );
}
