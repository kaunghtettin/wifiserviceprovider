import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PaginatedTableFooter from '@/Components/admin/PaginatedTableFooter';
import PageHeader from '@/Components/admin/PageHeader';
import StatusBadge from '@/Components/admin/StatusBadge';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
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
import { Add as AddIcon, Payments as PaymentsIcon, Print as PrintIcon, ReceiptLong as ReceiptLongIcon, Search as SearchIcon } from '@mui/icons-material';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');
const formatMonth = (value) => (value ? String(value).slice(0, 7) : '-');
const formatDaysLeft = (value) => {
    const days = Number(value);

    if (!Number.isFinite(days) || days < 0) {
        return '';
    }

    return days === 0 ? 'Due today' : `${days} day(s) left`;
};

export default function InvoiceIndex({ invoices, filters, summary }) {
    const { admin_app_url } = usePage().props;
    const rows = useMemo(() => invoices?.data || [], [invoices]);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [query, setQuery] = useState(filters?.q || '');
    const [status, setStatus] = useState(filters?.status || '');
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const perPage = Number(filters?.per_page || invoices?.per_page || 15);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        month: filters?.month || new Date().toISOString().slice(0, 7),
    });
    const {
        data: paymentData,
        setData: setPaymentData,
        post: postPayment,
        processing: paymentProcessing,
        errors: paymentErrors,
        reset: resetPayment,
        clearErrors: clearPaymentErrors,
    } = useForm({
        invoice_id: '',
        amount: '',
        paid_at: new Date().toISOString().slice(0, 16),
        method: 'cash',
        reference_no: '',
        notes: '',
        return_to: 'back',
    });

    const closeGenerateDialog = () => {
        setGenerateOpen(false);
        reset();
        clearErrors();
    };

    const closePaymentDialog = () => {
        setPaymentOpen(false);
        setSelectedInvoice(null);
        resetPayment();
        clearPaymentErrors();
    };

    const applyFilters = () => {
        router.get(
            `${admin_app_url}/invoices`,
            {
                q: query || undefined,
                status: status || undefined,
                month: month || undefined,
                per_page: perPage,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        setQuery('');
        setStatus('');
        const defaultMonth = new Date().toISOString().slice(0, 7);
        setMonth(defaultMonth);
        router.get(
            `${admin_app_url}/invoices`,
            { month: defaultMonth, per_page: perPage },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const generateInvoices = (event) => {
        event.preventDefault();
        post(`${admin_app_url}/invoices`, {
            preserveScroll: true,
            onSuccess: closeGenerateDialog,
        });
    };

    const openCustomer = (invoice) => {
        const customerId = invoice?.customer?.id || invoice?.customer_id;
        if (!customerId) return;

        router.get(`${admin_app_url}/customers/${customerId}`);
    };

    const openPaymentDialog = (invoice) => {
        if (!invoice || Number(invoice.balance_amount || 0) <= 0 || invoice.status === 'paid') {
            return;
        }

        setSelectedInvoice(invoice);
        setPaymentData({
            invoice_id: String(invoice.id),
            amount: Number(invoice.balance_amount || 0) > 0 ? String(invoice.balance_amount) : '',
            paid_at: new Date().toISOString().slice(0, 16),
            method: 'cash',
            reference_no: '',
            notes: '',
            return_to: 'back',
        });
        clearPaymentErrors();
        setPaymentOpen(true);
    };

    const submitPayment = (event) => {
        event.preventDefault();
        postPayment(`${admin_app_url}/payments`, {
            preserveScroll: true,
            onSuccess: closePaymentDialog,
        });
    };

    const cards = [
        {
            label: 'Invoices',
            value: summary?.count ?? 0,
            helper: 'Invoice records in the selected month.',
        },
        {
            label: 'Billed amount',
            value: formatCurrency(summary?.total_amount),
            helper: 'Total generated amount for the filtered period.',
        },
        {
            label: 'Collected',
            value: formatCurrency(summary?.paid_amount),
            helper: 'Applied payments already linked to invoices.',
        },
        {
            label: 'Overdue',
            value: summary?.overdue_count ?? 0,
            helper: 'Invoices still carrying unpaid overdue balances.',
        },
    ];

    return (
        <AdminLayout title="Invoices">
            <Head title="Invoices" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Billing"
                    title="Invoices"
                    description="Generate monthly invoices, monitor collection status, and keep one invoice per customer per billing cycle."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setGenerateOpen(true)}>Generate Invoices</Button>}
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
                    {cards.map((card) => (
                        <AppSurface key={card.label} sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {card.label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5, mb: 0.5 }}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {card.helper}
                            </Typography>
                        </AppSurface>
                    ))}
                </Box>

                <TableCard
                    title="Monthly invoice register"
                    description={`${invoices?.from || 0}-${invoices?.to || 0} of ${invoices?.total || 0} invoice records in the current view.`}
                    toolbar={
                        <>
                            <TextField
                                size="small"
                                placeholder="Search invoice or customer"
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
                                InputLabelProps={{ shrink: true }}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 130 }}>
                                <MenuItem value="">All statuses</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="unpaid">Unpaid</MenuItem>
                                <MenuItem value="partial">Partial</MenuItem>
                                <MenuItem value="warning">Warning</MenuItem>
                                <MenuItem value="overdue">Overdue</MenuItem>
                            </TextField>
                            <Button variant="outlined" onClick={applyFilters}>
                                Search
                            </Button>
                            <Button variant="text" color="inherit" onClick={resetFilters}>
                                Reset
                            </Button>
                        </>
                    }
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<ReceiptLongIcon />}
                            title="No invoices yet"
                            description="Generate the first month of invoices to begin payment collection and overdue tracking."
                            action={{ label: 'Generate invoices', onClick: () => setGenerateOpen(true) }}
                        />
                    ) : (
                        <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Month</TableCell>
                                        <TableCell>Due Date</TableCell>
                                        <TableCell>Total</TableCell>
                                        <TableCell>Paid</TableCell>
                                        <TableCell>Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="center">Action</TableCell>
                                        <TableCell align="right">Print</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((invoice) => (
                                        <TableRow key={invoice.id} hover>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 760 }}>{invoice.invoice_number || '-'}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {invoice.package_name || 'No package snapshot'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={() => openCustomer(invoice)}
                                                    disabled={!invoice.customer?.id && !invoice.customer_id}
                                                    sx={{
                                                        width: '100%',
                                                        p: 0,
                                                        m: 0,
                                                        border: 0,
                                                        bgcolor: 'transparent',
                                                        textAlign: 'left',
                                                        color: 'inherit',
                                                        cursor: invoice.customer?.id || invoice.customer_id ? 'pointer' : 'default',
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 700,
                                                            transition: 'color 0.18s ease',
                                                            '&:hover': {
                                                                color: invoice.customer?.id || invoice.customer_id ? 'primary.main' : 'inherit',
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
                                            <TableCell>{formatMonth(invoice.invoice_month)}</TableCell>
                                            <TableCell>
                                                <Typography>{formatDate(invoice.due_date)}</Typography>
                                                {invoice.days_left !== null && invoice.days_left !== undefined ? (
                                                    <Typography
                                                        variant="body2"
                                                        color={invoice.display_status === 'warning' ? 'warning.main' : 'text.secondary'}
                                                    >
                                                        {formatDaysLeft(invoice.days_left)}
                                                    </Typography>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                                            <TableCell>{formatCurrency(invoice.paid_amount)}</TableCell>
                                            <TableCell>{formatCurrency(invoice.balance_amount)}</TableCell>
                                            <TableCell>
                                                <Stack spacing={0.35} sx={{ alignItems: 'flex-start' }}>
                                                    <StatusBadge status={invoice.display_status || invoice.status} />
                                                    {invoice.display_status === 'warning' && invoice.days_left !== null && invoice.days_left !== undefined ? (
                                                        <Typography variant="caption" color="warning.main">
                                                            {formatDaysLeft(invoice.days_left)}
                                                        </Typography>
                                                    ) : null}
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                {invoice.status !== 'paid' && Number(invoice.balance_amount || 0) > 0 ? (
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        startIcon={<PaymentsIcon fontSize="small" />}
                                                        onClick={() => openPaymentDialog(invoice)}
                                                    >
                                                        Pay
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    component="a"
                                                    href={`${admin_app_url}/invoices/${invoice.id}/print`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    variant="text"
                                                    size="small"
                                                    startIcon={<PrintIcon fontSize="small" />}
                                                >
                                                    Print
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                    <PaginatedTableFooter pagination={invoices} baseUrl={`${admin_app_url}/invoices`} filters={filters} />
                </TableCard>
            </Stack>

            <Dialog open={generateOpen} onClose={closeGenerateDialog} fullWidth maxWidth="xs">
                <DialogTitle>Generate Monthly Invoices</DialogTitle>
                <Box component="form" onSubmit={generateInvoices}>
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            <TextField
                                type="month"
                                label="Invoice Month"
                                value={data.month}
                                onChange={(event) => setData('month', event.target.value)}
                                error={!!errors.month}
                                helperText={errors.month || 'Invoices are generated only for active customers.'}
                                InputLabelProps={{ shrink: true }}
                                slotProps={{ inputLabel: { shrink: true } }}
                                required
                            />
                            <Typography variant="body2" color="text.secondary">
                                Existing invoices for the same customer and month will not be duplicated.
                            </Typography>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeGenerateDialog} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={processing}>
                            Generate
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog open={paymentOpen} onClose={closePaymentDialog} fullWidth maxWidth="sm">
                <DialogTitle>Record Payment</DialogTitle>
                <Box component="form" onSubmit={submitPayment}>
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            {selectedInvoice ? (
                                <AppSurface sx={{ p: 1.25 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {selectedInvoice.customer?.name || '-'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedInvoice.invoice_number || '-'} - Balance: {formatCurrency(selectedInvoice.balance_amount)}
                                    </Typography>
                                </AppSurface>
                            ) : null}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    label="Amount"
                                    value={paymentData.amount}
                                    onChange={(event) => setPaymentData('amount', event.target.value)}
                                    error={!!paymentErrors.amount}
                                    helperText={paymentErrors.amount}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    type="datetime-local"
                                    label="Paid At"
                                    value={paymentData.paid_at}
                                    onChange={(event) => setPaymentData('paid_at', event.target.value)}
                                    error={!!paymentErrors.paid_at}
                                    helperText={paymentErrors.paid_at}
                                    required
                                    sx={{ flex: 1 }}
                                    InputLabelProps={{ shrink: true }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    select
                                    label="Method"
                                    value={paymentData.method}
                                    onChange={(event) => setPaymentData('method', event.target.value)}
                                    error={!!paymentErrors.method}
                                    helperText={paymentErrors.method}
                                    required
                                    sx={{ flex: 1 }}
                                >
                                    <MenuItem value="cash">Cash</MenuItem>
                                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </TextField>
                                <TextField
                                    label="Reference No"
                                    value={paymentData.reference_no}
                                    onChange={(event) => setPaymentData('reference_no', event.target.value)}
                                    error={!!paymentErrors.reference_no}
                                    helperText={paymentErrors.reference_no}
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <TextField
                                label="Notes"
                                value={paymentData.notes}
                                onChange={(event) => setPaymentData('notes', event.target.value)}
                                error={!!paymentErrors.notes}
                                helperText={paymentErrors.notes}
                                multiline
                                minRows={2}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closePaymentDialog} disabled={paymentProcessing}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={paymentProcessing || !selectedInvoice}>
                            {paymentProcessing ? (
                                <>
                                    <CircularProgress size={14} color="inherit" sx={{ mr: 1 }} />
                                    Saving...
                                </>
                            ) : (
                                'Save Payment'
                            )}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </AdminLayout>
    );
}
