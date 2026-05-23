import AppSurface from '@/Components/admin/AppSurface';
import { Box, Stack, Typography } from '@mui/material';

const MiniBars = ({ color = '#3b82f6', values = [] }) => (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-end', height: 42 }}>
        {values.map((value, index) => (
            <Box
                key={`${value}-${index}`}
                sx={{
                    width: 8,
                    borderRadius: 999,
                    height: `${Math.max(18, value)}px`,
                    background: `linear-gradient(180deg, ${color}, rgba(59,130,246,0.22))`,
                    opacity: 0.95,
                }}
            />
        ))}
    </Stack>
);

export default function StatCard({ label, value, helper, trend, icon, values = [], color = '#3b82f6' }) {
    return (
        <AppSurface sx={{ p: 1.75, minHeight: 138 }}>
            <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        display: 'grid',
                        placeItems: 'center',
                        color,
                        background: `linear-gradient(180deg, rgba(59,130,246,0.16), rgba(59,130,246,0.06))`,
                    }}
                >
                    {icon}
                </Box>
                {trend ? (
                    <Typography
                        variant="caption"
                        sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 999,
                            color: trend.startsWith('-') ? 'error.main' : 'success.main',
                            bgcolor: trend.startsWith('-') ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.12)',
                        }}
                    >
                        {trend}
                    </Typography>
                ) : null}
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 860, mb: 0.75 }}>
                {value}
            </Typography>

            <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180 }}>
                    {helper}
                </Typography>
                {values.length > 0 ? <MiniBars values={values} color={color} /> : null}
            </Stack>
        </AppSurface>
    );
}
