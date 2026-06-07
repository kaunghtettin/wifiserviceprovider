import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PaginatedTableFooter from '@/Components/admin/PaginatedTableFooter';
import PageHeader from '@/Components/admin/PageHeader';
import StatusBadge from '@/Components/admin/StatusBadge';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    MoreVert as MoreVertIcon,
    PeopleAltOutlined as PeopleAltOutlinedIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';

const emptyForm = {
    branch_id: '',
    wifi_package_id: '',
    name: '',
    phone: '',
    nrc: '',
    address: '',
    gps_lat: '',
    gps_lng: '',
    installation_date: '',
    billing_day_of_month: 1,
    router_sn: '',
    status: 'active',
    notes: '',
};

const normalizeDateValue = (value) => {
    if (!value) return '';
    const raw = String(value);
    return raw.includes('T') ? raw.slice(0, 10) : raw;
};

const getDayFromDateValue = (value) => {
    const normalized = normalizeDateValue(value);
    if (!normalized) return null;
    const parts = normalized.split('-');
    if (parts.length !== 3) return null;
    const day = Number(parts[2]);
    if (!Number.isFinite(day) || day < 1 || day > 31) return null;
    return day;
};

export default function CustomerIndex({ customers, summary, branches, packages, canAssignBranch, filters }) {
    const { admin_app_url, canFilterBranch = false, filterBranches = [] } = usePage().props;
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionCustomer, setActionCustomer] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);
    const [query, setQuery] = useState(filters?.q || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const [branchFilter, setBranchFilter] = useState(filters?.branch_id || '');
    const perPage = Number(filters?.per_page || customers?.per_page || 15);

    const rows = useMemo(() => customers?.data || [], [customers]);
    const branchOptions = useMemo(() => branches || [], [branches]);
    const packageOptions = useMemo(() => packages || [], [packages]);
    const metrics = useMemo(() => {
        return [
            { label: 'Total subscribers', value: summary?.total ?? 0, helper: 'All customer records in the current filter scope.' },
            { label: 'Active service', value: summary?.active ?? 0, helper: 'Customers currently running in active state.' },
            { label: 'Pending setup', value: summary?.pending ?? 0, helper: 'Installations or activations still being prepared.' },
            { label: 'Need attention', value: summary?.attention ?? 0, helper: 'Suspended or disconnected customer accounts.' },
        ];
    }, [summary]);

    const closeDialog = () => {
        setOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        if (isPhone) {
            router.get(`${admin_app_url}/customers/create`);
            return;
        }
        setEditing(null);
        reset();
        clearErrors();
        setOpen(true);
    };

    const openEdit = (c) => {
        if (!c?.id) return;
        router.get(`${admin_app_url}/customers/${c.id}/edit`);
    };

    const openView = (customer) => {
        if (!customer?.id) return;
        router.get(`${admin_app_url}/customers/${customer.id}`);
    };

    const submit = (e) => {
        e.preventDefault();

        const payload = {
            ...data,
            branch_id: canAssignBranch ? (data.branch_id === '' ? null : data.branch_id) : undefined,
            wifi_package_id: data.wifi_package_id === '' ? null : data.wifi_package_id,
        };

        if (editing?.id) {
            put(`${admin_app_url}/customers/${editing.id}`, {
                data: payload,
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(`${admin_app_url}/customers`, {
            data: payload,
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const remove = (c) => {
        if (!c?.id) return;
        const label = c.customer_code ? `${c.customer_code} - ${c.name}` : c.name;
        if (!window.confirm(`Delete customer "${label}"?`)) return;
        router.delete(`${admin_app_url}/customers/${c.id}`, { preserveScroll: true });
    };

    const openActions = (event, customer) => {
        setActionAnchor(event.currentTarget);
        setActionCustomer(customer);
    };
    const closeActions = () => {
        setActionAnchor(null);
        setActionCustomer(null);
    };

    const filterBranchOptions = useMemo(() => filterBranches || [], [filterBranches]);

    const applySearch = () => {
        router.get(
            `${admin_app_url}/customers`,
            {
                q: query || '',
                status: statusFilter || '',
                branch_id: canFilterBranch ? branchFilter || '' : '',
                per_page: perPage,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetSearch = () => {
        setQuery('');
        setStatusFilter('');
        setBranchFilter('');
        router.get(
            `${admin_app_url}/customers`,
            { per_page: perPage },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const renderPackageMeta = (c) => {
        if (!c?.package?.speed_mbps) return 'No speed info';
        return `${c.package.speed_mbps} Mbps`;
    };

    return (
        <AdminLayout title="Customers">
            <Head title="Customers" />

            <Stack spacing={2.5}>
                <PageHeader
                    eyebrow="Subscribers"
                    title="Customer management"
                    description="Manage subscriber profiles, assigned packages, billing cycles, and branch visibility from a cleaner operational workspace."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Customer</Button>}
                />

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            xl: 'repeat(4, minmax(0, 1fr))',
                        },
                    }}
                >
                    {metrics.map((metric) => (
                        <AppSurface key={metric.label} sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {metric.label}
                                    </Typography>
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: '10px',
                                            display: 'grid',
                                            placeItems: 'center',
                                            color: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        }}
                                    >
                                        <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />
                                    </Box>
                                </Stack>
                                <Typography variant="h4" sx={{ fontWeight: 820, letterSpacing: '-0.04em' }}>
                                    {metric.value}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {metric.helper}
                                </Typography>
                            </Stack>
                        </AppSurface>
                    ))}
                </Box>

                <TableCard
                    title="Subscriber directory"
                    description={`${customers?.from || 0}-${customers?.to || 0} of ${customers?.total || 0} customer records available for service operations and billing review.`}
                    toolbarBelow
                    toolbar={
                        <Box
                            sx={{
                                width: '100%',
                                display: 'grid',
                                gap: 1.25,
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: canFilterBranch
                                        ? 'minmax(220px, 1.6fr) minmax(140px, 1fr)'
                                        : 'minmax(220px, 1.8fr) minmax(140px, 1fr)',
                                    md: canFilterBranch
                                        ? 'minmax(240px, 1.8fr) minmax(140px, 0.9fr) minmax(160px, 1fr) auto'
                                        : 'minmax(260px, 2fr) minmax(150px, 1fr) auto',
                                },
                                alignItems: 'start',
                            }}
                        >
                            <Stack spacing={0.75}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 0.25 }}>
                                    Search
                                </Typography>
                                <TextField
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Customer, phone, or code"
                                    size="small"
                                    fullWidth
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') applySearch();
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Stack>
                            <Stack spacing={0.75}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 0.25 }}>
                                    Status
                                </Typography>
                                <TextField
                                    select
                                    size="small"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    fullWidth
                                >
                                    <MenuItem value="">All statuses</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                    <MenuItem value="disconnected">Disconnected</MenuItem>
                                </TextField>
                            </Stack>
                            {canFilterBranch ? (
                                <Stack spacing={0.75}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 0.25 }}>
                                        Branch
                                    </Typography>
                                    <TextField
                                        select
                                        size="small"
                                        value={branchFilter}
                                        onChange={(e) => setBranchFilter(e.target.value)}
                                        fullWidth
                                    >
                                        <MenuItem value="">All branches</MenuItem>
                                        {filterBranchOptions.map((branch) => (
                                            <MenuItem key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            ) : null}
                            <Stack
                                spacing={0.75}
                                sx={{
                                    minWidth: { md: 150 },
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 0.25 }}>
                                    Actions
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                        justifyContent: { xs: 'flex-start', md: 'flex-end' },
                                        alignItems: 'stretch',
                                        flexWrap: 'wrap',
                                        minHeight: 40,
                                    }}
                                >
                                    <Button
                                        variant="outlined"
                                        onClick={applySearch}
                                        sx={{ minHeight: 40, px: 2.25, alignSelf: 'stretch' }}
                                    >
                                        Apply
                                    </Button>
                                    {query || statusFilter || branchFilter ? (
                                        <Button
                                            variant="text"
                                            color="inherit"
                                            onClick={resetSearch}
                                            sx={{ minHeight: 40, px: 1.5, alignSelf: 'stretch' }}
                                        >
                                            Reset
                                        </Button>
                                    ) : null}
                                </Stack>
                            </Stack>
                        </Box>
                    }
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<PeopleAltOutlinedIcon />}
                            title="No customers found"
                            description="Add your first subscriber record to start managing package assignments, billing dates, and service status in one place."
                            action={{ label: 'Create customer', onClick: openCreate }}
                        />
                    ) : isPhone ? (
                        <Stack spacing={1.25}>
                            {rows.map((c) => (
                                <Box
                                    key={c.id}
                                    sx={{
                                        p: 1.75,
                                        borderRadius: '14px',
                                        border: `1px solid ${theme.palette.divider}`,
                                        bgcolor: alpha(theme.palette.background.paper, 0.84),
                                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
                                    }}
                                >
                                    <Stack spacing={1.25}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={() => openView(c)}
                                                    sx={{
                                                        width: '100%',
                                                        p: 0,
                                                        m: 0,
                                                        border: 0,
                                                        bgcolor: 'transparent',
                                                        textAlign: 'left',
                                                        color: 'inherit',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 780,
                                                            lineHeight: 1.2,
                                                            transition: 'color 0.18s ease',
                                                            '&:hover': { color: 'primary.main' },
                                                        }}
                                                        noWrap
                                                        title={c.name || '-'}
                                                    >
                                                        {c.name || '-'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                    {c.customer_code || '-'}
                                                </Typography>
                                            </Box>
                                            <StatusBadge status={c.status} />
                                        </Stack>

                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                gap: 1.25,
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Phone
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                                    {c.phone || '-'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Status
                                                </Typography>
                                                <Box sx={{ mt: 0.4 }}>
                                                    <StatusBadge status={c.status} />
                                                </Box>
                                            </Box>
                                            <Box sx={{ gridColumn: '1 / -1' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Package
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                                    {c.package?.name || '-'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {renderPackageMeta(c)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ gridColumn: '1 / -1' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Branch
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                                    {c.branch?.name || `#${c.branch_id}`}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                                <Button
                                                    variant="text"
                                                    color="inherit"
                                                    onClick={() => openView(c)}
                                                    sx={{ minWidth: 0, px: 0.5 }}
                                                >
                                                    Details
                                                </Button>
                                                <Button
                                                    component="a"
                                                    href={c.phone ? `tel:${c.phone}` : undefined}
                                                    variant="text"
                                                    color="inherit"
                                                    disabled={!c.phone}
                                                    sx={{ minWidth: 0, px: 0.5 }}
                                                >
                                                    Call
                                                </Button>
                                                <IconButton size="small" onClick={(e) => openActions(e, c)} title="Actions">
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    ) : (
                        <Box
                            sx={{
                                width: '100%',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                            }}
                        >
                            <Table
                                size="small"
                                stickyHeader
                                sx={{
                                    minWidth: 660,
                                    tableLayout: 'fixed',
                                    '& .MuiTableCell-root': {
                                        px: 1,
                                        py: 0.75,
                                        verticalAlign: 'top',
                                    },
                                    '& .MuiTableHead-root .MuiTableCell-root': {
                                        py: 0.85,
                                        fontSize: '0.7rem',
                                        letterSpacing: '0.08em',
                                    },
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Customer</TableCell>
                                        <TableCell sx={{ width: 108, minWidth: 108, maxWidth: 108 }}>Phone</TableCell>
                                        <TableCell sx={{ width: 154, minWidth: 154, maxWidth: 154 }}>Package</TableCell>
                                        <TableCell sx={{ width: 92, minWidth: 92, maxWidth: 92 }}>Status</TableCell>
                                        <TableCell sx={{ width: 100, minWidth: 100, maxWidth: 100 }}>Branch</TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{ width: 40, minWidth: 40, maxWidth: 40, px: 0.5 }}
                                            aria-label="Actions"
                                        >
                                            ...
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((c) => (
                                        <TableRow key={c.id} hover>
                                            <TableCell sx={{ width: 160, minWidth: 160, maxWidth: 160 }}>
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={() => openView(c)}
                                                    sx={{
                                                        width: '100%',
                                                        p: 0,
                                                        m: 0,
                                                        border: 0,
                                                        bgcolor: 'transparent',
                                                        textAlign: 'left',
                                                        color: 'inherit',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 760,
                                                            fontSize: '0.9rem',
                                                            lineHeight: 1.2,
                                                            transition: 'color 0.18s ease',
                                                            '&:hover': { color: 'primary.main' },
                                                        }}
                                                        noWrap
                                                        title={c.name || '-'}
                                                    >
                                                        {c.name || '-'}
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ fontFamily: 'monospace', fontSize: '0.76rem', lineHeight: 1.2 }}
                                                    noWrap
                                                    title={c.customer_code || '-'}
                                                >
                                                    {c.customer_code || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: 108, minWidth: 108, maxWidth: 108 }}>
                                                <Typography noWrap title={c.phone || '-'} sx={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                    {c.phone || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: 154, minWidth: 154, maxWidth: 154 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }} noWrap title={c.package?.name || '-'}>
                                                    {c.package?.name || '-'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" noWrap title={renderPackageMeta(c)} sx={{ fontSize: '0.76rem', lineHeight: 1.2 }}>
                                                    {renderPackageMeta(c)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: 92, minWidth: 92, maxWidth: 92 }}>
                                                <StatusBadge status={c.status} />
                                            </TableCell>
                                            <TableCell sx={{ width: 100, minWidth: 100, maxWidth: 100 }}>
                                                <Typography
                                                    noWrap
                                                    sx={{ fontSize: '0.84rem', lineHeight: 1.2 }}
                                                    title={c.branch?.name || `#${c.branch_id}`}
                                                >
                                                    {c.branch?.name || `#${c.branch_id}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ width: 40, minWidth: 40, maxWidth: 40, px: 0.5 }}>
                                                <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => openActions(e, c)} title="Actions">
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                    <PaginatedTableFooter pagination={customers} baseUrl={`${admin_app_url}/customers`} filters={filters} />
                </TableCard>
            </Stack>

            <Menu
                anchorEl={actionAnchor}
                open={Boolean(actionAnchor)}
                onClose={closeActions}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ variant: 'outlined', sx: { borderRadius: '12px' } }}
            >
                <MenuItem
                    onClick={() => {
                        const c = actionCustomer;
                        closeActions();
                        if (c) openView(c);
                    }}
                >
                    <VisibilityIcon fontSize="small" style={{ marginRight: 8 }} /> View
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const c = actionCustomer;
                        closeActions();
                        if (c) openEdit(c);
                    }}
                >
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const c = actionCustomer;
                        closeActions();
                        if (c) remove(c);
                    }}
                >
                    <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog
                open={open}
                onClose={closeDialog}
                fullWidth
                maxWidth="md"
                scroll="paper"
                PaperProps={{ sx: { borderRadius: '16px' } }}
            >
                <DialogTitle>{editing ? 'Edit Customer' : 'New Customer'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2.25} sx={{ mt: 0.5 }}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                                    Service setup
                                </Typography>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                {canAssignBranch ? (
                                    <TextField
                                        select
                                        label="Branch"
                                        value={data.branch_id}
                                        onChange={(e) => setData('branch_id', e.target.value)}
                                        error={!!errors.branch_id}
                                        helperText={errors.branch_id}
                                        sx={{ flex: 1 }}
                                        required
                                    >
                                        {branchOptions.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>
                                                {b.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                ) : null}

                                <TextField
                                    select
                                    label="WiFi Package"
                                    value={data.wifi_package_id}
                                    onChange={(e) => setData('wifi_package_id', e.target.value)}
                                    error={!!errors.wifi_package_id}
                                    helperText={errors.wifi_package_id}
                                    sx={{ flex: 1 }}
                                >
                                    <MenuItem value="">No package</MenuItem>
                                    {packageOptions.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name} ({p.speed_mbps} Mbps)
                                        </MenuItem>
                                    ))}
                                </TextField>
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                                    Subscriber details
                                </Typography>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    label="Customer Name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={!!errors.name}
                                    helperText={errors.name}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    error={!!errors.phone}
                                    helperText={errors.phone}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="NRC"
                                    value={data.nrc}
                                    onChange={(e) => setData('nrc', e.target.value)}
                                    error={!!errors.nrc}
                                    helperText={errors.nrc}
                                    sx={{ flex: 1 }}
                                />
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                                    Billing and status
                                </Typography>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    select
                                    label="Billing Day"
                                    value={data.billing_day_of_month}
                                    onChange={(e) => setData('billing_day_of_month', e.target.value)}
                                    error={!!errors.billing_day_of_month}
                                    helperText={errors.billing_day_of_month}
                                    required
                                    sx={{ flex: 1 }}
                                >
                                    {Array.from({ length: 31 }).map((_, idx) => {
                                        const day = idx + 1;
                                        return (
                                            <MenuItem key={`billday-${day}`} value={day}>
                                                {day}
                                            </MenuItem>
                                        );
                                    })}
                                </TextField>
                                <TextField
                                    label="Installation Date"
                                    type="date"
                                    value={data.installation_date || ''}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setData('installation_date', next);
                                        const day = getDayFromDateValue(next);
                                        if (day) setData('billing_day_of_month', day);
                                    }}
                                    error={!!errors.installation_date}
                                    helperText={errors.installation_date}
                                    sx={{ flex: 1 }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                                <TextField
                                    select
                                    label="Status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    error={!!errors.status}
                                    helperText={errors.status}
                                    required
                                    sx={{ flex: 1 }}
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                    <MenuItem value="disconnected">Disconnected</MenuItem>
                                </TextField>
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                                    Network metadata
                                </Typography>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    label="Router SN"
                                    value={data.router_sn}
                                    onChange={(e) => setData('router_sn', e.target.value)}
                                    error={!!errors.router_sn}
                                    helperText={errors.router_sn}
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="GPS Lat"
                                    value={data.gps_lat}
                                    onChange={(e) => setData('gps_lat', e.target.value)}
                                    error={!!errors.gps_lat}
                                    helperText={errors.gps_lat}
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="GPS Lng"
                                    value={data.gps_lng}
                                    onChange={(e) => setData('gps_lng', e.target.value)}
                                    error={!!errors.gps_lng}
                                    helperText={errors.gps_lng}
                                    sx={{ flex: 1 }}
                                />
                                </Stack>
                            </Box>

                            <TextField
                                label="Address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
                                multiline
                                minRows={2}
                            />

                            <TextField
                                label="Notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                error={!!errors.notes}
                                helperText={errors.notes}
                                multiline
                                minRows={2}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDialog} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={processing}>
                            {editing ? 'Save' : 'Create'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </AdminLayout>
    );
}
