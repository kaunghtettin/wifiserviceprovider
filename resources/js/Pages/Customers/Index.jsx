import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
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

export default function CustomerIndex({ customers, branches, packages, canAssignBranch, filters }) {
    const { admin_app_url } = usePage().props;
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionCustomer, setActionCustomer] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);
    const [query, setQuery] = useState(filters?.q || '');

    const rows = useMemo(() => customers || [], [customers]);
    const branchOptions = useMemo(() => branches || [], [branches]);
    const packageOptions = useMemo(() => packages || [], [packages]);
    const metrics = useMemo(() => {
        const total = rows.length;
        const active = rows.filter((customer) => customer.status === 'active').length;
        const pending = rows.filter((customer) => customer.status === 'pending').length;
        const attention = rows.filter((customer) =>
            ['suspended', 'disconnected'].includes(String(customer.status || '').toLowerCase()),
        ).length;

        return [
            { label: 'Total subscribers', value: total, helper: 'All customer records in the current workspace.' },
            { label: 'Active service', value: active, helper: 'Customers currently running in active state.' },
            { label: 'Pending setup', value: pending, helper: 'Installations or activations still being prepared.' },
            { label: 'Need attention', value: attention, helper: 'Suspended or disconnected customer accounts.' },
        ];
    }, [rows]);

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
        if (isPhone) {
            router.get(`${admin_app_url}/customers/${c.id}/edit`);
            return;
        }
        setEditing(c);
        setData({
            branch_id: c?.branch_id ?? '',
            wifi_package_id: c?.wifi_package_id ?? '',
            name: c?.name ?? '',
            phone: c?.phone ?? '',
            nrc: c?.nrc ?? '',
            address: c?.address ?? '',
            gps_lat: c?.gps_lat ?? '',
            gps_lng: c?.gps_lng ?? '',
            installation_date: normalizeDateValue(c?.installation_date),
            billing_day_of_month: c?.billing_day_of_month ?? 1,
            router_sn: c?.router_sn ?? '',
            status: c?.status ?? 'active',
            notes: c?.notes ?? '',
        });
        clearErrors();
        setOpen(true);
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

    const applySearch = () => {
        router.get(
            `${admin_app_url}/customers`,
            { q: query || '' },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetSearch = () => {
        setQuery('');
        router.get(
            `${admin_app_url}/customers`,
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const renderPackageLabel = (c) => {
        if (!c?.package) return '-';
        return `${c.package.name} (${c.package.speed_mbps} Mbps)`;
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
                    description={`${rows.length} customer records available for service operations and billing review.`}
                    toolbar={
                        <>
                            <TextField
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search name, phone, code"
                                size="small"
                                sx={{ minWidth: { xs: '100%', sm: 280 } }}
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
                            <Button variant="outlined" onClick={applySearch}>
                                Search
                            </Button>
                            {query ? (
                                <Button variant="text" color="inherit" onClick={resetSearch}>
                                    Reset
                                </Button>
                            ) : null}
                        </>
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
                                                <Typography sx={{ fontWeight: 780, lineHeight: 1.2 }} noWrap>
                                                    {c.name}
                                                </Typography>
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
                                                    Billing day
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                                    {c.billing_day_of_month || '-'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ gridColumn: '1 / -1' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Package
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                                    {renderPackageLabel(c)}
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
                                            <IconButton size="small" onClick={(e) => openActions(e, c)} title="Actions">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    ) : (
                        <Table size="small" stickyHeader sx={{ minWidth: 1040 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Phone</TableCell>
                                    <TableCell>Package</TableCell>
                                    <TableCell>Billing Day</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Branch</TableCell>
                                    <TableCell>Installation</TableCell>
                                    <TableCell align="right" sx={{ width: 72 }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((c) => (
                                    <TableRow key={c.id} hover>
                                        <TableCell sx={{ minWidth: 220 }}>
                                            <Typography sx={{ fontWeight: 760 }}>{c.name}</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                {c.customer_code || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{c.phone || '-'}</TableCell>
                                        <TableCell>{renderPackageLabel(c)}</TableCell>
                                        <TableCell>{c.billing_day_of_month || '-'}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={c.status} />
                                        </TableCell>
                                        <TableCell>{c.branch?.name || `#${c.branch_id}`}</TableCell>
                                        <TableCell>{normalizeDateValue(c.installation_date) || '-'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={(e) => openActions(e, c)} title="Actions">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
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
                                    InputLabelProps={{ shrink: true }}
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
