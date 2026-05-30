import AppSurface from '@/Components/admin/AppSurface';
import EmptyState from '@/Components/admin/EmptyState';
import PaginatedTableFooter from '@/Components/admin/PaginatedTableFooter';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    MoreVert as MoreVertIcon,
    Receipt as ReceiptIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

const currency = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const emptyForm = {
    branch_id: '',
    category: '',
    title: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    vendor: '',
    reference_no: '',
    notes: '',
};

const formatCurrency = (value) => currency.format(Number(value || 0));
const formatDate = (value) => (value ? String(value).slice(0, 10) : '-');
const formatCategory = (value) =>
    String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export default function ExpenseIndex({ expenses, branches, canAssignBranch, filters, categories, summary }) {
    const { admin_app_url } = usePage().props;
    const rows = useMemo(() => expenses?.data || [], [expenses]);
    const branchOptions = useMemo(() => branches || [], [branches]);
    const categoryOptions = useMemo(() => categories || [], [categories]);
    const categoriesBySlug = useMemo(
        () =>
            Object.fromEntries(
                categoryOptions.map((category) => [category.slug, category]),
            ),
        [categoryOptions],
    );
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [actionAnchor, setActionAnchor] = useState(null);
    const [actionExpense, setActionExpense] = useState(null);
    const [query, setQuery] = useState(filters?.q || '');
    const [categoryFilter, setCategoryFilter] = useState(filters?.category || '');
    const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));
    const perPage = Number(filters?.per_page || expenses?.per_page || 15);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm);

    const cards = [
        {
            label: 'Expense entries',
            value: summary?.count ?? 0,
            helper: 'Recorded operational expenses in the selected month.',
        },
        {
            label: 'Total expense',
            value: formatCurrency(summary?.total_amount),
            helper: 'Combined spending across the filtered branch scope.',
        },
        {
            label: 'Top category',
            value: summary?.top_category ? (categoriesBySlug[summary.top_category]?.name || formatCategory(summary.top_category)) : '-',
            helper: 'Highest expense category in the current view.',
        },
    ];

    const closeDialog = () => {
        setOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        setEditing(null);
        reset();
        setData({
            ...emptyForm,
            category: categoryOptions[0]?.slug || '',
        });
        clearErrors();
        setOpen(true);
    };

    const openEdit = (expense) => {
        setEditing(expense);
        setData({
            branch_id: expense?.branch_id ?? '',
            category: expense?.category ?? categoryOptions[0]?.slug ?? '',
            title: expense?.title ?? '',
            amount: expense?.amount ?? '',
            expense_date: formatDate(expense?.expense_date),
            vendor: expense?.vendor ?? '',
            reference_no: expense?.reference_no ?? '',
            notes: expense?.notes ?? '',
        });
        clearErrors();
        setOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();

        const payload = {
            ...data,
            branch_id: canAssignBranch ? (data.branch_id === '' ? null : data.branch_id) : undefined,
        };

        if (editing?.id) {
            put(`${admin_app_url}/expenses/${editing.id}`, {
                data: payload,
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(`${admin_app_url}/expenses`, {
            data: payload,
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const remove = (expense) => {
        if (!expense?.id) return;
        if (!window.confirm(`Delete expense "${expense.title}"?`)) return;
        router.delete(`${admin_app_url}/expenses/${expense.id}`, { preserveScroll: true });
    };

    const openActions = (event, expense) => {
        setActionAnchor(event.currentTarget);
        setActionExpense(expense);
    };

    const closeActions = () => {
        setActionAnchor(null);
        setActionExpense(null);
    };

    const applyFilters = () => {
        router.get(
            `${admin_app_url}/expenses`,
            {
                q: query || undefined,
                category: categoryFilter || undefined,
                month: month || undefined,
                per_page: perPage,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const resetFilters = () => {
        setQuery('');
        setCategoryFilter('');
        const defaultMonth = new Date().toISOString().slice(0, 7);
        setMonth(defaultMonth);
        router.get(
            `${admin_app_url}/expenses`,
            { month: defaultMonth, per_page: perPage },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AdminLayout title="Expenses">
            <Head title="Expenses" />

            <Stack spacing={2}>
                <PageHeader
                    eyebrow="Finance"
                    title="Expense management"
                    description="Track branch operating costs, categorize spending, and keep monthly expense reporting ready for finance reviews."
                    actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Expense</Button>}
                />

                <Box
                    sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(3, minmax(0, 1fr))',
                        },
                    }}
                >
                    {cards.map((card) => (
                        <AppSurface key={card.label} sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {card.label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 820, mt: 0.5, mb: 0.5 }}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {card.helper}
                            </Typography>
                        </AppSurface>
                    ))}
                </Box>

                <TableCard
                    title="Expense ledger"
                    description={`${expenses?.from || 0}-${expenses?.to || 0} of ${expenses?.total || 0} expense records in the current view.`}
                    toolbar={
                        <>
                            <TextField
                                size="small"
                                placeholder="Search title, vendor, reference"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') applyFilters();
                                }}
                                sx={{ minWidth: { xs: '100%', sm: 220 } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                size="small"
                                type="month"
                                label="Month"
                                value={month}
                                onChange={(event) => setMonth(event.target.value)}
                                InputLabelProps={{ shrink: true }}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                select
                                size="small"
                                label="Category"
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                sx={{ minWidth: 140 }}
                            >
                                <MenuItem value="">All categories</MenuItem>
                                {categoryOptions.map((category) => (
                                    <MenuItem key={category.id} value={category.slug}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button variant="outlined" onClick={applyFilters}>
                                Search
                            </Button>
                            <Button variant="text" color="inherit" onClick={resetFilters}>
                                Reset
                            </Button>
                        </>
                    }
                >
                    {rows.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<ReceiptIcon />}
                            title="No expenses yet"
                            description="Add operating expenses to track branch spending and prepare monthly finance reports."
                            action={{ label: 'Create expense', onClick: openCreate }}
                        />
                    ) : (
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Expense</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Branch</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Reference</TableCell>
                                    <TableCell align="right" sx={{ width: 72 }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((expense) => (
                                    <TableRow key={expense.id} hover>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 760 }}>{expense.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {expense.vendor || expense.notes || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{categoriesBySlug[expense.category]?.name || formatCategory(expense.category)}</TableCell>
                                        <TableCell>{expense.branch?.name || `#${expense.branch_id}`}</TableCell>
                                        <TableCell>{formatDate(expense.expense_date)}</TableCell>
                                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                        <TableCell>{expense.reference_no || '-'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={(event) => openActions(event, expense)} title="Actions">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    <PaginatedTableFooter pagination={expenses} baseUrl={`${admin_app_url}/expenses`} filters={filters} />
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
                        const expense = actionExpense;
                        closeActions();
                        if (expense) openEdit(expense);
                    }}
                >
                    <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const expense = actionExpense;
                        closeActions();
                        if (expense) remove(expense);
                    }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>

            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{editing ? 'Edit Expense' : 'New Expense'}</DialogTitle>
                <Box component="form" onSubmit={submit}>
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            {canAssignBranch ? (
                                <TextField
                                    select
                                    label="Branch"
                                    value={data.branch_id}
                                    onChange={(event) => setData('branch_id', event.target.value)}
                                    error={!!errors.branch_id}
                                    helperText={errors.branch_id}
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
                                >
                                    {branchOptions.map((branch) => (
                                        <MenuItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            ) : null}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    select
                                    label="Category"
                                    value={data.category}
                                    onChange={(event) => setData('category', event.target.value)}
                                    error={!!errors.category}
                                    helperText={errors.category}
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
                                    sx={{ flex: 1 }}
                                >
                                    {categoryOptions.map((category) => (
                                        <MenuItem key={category.id} value={category.slug}>
                                            {category.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    type="date"
                                    label="Expense Date"
                                    value={data.expense_date}
                                    onChange={(event) => setData('expense_date', event.target.value)}
                                    error={!!errors.expense_date}
                                    helperText={errors.expense_date}
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
                                    sx={{ flex: 1 }}
                                    InputLabelProps={{ shrink: true }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    label="Title"
                                    value={data.title}
                                    onChange={(event) => setData('title', event.target.value)}
                                    error={!!errors.title}
                                    helperText={errors.title}
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
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Amount"
                                    value={data.amount}
                                    onChange={(event) => setData('amount', event.target.value)}
                                    error={!!errors.amount}
                                    helperText={errors.amount}
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
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField
                                    label="Vendor"
                                    value={data.vendor}
                                    onChange={(event) => setData('vendor', event.target.value)}
                                    error={!!errors.vendor}
                                    helperText={errors.vendor}
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
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Reference No"
                                    value={data.reference_no}
                                    onChange={(event) => setData('reference_no', event.target.value)}
                                    error={!!errors.reference_no}
                                    helperText={errors.reference_no}
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
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <TextField
                                label="Notes"
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                                error={!!errors.notes}
                                helperText={errors.notes}
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
