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
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon, Search as SearchIcon } from '@mui/icons-material';

const emptyForm = {
    branch_id: '',
    role_id: '',
    name: '',
    email: '',
    phone: '',
    status: 'active',
    password: '',
};

export default function UserIndex({ users, branches, roles, canAssignBranch, canAssignRole, filters }) {
    const { admin_app_url, auth } = usePage().props;
    const authUserId = auth?.user?.id;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionUser, setActionUser] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);
    const [query, setQuery] = useState(filters?.q || '');

    const rows = useMemo(() => users || [], [users]);
    const branchOptions = useMemo(() => branches || [], [branches]);
    const roleOptions = useMemo(() => roles || [], [roles]);

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

    const openEdit = (u) => {
        setEditing(u);
        setData({
            branch_id: u?.branch_id ?? '',
            role_id: u?.role_id ?? '',
            name: u?.name ?? '',
            email: u?.email ?? '',
            phone: u?.phone ?? '',
            status: u?.status ?? 'active',
            password: '',
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();

        const payload = {
            ...data,
            branch_id: canAssignBranch ? (data.branch_id === '' ? null : data.branch_id) : undefined,
            role_id: canAssignRole ? data.role_id : undefined,
        };

        if (editing?.id) {
            put(`${admin_app_url}/users/${editing.id}`, {
                data: payload,
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(`${admin_app_url}/users`, {
            data: payload,
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const remove = (u) => {
        if (!u?.id) return;
        if (u.id === authUserId) return;
        if (!window.confirm(`Delete user "${u.name}"?`)) return;
        router.delete(`${admin_app_url}/users/${u.id}`, { preserveScroll: true });
    };

    const openActions = (event, u) => {
        setActionAnchor(event.currentTarget);
        setActionUser(u);
    };
    const closeActions = () => {
        setActionAnchor(null);
        setActionUser(null);
    };

    const applySearch = () => {
        router.get(`${admin_app_url}/users`, { q: query || '' }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const roleLabel = (u) => u?.role?.name || '-';
    const branchLabel = (u) => u?.branch?.name || (u?.branch_id ? `#${u.branch_id}` : '-');

    return (
        <AdminLayout title="Users">
            <Head title="Users" />

            <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Users
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage staff/admin accounts and branch assignment.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                        <TextField
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search name, email, phone"
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
                            New User
                        </Button>
                    </Stack>
                </Stack>

                <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 980 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Last Login</TableCell>
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
                                            No users found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((u) => (
                                    <TableRow key={u.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{u.phone || '-'}</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{roleLabel(u)}</TableCell>
                                        <TableCell>{branchLabel(u)}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{u.status}</TableCell>
                                        <TableCell>{u.last_login_at ? String(u.last_login_at).replace('T', ' ').slice(0, 19) : '-'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={(e) => openActions(e, u)} title="Actions" disabled={u.id === authUserId}>
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
                        const u = actionUser;
                        closeActions();
                        if (u) openEdit(u);
                    }}
                >
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const u = actionUser;
                        closeActions();
                        if (u) remove(u);
                    }}
                >
                    <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm" scroll="paper">
                <DialogTitle>{editing ? 'Edit User' : 'New User'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                {canAssignRole ? (
                                    <TextField
                                        select
                                        label="Role"
                                        value={data.role_id}
                                        onChange={(e) => setData('role_id', e.target.value)}
                                        error={!!errors.role_id}
                                        helperText={errors.role_id}
                                        required
                                        sx={{ flex: 1 }}
                                    >
                                        {roleOptions.map((r) => (
                                            <MenuItem key={r.id} value={r.id}>
                                                {r.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                ) : null}

                                {canAssignBranch ? (
                                    <TextField
                                        select
                                        label="Branch"
                                        value={data.branch_id}
                                        onChange={(e) => setData('branch_id', e.target.value)}
                                        error={!!errors.branch_id}
                                        helperText={errors.branch_id}
                                        sx={{ flex: 1 }}
                                    >
                                        <MenuItem value="">No branch</MenuItem>
                                        {branchOptions.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>
                                                {b.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                ) : null}
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={!!errors.name}
                                    helperText={errors.name}
                                    required
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                    required
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    error={!!errors.phone}
                                    helperText={errors.phone}
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
                                    <MenuItem value="disabled">Disabled</MenuItem>
                                </TextField>
                            </Stack>

                            <TextField
                                label={editing ? 'New Password (optional)' : 'Password'}
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                error={!!errors.password}
                                helperText={errors.password}
                                required={!editing}
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
