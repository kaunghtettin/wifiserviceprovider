import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    AdminPanelSettingsRounded,
    ArrowForwardRounded,
    BusinessRounded,
    CorporateFareRounded,
    LanguageRounded,
    LogoutRounded,
    ManageAccountsRounded,
    PhoneRounded,
    PlaceRounded,
    SearchRounded,
    ShieldRounded,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    CssBaseline,
    Grid,
    InputAdornment,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    alpha,
} from '@mui/material';
import { getAdminTheme } from '@/theme/adminTheme';

const formatRole = (value) =>
    String(value || 'Branch member')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());

export default function SelectWorkspace({ branches = [], canAccessGlobal }) {
    const { admin_app_url: appUrl, app_base: appBase, auth } = usePage().props;
    const [query, setQuery] = useState('');
    const [opening, setOpening] = useState(null);
    const theme = useMemo(() => getAdminTheme('light'), []);
    const logoSrc = `${appBase}/app_logo_transparent.png`;

    const filteredBranches = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return branches;

        return branches.filter((branch) =>
            [branch.name, branch.code, branch.address, branch.phone, branch.role]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
        );
    }, [branches, query]);

    const openWorkspace = (key, url) => {
        if (opening) return;
        setOpening(key);
        router.post(url, {}, { onFinish: () => setOpening(null) });
    };

    const initials = String(auth?.user?.name || 'User')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Head title="Choose Workspace" />

            <Box
                sx={{
                    minHeight: '100vh',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: '#f3f6fb',
                    '&::before': {
                        content: '""',
                        position: 'fixed',
                        inset: 0,
                        background:
                            'radial-gradient(circle at 4% 8%, rgba(59,130,246,0.13), transparent 27%), radial-gradient(circle at 96% 4%, rgba(139,92,246,0.10), transparent 25%), linear-gradient(180deg, #f8fbff 0%, #f3f6fb 48%, #eef3f9 100%)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Box
                    component="header"
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha('#ffffff', 0.78),
                        backdropFilter: 'blur(18px)',
                    }}
                >
                    <Container maxWidth="lg">
                        <Stack
                            direction="row"
                            sx={{
                                minHeight: { xs: 72, md: 80 },
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                            }}
                        >
                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                <Box
                                    sx={{
                                        width: 46,
                                        height: 46,
                                        display: 'grid',
                                        placeItems: 'center',
                                        borderRadius: 2.5,
                                        bgcolor: '#ffffff',
                                        border: '1px solid rgba(37,99,235,0.14)',
                                        boxShadow: '0 12px 28px rgba(37,99,235,0.22)',
                                    }}
                                >
                                    <Box component="img" src={logoSrc} alt="Super Excellent Wifi Solutions" sx={{ width: 29, height: 29 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 850, lineHeight: 1.15 }}>
                                        Super Excellent
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Wifi Solutions
                                    </Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                                <Stack sx={{ display: { xs: 'none', sm: 'flex' }, textAlign: 'right' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 750 }}>
                                        {auth?.user?.name || 'User'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Select a secure workspace
                                    </Typography>
                                </Stack>
                                <Avatar
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        color: 'primary.dark',
                                        fontSize: '0.8rem',
                                        fontWeight: 850,
                                    }}
                                >
                                    {initials}
                                </Avatar>
                                <Button
                                    color="inherit"
                                    startIcon={<LogoutRounded />}
                                    disabled={!!opening}
                                    onClick={() => router.post(`${appUrl}/logout`)}
                                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                                >
                                    Sign out
                                </Button>
                            </Stack>
                        </Stack>
                    </Container>
                </Box>

                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 4, md: 6 } }}>
                    <Stack spacing={{ xs: 3.5, md: 4.5 }}>
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            sx={{ alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}
                        >
                            <Box>
                                <Chip
                                    icon={<ShieldRounded />}
                                    label="Secure workspace access"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ mb: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.04) }}
                                />
                                <Typography
                                    variant="h2"
                                    sx={{
                                        maxWidth: 680,
                                        fontSize: { xs: '2rem', sm: '2.45rem', md: '2.85rem' },
                                        lineHeight: 1.08,
                                        mb: 1.2,
                                    }}
                                >
                                    Where would you like to work today?
                                </Typography>
                                <Typography color="text.secondary" sx={{ maxWidth: 650, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                                    Choose a branch for daily operations, or enter the global workspace for company-wide administration and reporting.
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Box
                                    sx={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: '50%',
                                        bgcolor: 'success.main',
                                        boxShadow: `0 0 0 5px ${alpha(theme.palette.success.main, 0.12)}`,
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {branches.length} {branches.length === 1 ? 'branch' : 'branches'} available
                                </Typography>
                            </Stack>
                        </Stack>

                        {canAccessGlobal ? (
                            <Card
                                sx={{
                                    color: '#fff',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(147,197,253,0.22)',
                                    background:
                                        'radial-gradient(circle at 88% 18%, rgba(139,92,246,0.38), transparent 28%), radial-gradient(circle at 12% 110%, rgba(59,130,246,0.34), transparent 34%), linear-gradient(135deg, #0b1930 0%, #102b50 58%, #163f73 100%)',
                                    boxShadow: '0 24px 54px rgba(15,39,72,0.20)',
                                }}
                            >
                                <CardActionArea
                                    disabled={!!opening}
                                    onClick={() => openWorkspace('global', `${appUrl}/workspaces/global`)}
                                    sx={{
                                        p: { xs: 0.5, md: 1 },
                                        '&:hover .global-arrow': {
                                            transform: 'translateX(5px)',
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2.5, sm: 3.25, md: 4 } }}>
                                        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                                            <Grid item xs={12} md={7}>
                                                <Stack direction="row" spacing={2.25} sx={{ alignItems: 'flex-start' }}>
                                                    <Avatar
                                                        sx={{
                                                            width: { xs: 52, sm: 62 },
                                                            height: { xs: 52, sm: 62 },
                                                            bgcolor: 'rgba(255,255,255,0.11)',
                                                            border: '1px solid rgba(255,255,255,0.16)',
                                                        }}
                                                    >
                                                        <AdminPanelSettingsRounded sx={{ fontSize: { xs: 28, sm: 34 } }} />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="overline" sx={{ color: '#93c5fd' }}>
                                                            Global workspace
                                                        </Typography>
                                                        <Typography variant="h3" sx={{ color: '#fff', fontSize: { xs: '1.45rem', sm: '1.8rem' }, mb: 1 }}>
                                                            Company administration
                                                        </Typography>
                                                        <Typography sx={{ color: 'rgba(226,232,240,0.78)', maxWidth: 590 }}>
                                                            See consolidated performance and manage shared company settings without entering a branch.
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Grid>
                                            <Grid item xs={12} md={5}>
                                                <Stack spacing={1.15}>
                                                    {[
                                                        [<LanguageRounded fontSize="small" />, 'Global summary and branch comparison'],
                                                        [<ManageAccountsRounded fontSize="small" />, 'Users, roles, and access control'],
                                                        [<CorporateFareRounded fontSize="small" />, 'Branch administration'],
                                                    ].map(([icon, label]) => (
                                                        <Stack key={label} direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                                                            <Box
                                                                sx={{
                                                                    width: 30,
                                                                    height: 30,
                                                                    display: 'grid',
                                                                    placeItems: 'center',
                                                                    borderRadius: 1.5,
                                                                    bgcolor: 'rgba(255,255,255,0.08)',
                                                                    color: '#bfdbfe',
                                                                }}
                                                            >
                                                                {icon}
                                                            </Box>
                                                            <Typography variant="body2" sx={{ color: 'rgba(241,245,249,0.9)', flex: 1 }}>
                                                                {label}
                                                            </Typography>
                                                            {label === 'Branch administration' ? (
                                                                opening === 'global'
                                                                    ? <CircularProgress size={20} sx={{ color: '#fff' }} />
                                                                    : <ArrowForwardRounded className="global-arrow" sx={{ transition: 'transform 180ms ease' }} />
                                                            ) : null}
                                                        </Stack>
                                                    ))}
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ) : null}

                        <Box>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', mb: 2.25 }}
                            >
                                <Box>
                                    <Typography variant="h4" sx={{ mb: 0.5 }}>
                                        Branch workspaces
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Operational data is isolated to the branch you select.
                                    </Typography>
                                </Box>
                                {branches.length > 3 ? (
                                    <TextField
                                        size="small"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search branches"
                                        sx={{ width: { xs: '100%', sm: 280 } }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchRounded fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                ) : null}
                            </Stack>

                            {filteredBranches.length ? (
                                <Grid container spacing={2.25}>
                                    {filteredBranches.map((branch, index) => {
                                        const workspaceKey = `branch-${branch.id}`;
                                        const isOpening = opening === workspaceKey;
                                        const tone = index % 3 === 0
                                            ? ['#2563eb', '#dbeafe']
                                            : index % 3 === 1
                                                ? ['#7c3aed', '#ede9fe']
                                                : ['#0891b2', '#cffafe'];

                                        return (
                                            <Grid item xs={12} sm={6} lg={4} key={branch.id}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        height: '100%',
                                                        boxShadow: '0 12px 30px rgba(15,23,42,0.055)',
                                                        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-4px)',
                                                            borderColor: alpha(tone[0], 0.34),
                                                            boxShadow: '0 20px 42px rgba(15,23,42,0.10)',
                                                        },
                                                    }}
                                                >
                                                    <CardActionArea
                                                        disabled={!!opening}
                                                        onClick={() => openWorkspace(workspaceKey, `${appUrl}/workspaces/branches/${branch.id}`)}
                                                        sx={{
                                                            height: '100%',
                                                            '&:hover .branch-arrow': { transform: 'translateX(4px)' },
                                                        }}
                                                    >
                                                        <CardContent sx={{ p: 2.75, height: '100%' }}>
                                                            <Stack spacing={2.25} sx={{ height: '100%' }}>
                                                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                                                    <Avatar
                                                                        variant="rounded"
                                                                        sx={{
                                                                            width: 48,
                                                                            height: 48,
                                                                            bgcolor: tone[1],
                                                                            color: tone[0],
                                                                        }}
                                                                    >
                                                                        <BusinessRounded />
                                                                    </Avatar>
                                                                    <Chip
                                                                        size="small"
                                                                        label={formatRole(branch.role)}
                                                                        sx={{
                                                                            bgcolor: alpha(tone[0], 0.08),
                                                                            color: tone[0],
                                                                            border: `1px solid ${alpha(tone[0], 0.12)}`,
                                                                        }}
                                                                    />
                                                                </Stack>

                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography variant="h4" sx={{ mb: 0.45 }}>
                                                                        {branch.name}
                                                                    </Typography>
                                                                    <Typography variant="overline" sx={{ color: tone[0] }}>
                                                                        {branch.code || `Branch ${branch.id}`}
                                                                    </Typography>
                                                                </Box>

                                                                <Stack spacing={1.1}>
                                                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                                                                        <PlaceRounded sx={{ fontSize: 18, color: 'text.disabled' }} />
                                                                        <Typography variant="body2" color="text.secondary" noWrap>
                                                                            {branch.address || 'Address not set'}
                                                                        </Typography>
                                                                    </Stack>
                                                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                                                        <PhoneRounded sx={{ fontSize: 18, color: 'text.disabled' }} />
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {branch.phone || 'Phone not set'}
                                                                        </Typography>
                                                                    </Stack>
                                                                </Stack>

                                                                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.75 }}>
                                                                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <Typography variant="button" sx={{ color: tone[0] }}>
                                                                            Open workspace
                                                                        </Typography>
                                                                        {isOpening ? (
                                                                            <CircularProgress size={20} sx={{ color: tone[0] }} />
                                                                        ) : (
                                                                            <ArrowForwardRounded
                                                                                className="branch-arrow"
                                                                                sx={{ color: tone[0], transition: 'transform 180ms ease' }}
                                                                            />
                                                                        )}
                                                                    </Stack>
                                                                </Box>
                                                            </Stack>
                                                        </CardContent>
                                                    </CardActionArea>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            ) : (
                                <Card variant="outlined">
                                    <CardContent sx={{ py: 7, px: 3, textAlign: 'center' }}>
                                        <Avatar sx={{ width: 58, height: 58, mx: 'auto', mb: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                                            {query ? <SearchRounded /> : <BusinessRounded />}
                                        </Avatar>
                                        <Typography variant="h5" sx={{ mb: 0.75 }}>
                                            {query ? 'No matching branches' : 'No branch access assigned'}
                                        </Typography>
                                        <Typography color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>
                                            {query
                                                ? 'Try a branch name, code, address, phone number, or role.'
                                                : 'Ask a global administrator to assign a branch and role to your account.'}
                                        </Typography>
                                        {query ? (
                                            <Button sx={{ mt: 2 }} onClick={() => setQuery('')}>
                                                Clear search
                                            </Button>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            )}
                        </Box>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{
                                alignItems: { sm: 'center' },
                                justifyContent: 'space-between',
                                pt: 1,
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="caption">
                                Your permissions and navigation update automatically for each workspace.
                            </Typography>
                            <Button
                                color="inherit"
                                startIcon={<LogoutRounded />}
                                disabled={!!opening}
                                onClick={() => router.post(`${appUrl}/logout`)}
                                sx={{ display: { sm: 'none' }, alignSelf: 'flex-start' }}
                            >
                                Sign out
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>
        </ThemeProvider>
    );
}
