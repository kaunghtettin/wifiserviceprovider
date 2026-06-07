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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Add as AddIcon, Payments as PaymentsIcon, Print as PrintIcon, Search as SearchIcon } from '@mui/icons-material';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDateTime = (value) => (value ? String(value).slice(0, 16).replace('T', ' ') : '-');

export default function PaymentIndex({ payments, openInvoices, filters, summary }) {
    const { admin_app_url } = usePage().props;
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const rows = useMemo(() => payments?.data || [], [payments]);
    const invoiceOptions = useMemo(() => openInvoices || [], [openInvoices]);
    const [open, setOpen] = useState(false);
    const [filtering, setFiltering] = useState(false);
    const [query, setQuery] = useState(filters?.q || '');
    const [method, setMethod] = useState(filters?.method || '');
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const perPage = Number(filters?.per_page || payments?.per_page || 15);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        invoice_id: '',
        amount: '',
        paid_at: new Date().toISOString().slice(0, 16),
        method: 'cash',
        reference_no: '',
        notes: '',
    });

    const selectedInvoice = useMemo(
        () => invoiceOptions.find((invoice) => String(invoice.id) === String(data.invoice_id)) || null,
        [invoiceOptions, data.invoice_id],
    );

    const cards = [
        {
            label: 'Payments',
            value: summary?.count ?? 0,
            helper: 'Recorded payment entries in the selected period.',
        },
        {
            label: 'Collected amount',
            value: formatCurrency(summary?.amount),
            helper: 'Total posted collections for the current filter.',
        },
        {
            label: 'Open invoices',
            value: summary?.open_invoice_count ?? 0,
            helper: 'Invoices still awaiting full settlement.',
        },
    ];

    const closeDialog = () => {
        setOpen(false);
        reset();
        clearErrors();
    };

    const applyFilters = () => {
        setFiltering(true);
        router.get(
            `${admin_app_url}/payments`,
            {
                q: query || undefined,
                method: method || undefined,
                month: month || undefined,
                per_page: perPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setFiltering(false),
            },
        );
    };

    const resetFilters = () => {
        setFiltering(true);
        setQuery('');
        setMethod('');
        const defaultMonth = new Date().toISOString().slice(0, 7);
        setMonth(defaultMonth);
        router.get(
            `${admin_app_url}/payments`,
            { month: defaultMonth, per_page: perPage },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setFiltering(false),
            },
        );
    };

    const submit = (event) => {
        event.preventDefault();
        post(`${admin_app_url}/payments`, {
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    return (
        <AdminLayout title="Payments">
            <Head title="Payments" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Billing"
                    title="Payments"
                    description="Record manual collections, attach payment methods and references, and keep invoice balances accurate."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} disabled={processing}>Record Payment</Button>}
                />

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(3, minmax(0, 1fr))',
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
                    title="Payment ledger"
                    description={`${payments?.from || 0}-${payments?.to || 0} of ${payments?.total || 0} payment records in the current view.`}
                    toolbar={
                        <>
                            <TextField
                                size="small"
                                placeholder="Search payment, invoice, customer"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') applyFilters();
                                }}
                                sx={{ minWidth: { xs: '100%', sm: 230 } }}
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
                            <TextField select size="small" label="Method" value={method} onChange={(event) => setMethod(event.target.value)} sx={{ minWidth: 140 }}>
                                <MenuItem value="">All methods</MenuItem>
                                <MenuItem value="cash">Cash</MenuItem>
                                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </TextField>
                            <Button variant="outlined" onClick={applyFilters} disabled={filtering}>
                                {filtering ? 'Searching...' : 'Search'}
                            </Button>
                            <Button variant="text" color="inherit" onClick={resetFilters} disabled={filtering}>
                                Reset
                            </Button>
                        </>
                    }
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<PaymentsIcon />}
                            title="No payments recorded"
                            description="Start recording manual payments against unpaid invoices to build your collection history."
                            action={invoiceOptions.length > 0 ? { label: 'Record payment', onClick: () => setOpen(true) } : null}
                        />
                    ) : isPhone ? (
                        <Stack spacing={1.1}>
                            {rows.map((payment) => (
                                <AppSurface key={payment.id} sx={{ p: 1.35 }}>
                                    <Stack spacing={1}>
                                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 760 }} noWrap>
                                                    {payment.customer?.name || '-'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {payment.payment_code || payment.invoice?.invoice_number || '-'}
                                                </Typography>
                                            </Box>
                                            <StatusBadge status={payment.invoice?.status} label={payment.invoice?.status || '-'} />
                                        </Stack>

                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                gap: 1,
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Amount
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(payment.amount)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Method
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                                    {String(payment.method || '-').replace('_', ' ')}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Paid At
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {formatDateTime(payment.paid_at)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Balance
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(payment.invoice?.balance_amount)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                                            <Button
                                                component="a"
                                                href={payment.customer?.phone ? `tel:${payment.customer.phone}` : undefined}
                                                variant="text"
                                                color="inherit"
                                                disabled={!payment.customer?.phone}
                                                sx={{ px: 0 }}
                                            >
                                                Call
                                            </Button>
                                            <Button
                                                component="a"
                                                href={`${admin_app_url}/payments/${payment.id}/receipt`}
                                                target="_blank"
                                                rel="noreferrer"
                                                variant="text"
                                                startIcon={<PrintIcon fontSize="small" />}
                                            >
                                                Receipt
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </AppSurface>
                            ))}
                        </Stack>
                    ) : (
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Payment</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Invoice</TableCell>
                                    <TableCell>Paid At</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Receipt</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((payment) => (
                                    <TableRow key={payment.id} hover>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 760 }}>{payment.payment_code || '-'}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {payment.reference_no || 'No reference'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 700 }}>{payment.customer?.name || '-'}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {payment.customer?.customer_code || payment.customer?.phone || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 700 }}>{payment.invoice?.invoice_number || '-'}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Remaining {formatCurrency(payment.invoice?.balance_amount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{formatDateTime(payment.paid_at)}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>
                                            {String(payment.method || '-').replace('_', ' ')}
                                        </TableCell>
                                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={payment.invoice?.status} label={payment.invoice?.status || '-'} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                component="a"
                                                href={`${admin_app_url}/payments/${payment.id}/receipt`}
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
                    )}
                    <PaginatedTableFooter pagination={payments} baseUrl={`${admin_app_url}/payments`} filters={filters} />
                </TableCard>
            </Stack>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm" fullScreen={isPhone}>
                <DialogTitle>Record Payment</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            <TextField
                                select
                                label="Open Invoice"
                                value={data.invoice_id}
                                onChange={(event) => {
                                    const nextId = event.target.value;
                                    const nextInvoice = invoiceOptions.find((invoice) => String(invoice.id) === String(nextId));
                                    setData({
                                        ...data,
                                        invoice_id: nextId,
                                        amount: nextInvoice ? nextInvoice.balance_amount : '',
                                    });
                                }}
                                error={!!errors.invoice_id}
                                helperText={errors.invoice_id}
                                required
                            >
                                {invoiceOptions.map((invoice) => (
                                    <MenuItem key={invoice.id} value={invoice.id}>
                                        {invoice.invoice_number} - {invoice.customer?.name} ({formatCurrency(invoice.balance_amount)})
                                    </MenuItem>
                                ))}
                            </TextField>

                            {selectedInvoice ? (
                                <AppSurface sx={{ p: 1.25 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {selectedInvoice.customer?.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Invoice balance: {formatCurrency(selectedInvoice.balance_amount)}
                                    </Typography>
                                </AppSurface>
                            ) : null}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    label="Amount"
                                    value={data.amount}
                                    onChange={(event) => setData('amount', event.target.value)}
                                    error={!!errors.amount}
                                    helperText={errors.amount}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    type="datetime-local"
                                    label="Paid At"
                                    value={data.paid_at}
                                    onChange={(event) => setData('paid_at', event.target.value)}
                                    error={!!errors.paid_at}
                                    helperText={errors.paid_at}
                                    required
                                    sx={{ flex: 1 }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    select
                                    label="Method"
                                    value={data.method}
                                    onChange={(event) => setData('method', event.target.value)}
                                    error={!!errors.method}
                                    helperText={errors.method}
                                    required
                                    sx={{ flex: 1 }}
                                >
                                    <MenuItem value="cash">Cash</MenuItem>
                                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </TextField>
                                <TextField
                                    label="Reference No"
                                    value={data.reference_no}
                                    onChange={(event) => setData('reference_no', event.target.value)}
                                    error={!!errors.reference_no}
                                    helperText={errors.reference_no}
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <TextField
                                label="Notes"
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                                error={!!errors.notes}
                                helperText={errors.notes}
                                multiline
                                minRows={2}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDialog} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={processing || invoiceOptions.length === 0}>
                            {processing ? (
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
