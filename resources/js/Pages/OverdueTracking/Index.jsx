import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PageHeader from '@/Components/admin/PageHeader';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    BlockRounded,
    CalendarMonthRounded,
    PersonSearchRounded,
    SearchRounded,
    WarningAmberRounded,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import { useState } from 'react';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatMonth = (value) => {
    if (!value) return '-';
    const date = new Date(`${String(value).slice(0, 7)}-01T00:00:00`);
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
};
const formatLabel = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const streakTone = (months) => {
    if (months >= 3) return { color: '#b91c1c', bg: 'rgba(239,68,68,0.12)' };
    if (months === 2) return { color: '#b45309', bg: 'rgba(245,158,11,0.14)' };
    return { color: '#1d4ed8', bg: 'rgba(59,130,246,0.11)' };
};

export default function OverdueTrackingIndex({ tracking = [], filters, summary, asOfDate, statusOptions = [] }) {
    const { admin_app_url: appUrl } = usePage().props;
    const [query, setQuery] = useState(filters?.q || '');
    const [minimumMonths, setMinimumMonths] = useState(filters?.minimum_months || 1);
    const [suspendCustomer, setSuspendCustomer] = useState(null);
    const [updatingCustomerId, setUpdatingCustomerId] = useState(null);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [bulkStatus, setBulkStatus] = useState('suspended');
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const customerStatuses = statusOptions.length ? statusOptions : ['active', 'pending', 'suspended', 'disconnected'];
    const bulkStatusOptions = customerStatuses.filter((status) => status !== 'active');
    const visibleCustomerIds = tracking.map((item) => item.customer?.id).filter(Boolean);
    const selectedCount = selectedCustomerIds.length;
    const allVisibleSelected = visibleCustomerIds.length > 0 && visibleCustomerIds.every((id) => selectedCustomerIds.includes(id));
    const someVisibleSelected = visibleCustomerIds.some((id) => selectedCustomerIds.includes(id));

    const applyFilters = () => {
        setSelectedCustomerIds([]);
        router.get(
            `${appUrl}/overdue-tracking`,
            { q: query || undefined, minimum_months: minimumMonths },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const toggleCustomerSelection = (customerId) => {
        setSelectedCustomerIds((current) => (
            current.includes(customerId)
                ? current.filter((id) => id !== customerId)
                : [...current, customerId]
        ));
    };

    const toggleAllVisible = () => {
        setSelectedCustomerIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !visibleCustomerIds.includes(id));
            }

            return Array.from(new Set([...current, ...visibleCustomerIds]));
        });
    };

    const suspend = () => {
        if (!suspendCustomer?.id) return;

        router.post(
            `${appUrl}/overdue-tracking/${suspendCustomer.id}/suspend`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setSuspendCustomer(null),
            },
        );
    };

    const updateCustomerStatus = (customer, status) => {
        if (!customer?.id || status === customer.status) return;

        router.post(
            `${appUrl}/overdue-tracking/${customer.id}/status`,
            { status },
            {
                preserveScroll: true,
                onStart: () => setUpdatingCustomerId(customer.id),
                onFinish: () => setUpdatingCustomerId(null),
            },
        );
    };

    const bulkUpdateCustomerStatus = () => {
        if (!selectedCustomerIds.length || !bulkStatus) return;

        router.post(
            `${appUrl}/overdue-tracking/status`,
            { customer_ids: selectedCustomerIds, status: bulkStatus },
            {
                preserveScroll: true,
                onStart: () => setBulkUpdating(true),
                onSuccess: () => {
                    setSelectedCustomerIds([]);
                    setBulkDialogOpen(false);
                },
                onFinish: () => setBulkUpdating(false),
            },
        );
    };

    const cards = [
        ['Tracked customers', summary?.total_customers ?? 0, 'Customers with an active continuous overdue streak.', '#2563eb'],
        ['One month', summary?.one_month ?? 0, 'First consecutive overdue invoice month.', '#0ea5e9'],
        ['Two months', summary?.two_months ?? 0, 'Requires close collection follow-up.', '#d97706'],
        ['Three months or more', summary?.three_plus_months ?? 0, 'Eligible for service suspension.', '#dc2626'],
        ['Tracked balance', formatCurrency(summary?.outstanding_balance), 'Balance across the consecutive overdue invoices.', '#7c3aed'],
    ];

    return (
        <AdminLayout title="Overdue Tracking">
            <Head title="Overdue Tracking" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Collections"
                    title="Continuous overdue tracking"
                    description={`Track consecutive unpaid invoice months as of ${asOfDate}. A paid or missing month resets the streak.`}
                />

                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' } }}>
                    {cards.map(([label, value, helper, color]) => (
                        <AppSurface key={label} sx={{ p: 1.5, minHeight: 126 }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 840, mt: 0.4 }}>{value}</Typography>
                                </Box>
                                <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 2, color, bgcolor: `${color}14` }}>
                                    <CalendarMonthRounded fontSize="small" />
                                </Box>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{helper}</Typography>
                        </AppSurface>
                    ))}
                </Box>

                <TableCard
                    title="Customer overdue queue"
                    description={`${tracking.length} customer(s) match the current overdue streak filter.`}
                    toolbar={
                        <>
                            <TextField
                                size="small"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                                placeholder="Search customer"
                                sx={{ minWidth: { xs: '100%', sm: 230 } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRounded fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                select
                                size="small"
                                label="Minimum streak"
                                value={minimumMonths}
                                onChange={(event) => setMinimumMonths(Number(event.target.value))}
                                sx={{ minWidth: 150 }}
                            >
                                <MenuItem value={1}>1+ months</MenuItem>
                                <MenuItem value={2}>2+ months</MenuItem>
                                <MenuItem value={3}>3+ months</MenuItem>
                            </TextField>
                            <Button variant="outlined" onClick={applyFilters}>Apply</Button>
                        </>
                    }
                >
                    {tracking.length ? (
                        <Box sx={{ width: '100%', overflowX: 'auto' }}>
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1}
                                sx={{
                                    alignItems: { xs: 'stretch', md: 'center' },
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: selectedCount ? 'rgba(59,130,246,0.08)' : 'background.paper',
                                }}
                            >
                                <Typography variant="body2" color={selectedCount ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 750 }}>
                                    {selectedCount ? `${selectedCount} selected` : 'Select customers to change status in bulk'}
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <TextField
                                        select
                                        size="small"
                                        label="Set status"
                                        value={bulkStatus}
                                        onChange={(event) => setBulkStatus(event.target.value)}
                                        sx={{ minWidth: 170 }}
                                    >
                                        {bulkStatusOptions.map((status) => (
                                            <MenuItem key={status} value={status}>{formatLabel(status)}</MenuItem>
                                        ))}
                                    </TextField>
                                    <Button
                                        variant="contained"
                                        disabled={!selectedCount || !bulkStatus}
                                        onClick={() => setBulkDialogOpen(true)}
                                    >
                                        Change Selected
                                    </Button>
                                    <Button
                                        variant="text"
                                        disabled={!selectedCount}
                                        onClick={() => setSelectedCustomerIds([])}
                                    >
                                        Clear
                                    </Button>
                                </Stack>
                            </Stack>

                            <Table size="small" stickyHeader sx={{ minWidth: 1120 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={allVisibleSelected}
                                                indeterminate={!allVisibleSelected && someVisibleSelected}
                                                onChange={toggleAllVisible}
                                                inputProps={{ 'aria-label': 'Select all visible overdue customers' }}
                                            />
                                        </TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Package</TableCell>
                                        <TableCell>Continuous overdue</TableCell>
                                        <TableCell>Overdue period</TableCell>
                                        <TableCell>Latest due</TableCell>
                                        <TableCell align="right">Tracked balance</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tracking.map((item) => {
                                        const tone = streakTone(item.consecutive_months);
                                        const customer = item.customer;

                                        return (
                                            <TableRow key={customer.id} hover>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedCustomerIds.includes(customer.id)}
                                                        onChange={() => toggleCustomerSelection(customer.id)}
                                                        inputProps={{ 'aria-label': `Select ${customer.name}` }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="text"
                                                        onClick={() => router.get(`${appUrl}/customers/${customer.id}`)}
                                                        sx={{ p: 0, justifyContent: 'flex-start', fontWeight: 780 }}
                                                    >
                                                        {customer.name}
                                                    </Button>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {customer.customer_code || customer.phone || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {customer.package?.name || '-'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {customer.package?.speed_mbps ? `${customer.package.speed_mbps} Mbps` : ''}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${item.consecutive_months} month${item.consecutive_months === 1 ? '' : 's'}`}
                                                        sx={{ color: tone.color, bgcolor: tone.bg }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {formatMonth(item.oldest_invoice_month)} to {formatMonth(item.latest_invoice_month)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{item.latest_due_date || '-'}</Typography>
                                                    <Typography variant="caption" color="error.main">{item.days_overdue} day(s) late</Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 780 }}>
                                                    {formatCurrency(item.outstanding_balance)}
                                                </TableCell>
                                                <TableCell sx={{ minWidth: 170 }}>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={customer.status || ''}
                                                        onChange={(event) => updateCustomerStatus(customer, event.target.value)}
                                                        disabled={updatingCustomerId === customer.id}
                                                        sx={{ minWidth: 150 }}
                                                    >
                                                        {customerStatuses.map((status) => (
                                                            <MenuItem key={status} value={status}>{formatLabel(status)}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.eligible_for_suspension && customer.status !== 'suspended' ? (
                                                        <Button
                                                            color="error"
                                                            variant="outlined"
                                                            startIcon={<BlockRounded />}
                                                            onClick={() => setSuspendCustomer(customer)}
                                                        >
                                                            Suspend
                                                        </Button>
                                                    ) : customer.status === 'suspended' ? (
                                                        <Chip size="small" color="error" label="Suspended" />
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">Monitor</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : (
                        <EmptyState
                            compact
                            icon={query ? <PersonSearchRounded /> : <WarningAmberRounded />}
                            title="No continuous overdue customers"
                            description="No customers match the current search and consecutive-month filter."
                        />
                    )}
                </TableCard>
            </Stack>

            <Dialog open={!!suspendCustomer} onClose={() => setSuspendCustomer(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Suspend customer service?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        {suspendCustomer?.name} has at least three consecutive overdue invoice months. Suspending the customer stops future automatic invoice generation until the account is reactivated.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuspendCustomer(null)}>Cancel</Button>
                    <Button color="error" variant="contained" startIcon={<BlockRounded />} onClick={suspend}>
                        Suspend Customer
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={bulkDialogOpen} onClose={() => !bulkUpdating && setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Change selected customer status?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        This will change {selectedCount} selected active overdue customer{selectedCount === 1 ? '' : 's'} to {formatLabel(bulkStatus)}. Customers changed away from Active will leave the overdue tracking list.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button disabled={bulkUpdating} onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
                    <Button disabled={bulkUpdating} variant="contained" onClick={bulkUpdateCustomerStatus}>
                        Change Status
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminLayout>
    );
}
