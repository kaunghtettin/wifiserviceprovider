import EmptyState from '@/Components/admin/EmptyState';
import PageHeader from '@/Components/admin/PageHeader';
import StatusBadge from '@/Components/admin/StatusBadge';
import TableCard from '@/Components/admin/TableCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
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

const emptyForm = {
    global_role_id: '',
    branch_assignments: [],
    name: '',
    email: '',
    phone: '',
    status: 'active',
    password: '',
};

export default function UserIndex({ users, branches, branchRoles, globalRoles, filters }) {
    const { admin_app_url: appUrl, auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [query, setQuery] = useState(filters?.q || '');
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);
    const rows = useMemo(() => users || [], [users]);

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

    const openEdit = (user) => {
        setEditing(user);
        setData({
            global_role_id: user.global_role_id || '',
            branch_assignments: (user.branch_assignments || []).map((assignment) => ({
                branch_id: assignment.branch_id,
                role_id: assignment.role_id || '',
            })),
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            status: user.status || 'active',
            password: '',
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: closeDialog };
        if (editing?.id) {
            put(`${appUrl}/users/${editing.id}`, options);
        } else {
            post(`${appUrl}/users`, options);
        }
    };

    const addAssignment = () => {
        setData('branch_assignments', [
            ...data.branch_assignments,
            { branch_id: '', role_id: branchRoles?.[0]?.id || '' },
        ]);
    };

    const updateAssignment = (index, key, value) => {
        setData(
            'branch_assignments',
            data.branch_assignments.map((assignment, assignmentIndex) =>
                assignmentIndex === index ? { ...assignment, [key]: value } : assignment),
        );
    };

    const removeAssignment = (index) => {
        setData('branch_assignments', data.branch_assignments.filter((_, assignmentIndex) => assignmentIndex !== index));
    };

    const removeUser = (user) => {
        if (user.id === auth?.user?.id || !window.confirm(`Delete user "${user.name}"?`)) return;
        router.delete(`${appUrl}/users/${user.id}`, { preserveScroll: true });
    };

    const applySearch = () => {
        router.get(`${appUrl}/users`, { q: query }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout title="Users">
            <Head title="Users" />
            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="Global Administration"
                    title="Users and branch access"
                    description="Assign a separate operational role for every branch a user can enter."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New User</Button>}
                />

                <TableCard
                    title="User directory"
                    description={`${rows.length} accounts`}
                    toolbar={
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && applySearch()}
                                placeholder="Search users"
                                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
                            />
                            <Button variant="outlined" onClick={applySearch}>Search</Button>
                        </Stack>
                    }
                >
                    {rows.length ? (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 900 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User</TableCell>
                                        <TableCell>Global role</TableCell>
                                        <TableCell>Branch access</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Last login</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((user) => (
                                        <TableRow key={user.id} hover>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 750 }}>{user.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                            </TableCell>
                                            <TableCell>{user.global_role?.name || '-'}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                                    {(user.branch_assignments || []).map((assignment) => (
                                                        <Chip
                                                            key={assignment.branch_id}
                                                            size="small"
                                                            label={`${assignment.branch_name}: ${assignment.role_name || 'No role'}`}
                                                        />
                                                    ))}
                                                    {!user.branch_assignments?.length ? <Typography color="text.secondary">None</Typography> : null}
                                                </Stack>
                                            </TableCell>
                                            <TableCell><StatusBadge status={user.status} /></TableCell>
                                            <TableCell>{user.last_login_at ? String(user.last_login_at).replace('T', ' ').slice(0, 19) : '-'}</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={() => openEdit(user)} disabled={user.id === auth?.user?.id}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => removeUser(user)} disabled={user.id === auth?.user?.id}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : (
                        <EmptyState compact icon={<AddIcon />} title="No users found" description="Create the first user assignment." />
                    )}
                </TableCard>
            </Stack>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md">
                <DialogTitle>{editing ? `Edit ${editing.name}` : 'New User'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2.5} sx={{ pt: 1 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Name"
                                    value={data.name}
                                    onChange={(event) => setData('name', event.target.value)}
                                    error={!!errors.name}
                                    helperText={errors.name}
                                />
                                <TextField
                                    fullWidth
                                    required
                                    type="email"
                                    label="Email"
                                    value={data.email}
                                    onChange={(event) => setData('email', event.target.value)}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField fullWidth label="Phone" value={data.phone} onChange={(event) => setData('phone', event.target.value)} />
                                <TextField
                                    fullWidth
                                    select
                                    label="Status"
                                    value={data.status}
                                    onChange={(event) => setData('status', event.target.value)}
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="disabled">Disabled</MenuItem>
                                </TextField>
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Global role (optional)"
                                    value={data.global_role_id}
                                    onChange={(event) => setData('global_role_id', event.target.value)}
                                    error={!!errors.global_role_id}
                                    helperText={errors.global_role_id || 'Only needed for global administration access.'}
                                >
                                    <MenuItem value="">No global access</MenuItem>
                                    {(globalRoles || []).map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
                                </TextField>
                                <TextField
                                    fullWidth
                                    required={!editing}
                                    type="password"
                                    label={editing ? 'New password (optional)' : 'Password'}
                                    value={data.password}
                                    onChange={(event) => setData('password', event.target.value)}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                />
                            </Stack>

                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Branch assignments</Typography>
                                    <Typography variant="body2" color="text.secondary">Choose one role for each branch.</Typography>
                                </Box>
                                <Button startIcon={<AddIcon />} onClick={addAssignment}>Add branch</Button>
                            </Stack>

                            {data.branch_assignments.map((assignment, index) => (
                                <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                    <TextField
                                        fullWidth
                                        select
                                        label="Branch"
                                        value={assignment.branch_id}
                                        onChange={(event) => updateAssignment(index, 'branch_id', event.target.value)}
                                        error={!!errors[`branch_assignments.${index}.branch_id`]}
                                        helperText={errors[`branch_assignments.${index}.branch_id`]}
                                    >
                                        {(branches || []).map((branch) => (
                                            <MenuItem
                                                key={branch.id}
                                                value={branch.id}
                                                disabled={data.branch_assignments.some((item, itemIndex) => itemIndex !== index && item.branch_id === branch.id)}
                                            >
                                                {branch.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        fullWidth
                                        select
                                        label="Role in branch"
                                        value={assignment.role_id}
                                        onChange={(event) => updateAssignment(index, 'role_id', event.target.value)}
                                        error={!!errors[`branch_assignments.${index}.role_id`]}
                                        helperText={errors[`branch_assignments.${index}.role_id`]}
                                    >
                                        {(branchRoles || []).map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
                                    </TextField>
                                    <IconButton color="error" onClick={() => removeAssignment(index)}><DeleteIcon /></IconButton>
                                </Stack>
                            ))}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDialog}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={processing}>{editing ? 'Save' : 'Create'}</Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </AdminLayout>
    );
}
