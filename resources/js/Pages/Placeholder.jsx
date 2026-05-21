import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { Alert, Paper, Stack, Typography } from '@mui/material';

export default function Placeholder({ title, description }) {
    return (
        <AdminLayout title={title || 'Coming Soon'}>
            <Head title={title || 'Coming Soon'} />
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Stack spacing={1}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {title || 'Coming Soon'}
                    </Typography>
                    {description ? (
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    ) : null}
                    <Alert severity="info">This page is a placeholder and will be implemented in the next phases.</Alert>
                </Stack>
            </Paper>
        </AdminLayout>
    );
}

