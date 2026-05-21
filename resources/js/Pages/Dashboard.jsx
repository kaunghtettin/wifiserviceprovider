import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { Box, Paper, Stack, Typography } from '@mui/material';

export default function Dashboard({ stats, progress }) {
    const kpis = [
        { label: 'Branches', value: stats?.branches ?? 0 },
        { label: 'Users', value: stats?.users ?? 0 },
        { label: 'Packages', value: stats?.packages ?? 0 },
        { label: 'Customers', value: stats?.customers ?? 0 },
    ];

    return (
        <AdminLayout title="Dashboard">
            <Head title="Dashboard" />
            <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    {kpis.map((kpi) => (
                        <Paper key={kpi.label} variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                {kpi.label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                                {kpi.value}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>

                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                        Development Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {progress?.phase || 'Phase 1 (MVP)'}
                    </Typography>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Done
                            </Typography>
                            <Stack spacing={0.75}>
                                {(progress?.done || []).map((item) => (
                                    <Typography key={item} variant="body2" color="text.secondary">
                                        - {item}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Next
                            </Typography>
                            <Stack spacing={0.75}>
                                {(progress?.next || []).map((item) => (
                                    <Typography key={item} variant="body2" color="text.secondary">
                                        - {item}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>
            </Stack>
        </AdminLayout>
    );
}
