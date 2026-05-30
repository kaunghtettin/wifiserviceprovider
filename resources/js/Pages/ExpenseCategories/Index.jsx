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
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    MoreVert as MoreVertIcon,
    Sell as SellIcon,
} from '@mui/icons-material';

const emptyForm = {
    name: '',
    description: '',
};

const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');

export default function ExpenseCategoryIndex({ categories }) {
    const { admin_app_url } = usePage().props;
    const rows = useMemo(() => categories || [], [categories]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionCategory, setActionCategory] = useState(null);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

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

    const openEdit = (category) => {
        setEditing(category);
        setData({
            name: category?.name ?? '',
            description: category?.description ?? '',
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();

        if (editing?.id) {
            put(`${admin_app_url}/expense-categories/${editing.id}`, {
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(`${admin_app_url}/expense-categories`, {
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const remove = (category) => {
        if (!category?.id) return;
        if (!window.confirm(`Delete expense category "${category.name}"?`)) return;
        router.delete(`${admin_app_url}/expense-categories/${category.id}`, { preserveScroll: true });
    };

    const openActions = (event, category) => {
        setActionAnchor(event.currentTarget);
        setActionCategory(category);
    };

    const closeActions = () => {
        setActionAnchor(null);
        setActionCategory(null);
    };

    return (
        <AdminLayout title="Expense Categories">
            <Head title="Expense Categories" />

            <Stack spacing={2.25}>
                <PageHeader
                    eyebrow="System"
                    title="Expense categories"
                    description="Manage the categories used by expense records, filters, and reporting."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Category</Button>}
                />

                <TableCard
                    title="Category list"
                    description={`${rows.length} expense categor${rows.length === 1 ? 'y' : 'ies'} available for expense entry and reporting.`}
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<SellIcon />}
                            title="No expense categories yet"
                            description="Create your first expense category to organize branch spending."
                            action={{ label: 'Create category', onClick: openCreate }}
                        />
                    ) : (
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Slug</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell align="right">Used In Expenses</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right" sx={{ width: 72 }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((category) => (
                                    <TableRow key={category.id} hover>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 760 }}>{category.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {category.slug}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{category.description || '-'}</TableCell>
                                        <TableCell align="right">{category.expense_count ?? 0}</TableCell>
                                        <TableCell>{formatDate(category.created_at)}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={(event) => openActions(event, category)} title="Actions">
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
                        const category = actionCategory;
                        closeActions();
                        if (category) openEdit(category);
                    }}
                >
                    <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const category = actionCategory;
                        closeActions();
                        if (category) remove(category);
                    }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{editing ? 'Edit Expense Category' : 'New Expense Category'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            <TextField
                                label="Category Name"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                error={!!errors.name}
                                helperText={errors.name || 'The slug is generated automatically from the category name.'}
                                slotProps={{ 
  formHelperText: { sx: { mt: 0.5, minHeight: '1.25em' } },
  inputLabel: {
    sx: {
      '&.MuiInputLabel-outlined': {
        transform: 'translate(14px, 12px) scale(1)',
      },
    }
  }
}}
                                required
                            />
                            <TextField
                                label="Description"
                                value={data.description}
                                onChange={(event) => setData('description', event.target.value)}
                                error={!!errors.description}
                                helperText={errors.description}
                                slotProps={{ 
  formHelperText: { sx: { mt: 0.5, minHeight: '1.25em' } },
  inputLabel: {
    sx: {
      '&.MuiInputLabel-outlined': {
        transform: 'translate(14px, 12px) scale(1)',
      },
    }
  }
}}
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
