import PrintLayout from '@/Layouts/PrintLayout';
import { usePage } from '@inertiajs/react';
import { Box, Divider, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatMonth = (value) =>
    value
        ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
          })
        : '-';

export default function PaymentReceipt({ payment }) {
    const { admin_app_url } = usePage().props;

    return (
        <PrintLayout
            title={`Receipt ${payment.payment_code}`}
            subtitle="Printable payment receipt"
            backHref={`${admin_app_url}/payments`}
            defaultFormat="thermal80"
        >
            <Stack spacing={1.5}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 850 }}>
                        {payment.branch?.name || 'Super Excellent Wifi Solutions'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {payment.branch?.address || 'Branch address not available'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {payment.branch?.phone || 'Phone not available'}
                    </Typography>
                </Box>

                <Divider />

                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="overline" color="text.secondary">
                        Payment Receipt
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 840 }}>
                        {payment.payment_code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {formatDateTime(payment.paid_at)}
                    </Typography>
                </Box>

                <Divider />

                <Stack spacing={0.5}>
                    <Typography variant="body2">
                        <strong>Customer:</strong> {payment.customer?.name || '-'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Customer Code:</strong> {payment.customer?.customer_code || '-'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Phone:</strong> {payment.customer?.phone || '-'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Invoice:</strong> {payment.invoice?.invoice_number || '-'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Billing Month:</strong> {formatMonth(payment.invoice?.invoice_month)}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Package:</strong> {payment.invoice?.package_name || '-'}
                    </Typography>
                </Stack>

                <Divider />

                <Table size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ borderBottom: 'none', px: 0 }}>Invoice Total</TableCell>
                            <TableCell align="right" sx={{ borderBottom: 'none', px: 0 }}>
                                {formatCurrency(payment.invoice?.total_amount)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ borderBottom: 'none', px: 0 }}>Paid This Receipt</TableCell>
                            <TableCell align="right" sx={{ borderBottom: 'none', px: 0, fontWeight: 800 }}>
                                {formatCurrency(payment.amount)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ borderBottom: 'none', px: 0 }}>Remaining Balance</TableCell>
                            <TableCell align="right" sx={{ borderBottom: 'none', px: 0 }}>
                                {formatCurrency(payment.invoice?.balance_amount)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <Divider />

                <Stack spacing={0.5}>
                    <Typography variant="body2">
                        <strong>Method:</strong> {String(payment.method || '-').replace('_', ' ')}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Reference:</strong> {payment.reference_no || '-'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Received By:</strong> {payment.received_by?.name || '-'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Status:</strong> {payment.invoice?.status || '-'}
                    </Typography>
                </Stack>

                {payment.notes ? (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="overline" color="text.secondary">
                                Notes
                            </Typography>
                            <Typography variant="body2">{payment.notes}</Typography>
                        </Box>
                    </>
                ) : null}

                <Divider />

                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Thank you for your payment.
                </Typography>
            </Stack>
        </PrintLayout>
    );
}
