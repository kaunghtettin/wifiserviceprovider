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
    Divider,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Payments as PaymentsIcon,
    Print as PrintIcon,
    ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatDaysLeft = (value) => {
    const days = Number(value);

    if (!Number.isFinite(days) || days < 0) {
        return '';
    }

    return days === 0 ? 'Due today' : `${days} day(s) left`;
};
const formatMonth = (value) =>
    value
        ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
          })
        : '-';

const formatMethod = (value) => String(value || '-').replace(/_/g, ' ');

const InfoRow = ({ label, value }) => (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
            {value || '-'}
        </Typography>
    </Stack>
);

export default function CustomerShow({ customer, invoiceHistory, paymentHistory, historyFilters, summary }) {
    const { admin_app_url } = usePage().props;
    const customerDetailUrl = `${admin_app_url}/customers/${customer.id}`;
    const paymentRows = paymentHistory?.data || [];
    const invoiceRows = invoiceHistory?.data || [];

    const stats = [
        {
            label: 'Total billed',
            value: formatCurrency(summary?.total_billed),
            helper: 'All invoices generated for this customer.',
        },
        {
            label: 'Total paid',
            value: formatCurrency(summary?.total_paid),
            helper: 'All recorded customer payments to date.',
        },
        {
            label: 'Outstanding',
            value: formatCurrency(summary?.outstanding_balance),
            helper: 'Remaining unpaid balance across open invoices.',
        },
        {
            label: 'Payments',
            value: summary?.payment_count ?? 0,
            helper: 'Number of recorded payment receipts.',
        },
    ];

    return (
        <AdminLayout title={customer?.name || 'Customer Detail'}>
            <Head title={customer?.name || 'Customer Detail'} />

            <Stack spacing={2.5}>
                <PageHeader
                    eyebrow="Subscribers"
                    title={customer?.name || 'Customer detail'}
                    description={`${customer?.customer_code || '-'} • ${customer?.branch?.name || 'No branch'} • Billing day ${customer?.billing_day_of_month || '-'}`}
                    actions={
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.get(`${admin_app_url}/customers`)}>
                                Back
                            </Button>
                            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => router.get(`${admin_app_url}/customers/${customer.id}/edit`)}>
                                Edit
                            </Button>
                            <Button
                                variant="text"
                                color="inherit"
                                startIcon={<PaymentsIcon />}
                                onClick={() => router.get(`${admin_app_url}/payments`, { q: customer?.customer_code || customer?.name })}
                            >
                                Payments
                            </Button>
                        </Stack>
                    }
                />

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.25,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            xl: 'repeat(4, minmax(0, 1fr))',
                        },
                    }}
                >
                    {stats.map((stat) => (
                        <AppSurface key={stat.label} sx={{ p: 1.75 }}>
                            <Typography variant="caption" color="text.secondary">
                                {stat.label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.4, mb: 0.4 }}>
                                {stat.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {stat.helper}
                            </Typography>
                        </AppSurface>
                    ))}
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: {
                            xs: '1fr',
                            lg: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
                        },
                    }}
                >
                    <AppSurface sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 780 }}>
                                    Customer profile
                                </Typography>
                                <StatusBadge status={customer?.status} />
                            </Stack>
                            <Divider />
                            <Stack spacing={1}>
                                <InfoRow label="Customer code" value={customer?.customer_code} />
                                <InfoRow label="Phone" value={customer?.phone} />
                                <InfoRow label="NRC" value={customer?.nrc} />
                                <InfoRow label="Address" value={customer?.address} />
                                <InfoRow label="Branch" value={customer?.branch?.name} />
                                <InfoRow label="Created by" value={customer?.created_by?.name} />
                                <InfoRow label="Created at" value={formatDateTime(customer?.created_at)} />
                            </Stack>
                        </Stack>
                    </AppSurface>

                    <AppSurface sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="h6" sx={{ fontWeight: 780 }}>
                                Service setup
                            </Typography>
                            <Divider />
                            <Stack spacing={1}>
                                <InfoRow label="Package" value={customer?.package?.name} />
                                <InfoRow label="Speed" value={customer?.package?.speed_mbps ? `${customer.package.speed_mbps} Mbps` : '-'} />
                                <InfoRow label="Package price" value={customer?.package?.price ? formatCurrency(customer.package.price) : '-'} />
                                <InfoRow label="Billing day" value={customer?.billing_day_of_month} />
                                <InfoRow label="Installation date" value={formatDate(customer?.installation_date)} />
                                <InfoRow label="Router SN" value={customer?.router_sn} />
                                <InfoRow label="Notes" value={customer?.notes} />
                            </Stack>
                        </Stack>
                    </AppSurface>
                </Box>

                <TableCard
                    title="Payment history"
                    description={`${summary?.payment_count ?? 0} payment record(s) available for this customer.`}
                    toolbar={
                        <Button
                            variant="text"
                            color="inherit"
                            startIcon={<PaymentsIcon />}
                            onClick={() => router.get(`${admin_app_url}/payments`, { q: customer?.customer_code || customer?.name })}
                        >
                            Open Payments
                        </Button>
                    }
                >
                    {paymentRows.length ? (
                        <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Receipt</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Method</TableCell>
                                        <TableCell>Reference</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Receipt</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paymentRows.map((payment) => (
                                        <TableRow key={payment.id} hover>
                                            <TableCell>{payment.payment_code || '-'}</TableCell>
                                            <TableCell>{formatDateTime(payment.paid_at)}</TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 700 }}>{payment.invoice?.invoice_number || '-'}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatMonth(payment.invoice?.invoice_month)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{formatMethod(payment.method)}</TableCell>
                                            <TableCell>{payment.reference_no || '-'}</TableCell>
                                            <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
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
                        </Box>
                    ) : (
                        <EmptyState
                            compact
                            icon={<PaymentsIcon />}
                            title="No payments yet"
                            description="This customer does not have recorded payment history yet."
                        />
                    )}
                    <PaginatedTableFooter
                        pagination={paymentHistory}
                        baseUrl={customerDetailUrl}
                        filters={historyFilters}
                        pageParam="payment_page"
                        perPageParam="payment_per_page"
                    />
                </TableCard>

                <TableCard
                    title="Invoice history"
                    description={`${summary?.invoice_count ?? 0} invoice record(s) available for this customer.`}
                    toolbar={
                        <Button
                            variant="text"
                            color="inherit"
                            startIcon={<ReceiptLongIcon />}
                            onClick={() => router.get(`${admin_app_url}/invoices`, { q: customer?.customer_code || customer?.name })}
                        >
                            Open Invoices
                        </Button>
                    }
                >
                    {invoiceRows.length ? (
                        <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 920 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Month</TableCell>
                                        <TableCell>Due Date</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                        <TableCell align="right">Paid</TableCell>
                                        <TableCell align="right">Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Print</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {invoiceRows.map((invoice) => (
                                        <TableRow key={invoice.id} hover>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 700 }}>{invoice.invoice_number || '-'}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {invoice.package_name || '-'}
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
                                            <TableCell align="right">{formatCurrency(invoice.total_amount)}</TableCell>
                                            <TableCell align="right">{formatCurrency(invoice.paid_amount)}</TableCell>
                                            <TableCell align="right">{formatCurrency(invoice.balance_amount)}</TableCell>
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
                    ) : (
                        <EmptyState
                            compact
                            icon={<ReceiptLongIcon />}
                            title="No invoices yet"
                            description="This customer does not have invoice history yet."
                        />
                    )}
                    <PaginatedTableFooter
                        pagination={invoiceHistory}
                        baseUrl={customerDetailUrl}
                        filters={historyFilters}
                        pageParam="invoice_page"
                        perPageParam="invoice_per_page"
                    />
                </TableCard>
            </Stack>
        </AdminLayout>
    );
}
