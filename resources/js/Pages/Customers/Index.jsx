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
    Menu,
    MenuItem,
    Paper,
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
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon, Search as SearchIcon } from '@mui/icons-material';

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

    const renderPackageLabel = (c) => {
        if (!c?.package) return '-';
        return `${c.package.name} (${c.package.speed_mbps} Mbps)`;
    };

    return (
        <AdminLayout title="Customers">
            <Head title="Customers" />

            <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Customers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage customer profiles, billing day, and service status.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
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
                                startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8, opacity: 0.6 }} />,
                            }}
                        />
                        <Button variant="outlined" onClick={applySearch}>
                            Search
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                            New Customer
                        </Button>
                    </Stack>
                </Stack>

                {isPhone ? (
                    <Stack spacing={1.25}>
                        {rows.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No customers found.
                                </Typography>
                            </Paper>
                        ) : (
                            rows.map((c) => (
                                <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                    <Stack spacing={1}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 800, lineHeight: 1.15 }} noWrap>
                                                    {c.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                    {c.customer_code || '-'}
                                                </Typography>
                                            </Box>
                                            <Box
                                                sx={{
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 999,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    textTransform: 'capitalize',
                                                    bgcolor:
                                                        c.status === 'active'
                                                            ? 'rgba(34, 197, 94, 0.12)'
                                                            : c.status === 'pending'
                                                              ? 'rgba(245, 158, 11, 0.12)'
                                                              : c.status === 'suspended'
                                                                ? 'rgba(239, 68, 68, 0.12)'
                                                                : 'rgba(148, 163, 184, 0.12)',
                                                    color:
                                                        c.status === 'active'
                                                            ? 'rgb(22, 163, 74)'
                                                            : c.status === 'pending'
                                                              ? 'rgb(217, 119, 6)'
                                                              : c.status === 'suspended'
                                                                ? 'rgb(220, 38, 38)'
                                                                : 'text.secondary',
                                                }}
                                            >
                                                {c.status}
                                            </Box>
                                        </Stack>

                                        <Stack spacing={0.25}>
                                            <Typography variant="body2" color="text.secondary">
                                                Phone: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{c.phone}</Box>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Package: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{renderPackageLabel(c)}</Box>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Billing day: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{c.billing_day_of_month}</Box>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Branch: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{c.branch?.name || `#${c.branch_id}`}</Box>
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                                            <IconButton size="small" onClick={(e) => openActions(e, c)} title="Actions">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))
                        )}
                    </Stack>
                ) : (
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 900 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Package</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Billing Day</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            <Typography variant="body2" color="text.secondary">
                                                No customers found.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((c) => (
                                        <TableRow key={c.id} hover>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{c.customer_code || '-'}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                                            <TableCell>{c.phone}</TableCell>
                                            <TableCell>{renderPackageLabel(c)}</TableCell>
                                            <TableCell>{c.billing_day_of_month}</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{c.status}</TableCell>
                                            <TableCell>{c.branch?.name || `#${c.branch_id}`}</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={(e) => openActions(e, c)} title="Actions">
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Stack>

            <Menu
                anchorEl={actionAnchor}
                open={Boolean(actionAnchor)}
                onClose={closeActions}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ variant: 'outlined', sx: { borderRadius: 2 } }}
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

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md" scroll="paper">
                <DialogTitle>{editing ? 'Edit Customer' : 'New Customer'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
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
