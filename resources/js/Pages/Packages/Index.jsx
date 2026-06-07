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

            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="Workspace"
                    title="Bandwidth packages"
                    description="Create premium service plans with speed, pricing, duration, and optional branch scoping."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Package</Button>}
                />

                <TableCard
                    title="Package catalog"
                    description={`${rows.length} packages available across global and branch-specific offerings.`}
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<AddIcon />}
                            title="No packages yet"
                            description="Add your first WiFi package to start assigning plans to subscribers and branches."
                            action={{ label: 'Create package', onClick: openCreate }}
                        />
                    ) : (
                        <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Speed</TableCell>
                                <TableCell>Price</TableCell>
                                <TableCell>Duration</TableCell>
                                <TableCell>Branch</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right" sx={{ width: 72 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((pkg) => (
                                <TableRow key={pkg.id} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 760 }}>{pkg.name}</Typography>
                                    </TableCell>
                                    <TableCell>{pkg.speed_mbps} Mbps</TableCell>
                                    <TableCell>{pkg.price}</TableCell>
                                    <TableCell>{pkg.duration_months} month(s)</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {renderBranchName(pkg)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={pkg.status} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={(e) => openActions(e, pkg)} title="Actions">
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
