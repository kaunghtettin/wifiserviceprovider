import { useEffect, useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Alert,
    AppBar,
    Avatar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Menu,
    MenuItem,
    Stack,
    ThemeProvider,
    Toolbar,
    Tooltip,
    Typography,
    alpha,
    useMediaQuery,
} from '@mui/material';
import {
    AccountCircle,
    AccountBalanceWallet as ExpenseIcon,
    Business as BusinessIcon,
    ChevronRight as ChevronRightIcon,
    Dashboard as DashboardIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Logout as LogoutIcon,
    ManageAccounts as UsersIcon,
    Menu as MenuIcon,
    Paid as PaymentsIcon,
    People as CustomersIcon,
    Person as PersonIcon,
    ReceiptLong as InvoicesIcon,
    Shield as RolesIcon,
    Speed as PerformanceIcon,
    Sell as ExpenseCategoryIcon,
    Wifi as PackagesIcon,
    Insights as ReportsIcon,
    SwapHoriz as SwitchWorkspaceIcon,
    WarningAmberRounded as OverdueTrackingIcon,
} from '@mui/icons-material';
import { getAdminTheme } from '@/theme/adminTheme';

const expandedWidth = 264;
const collapsedWidth = 78;
const drawerBackground = '#0b1220';
const drawerSurface = '#111c2f';
const drawerText = '#e5eefb';
const drawerMutedText = '#91a4bf';
const drawerBorder = 'rgba(148, 163, 184, 0.14)';

const formatLabel = (value) =>
    String(value || '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizePath = (value) => {
    const raw = String(value || '')
        .split('?')[0]
        .split('#')[0]
        .trim();

    if (!raw) {
        return '/';
    }

    try {
        const pathname = /^[a-z]+:\/\//i.test(raw)
            ? new URL(raw).pathname
            : raw;

        return pathname.replace(/\/+$/, '') || '/';
    } catch {
        return raw.replace(/\/+$/, '') || '/';
    }
};

export default function AdminLayout({ children, title = 'Admin Panel' }) {
    const { url, props } = usePage();
    const adminAppUrl = props.admin_app_url;
    const appBase = props.app_base || '';
    const authUser = props.auth?.user;
    const workspace = props.auth?.workspace;
    const activeBranch = props.auth?.branch;
    const permissions = props.auth?.permissions || [];
    const isSuperAdmin = !!props.auth?.is_super_admin;
    const roleName = props.auth?.role || (isSuperAdmin ? 'super_admin' : 'staff');
    const flash = props.flash || {};
    const [profileAnchor, setProfileAnchor] = useState(null);
    const [desktopOpen, setDesktopOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const [toast, setToast] = useState(null);
    const [dark, setDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('admin-color-mode') === 'dark';
    });

    const theme = useMemo(() => getAdminTheme(dark ? 'dark' : 'light'), [dark]);
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        const unregisterStart = router.on('start', () => setNavigating(true));
        const unregisterFinish = router.on('finish', () => setNavigating(false));
        const unregisterError = router.on('error', () => setNavigating(false));
        const unregisterInvalid = router.on('invalid', () => setNavigating(false));

        return () => {
            unregisterStart();
            unregisterFinish();
            unregisterError();
            unregisterInvalid();
        };
    }, []);

    useEffect(() => {
        if (flash?.success) {
            setToast({ severity: 'success', message: flash.success });
            return;
        }
        if (flash?.error) {
            setToast({ severity: 'error', message: flash.error });
            return;
        }
        if (flash?.warning) {
            setToast({ severity: 'warning', message: flash.warning });
        }
    }, [flash?.error, flash?.success, flash?.warning]);

    const toggleTheme = () => {
        setDark((prev) => {
            const next = !prev;
            window.localStorage.setItem('admin-color-mode', next ? 'dark' : 'light');
            return next;
        });
    };

    const toggleNavigation = () => {
        if (isMobile) {
            setMobileOpen((prev) => !prev);
            return;
        }
        setDesktopOpen((prev) => !prev);
    };

    const can = (permissionKey) => isSuperAdmin || permissions.includes(permissionKey);

    const branchNavGroups = [
        {
            title: 'Overview',
            items: [
                { label: 'Dashboard', href: `${adminAppUrl}/dashboard`, icon: <DashboardIcon fontSize="small" /> },
                ...(can('dashboard.view')
                    ? [
                          { label: 'Report', href: `${adminAppUrl}/reports`, icon: <ReportsIcon fontSize="small" /> },
                      ]
                    : []),
            ],
        },
        {
            title: 'Workspace',
            items: [
                ...(can('customers.manage') ? [{ label: 'Customer', href: `${adminAppUrl}/customers`, icon: <CustomersIcon fontSize="small" /> }] : []),
                ...(can('customers.manage') ? [{ label: 'Overdue Tracking', href: `${adminAppUrl}/overdue-tracking`, icon: <OverdueTrackingIcon fontSize="small" /> }] : []),
                ...(can('invoices.manage') ? [{ label: 'Invoice', href: `${adminAppUrl}/invoices`, icon: <InvoicesIcon fontSize="small" /> }] : []),
                ...(can('payments.manage') ? [{ label: 'Payment', href: `${adminAppUrl}/payments`, icon: <PaymentsIcon fontSize="small" /> }] : []),
                ...(can('expenses.manage') ? [{ label: 'Expenses', href: `${adminAppUrl}/expenses`, icon: <ExpenseIcon fontSize="small" /> }] : []),
                ...(can('packages.manage') ? [{ label: 'Packages', href: `${adminAppUrl}/packages`, icon: <PackagesIcon fontSize="small" /> }] : []),
                ...(can('expenses.manage')
                    ? [{ label: 'Expense Categories', href: `${adminAppUrl}/expense-categories`, icon: <ExpenseCategoryIcon fontSize="small" /> }]
                    : []),
            ],
        },
        {
            title: 'Account',
            items: [
                { label: 'Profile', href: `${adminAppUrl}/profile`, icon: <PersonIcon fontSize="small" /> },
                {
                    label: 'Switch Branch',
                    icon: <SwitchWorkspaceIcon fontSize="small" />,
                    onClick: () => router.post(`${adminAppUrl}/workspaces/switch`),
                },
                {
                    label: 'Logout',
                    icon: <LogoutIcon fontSize="small" />,
                    onClick: () => router.post(`${adminAppUrl}/logout`),
                },
            ],
        },
    ];

    const globalNavGroups = [
        {
            title: 'Global',
            items: [
                ...(can('reports.global') ? [{ label: 'Global Summary', href: `${adminAppUrl}/global-summary`, icon: <PerformanceIcon fontSize="small" /> }] : []),
                ...(can('branches.manage') ? [{ label: 'Branches', href: `${adminAppUrl}/branches`, icon: <BusinessIcon fontSize="small" /> }] : []),
                ...(can('users.manage') ? [{ label: 'Users', href: `${adminAppUrl}/users`, icon: <UsersIcon fontSize="small" /> }] : []),
                ...(can('roles.manage') ? [{ label: 'Roles', href: `${adminAppUrl}/roles`, icon: <RolesIcon fontSize="small" /> }] : []),
            ],
        },
        {
            title: 'Account',
            items: [
                { label: 'Profile', href: `${adminAppUrl}/profile`, icon: <PersonIcon fontSize="small" /> },
                {
                    label: 'Switch Workspace',
                    icon: <SwitchWorkspaceIcon fontSize="small" />,
                    onClick: () => router.post(`${adminAppUrl}/workspaces/switch`),
                },
                {
                    label: 'Logout',
                    icon: <LogoutIcon fontSize="small" />,
                    onClick: () => router.post(`${adminAppUrl}/logout`),
                },
            ],
        },
    ];

    const commonNavGroups = [
        {
            title: 'Account',
            items: [
                { label: 'Profile', href: `${adminAppUrl}/profile`, icon: <PersonIcon fontSize="small" /> },
                {
                    label: 'Choose Workspace',
                    icon: <SwitchWorkspaceIcon fontSize="small" />,
                    onClick: () => router.post(`${adminAppUrl}/workspaces/switch`),
                },
                {
                    label: 'Logout',
                    icon: <LogoutIcon fontSize="small" />,
                    onClick: () => router.post(`${adminAppUrl}/logout`),
                },
            ],
        },
    ];

    const selectedNavGroups = workspace === 'global'
        ? globalNavGroups
        : workspace === 'branch'
            ? branchNavGroups
            : commonNavGroups;

    const navGroups = selectedNavGroups
        .filter((group) => group.items.length > 0);

    const currentPath = normalizePath(url);
    const flattenedNav = navGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));
    const activeHref = useMemo(() => {
        const matches = flattenedNav
            .filter((item) => {
                if (!item.href) {
                    return false;
                }

                const path = normalizePath(item.href);

                return currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`));
            })
            .sort((a, b) => normalizePath(b.href).length - normalizePath(a.href).length);

        return matches[0]?.href || null;
    }, [currentPath, flattenedNav]);

    const isActive = (href) => {
        if (!href || !activeHref) {
            return false;
        }

        return normalizePath(href) === normalizePath(activeHref);
    };

    const currentItem = flattenedNav.find((item) => isActive(item.href));
    const breadcrumbs = useMemo(() => {
        const homeHref = workspace === 'global' ? `${adminAppUrl}/global-summary` : `${adminAppUrl}/dashboard`;
        const crumbs = [{ label: workspace === 'global' ? 'Global' : activeBranch?.name || 'Branch', href: homeHref }];
        if (currentItem?.group) crumbs.push({ label: currentItem.group });
        crumbs.push({ label: title || currentItem?.label || 'Dashboard' });
        return crumbs;
    }, [activeBranch?.name, adminAppUrl, currentItem, title, workspace]);

    const openProfileMenu = (event) => setProfileAnchor(event.currentTarget);
    const closeProfileMenu = () => setProfileAnchor(null);
    const profileMenuOpen = Boolean(profileAnchor);

    const sidebarContent = (
        <Box
            sx={{
                minHeight: '100%',
                px: desktopOpen || isMobile ? 1 : 0.75,
                py: 1.25,
                color: drawerText,
            }}
        >
            <Stack
                direction="row"
                spacing={1.25}
                sx={{
                    alignItems: 'center',
                    px: desktopOpen || isMobile ? 1 : 0,
                    pb: 1.5,
                }}
            >
                <Box
                    sx={{
                        width: 46,
                        height: 46,
                        borderRadius: '12px',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.75)',
                        boxShadow: '0 10px 24px rgba(2, 6, 23, 0.34)',
                        flexShrink: 0,
                    }}
                >
                    <Box component="img" src={`${appBase}/app_logo_transparent.png`} alt="Super Excellent Wifi Solutions" sx={{ width: 28, height: 28 }} />
                </Box>

                {(desktopOpen || isMobile) && (
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ color: drawerText, fontWeight: 800, lineHeight: 1.1 }}>
                            Super Excellent
                        </Typography>
                        <Typography variant="caption" sx={{ color: drawerMutedText }}>
                            Wifi Solutions
                        </Typography>
                    </Box>
                )}
            </Stack>

            {(desktopOpen || isMobile) && (
                <Box
                    sx={{
                        mb: 2,
                        p: 1.25,
                        borderRadius: '12px',
                        bgcolor: drawerSurface,
                        border: `1px solid ${drawerBorder}`,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
                    }}
                >
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: drawerMutedText }}>
                        {workspace === 'global' ? 'Global Workspace' : activeBranch?.name || 'Branch Workspace'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: drawerText, fontWeight: 800 }}>
                        {formatLabel(roleName)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: drawerMutedText }}>
                        {authUser?.name || 'Administrator'}
                    </Typography>
                </Box>
            )}

            {navGroups.map((group) => (
                <Box key={group.title} sx={{ mb: 1 }}>
                    {(desktopOpen || isMobile) ? (
                        <Typography
                            variant="overline"
                            sx={{ px: 1, py: 0.75, display: 'block', color: drawerMutedText }}
                        >
                            {group.title}
                        </Typography>
                    ) : (
                        <Divider sx={{ my: 1.25, mx: 1.25, borderColor: drawerBorder }} />
                    )}
                    <List dense disablePadding>
                        {group.items.map((item) => {
                            const active = item.href ? isActive(item.href) : false;

                            const button = (
                                <ListItemButton
                                    component={item.href ? Link : 'button'}
                                    {...(item.href ? { href: item.href } : { type: 'button' })}
                                    onClick={() => {
                                        setMobileOpen(false);
                                        item.onClick?.();
                                    }}
                                    selected={active}
                                    sx={{
                                        minHeight: 44,
                                        px: desktopOpen || isMobile ? 1.25 : 1,
                                        justifyContent: desktopOpen || isMobile ? 'flex-start' : 'center',
                                        position: 'relative',
                                        color: active ? '#ffffff' : drawerMutedText,
                                        bgcolor: active ? 'rgba(59, 130, 246, 0.20)' : 'transparent',
                                        '&:hover': {
                                            color: drawerText,
                                            bgcolor: active ? 'rgba(59, 130, 246, 0.26)' : 'rgba(148, 163, 184, 0.09)',
                                        },
                                        '&.Mui-selected': {
                                            color: '#ffffff',
                                            bgcolor: 'rgba(59, 130, 246, 0.20)',
                                            '&:hover': {
                                                bgcolor: 'rgba(59, 130, 246, 0.26)',
                                            },
                                        },
                                        '&::before': active
                                            ? {
                                                  content: '""',
                                                  position: 'absolute',
                                                  left: 8,
                                                  top: 10,
                                                  bottom: 10,
                                                  width: 4,
                                                  borderRadius: 999,
                                                  background: '#60a5fa',
                                                  boxShadow: '0 0 14px rgba(96, 165, 250, 0.62)',
                                              }
                                            : undefined,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: desktopOpen || isMobile ? 1.25 : 0,
                                            justifyContent: 'center',
                                            width: 20,
                                            color: active ? '#93c5fd' : drawerMutedText,
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    {(desktopOpen || isMobile) && (
                                        <>
                                            <ListItemText
                                                primary={item.label}
                                                primaryTypographyProps={{
                                                    fontWeight: active ? 800 : 650,
                                                    fontSize: '0.92rem',
                                                }}
                                            />
                                            {active ? <ChevronRightIcon sx={{ fontSize: 18, color: '#93c5fd' }} /> : null}
                                        </>
                                    )}
                                </ListItemButton>
                            );

                            return (
                                <ListItem key={item.label} disablePadding sx={{ px: 0.35, py: 0.25 }}>
                                    {desktopOpen || isMobile ? (
                                        button
                                    ) : (
                                        <Tooltip title={item.label} placement="right">
                                            {button}
                                        </Tooltip>
                                    )}
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>
            ))}
        </Box>
    );

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <CssBaseline />

                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: (muiTheme) => ({
                            xs: muiTheme.zIndex.appBar,
                            md: muiTheme.zIndex.drawer + 10,
                        }),
                        left: { md: desktopOpen ? expandedWidth + 16 : collapsedWidth + 16 },
                        width: {
                            xs: '100%',
                            md: `calc(100% - ${desktopOpen ? expandedWidth + 24 : collapsedWidth + 24}px)`,
                        },
                        top: { xs: 0, md: 8 },
                        right: { xs: 0, md: 8 },
                        borderRadius: { xs: 0, md: '14px' },
                    }}
                >
                    {navigating ? (
                        <LinearProgress
                            color="primary"
                            sx={{
                                position: 'absolute',
                                inset: 'auto 0 0 0',
                                height: 2,
                                borderBottomLeftRadius: { xs: 0, md: '14px' },
                                borderBottomRightRadius: { xs: 0, md: '14px' },
                            }}
                        />
                    ) : null}
                    <Toolbar sx={{ minHeight: 62, gap: 1, px: { xs: 1.1, md: 1.5, xl: 1.75 } }}>
                        <IconButton onClick={toggleNavigation} edge="start">
                            <MenuIcon />
                        </IconButton>

                        <Stack sx={{ minWidth: 0, flex: 1, display: { xs: 'none', md: 'flex' } }}>
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                                {breadcrumbs.map((crumb, index) => (
                                    <Stack key={`${crumb.label}-${index}`} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                        {index > 0 ? <ChevronRightIcon sx={{ fontSize: 16, opacity: 0.5 }} /> : null}
                                        <Typography
                                            variant="caption"
                                            sx={{ color: index === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary', fontWeight: index === breadcrumbs.length - 1 ? 800 : 600 }}
                                        >
                                            {crumb.label}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                            <Typography variant="h6" sx={{ fontWeight: 820, mt: 0.25 }}>
                                {title}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: { xs: 'auto', md: 0 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Stack sx={{ display: { xs: 'none', sm: 'flex' }, minWidth: 0 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                                        {authUser?.name || 'Admin'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {formatLabel(roleName)}
                                    </Typography>
                                </Stack>
                                <IconButton onClick={openProfileMenu} sx={{ p: 0.25 }}>
                                    {authUser?.avatar_url ? (
                                        <Avatar src={authUser.avatar_url} sx={{ width: 34, height: 34 }} />
                                    ) : (
                                        <Avatar sx={{ width: 34, height: 34, bgcolor: alpha(theme.palette.primary.main, 0.18), color: 'primary.main' }}>
                                            {authUser?.name ? String(authUser.name).slice(0, 1).toUpperCase() : <AccountCircle fontSize="small" />}
                                        </Avatar>
                                    )}
                                </IconButton>
                            </Stack>
                        </Stack>
                    </Toolbar>
                </AppBar>

                <Menu
                    anchorEl={profileAnchor}
                    open={profileMenuOpen}
                    onClose={closeProfileMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { minWidth: 280, borderRadius: '14px' } }}
                >
                    <MenuItem component={Link} href={`${adminAppUrl}/profile`} onClick={closeProfileMenu} sx={{ py: 1.25 }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', width: '100%' }}>
                            <Avatar
                                src={authUser?.avatar_url || undefined}
                                sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.18), color: 'primary.main' }}
                            >
                                {authUser?.name ? String(authUser.name).slice(0, 1).toUpperCase() : 'A'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                                    {authUser?.name || 'Admin'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {formatLabel(roleName)}
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800 }}>
                                Edit
                            </Typography>
                        </Stack>
                    </MenuItem>
                    <Divider sx={{ my: 0.75 }} />
                    <MenuItem
                        onClick={() => {
                            toggleTheme();
                            closeProfileMenu();
                        }}
                    >
                        {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        Night Mode
                    </MenuItem>
                    {workspace === 'branch' ? (
                        <MenuItem component={Link} href={`${adminAppUrl}/dashboard`} onClick={closeProfileMenu}>
                            <DashboardIcon fontSize="small" />
                            Dashboard
                        </MenuItem>
                    ) : null}
                    {workspace === 'branch' && can('dashboard.view') ? (
                        <MenuItem component={Link} href={`${adminAppUrl}/reports`} onClick={closeProfileMenu}>
                            <ReportsIcon fontSize="small" />
                            Report
                        </MenuItem>
                    ) : null}
                    {workspace === 'branch' && can('customers.manage') ? (
                        <MenuItem component={Link} href={`${adminAppUrl}/customers`} onClick={closeProfileMenu}>
                            <CustomersIcon fontSize="small" />
                            Customers
                        </MenuItem>
                    ) : null}
                    <MenuItem
                        onClick={() => {
                            closeProfileMenu();
                            router.post(`${adminAppUrl}/workspaces/switch`);
                        }}
                    >
                        <SwitchWorkspaceIcon fontSize="small" />
                        Switch Workspace
                    </MenuItem>
                    <Divider sx={{ my: 0.75 }} />
                    <MenuItem
                        onClick={() => {
                            closeProfileMenu();
                            router.post(`${adminAppUrl}/logout`);
                        }}
                    >
                        <LogoutIcon fontSize="small" />
                        Logout
                    </MenuItem>
                </Menu>

                <Snackbar
                    open={!!toast}
                    autoHideDuration={3200}
                    onClose={() => setToast(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    {toast ? (
                        <Alert
                            severity={toast.severity}
                            variant="filled"
                            onClose={() => setToast(null)}
                            sx={{ width: '100%', minWidth: { xs: 260, sm: 320 } }}
                        >
                            {toast.message}
                        </Alert>
                    ) : null}
                </Snackbar>

                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        zIndex: (muiTheme) => muiTheme.zIndex.appBar + 20,
                        '& .MuiDrawer-paper': {
                            width: expandedWidth,
                            p: 0.75,
                            border: 'none',
                            borderRadius: 0,
                            color: drawerText,
                            backgroundColor: drawerBackground,
                            backgroundImage: 'linear-gradient(180deg, rgba(59,130,246,0.08), transparent 28%)',
                            boxShadow: '0 24px 48px rgba(2, 6, 23, 0.42)',
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(148, 163, 184, 0.28)',
                            },
                        },
                    }}
                >
                    {sidebarContent}
                </Drawer>

                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        width: desktopOpen ? expandedWidth : collapsedWidth,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: desktopOpen ? expandedWidth : collapsedWidth,
                            boxSizing: 'border-box',
                            m: 1,
                            height: 'calc(100vh - 16px)',
                            border: 'none',
                            color: drawerText,
                            backgroundColor: drawerBackground,
                            backgroundImage: 'linear-gradient(180deg, rgba(59,130,246,0.08), transparent 28%)',
                            boxShadow: '0 18px 42px rgba(2, 6, 23, 0.24)',
                            overflowX: 'hidden',
                            transition: 'width 180ms ease',
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(148, 163, 184, 0.28)',
                            },
                        },
                    }}
                >
                    {sidebarContent}
                </Drawer>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        pt: { xs: 9.25, md: 10, lg: 10.75 },
                        px: { xs: 1, sm: 1.4, lg: 1.75, xl: 2 },
                        pl: { md: 2.25, lg: 2.5, xl: 2.75 },
                        pb: { xs: 1.25, sm: 1.75 },
                    }}
                >
                    {children}
                </Box>
            </Box>
        </ThemeProvider>
    );
}
