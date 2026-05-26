import AppSurface from '@/Components/admin/AppSurface';
import { Box, Stack, Typography } from '@mui/material';

export default function TableCard({ title, description, toolbar = null, toolbarBelow = false, children, sx = {} }) {
    return (
        <AppSurface sx={{ ...sx }}>
            {(title || description || toolbar) && (
                toolbarBelow ? (
                    <Stack spacing={1.25} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                        <Box>
                            {title ? (
                                <Typography variant="h6" sx={{ fontWeight: 760, mb: 0.25 }}>
                                    {title}
                                </Typography>
                            ) : null}
                            {description ? (
                                <Typography variant="body2" color="text.secondary">
                                    {description}
                                </Typography>
                            ) : null}
                        </Box>
                        {toolbar ? <Box>{toolbar}</Box> : null}
                    </Stack>
                ) : (
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1}
                        sx={{ px: 1.5, pt: 1.5, pb: 1, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                    >
                        <Box>
                            {title ? (
                                <Typography variant="h6" sx={{ fontWeight: 760, mb: 0.25 }}>
                                    {title}
                                </Typography>
                            ) : null}
                            {description ? (
                                <Typography variant="body2" color="text.secondary">
                                    {description}
                                </Typography>
                            ) : null}
                        </Box>
                        {toolbar ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>{toolbar}</Stack> : null}
                    </Stack>
                )
            )}
            <Box sx={{ px: { xs: 0.75, md: 1 }, pb: 0.75 }}>{children}</Box>
        </AppSurface>
    );
}
