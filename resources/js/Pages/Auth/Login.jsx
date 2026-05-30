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
    DashboardRounded as DashboardIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    SecurityRounded as SecurityIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    WifiRounded as WifiIcon,
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

    const mobileHighlights = [
        { label: 'Dashboard', value: 'Live', icon: <DashboardIcon sx={{ fontSize: 17 }} /> },
        { label: 'Branches', value: 'Multi', icon: <WifiIcon sx={{ fontSize: 17 }} /> },
        { label: 'Access', value: 'RBAC', icon: <SecurityIcon sx={{ fontSize: 17 }} /> },
    ];

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
                                        Super
                                        <Typography component="span" sx={{ display: 'block', color: 'rgba(226, 232, 240, 0.76)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.01em' }}>
                                            Excellent Wifi Service
                                        </Typography>
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

                <Box
                    sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        bgcolor: isMobile ? '#eef4ff' : 'background.paper',
                        '&::before': isMobile
                            ? {
                                  content: '""',
                                  position: 'absolute',
                                  inset: '0 0 auto',
                                  height: 330,
                                  borderRadius: '0 0 34px 34px',
                                  background:
                                      'radial-gradient(circle at 12% 5%, rgba(96, 165, 250, 0.38), transparent 34%), radial-gradient(circle at 92% 18%, rgba(139, 92, 246, 0.32), transparent 32%), linear-gradient(145deg, #071a33 0%, #0d3970 56%, #2563eb 100%)',
                              }
                            : undefined,
                        '&::after': isMobile
                            ? {
                                  content: '""',
                                  position: 'absolute',
                                  width: 290,
                                  height: 290,
                                  top: -44,
                                  right: -86,
                                  backgroundImage: `url(${logoSrc})`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'center',
                                  backgroundSize: 'contain',
                                  opacity: 0.055,
                                  transform: 'rotate(-10deg)',
                                  pointerEvents: 'none',
                              }
                            : undefined,
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            minHeight: '100vh',
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: { xs: 'flex-start', md: 'center' },
                            px: { xs: 2, sm: 4, md: 6, lg: 8, xl: 10 },
                            py: { xs: 2.25, sm: 3, md: 2 },
                            overflowY: 'auto',
                        }}
                    >
                        <Box sx={{ maxWidth: { xs: 440, md: 360 }, width: '100%', mx: 'auto' }}>
                            {isMobile && (
                                <>
                                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                                            <Box
                                                sx={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 2.25,
                                                    bgcolor: 'rgba(255, 255, 255, 0.11)',
                                                    border: '1px solid rgba(255, 255, 255, 0.18)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 8px 18px rgba(2, 6, 23, 0.18)',
                                                }}
                                            >
                                                <Box component="img" src={logoSrc} alt="Logo" sx={{ width: 25, height: 25 }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ color: 'white', fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.15 }}>
                                                    Super
                                                </Typography>
                                                <Typography sx={{ color: 'rgba(226, 232, 240, 0.76)', fontSize: '0.66rem', fontWeight: 700 }}>
                                                    Excellent Wifi Service
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Stack
                                            direction="row"
                                            spacing={0.75}
                                            sx={{
                                                alignItems: 'center',
                                                px: 1.1,
                                                py: 0.7,
                                                borderRadius: 999,
                                                bgcolor: 'rgba(255, 255, 255, 0.10)',
                                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                            }}
                                        >
                                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ade80', boxShadow: '0 0 0 3px rgba(74, 222, 128, 0.15)' }} />
                                            <Typography sx={{ color: 'rgba(240, 253, 244, 0.94)', fontSize: '0.64rem', fontWeight: 800 }}>
                                                Secure
                                            </Typography>
                                        </Stack>
                                    </Stack>

                                    <Stack spacing={0.8} sx={{ mb: 2 }}>
                                        <Typography sx={{ color: 'rgba(191, 219, 254, 0.9)', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                            Staff workspace
                                        </Typography>
                                        <Typography sx={{ color: 'white', fontSize: { xs: '1.7rem', sm: '2rem' }, fontWeight: 850, letterSpacing: '-0.045em', lineHeight: 1.05 }}>
                                            Run your network
                                            <br />
                                            with clarity.
                                        </Typography>
                                        <Typography sx={{ maxWidth: 360, color: 'rgba(226, 232, 240, 0.82)', fontSize: '0.78rem', lineHeight: 1.55 }}>
                                            Billing, subscribers, collections, and branch operations in one secure dashboard.
                                        </Typography>
                                    </Stack>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                                        {mobileHighlights.map((item) => (
                                            <Stack
                                                key={item.label}
                                                spacing={0.5}
                                                sx={{
                                                    p: 1,
                                                    minWidth: 0,
                                                    borderRadius: 2,
                                                    color: 'white',
                                                    bgcolor: 'rgba(255, 255, 255, 0.10)',
                                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                                    backdropFilter: 'blur(12px)',
                                                }}
                                            >
                                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', color: '#bfdbfe' }}>
                                                    {item.icon}
                                                    <Typography sx={{ color: 'white', fontSize: '0.7rem', fontWeight: 850 }}>
                                                        {item.value}
                                                    </Typography>
                                                </Stack>
                                                <Typography sx={{ color: 'rgba(226, 232, 240, 0.78)', fontSize: '0.63rem', fontWeight: 700 }}>
                                                    {item.label}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Box>
                                </>
                            )}

                            <Box
                                sx={{
                                    mt: isMobile ? 2 : 0,
                                    p: isMobile ? 2.25 : 0,
                                    borderRadius: isMobile ? 3 : 0,
                                    bgcolor: isMobile ? 'rgba(255, 255, 255, 0.97)' : 'transparent',
                                    border: isMobile ? '1px solid rgba(148, 163, 184, 0.18)' : 'none',
                                    boxShadow: isMobile ? '0 18px 42px rgba(15, 23, 42, 0.14)' : 'none',
                                    backdropFilter: isMobile ? 'blur(18px)' : 'none',
                                }}
                            >
                                <Stack spacing={0.5} sx={{ mb: 2.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                        {isMobile ? 'Welcome back' : 'Sign in'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {isMobile
                                            ? 'Sign in to continue to your operations dashboard.'
                                            : 'Use your Super Admin account to access the system.'}
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

                            {isMobile && (
                                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'center', mt: 2, color: '#64748b' }}>
                                    <SecurityIcon sx={{ fontSize: 15 }} />
                                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700 }}>
                                        Protected staff access for Super operations
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
