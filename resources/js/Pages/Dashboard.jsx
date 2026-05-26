import AppSurface from '@/Components/admin/AppSurface';
import PageHeader from '@/Components/admin/PageHeader';
import StatCard from '@/Components/admin/StatCard';
import StatusBadge from '@/Components/admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import {
    Box,
    Button,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import {
    Business as BusinessIcon,
    ManageAccounts as UsersIcon,
    Paid as RevenueIcon,
    People as CustomersIcon,
    Wifi as WifiIcon,
} from '@mui/icons-material';

export default function Dashboard({ stats, progress }) {
    const kpis = [
        {
            label: 'Branches',
            value: stats?.branches ?? 0,
            helper: 'Branch operations ready for multi-site deployment.',
            trend: '+12%',
            icon: <BusinessIcon fontSize="small" />,
            values: [22, 28, 24, 30, 34, 38],
            color: '#3b82f6',
        },
        {
            label: 'Users',
            value: stats?.users ?? 0,
            helper: 'Admins and operators with RBAC-enabled access.',
            trend: '+5%',
            icon: <UsersIcon fontSize="small" />,
            values: [20, 24, 26, 28, 27, 32],
            color: '#8b5cf6',
        },
        {
            label: 'Packages',
            value: stats?.packages ?? 0,
            helper: 'Branch-specific and global bandwidth plans.',
            trend: '+8%',
            icon: <WifiIcon fontSize="small" />,
            values: [18, 24, 21, 29, 31, 36],
            color: '#0ea5e9',
        },
        {
            label: 'Customers',
            value: stats?.customers ?? 0,
            helper: 'Subscriber records ready for billing automation.',
            trend: '+18%',
            icon: <CustomersIcon fontSize="small" />,
            values: [26, 28, 32, 36, 40, 44],
            color: '#22c55e',
        },
    ];

    const completionPercent = Math.min(
        100,
        Math.round((((progress?.done || []).length || 0) / Math.max(1, ((progress?.done || []).length || 0) + ((progress?.next || []).length || 0))) * 100),
    );

    const activityItems = [
        { title: 'RBAC foundation completed', meta: 'Roles, permissions, user scope and super admin seeding are live.', status: 'active' },
        { title: 'Core operations workspace online', meta: 'Branches, packages, customers and staff management are working.', status: 'active' },
        { title: 'Finance operations expanded', meta: 'Invoices, payments, expenses, printing, and reporting are now part of the working admin workflow.', status: 'active' },
        { title: 'Network sync foundation online', meta: 'Branch router endpoints, connection checks, and manual suspend/reactivate tracking are ready.', status: 'active' },
        { title: 'Staff mobile workflow improved', meta: 'Customer lookup, payment collection, and network queues now support better phone-first operation.', status: 'active' },
    ];

    const networkWidgets = [
        { label: 'Invoice readiness', value: '74%', color: '#3b82f6' },
        { label: 'Customer data completeness', value: '68%', color: '#8b5cf6' },
        { label: 'Operational module coverage', value: '57%', color: '#22c55e' },
    ];

    return (
        <AdminLayout title="Dashboard">
            <Head title="Dashboard" />
            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="Operations Command Center"
                    title="ISP business overview"
                    description="A cleaner control layer for branches, subscribers, staff operations, and the upcoming billing engine."
                    actions={[
                        <Button key="report" variant="outlined">Export snapshot</Button>,
                        <Button key="workspace" variant="contained">Open workspace</Button>,
                    ]}
                />

                <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
                    {kpis.map((kpi) => (
                        <Box key={kpi.label} sx={{ flex: 1 }}>
                            <StatCard {...kpi} />
                        </Box>
                    ))}
                </Stack>

                <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
                    <AppSurface sx={{ flex: 1.4, p: 2.5 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                                    Development Progress
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {progress?.phase || 'Phase 1 (MVP)'}
                                </Typography>
                            </Box>
                            <StatusBadge label={`${completionPercent}% complete`} status={completionPercent >= 70 ? 'active' : 'pending'} />
                        </Stack>

                        <LinearProgress
                            variant="determinate"
                            value={completionPercent}
                            sx={{
                                height: 10,
                                borderRadius: 999,
                                mb: 2.5,
                                bgcolor: 'rgba(148,163,184,0.12)',
                            }}
                        />

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <AppSurface sx={{ flex: 1, p: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                                    Completed
                                </Typography>
                                <Stack spacing={1}>
                                    {(progress?.done || []).map((item) => (
                                        <Stack key={item} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                                            <StatusBadge label="Done" status="active" sx={{ minWidth: 58 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {item}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </AppSurface>

                            <AppSurface sx={{ flex: 1, p: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                                    Next Up
                                </Typography>
                                <Stack spacing={1}>
                                    {(progress?.next || []).map((item) => (
                                        <Stack key={item} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                                            <StatusBadge label="Next" status="pending" sx={{ minWidth: 58 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {item}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </AppSurface>
                        </Stack>
                    </AppSurface>

                    <AppSurface sx={{ flex: 0.9, p: 2.5 }}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    Operations Pulse
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Build readiness across ISP workflows.
                                </Typography>
                            </Box>
                            <RevenueIcon sx={{ color: 'primary.main' }} />
                        </Stack>

                        <Stack spacing={1.5}>
                            {networkWidgets.map((widget) => (
                                <Box key={widget.label}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                            {widget.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {widget.value}
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Number(widget.value.replace('%', ''))}
                                        sx={{
                                            height: 8,
                                            borderRadius: 999,
                                            bgcolor: 'rgba(148,163,184,0.12)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 999,
                                                background: `linear-gradient(90deg, ${widget.color}, rgba(255,255,255,0.75))`,
                                            },
                                        }}
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </AppSurface>
                </Stack>

                <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
                    <AppSurface sx={{ flex: 1, p: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                            Team Activity
                        </Typography>
                        <Stack spacing={1.25}>
                            {activityItems.map((item) => (
                                <Stack
                                    key={item.title}
                                    direction="row"
                                    spacing={1.25}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(148,163,184,0.06)',
                                        border: '1px solid rgba(148,163,184,0.08)',
                                    }}
                                >
                                    <StatusBadge status={item.status} label={item.status} sx={{ mt: 0.1 }} />
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.25 }}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.meta}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>
                    </AppSurface>

                    <AppSurface sx={{ flex: 1, p: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                            ISP Readiness Snapshot
                        </Typography>
                        <Stack spacing={1.25}>
                            {[
                                ['Billing workflow', 'Live'],
                                ['Expense reporting', 'Live'],
                                ['Voucher printing', 'Live'],
                                ['Revenue analytics', 'Live'],
                                ['Network automation', 'Live'],
                                ['Staff mobile support', 'Live'],
                            ].map(([name, state]) => (
                                <Stack
                                    key={name}
                                    direction="row"
                                    sx={{
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: 1.5,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(148,163,184,0.06)',
                                        border: '1px solid rgba(148,163,184,0.08)',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 760 }}>
                                            {name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Enterprise module rollout
                                        </Typography>
                                    </Box>
                                    <StatusBadge label={state} status={state === 'Live' ? 'active' : state === 'Queued' ? 'pending' : 'offline'} />
                                </Stack>
                            ))}
                        </Stack>
                    </AppSurface>
                </Stack>
            </Stack>
        </AdminLayout>
    );
}
