import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PageHeader from '@/Components/admin/PageHeader';
import StatusBadge from '@/Components/admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Box,
    Button,
    Stack,
    Typography,
} from '@mui/material';
import {
    AddBusiness as BranchesIcon,
    ArrowForward as ArrowForwardIcon,
    AssignmentLate as AttentionIcon,
    GroupAdd as CustomerAddIcon,
    ManageAccounts as UsersIcon,
    Paid as PaymentsIcon,
    People as CustomersIcon,
    ReceiptLong as InvoicesIcon,
    Sell as PackagesIcon,
    TrendingUp as ReportsIcon,
    WarningAmber as OverdueIcon,
    Wifi as EmptyIcon,
    AccountBalanceWallet as ExpensesIcon,
} from '@mui/icons-material';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat('en-US');
const formatValue = (item) => (item?.format === 'currency' ? currency.format(Number(item?.value || 0)) : number.format(Number(item?.value || 0)));
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatMethod = (value) => String(value || '-').replace(/_/g, ' ');

const tones = {
    primary: { color: '#2563eb', background: 'rgba(59,130,246,0.10)' },
    secondary: { color: '#7c3aed', background: 'rgba(139,92,246,0.10)' },
    success: { color: '#15803d', background: 'rgba(34,197,94,0.10)' },
    warning: { color: '#b45309', background: 'rgba(245,158,11,0.12)' },
    danger: { color: '#b91c1c', background: 'rgba(239,68,68,0.10)' },
};

const shortcutIcons = {
    customer_add: CustomerAddIcon,
    customers: CustomersIcon,
    invoices: InvoicesIcon,
    payments: PaymentsIcon,
    expenses: ExpensesIcon,
    overdue: OverdueIcon,
    reports: ReportsIcon,
    packages: PackagesIcon,
    users: UsersIcon,
    branches: BranchesIcon,
};

export default function Dashboard({ dashboard }) {
    const { admin_app_url, auth } = usePage().props;
    const cards = dashboard?.cards || [];
    const attention = dashboard?.attention || [];
    const shortcuts = dashboard?.shortcuts || [];
    const recentCustomers = dashboard?.recent_customers || [];
    const recentPayments = dashboard?.recent_payments || [];
    const open = (href) => href && router.get(`${admin_app_url}${href}`);

    return (
        <AdminLayout title="Dashboard">
            <Head title="Dashboard" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Operations"
                    title={`Welcome, ${auth?.user?.name || 'Administrator'}`}
                    description={`${dashboard?.scope_label || 'Assigned scope'} | ${dashboard?.month_label || 'Current month'} | Information and actions reflect your role permissions.`}
                />

                {cards.length ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.25,
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                xl: `repeat(${Math.min(cards.length, 4)}, minmax(0, 1fr))`,
                            },
                        }}
                    >
                        {cards.map((card) => {
                            const tone = tones[card.tone] || tones.primary;

                            return (
                                <AppSurface
                                    key={card.key}
                                    component="button"
                                    type="button"
                                    onClick={() => open(card.href)}
                                    sx={{
                                        p: 1.75,
                                        border: 0,
                                        textAlign: 'left',
                                        cursor: card.href ? 'pointer' : 'default',
                                        transition: 'transform 160ms ease, border-color 160ms ease',
                                        '&:hover': card.href ? { transform: 'translateY(-2px)' } : undefined,
                                    }}
                                >
                                    <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {card.label}
                                            </Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 840, mt: 0.5, mb: 0.5 }}>
                                                {formatValue(card)}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: '10px',
                                                display: 'grid',
                                                placeItems: 'center',
                                                color: tone.color,
                                                bgcolor: tone.background,
                                            }}
                                        >
                                            <ArrowForwardIcon sx={{ fontSize: 18 }} />
                                        </Box>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        {card.helper}
                                    </Typography>
                                </AppSurface>
                            );
                        })}
                    </Box>
                ) : null}

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' },
                    }}
                >
                    <AppSurface sx={{ p: 2 }}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    Needs attention
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Work items in your accessible branch scope.
                                </Typography>
                            </Box>
                            <AttentionIcon sx={{ color: 'warning.main' }} />
                        </Stack>

                        {attention.length ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
                                {attention.map((item) => (
                                    <Box
                                        key={item.key}
                                        component="button"
                                        type="button"
                                        onClick={() => open(item.href)}
                                        sx={{
                                            p: 1.35,
                                            borderRadius: '12px',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'rgba(148,163,184,0.045)',
                                            color: 'text.primary',
                                            textAlign: 'left',
                                            cursor: item.href ? 'pointer' : 'default',
                                            '&:hover': { bgcolor: 'rgba(59,130,246,0.055)' },
                                        }}
                                    >
                                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 780 }}>
                                                {item.label}
                                            </Typography>
                                            <StatusBadge
                                                status={item.tone === 'danger' ? 'overdue' : item.tone === 'success' ? 'active' : item.tone}
                                                label={number.format(Number(item.value || 0))}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.helper}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <EmptyState compact icon={<AttentionIcon />} title="Nothing requires attention" description="No actionable items are available for your role." />
                        )}
                    </AppSurface>

                    <AppSurface sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Quick actions
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Shortcuts are limited to your assigned permissions.
                        </Typography>

                        {shortcuts.length ? (
                            <Stack spacing={0.75}>
                                {shortcuts.map((shortcut) => {
                                    const Icon = shortcutIcons[shortcut.icon] || ArrowForwardIcon;
                                    const tone = tones[shortcut.tone] || tones.primary;

                                    return (
                                        <Button
                                            key={shortcut.label}
                                            fullWidth
                                            color="inherit"
                                            onClick={() => open(shortcut.href)}
                                            sx={{
                                                minHeight: 48,
                                                px: 1.25,
                                                justifyContent: 'flex-start',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'rgba(148,163,184,0.04)',
                                            }}
                                        >
                                            <Box sx={{ width: 32, height: 32, borderRadius: '9px', display: 'grid', placeItems: 'center', color: tone.color, bgcolor: tone.background, mr: 1.1 }}>
                                                <Icon sx={{ fontSize: 18 }} />
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 760 }}>
                                                    {shortcut.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    {shortcut.description}
                                                </Typography>
                                            </Box>
                                            <ArrowForwardIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
                                        </Button>
                                    );
                                })}
                            </Stack>
                        ) : (
                            <EmptyState compact icon={<EmptyIcon />} title="No management shortcuts" description="Your account currently has dashboard-only access." />
                        )}
                    </AppSurface>
                </Box>

                {(recentCustomers.length || recentPayments.length) ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: {
                                xs: '1fr',
                                xl: recentCustomers.length && recentPayments.length ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                            },
                        }}
                    >
                        {recentCustomers.length ? (
                            <AppSurface sx={{ p: 2 }}>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                            Recently added customers
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Latest subscribers in your accessible branches.
                                        </Typography>
                                    </Box>
                                    <Button onClick={() => open('/customers')}>View All</Button>
                                </Stack>
                                <Stack spacing={0.7}>
                                    {recentCustomers.map((customer) => (
                                        <Button
                                            key={customer.id}
                                            color="inherit"
                                            fullWidth
                                            onClick={() => open(`/customers/${customer.id}`)}
                                            sx={{ p: 1.1, justifyContent: 'space-between', border: '1px solid', borderColor: 'divider' }}
                                        >
                                            <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 760 }} noWrap>
                                                    {customer.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {customer.customer_code || customer.phone} | {customer.branch?.name || '-'} | {customer.package?.name || 'No package'}
                                                </Typography>
                                            </Box>
                                            <StatusBadge status={customer.status} />
                                        </Button>
                                    ))}
                                </Stack>
                            </AppSurface>
                        ) : null}

                        {recentPayments.length ? (
                            <AppSurface sx={{ p: 2 }}>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                            Recent payments
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Latest collections recorded in your scope.
                                        </Typography>
                                    </Box>
                                    <Button onClick={() => open('/payments')}>View All</Button>
                                </Stack>
                                <Stack spacing={0.7}>
                                    {recentPayments.map((payment) => (
                                        <Box key={payment.id} sx={{ p: 1.1, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                                            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 760 }} noWrap>
                                                        {payment.customer?.name || payment.payment_code || '-'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                        {payment.invoice?.invoice_number || '-'} | {formatMethod(payment.method)} | {formatDateTime(payment.paid_at)}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                                                    {currency.format(Number(payment.amount || 0))}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </AppSurface>
                        ) : null}
                    </Box>
                ) : null}
            </Stack>
        </AdminLayout>
    );
}
