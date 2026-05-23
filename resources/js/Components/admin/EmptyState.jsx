import AppSurface from '@/Components/admin/AppSurface';
import { Box, Button, Stack, Typography } from '@mui/material';

export default function EmptyState({ icon, title, description, action = null, compact = false }) {
    return (
        <AppSurface sx={{ p: compact ? 2.5 : 4 }}>
            <Stack spacing={1.5} sx={{ alignItems: compact ? 'flex-start' : 'center', textAlign: compact ? 'left' : 'center' }}>
                {icon ? (
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 3,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(59,130,246,0.1)',
                            color: 'primary.main',
                        }}
                    >
                        {icon}
                    </Box>
                ) : null}
                <Typography variant="h6" sx={{ fontWeight: 760 }}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
                    {description}
                </Typography>
                {action ? <Button variant="contained" onClick={action.onClick}>{action.label}</Button> : null}
            </Stack>
        </AppSurface>
    );
}

