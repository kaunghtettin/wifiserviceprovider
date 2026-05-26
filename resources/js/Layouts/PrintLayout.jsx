import { Head } from '@inertiajs/react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { ArrowBack as ArrowBackIcon, Print as PrintIcon } from '@mui/icons-material';

const FORMATS = {
    a4: {
        label: 'A4',
        width: '210mm',
        padding: 3,
        minHeight: '297mm',
    },
    thermal58: {
        label: 'Thermal 58mm',
        width: '58mm',
        padding: 1.25,
        minHeight: 'auto',
    },
    thermal80: {
        label: 'Thermal 80mm',
        width: '80mm',
        padding: 1.5,
        minHeight: 'auto',
    },
};

export default function PrintLayout({ title, subtitle, backHref, children, defaultFormat = 'a4' }) {
    const [format, setFormat] = useState(defaultFormat in FORMATS ? defaultFormat : 'a4');

    const activeFormat = useMemo(() => FORMATS[format] || FORMATS.a4, [format]);

    return (
        <>
            <Head title={title} />

            <Box
                sx={{
                    minHeight: '100vh',
                    bgcolor: '#eef2f8',
                    px: { xs: 1.5, md: 3 },
                    py: { xs: 1.5, md: 2.5 },
                    '@media print': {
                        bgcolor: '#ffffff',
                        p: 0,
                    },
                }}
            >
                <Stack
                    className="print-toolbar"
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{
                        mb: 1.5,
                        alignItems: { sm: 'center' },
                        justifyContent: 'space-between',
                        '@media print': {
                            display: 'none',
                        },
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {title}
                        </Typography>
                        {subtitle ? (
                            <Typography variant="body2" color="text.secondary">
                                {subtitle}
                            </Typography>
                        ) : null}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <TextField
                            select
                            size="small"
                            label="Format"
                            value={format}
                            onChange={(event) => setFormat(event.target.value)}
                            sx={{ minWidth: 150 }}
                        >
                            {Object.entries(FORMATS).map(([key, option]) => (
                                <MenuItem key={key} value={key}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button component="a" href={backHref} variant="text" color="inherit" startIcon={<ArrowBackIcon />}>
                            Back
                        </Button>
                        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                            Print
                        </Button>
                    </Stack>
                </Stack>

                <Paper
                    elevation={0}
                    sx={{
                        width: activeFormat.width,
                        minHeight: activeFormat.minHeight,
                        maxWidth: '100%',
                        mx: 'auto',
                        p: activeFormat.padding,
                        bgcolor: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
                        '@media print': {
                            width: '100%',
                            maxWidth: '100%',
                            minHeight: 'auto',
                            border: 'none',
                            boxShadow: 'none',
                            p: format === 'a4' ? 0 : activeFormat.padding,
                        },
                    }}
                >
                    {children}
                </Paper>
            </Box>
        </>
    );
}
