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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';

const emptyForm = {
    branch_id: '',
    name: '',
    speed_mbps: '',
    price: '',
    duration_months: 1,
    description: '',
    status: 'active',
};

export default function PackageIndex({ packages, branches, canAssignBranch }) {
    const { admin_app_url } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionPkg, setActionPkg] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

    const rows = useMemo(() => packages || [], [packages]);
    const branchOptions = useMemo(() => branches || [], [branches]);

    const closeDialog = () => {
        setOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        setEditing(null);
        reset();
        clearErrors();
        setOpen(true);
    };

    const openEdit = (pkg) => {
        setEditing(pkg);
        setData({
            branch_id: pkg?.branch_id ?? '',
            name: pkg?.name ?? '',
            speed_mbps: pkg?.speed_mbps ?? '',
            price: pkg?.price ?? '',
            duration_months: pkg?.duration_months ?? 1,
            description: pkg?.description ?? '',
            status: pkg?.status ?? 'active',
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();

        const payload = {
            ...data,
            branch_id: canAssignBranch ? (data.branch_id === '' ? null : data.branch_id) : undefined,
        };

        if (editing?.id) {
            put(`${admin_app_url}/packages/${editing.id}`, {
                data: payload,
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(`${admin_app_url}/packages`, {
            data: payload,
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const remove = (pkg) => {
        if (!pkg?.id) return;
        if (!window.confirm(`Delete package "${pkg.name}"?`)) return;
        router.delete(`${admin_app_url}/packages/${pkg.id}`, { preserveScroll: true });
    };

    const openActions = (event, pkg) => {
        setActionAnchor(event.currentTarget);
        setActionPkg(pkg);
    };
    const closeActions = () => {
        setActionAnchor(null);
        setActionPkg(null);
    };

    const renderBranchName = (pkg) => {
        const branchName = pkg?.branch?.name;
        if (!pkg?.branch_id) return 'All branches';
        return branchName || `Branch #${pkg.branch_id}`;
    };

    return (
        <AdminLayout title="Packages">
            <Head title="Packages" />

            <Stack spacing={2}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            WiFi Packages
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage speed-based packages and monthly pricing.
                        </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                        New Package
                    </Button>
                </Stack>

                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Speed</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <Typography variant="body2" color="text.secondary">
                                            No packages yet.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((pkg) => (
                                    <TableRow key={pkg.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{pkg.name}</TableCell>
                                        <TableCell>{pkg.speed_mbps} Mbps</TableCell>
                                        <TableCell>{pkg.price}</TableCell>
                                        <TableCell>{pkg.duration_months} month(s)</TableCell>
                                        <TableCell>{renderBranchName(pkg)}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{pkg.status}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={(e) => openActions(e, pkg)} title="Actions">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>
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
                        const pkg = actionPkg;
                        closeActions();
                        if (pkg) openEdit(pkg);
                    }}
                >
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const pkg = actionPkg;
                        closeActions();
                        if (pkg) remove(pkg);
                    }}
                >
                    <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{editing ? 'Edit Package' : 'New Package'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            {canAssignBranch ? (
                                <TextField
                                    select
                                    label="Branch"
                                    value={data.branch_id}
                                    onChange={(e) => setData('branch_id', e.target.value)}
                                    error={!!errors.branch_id}
                                    helperText={errors.branch_id}
                                >
                                    <MenuItem value="">All branches</MenuItem>
                                    {branchOptions.map((b) => (
                                        <MenuItem key={b.id} value={b.id}>
                                            {b.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            ) : null}

                            <TextField
                                label="Package Name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Speed (Mbps)"
                                    value={data.speed_mbps}
                                    onChange={(e) => setData('speed_mbps', e.target.value)}
                                    error={!!errors.speed_mbps}
                                    helperText={errors.speed_mbps}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Price"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    error={!!errors.price}
                                    helperText={errors.price}
                                    required
                                    sx={{ flex: 1 }}
                                />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Duration (months)"
                                    value={data.duration_months}
                                    onChange={(e) => setData('duration_months', e.target.value)}
                                    error={!!errors.duration_months}
                                    helperText={errors.duration_months}
                                    required
                                    sx={{ flex: 1 }}
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
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                </TextField>
                            </Stack>
                            <TextField
                                label="Description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                error={!!errors.description}
                                helperText={errors.description}
                                multiline
                                minRows={3}
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
