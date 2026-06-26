import PrintLayout from '@/Layouts/PrintLayout';
import { usePage } from '@inertiajs/react';
import { Box, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useState } from 'react';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatMonth = (value) =>
    value
        ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
          })
        : '-';
const formatPeriod = (start, end) => {
    const startLabel = formatMonth(start);
    const endLabel = formatMonth(end);

    return !end || startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};
const formatNextBillingDate = (periodEndMonth, billingDay) => {
    if (!periodEndMonth || !billingDay) {
        return '-';
    }

    const date = new Date(`${String(periodEndMonth).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    date.setMonth(date.getMonth() + 1, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(Math.max(Number(billingDay), 1), lastDay));

    return date.toLocaleDateString();
};

const textWrap = {
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
};

const DetailLine = ({ label, value, compact = false }) => (
    <Typography variant="body2" color="text.secondary" sx={{ fontSize: compact ? '0.75rem' : undefined, ...textWrap }}>
        {label ? `${label}: ` : ''}
        {value || '-'}
    </Typography>
);

const TotalRow = ({ label, value, strong = false, compact = false }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) max-content',
            gap: compact ? 0.75 : 1.5,
            alignItems: 'baseline',
        }}
    >
        <Typography color="text.secondary" sx={{ fontSize: compact ? '0.78rem' : undefined }}>
            {label}
        </Typography>
        <Typography sx={{ fontWeight: strong ? 860 : 760, fontSize: compact ? '0.8rem' : undefined, textAlign: 'right' }}>
            {formatCurrency(value)}
        </Typography>
    </Box>
);

const PaymentHistory = ({ payments, compact = false }) => (
    <Box>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: compact ? '0.64rem' : undefined }}>
            Payment History
        </Typography>
        {payments?.length ? (
            compact ? (
                <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                    {payments.map((payment) => (
                        <Box key={payment.id} sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.12)', pt: 0.75 }}>
                            <Typography sx={{ fontWeight: 760, fontSize: '0.78rem', ...textWrap }}>{payment.payment_code || '-'}</Typography>
                            <DetailLine compact label="Date" value={formatDate(payment.paid_at)} />
                            <DetailLine compact label="Method" value={String(payment.method || '-').replace('_', ' ')} />
                            <TotalRow compact label="Amount" value={payment.amount} strong />
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Receipt</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell sx={textWrap}>{payment.payment_code || '-'}</TableCell>
                                <TableCell>{formatDate(payment.paid_at)}</TableCell>
                                <TableCell sx={{ textTransform: 'capitalize', ...textWrap }}>{String(payment.method || '-').replace('_', ' ')}</TableCell>
                                <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )
        ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: compact ? '0.75rem' : undefined }}>
                No payments have been applied to this invoice yet.
            </Typography>
        )}
    </Box>
);

const RemarkBlock = ({ remark, compact = false }) => {
    if (!remark) {
        return null;
    }

    return (
        <>
            <Divider />
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: compact ? '0.64rem' : undefined }}>
                    Remark
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: compact ? '0.75rem' : undefined,
                        whiteSpace: 'pre-wrap',
                        ...textWrap,
                    }}
                >
                    {remark}
                </Typography>
            </Box>
        </>
    );
};

const A4Invoice = ({ invoice, billingPeriod, nextBillingDate, remark }) => (
    <Stack spacing={2}>
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                columnGap: 2,
                alignItems: 'start',
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 850, ...textWrap }}>
                    {invoice.branch?.name || 'Super Excellent Wifi Solutions'}
                </Typography>
                <DetailLine label="" value={invoice.branch?.address || 'Branch address not available'} />
                <DetailLine label="" value={invoice.branch?.phone || 'Phone not available'} />
            </Box>
            <Box sx={{ textAlign: 'right', minWidth: 0, justifySelf: 'end' }}>
                <Typography variant="overline" color="text.secondary">
                    Invoice Voucher
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 840, ...textWrap }}>
                    {invoice.invoice_number}
                </Typography>
                <DetailLine label="Billing Period" value={billingPeriod} />
                <DetailLine label="Due Date" value={formatDate(invoice.due_date)} />
                <DetailLine label="Next Billing Date" value={nextBillingDate} />
            </Box>
        </Box>

        <Divider />

        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                columnGap: 2,
                alignItems: 'start',
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary">
                    Bill To
                </Typography>
                <Typography sx={{ fontWeight: 760, ...textWrap }}>{invoice.customer?.name || '-'}</Typography>
                <DetailLine label="Customer ID" value={invoice.customer?.ftth_id} />
                <DetailLine label="FTTH Name" value={invoice.customer?.ftth_account_name} />
                <DetailLine label="Phone" value={invoice.customer?.phone} />
                <DetailLine label="Address" value={invoice.customer?.address} />
            </Box>

            <Box sx={{ minWidth: 0, textAlign: 'right', justifySelf: 'end' }}>
                <Typography variant="overline" color="text.secondary">
                    Service Details
                </Typography>
                <DetailLine label="Package" value={invoice.package_name} />
                <DetailLine label="Billing Day" value={invoice.billing_day_of_month} />
                <DetailLine label="Router SN" value={invoice.customer?.router_sn} />
                <DetailLine label="Generated By" value={invoice.generated_by?.name} />
            </Box>
        </Box>

        <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
                <TableRow>
                    <TableCell sx={{ width: '35%' }}>Description</TableCell>
                    <TableCell sx={{ width: '40%' }}>Period</TableCell>
                    <TableCell align="right" sx={{ width: '25%' }}>
                        Amount
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                    <TableCell sx={textWrap}>{invoice.package_name || 'Monthly internet subscription'}</TableCell>
                    <TableCell sx={textWrap}>{billingPeriod}</TableCell>
                    <TableCell align="right">{formatCurrency(invoice.total_amount)}</TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <Box sx={{ alignSelf: 'flex-end', width: { xs: '100%', sm: 300 } }}>
            <Stack spacing={0.75}>
                <TotalRow label="Total" value={invoice.total_amount} />
                <TotalRow label="Paid" value={invoice.paid_amount} />
                <TotalRow label="Balance" value={invoice.balance_amount} strong />
            </Stack>
        </Box>

        <Divider />

        <PaymentHistory payments={invoice.payments} />

        <RemarkBlock remark={remark} />
    </Stack>
);

const ThermalInvoice = ({ invoice, billingPeriod, nextBillingDate, printFormat, remark }) => {
    const is58mm = printFormat === 'thermal58';
    const spacing = is58mm ? 1 : 1.2;

    return (
        <Stack
            spacing={spacing}
            sx={{
                width: '100%',
                minWidth: 0,
                fontSize: is58mm ? '0.78rem' : '0.84rem',
                '& .MuiDivider-root': {
                    my: 0.25,
                },
            }}
        >
            <Box sx={{ textAlign: 'center', minWidth: 0 }}>
                <Typography sx={{ fontWeight: 850, fontSize: is58mm ? '1rem' : '1.1rem', lineHeight: 1.15, ...textWrap }}>
                    {invoice.branch?.name || 'Super Excellent Wifi Solutions'}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: is58mm ? '0.72rem' : '0.78rem', ...textWrap }}>
                    {invoice.branch?.address || 'Branch address not available'}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: is58mm ? '0.72rem' : '0.78rem', ...textWrap }}>
                    {invoice.branch?.phone || 'Phone not available'}
                </Typography>
            </Box>

            <Divider />

            <Box sx={{ textAlign: 'center', minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: is58mm ? '0.62rem' : '0.68rem' }}>
                    Invoice Voucher
                </Typography>
                <Typography sx={{ fontWeight: 860, fontSize: is58mm ? '1rem' : '1.1rem', ...textWrap }}>
                    {invoice.invoice_number}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: is58mm ? '0.72rem' : '0.78rem', ...textWrap }}>
                    Billing Period: {billingPeriod}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: is58mm ? '0.72rem' : '0.78rem' }}>
                    Due Date: {formatDate(invoice.due_date)}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: is58mm ? '0.72rem' : '0.78rem' }}>
                    Next Billing Date: {nextBillingDate}
                </Typography>
            </Box>

            <Divider />

            <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: is58mm ? '0.62rem' : '0.68rem' }}>
                    Bill To
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: is58mm ? '0.9rem' : '0.95rem', ...textWrap }}>
                    {invoice.customer?.name || '-'}
                </Typography>
                <DetailLine compact label="Customer ID" value={invoice.customer?.ftth_id} />
                <DetailLine compact label="FTTH Name" value={invoice.customer?.ftth_account_name} />
                <DetailLine compact label="Phone" value={invoice.customer?.phone} />
                <DetailLine compact label="Address" value={invoice.customer?.address} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: is58mm ? '0.62rem' : '0.68rem' }}>
                    Service Details
                </Typography>
                <DetailLine compact label="Package" value={invoice.package_name} />
                <DetailLine compact label="Billing Day" value={invoice.billing_day_of_month} />
                <DetailLine compact label="Router SN" value={invoice.customer?.router_sn} />
                <DetailLine compact label="Generated By" value={invoice.generated_by?.name} />
            </Box>

            <Divider />

            <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: is58mm ? '0.62rem' : '0.68rem' }}>
                    Items
                </Typography>
                <Box sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.12)', borderBottom: '1px solid rgba(15, 23, 42, 0.12)', py: 0.75 }}>
                    <Typography sx={{ fontWeight: 760, fontSize: is58mm ? '0.8rem' : '0.86rem', ...textWrap }}>
                        {invoice.package_name || 'Monthly internet subscription'}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: is58mm ? '0.72rem' : '0.78rem', ...textWrap }}>
                        {billingPeriod}
                    </Typography>
                    <Typography sx={{ fontWeight: 820, fontSize: is58mm ? '0.86rem' : '0.94rem', textAlign: 'right' }}>
                        {formatCurrency(invoice.total_amount)}
                    </Typography>
                </Box>
            </Box>

            <Stack spacing={0.5}>
                <TotalRow compact label="Total" value={invoice.total_amount} />
                <TotalRow compact label="Paid" value={invoice.paid_amount} />
                <TotalRow compact label="Balance" value={invoice.balance_amount} strong />
            </Stack>

            <Divider />

            <PaymentHistory compact payments={invoice.payments} />

            <RemarkBlock compact remark={remark} />
        </Stack>
    );
};

export default function InvoicePrint({ invoice }) {
    const { admin_app_url } = usePage().props;
    const [remark, setRemark] = useState('');
    const billingPeriod = formatPeriod(invoice.period_start_month || invoice.invoice_month, invoice.period_end_month || invoice.invoice_month);
    const nextBillingDate = formatNextBillingDate(invoice.period_end_month || invoice.invoice_month, invoice.billing_day_of_month);
    const printableRemark = remark.trim();

    return (
        <PrintLayout
            title={`Invoice ${invoice.invoice_number}`}
            subtitle="Printable invoice voucher"
            backHref={`${admin_app_url}/invoices`}
            toolbarExtra={
                <TextField
                    size="small"
                    label="Remark"
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    multiline
                    maxRows={2}
                    sx={{
                        minWidth: { xs: '100%', sm: 260 },
                        maxWidth: { sm: 360 },
                    }}
                />
            }
        >
            {({ printFormat }) =>
                printFormat === 'a4' ? (
                    <A4Invoice invoice={invoice} billingPeriod={billingPeriod} nextBillingDate={nextBillingDate} remark={printableRemark} />
                ) : (
                    <ThermalInvoice
                        invoice={invoice}
                        billingPeriod={billingPeriod}
                        nextBillingDate={nextBillingDate}
                        printFormat={printFormat}
                        remark={printableRemark}
                    />
                )
            }
        </PrintLayout>
    );
}
