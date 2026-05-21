import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React, { useEffect } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

export default function Login({ status, canResetPassword }) {
    const { admin_app_url, app_base } = usePage().props;
    const appBase = app_base || '';
    const logoSrc = `${appBase}/app_logo_transparent.png`;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [showPassword, setShowPassword] = React.useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();

        post(`${admin_app_url}/login`);
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.paper' }}>
            <Head title="Log in" />
            <Box
                sx={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'minmax(0, 1.4fr) minmax(360px, 1fr)',
                    },
                }}
            >
                {!isMobile && (
                    <Box>
                        <Box
                            sx={{
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                                backgroundColor: '#0b1220',
                                backgroundImage:
                                    'radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.35), transparent 45%), radial-gradient(circle at 90% 90%, rgba(245, 158, 11, 0.22), transparent 50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                px: { md: 8, lg: 12 },
                                color: 'white',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundImage: `url(${logoSrc})`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    backgroundSize: '720px',
                                    opacity: 0.08,
                                    transform: 'rotate(-6deg) scale(1.05)',
                                    pointerEvents: 'none',
                                },
                            }}
                        >
                            <Stack spacing={3} sx={{ position: 'relative' }}>
                                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(148, 163, 184, 0.18)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Box component="img" src={logoSrc} alt="Logo" sx={{ width: 30, height: 30 }} />
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                        ISP/WiFi Management
                                    </Typography>
                                </Stack>

                                <Stack spacing={1.5}>
                                    <Typography
                                        variant="h3"
                                        sx={{
                                            fontWeight: 800,
                                            lineHeight: 1.08,
                                            fontSize: { md: '2.6rem', lg: '2.85rem', xl: '3.1rem' },
                                        }}
                                    >
                                        Branch-ready <br />
                                        <Box component="span" sx={{ color: 'primary.main' }}>
                                            Billing & Customer Console
                                        </Box>
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: 'rgba(226, 232, 240, 0.82)', fontWeight: 400, maxWidth: 520 }}>
                                        Manage customers, packages, monthly invoices, payments, and branch operations with fast daily workflows.
                                    </Typography>
                                </Stack>

                                <Stack spacing={1.5}>
                                    {[
                                        'Multi-branch filtering and staff access control',
                                        'Monthly billing, receipts, and accurate payment history',
                                        'Overdue tracking with notifications and SMS readiness',
                                        'Audit-friendly activity logs for critical changes',
                                    ].map((feature) => (
                                        <Stack key={feature} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                                            <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                            <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.88)' }}>
                                                {feature}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Stack>
                        </Box>
                    </Box>
                )}

                <Box>
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            px: { xs: 3, sm: 8, md: 6, lg: 8, xl: 10 },
                            py: 2,
                            overflowY: 'auto',
                        }}
                    >
                        <Box sx={{ maxWidth: 360, width: '100%', mx: 'auto' }}>
                            {isMobile && (
                                <Stack direction="row" spacing={1.5} sx={{ mb: 4, alignItems: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(59, 130, 246, 0.10)',
                                            border: '1px solid rgba(59, 130, 246, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Box component="img" src={logoSrc} alt="Logo" sx={{ width: 22, height: 22 }} />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                        ISP/WiFi Admin
                                    </Typography>
                                </Stack>
                            )}

                            <Stack spacing={0.5} sx={{ mb: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                    Sign in
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Use your Super Admin account to access the system.
                                </Typography>
                            </Stack>

                            {status && <Alert severity="success" sx={{ mb: 2 }}>{status}</Alert>}
                            {errors.email && <Alert severity="error" sx={{ mb: 2 }}>{errors.email}</Alert>}

                            <Box component="form" onSubmit={submit}>
                                <Stack spacing={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Email Address"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        error={!!errors.email}
                                        required
                                        autoFocus
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        error={!!errors.password}
                                        required
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                                                        {showPassword ? (
                                                            <VisibilityOffIcon fontSize="small" />
                                                        ) : (
                                                            <VisibilityIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={data.remember}
                                                    onChange={(e) => setData('remember', e.target.checked)}
                                                />
                                            }
                                            label={<Typography variant="caption" sx={{ fontWeight: 500 }}>Remember me</Typography>}
                                        />
                                        {canResetPassword && (
                                            <Typography
                                                variant="caption"
                                                component={Link}
                                                href={`${admin_app_url}/forgot-password`}
                                                sx={{
                                                    color: 'primary.main',
                                                    textDecoration: 'none',
                                                    fontWeight: 600,
                                                    '&:hover': { textDecoration: 'underline' },
                                                }}
                                            >
                                                Forgot password?
                                            </Typography>
                                        )}
                                    </Stack>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="medium"
                                        type="submit"
                                        disabled={processing}
                                        sx={{
                                            py: 1.25,
                                            fontWeight: 700,
                                            borderRadius: 1.5,
                                            textTransform: 'none',
                                            fontSize: '0.875rem',
                                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                                        }}
                                    >
                                        {processing ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
                                    </Button>
                                </Stack>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
