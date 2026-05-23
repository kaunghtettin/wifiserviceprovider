import EmptyState from '@/Components/admin/EmptyState';
import PageHeader from '@/Components/admin/PageHeader';
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

const emptyForm = { name: '', code: '', phone: '', address: '' };

export default function BranchIndex({ branches }) {
    const { admin_app_url } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionBranch, setActionBranch] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

    const rows = useMemo(() => branches || [], [branches]);

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

    const openEdit = (branch) => {
        setEditing(branch);
        setData({
            name: branch?.name || '',
            code: branch?.code || '',
            phone: branch?.phone || '',
            address: branch?.address || '',
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();

        if (editing?.id) {
            put(`${admin_app_url}/branches/${editing.id}`, {
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(`${admin_app_url}/branches`, {
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const remove = (branch) => {
        if (!branch?.id) return;
        if (!window.confirm(`Delete branch "${branch.name}"?`)) return;
        router.delete(`${admin_app_url}/branches/${branch.id}`, { preserveScroll: true });
    };

    const openActions = (event, branch) => {
        setActionAnchor(event.currentTarget);
        setActionBranch(branch);
    };
    const closeActions = () => {
        setActionAnchor(null);
        setActionBranch(null);
    };

    return (
        <AdminLayout title="Branches">
            <Head title="Branches" />

            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="Workspace"
                    title="Branch management"
                    description="Manage physical locations, operational codes, and contact details for every branch."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Branch</Button>}
                />

                <TableCard
                    title="Branch directory"
                    description={`${rows.length} branch records in the current workspace.`}
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<AddIcon />}
                            title="No branches yet"
                            description="Create your first branch to organize customers, packages, staff, and financial data by location."
                            action={{ label: 'Create branch', onClick: openCreate }}
                        />
                    ) : (
                        <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Code</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell align="right" sx={{ width: 72 }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((branch) => (
                            <TableRow key={branch.id} hover>
                                <TableCell>
                                    <Typography sx={{ fontWeight: 760 }}>{branch.name}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                        {branch.code || '-'}
                                    </Typography>
                                </TableCell>
                                <TableCell>{branch.phone || '-'}</TableCell>
                                <TableCell sx={{ maxWidth: 520 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {branch.address || '-'}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={(e) => openActions(e, branch)} title="Actions">
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
                        const branch = actionBranch;
                        closeActions();
                        if (branch) openEdit(branch);
                    }}
                >
                    <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const branch = actionBranch;
                        closeActions();
                        if (branch) remove(branch);
                    }}
                >
                    <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{editing ? 'Edit Branch' : 'New Branch'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            <TextField
                                label="Branch Name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <TextField
                                label="Branch Code"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                error={!!errors.code}
                                helperText={errors.code}
                            />
                            <TextField
                                label="Phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={!!errors.phone}
                                helperText={errors.phone}
                            />
                            <TextField
                                label="Address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
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
