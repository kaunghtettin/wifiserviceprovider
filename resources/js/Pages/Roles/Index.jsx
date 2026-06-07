import EmptyState from '@/Components/admin/EmptyState';
import PageHeader from '@/Components/admin/PageHeader';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
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

const emptyForm = { name: '', description: '', permission_keys: [] };

const groupPermissions = (permissions) => {
    const groups = new Map();
    (permissions || []).forEach((p) => {
        const key = p.key || '';
        const group = key.includes('.') ? key.split('.')[0] : 'other';
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(p);
    });
    return Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, items]) => ({ group, items: items.sort((a, b) => a.key.localeCompare(b.key)) }));
};

export default function RolesIndex({ roles, permissions }) {
    const { admin_app_url } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionRole, setActionRole] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

    const rows = useMemo(() => roles || [], [roles]);
    const permissionGroups = useMemo(() => groupPermissions(permissions || []), [permissions]);
    const allPermissionKeys = useMemo(() => (permissions || []).map((p) => p.key), [permissions]);

    const closeDialog = () => {
        setOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        setEditing(null);
        setData(emptyForm);
        clearErrors();
        setOpen(true);
    };

    const openEdit = (role) => {
        setEditing(role);
        setData({
            name: role?.name || '',
            description: role?.description || '',
            permission_keys: Array.isArray(role?.permission_keys) ? role.permission_keys : [],
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing?.id) {
            put(`${admin_app_url}/roles/${editing.id}`, { preserveScroll: true, onSuccess: closeDialog });
            return;
        }
        post(`${admin_app_url}/roles`, { preserveScroll: true, onSuccess: closeDialog });
    };

    const remove = (role) => {
        if (!role?.id) return;
        if (!window.confirm(`Delete role "${role.name}"?`)) return;
        router.delete(`${admin_app_url}/roles/${role.id}`, { preserveScroll: true });
    };

    const openActions = (event, role) => {
        setActionAnchor(event.currentTarget);
        setActionRole(role);
    };
    const closeActions = () => {
        setActionAnchor(null);
        setActionRole(null);
    };

    const togglePermission = (key) => {
        const current = Array.isArray(data.permission_keys) ? data.permission_keys : [];
        const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
        setData('permission_keys', next);
    };

    const setAll = (checked) => {
        setData('permission_keys', checked ? allPermissionKeys : []);
    };

    const canDelete = (role) => role?.name !== 'super_admin' && (role?.users_count ?? 0) === 0;
    const canEdit = (role) => role?.name !== 'super_admin';

    return (
        <AdminLayout title="Roles">
            <Head title="Roles" />

            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="Security"
                    title="Roles & permissions"
                    description="Design access policies for every staff type and keep branch operations safely scoped."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Role</Button>}
                />

                <TableCard
                    title="RBAC directory"
                    description={`${rows.length} roles available in the current permission model.`}
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<AddIcon />}
                            title="No roles found"
                            description="Create a role to begin assigning permission bundles for admins and staff."
                            action={{ label: 'Create role', onClick: openCreate }}
                        />
                    ) : (
                        <Table size="small" stickyHeader sx={{ minWidth: 840 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Role</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Users</TableCell>
                                <TableCell>Permissions</TableCell>
                                <TableCell align="right" sx={{ width: 72 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((role) => (
                                <TableRow key={role.id} hover>
                                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{role.name}</TableCell>
                                    <TableCell sx={{ maxWidth: 520 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {role.description || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{role.users_count ?? 0}</TableCell>
                                    <TableCell>{Array.isArray(role.permission_keys) ? role.permission_keys.length : 0}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={(e) => openActions(e, role)} title="Actions">
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
                    disabled={!canEdit(actionRole)}
                    onClick={() => {
                        const role = actionRole;
                        closeActions();
                        if (role && canEdit(role)) openEdit(role);
                    }}
                >
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
                </MenuItem>
                <MenuItem
                    disabled={!canDelete(actionRole)}
                    onClick={() => {
                        const role = actionRole;
                        closeActions();
                        if (role && canDelete(role)) remove(role);
                    }}
                >
                    <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md" scroll="paper">
                <DialogTitle>{editing ? `Edit Role: ${editing.name}` : 'New Role'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    label="Role Name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={!!errors.name}
                                    helperText={errors.name}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    error={!!errors.description}
                                    helperText={errors.description}
                                    sx={{ flex: 2 }}
                                />
                            </Stack>

                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    Permissions
                                </Typography>
                                <FormControlLabel
                                    control={<Checkbox checked={Array.isArray(data.permission_keys) && data.permission_keys.length === allPermissionKeys.length} onChange={(e) => setAll(e.target.checked)} />}
                                    label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Select all</Typography>}
                                />
                            </Stack>

                            <Stack spacing={2}>
                                {permissionGroups.map((g) => (
                                    <Paper key={g.group} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                                            {g.group}
                                        </Typography>
                                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                                            {g.items.map((p) => (
                                                <FormControlLabel
                                                    key={p.key}
                                                    control={<Checkbox checked={Array.isArray(data.permission_keys) && data.permission_keys.includes(p.key)} onChange={() => togglePermission(p.key)} />}
                                                    label={
                                                        <Stack spacing={0} sx={{ my: 0.25 }}>
                                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                                                {p.key}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {p.description || ''}
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                />
                                            ))}
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
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
