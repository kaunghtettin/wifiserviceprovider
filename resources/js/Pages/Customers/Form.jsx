import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';

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

const buildInitial = (customer, canAssignBranch, defaultBranchId) => ({
    branch_id: canAssignBranch ? customer?.branch_id ?? '' : defaultBranchId ?? '',
    wifi_package_id: customer?.wifi_package_id ?? '',
    name: customer?.name ?? '',
    ftth_account_name: customer?.ftth_account_name ?? '',
    ftth_id: customer?.ftth_id ?? '',
    phone: customer?.phone ?? '',
    nrc: customer?.nrc ?? '',
    address: customer?.address ?? '',
    gps_lat: customer?.gps_lat ?? '',
    gps_lng: customer?.gps_lng ?? '',
    installation_date: normalizeDateValue(customer?.installation_date),
    billing_day_of_month: customer?.billing_day_of_month ?? 1,
    router_sn: customer?.router_sn ?? '',
    status: customer?.status ?? 'active',
    notes: customer?.notes ?? '',
});

export default function CustomerForm({ mode, customer, branches, packages, canAssignBranch, defaultBranchId }) {
    const { admin_app_url } = usePage().props;
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const isEdit = mode === 'edit';
    const title = isEdit ? 'Edit Customer' : 'New Customer';

    const initial = useMemo(
        () => buildInitial(customer, canAssignBranch, defaultBranchId),
        [customer, canAssignBranch, defaultBranchId],
    );

    const { data, setData, post, put, processing, errors } = useForm(initial);

    const submit = (e) => {
        e.preventDefault();
        const payload = {
            ...data,
            branch_id: canAssignBranch ? (data.branch_id === '' ? null : data.branch_id) : undefined,
            wifi_package_id: data.wifi_package_id === '' ? null : data.wifi_package_id,
        };

        if (isEdit && customer?.id) {
            put(`${admin_app_url}/customers/${customer.id}`, { data: payload });
            return;
        }

        post(`${admin_app_url}/customers`, { data: payload });
    };

    return (
        <AdminLayout title={title}>
            <Head title={title} />

            <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 2, maxWidth: 980, mx: 'auto', mb: { xs: 9, sm: 0 } }}>
                <Stack spacing={1.75}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                {title}
                            </Typography>
                            {customer?.customer_code ? (
                                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                    {customer.customer_code}
                                </Typography>
                            ) : null}
                        </Box>
                        <Button component={Link} href={`${admin_app_url}/customers`} variant="outlined">
                            Back
                        </Button>
                    </Stack>

                    <Box component="form" id="customer-mobile-form" onSubmit={submit}>
                        <Stack spacing={2}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
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
                                        {branches.map((b) => (
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
                                    {packages.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name} ({p.speed_mbps} Mbps)
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
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

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField
                                    label="FTTH Account Name"
                                    value={data.ftth_account_name}
                                    onChange={(e) => setData('ftth_account_name', e.target.value)}
                                    error={!!errors.ftth_account_name}
                                    helperText={errors.ftth_account_name}
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="FTTH ID"
                                    value={data.ftth_id}
                                    onChange={(e) => setData('ftth_id', e.target.value)}
                                    error={!!errors.ftth_id}
                                    helperText={errors.ftth_id}
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
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

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
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

                            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', display: { xs: 'none', sm: 'flex' } }}>
                                <Button component={Link} href={`${admin_app_url}/customers`} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="contained" disabled={processing}>
                                    {isEdit ? 'Save' : 'Create'}
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                </Stack>
            </Paper>

            {isPhone ? (
                <Paper
                    elevation={0}
                    sx={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: (muiTheme) => muiTheme.zIndex.appBar - 1,
                        borderTop: `1px solid ${theme.palette.divider}`,
                        p: 1,
                        borderRadius: 0,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Stack direction="row" spacing={1}>
                        <Button component={Link} href={`${admin_app_url}/customers`} disabled={processing} variant="outlined" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" form="customer-mobile-form" variant="contained" disabled={processing} fullWidth>
                            {isEdit ? 'Save' : 'Create'}
                        </Button>
                    </Stack>
                </Paper>
            ) : null}
        </AdminLayout>
    );
}
