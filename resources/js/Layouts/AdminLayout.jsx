import { useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AppBar,
    Avatar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    ThemeProvider,
    Toolbar,
    Typography,
    createTheme,
    useMediaQuery,
} from '@mui/material';
import {
    AccountCircle,
    AutoAwesomeMosaic as UiShowcaseIcon,
    AccountBalanceWallet as ExpenseIcon,
    Business as BusinessIcon,
    Dashboard as DashboardIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Logout as LogoutIcon,
    ManageAccounts as UsersIcon,
    Menu as MenuIcon,
    People as CustomersIcon,
    Person as PersonIcon,
    ReceiptLong as InvoicesIcon,
    Shield as RolesIcon,
    Sms as SmsIcon,
    Notifications as NotificationsIcon,
    Wifi as PackagesIcon,
    Insights as ReportsIcon,
    Paid as PaymentsIcon,
} from '@mui/icons-material';

const drawerWidth = 220;

export default function AdminLayout({ children, title = 'Admin Panel' }) {
    const { url, props } = usePage();
    const adminAppUrl = props.admin_app_url;
    const appBase = props.app_base || '';
    const authUser = props.auth?.user;
    const permissions = props.auth?.permissions || [];
    const isSuperAdmin = !!props.auth?.is_super_admin;
    const roleName = props.auth?.role || (isSuperAdmin ? 'super_admin' : 'staff');
    const [profileAnchor, setProfileAnchor] = useState(null);
    const [desktopOpen, setDesktopOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dark, setDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('admin-color-mode') === 'dark';
    });

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: dark ? 'dark' : 'light',
                    primary: { main: '#3b82f6' },
                    background: {
                        default: dark ? '#0f172a' : '#f3f4f6',
                        paper: dark ? '#111827' : '#ffffff',
                    },
                },
                shape: { borderRadius: 8 },
                components: {
                    MuiPaper: {
                        defaultProps: {
                            elevation: 0,
                            variant: 'outlined',
                        },
                        styleOverrides: {
                            root: {
                                borderColor: dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.1)',
                            },
                        },
                    },
                    MuiCard: {
                        defaultProps: {
                            elevation: 0,
                            variant: 'outlined',
                        },
                        styleOverrides: {
                            root: {
                                borderColor: dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.1)',
                            },
                        },
                    },
                    MuiTextField: {
                        defaultProps: {
                            size: 'small',
                        },
                    },
                    MuiOutlinedInput: {
                        styleOverrides: {
                            root: {
                                borderRadius: 10,
                            },
                        },
                    },
                    MuiButton: {
                        defaultProps: {
                            size: 'small',
                            disableElevation: true,
                        },
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 10,
                            },
                        },
                    },
                },
            }),
        [dark],
    );

    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

    const navGroups = [
        {
            title: 'Main',
            items: [
                { label: 'Dashboard', href: `${adminAppUrl}/dashboard`, icon: <DashboardIcon /> },
                ...(can('dashboard.view') ? [{ label: 'Reports', href: `${adminAppUrl}/reports`, icon: <ReportsIcon /> }] : []),
            ],
        },
        {
            title: 'Management',
            items: [
                ...(can('branches.manage') ? [{ label: 'Branches', href: `${adminAppUrl}/branches`, icon: <BusinessIcon /> }] : []),
                ...(can('customers.manage') ? [{ label: 'Customers', href: `${adminAppUrl}/customers`, icon: <CustomersIcon /> }] : []),
                ...(can('packages.manage') ? [{ label: 'Packages', href: `${adminAppUrl}/packages`, icon: <PackagesIcon /> }] : []),
                ...(can('users.manage') ? [{ label: 'Users', href: `${adminAppUrl}/users`, icon: <UsersIcon /> }] : []),
            ],
        },
        {
            title: 'Billing',
            items: [
                ...(can('invoices.manage') ? [{ label: 'Invoices', href: `${adminAppUrl}/invoices`, icon: <InvoicesIcon /> }] : []),
                ...(can('payments.manage') ? [{ label: 'Payments', href: `${adminAppUrl}/payments`, icon: <PaymentsIcon /> }] : []),
            ],
        },
        {
            title: 'Finance',
            items: [...(can('expenses.manage') ? [{ label: 'Expenses', href: `${adminAppUrl}/expenses`, icon: <ExpenseIcon /> }] : [])],
        },
        {
            title: 'Communication',
            items: [
                ...(can('notifications.manage') ? [{ label: 'Notifications', href: `${adminAppUrl}/notifications`, icon: <NotificationsIcon /> }] : []),
                ...(can('sms.manage') ? [{ label: 'SMS', href: `${adminAppUrl}/sms`, icon: <SmsIcon /> }] : []),
            ],
        },
        {
            title: 'Settings',
            items: [...(can('roles.manage') ? [{ label: 'Roles', href: `${adminAppUrl}/roles`, icon: <RolesIcon /> }] : [])],
        },
        {
            title: 'System',
            items: [{ label: 'UI Showcase', href: `${adminAppUrl}/ui-showcase`, icon: <UiShowcaseIcon /> }],
        },
        {
            title: 'Account',
            items: [{ label: 'Profile', href: `${adminAppUrl}/profile`, icon: <PersonIcon /> }],
        },
    ].filter((group) => group.items.length > 0);

    const currentPath = url.split('?')[0];
    const isActive = (href) => {
        try {
            const path = new URL(href).pathname;
            return currentPath === path || currentPath.startsWith(`${path}/`);
        } catch {
            return false;
        }
    };

    const openProfileMenu = (event) => setProfileAnchor(event.currentTarget);
    const closeProfileMenu = () => setProfileAnchor(null);
    const profileMenuOpen = Boolean(profileAnchor);

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <CssBaseline />

                <AppBar
                    position="fixed"
                    color="default"
                    elevation={0}
                    sx={{
                        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
                        bgcolor: 'background.paper',
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Toolbar variant="dense" sx={{ minHeight: 48 }}>
                        <IconButton onClick={toggleNavigation} edge="start" sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                        <Box
                            component="img"
                            src={`${appBase}/app_logo_transparent.png`}
                            alt="Logo"
                            sx={{ width: 28, height: 28, mr: 1 }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
                            {title}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
                            >
                                {authUser?.name || 'Admin'}
                            </Typography>
                            <IconButton size="small" onClick={openProfileMenu}>
                                <AccountCircle fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Toolbar>
                </AppBar>

                <Menu
                    anchorEl={profileAnchor}
                    open={profileMenuOpen}
                    onClose={closeProfileMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ variant: 'outlined', sx: { minWidth: 260, borderRadius: 2 } }}
                >
                    <MenuItem
                        component={Link}
                        href={`${adminAppUrl}/profile`}
                        onClick={closeProfileMenu}
                        sx={{ py: 1.25, alignItems: 'flex-start' }}
                    >
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', width: '100%' }}>
                            <Avatar
                                src={authUser?.avatar_url || undefined}
                                sx={{ width: 36, height: 36, bgcolor: dark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)', color: 'primary.main' }}
                            >
                                {authUser?.name ? String(authUser.name).slice(0, 1).toUpperCase() : 'A'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                                    {authUser?.name || 'Admin'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }} noWrap>
                                    {roleName}
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                Edit
                            </Typography>
                        </Stack>
                    </MenuItem>

                    <Divider sx={{ my: 1 }} />

                    <MenuItem
                        onClick={() => {
                            toggleTheme();
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 0, mr: 1.25 }}>
                            {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </ListItemIcon>
                        Night Mode
                    </MenuItem>

                    <MenuItem component={Link} href={`${adminAppUrl}/dashboard`} onClick={closeProfileMenu}>
                        <ListItemIcon sx={{ minWidth: 0, mr: 1.25 }}>
                            <DashboardIcon fontSize="small" />
                        </ListItemIcon>
                        Dashboard
                    </MenuItem>

                    {can('dashboard.view') ? (
                        <MenuItem component={Link} href={`${adminAppUrl}/reports`} onClick={closeProfileMenu}>
                            <ListItemIcon sx={{ minWidth: 0, mr: 1.25 }}>
                                <ReportsIcon fontSize="small" />
                            </ListItemIcon>
                            Report
                        </MenuItem>
                    ) : null}

                    {can('customers.manage') ? (
                        <MenuItem component={Link} href={`${adminAppUrl}/customers`} onClick={closeProfileMenu}>
                            <ListItemIcon sx={{ minWidth: 0, mr: 1.25 }}>
                                <CustomersIcon fontSize="small" />
                            </ListItemIcon>
                            Customers
                        </MenuItem>
                    ) : null}

                    <Divider sx={{ my: 1 }} />
                    <MenuItem
                        onClick={() => {
                            closeProfileMenu();
                            router.post(`${adminAppUrl}/logout`);
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 0, mr: 1.25 }}>
                            <LogoutIcon fontSize="small" />
                        </ListItemIcon>
                        Logout
                    </MenuItem>
                </Menu>

                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                        },
                    }}
                >
                    <Toolbar variant="dense" sx={{ minHeight: 48 }} />
                    <Box sx={{ py: 1 }}>
                        {navGroups.map((group, idx) => (
                            <Box key={`mobile-${group.title}`}>
                                <Typography
                                    variant="overline"
                                    sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 700 }}
                                >
                                    {group.title}
                                </Typography>
                                <List dense disablePadding>
                                    {group.items.map((item) => (
                                        <ListItem key={`mobile-${item.label}`} disablePadding sx={{ px: 1, py: 0.25 }}>
                                            <ListItemButton
                                                component={Link}
                                                href={item.href}
                                                selected={isActive(item.href)}
                                                onClick={() => setMobileOpen(false)}
                                                sx={{ borderRadius: 1.25, minHeight: 40, px: 1.25 }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 0, mr: 1.5, justifyContent: 'center' }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                                <ListItemText primary={item.label} />
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                                {idx < navGroups.length - 1 && <Divider sx={{ mx: 1.5, my: 1 }} />}
                            </Box>
                        ))}
                    </Box>
                </Drawer>

                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        width: desktopOpen ? drawerWidth : 72,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: desktopOpen ? drawerWidth : 72,
                            boxSizing: 'border-box',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            overflowX: 'hidden',
                            transition: 'width 0.2s ease',
                        },
                    }}
                >
                    <Toolbar variant="dense" sx={{ minHeight: 48 }} />
                    <Box sx={{ py: 1 }}>
                        {navGroups.map((group, idx) => (
                            <Box key={group.title}>
                                {desktopOpen && (
                                    <Typography
                                        variant="overline"
                                        sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 700 }}
                                    >
                                        {group.title}
                                    </Typography>
                                )}
                                <List dense disablePadding>
                                    {group.items.map((item) => (
                                        <ListItem key={item.label} disablePadding sx={{ px: 1, py: 0.25 }}>
                                            <ListItemButton
                                                component={Link}
                                                href={item.href}
                                                selected={isActive(item.href)}
                                                sx={{ borderRadius: 1.25, minHeight: 40, px: 1.25 }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 0, mr: desktopOpen ? 1.5 : 0, justifyContent: 'center' }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                                {desktopOpen && <ListItemText primary={item.label} />}
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                                {idx < navGroups.length - 1 && <Divider sx={{ mx: 1.5, my: 1 }} />}
                            </Box>
                        ))}
                    </Box>
                </Drawer>

                <Box
                    component="main"
                    sx={{ flexGrow: 1, pt: 7, px: { xs: 1.25, sm: 2 }, pb: { xs: 1.25, sm: 2 }, bgcolor: 'background.default' }}
                >
                    {children}
                </Box>
            </Box>
        </ThemeProvider>
    );
}
