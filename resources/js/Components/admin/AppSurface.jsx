import { Box, Paper } from '@mui/material';

export default function AppSurface({ children, sx = {}, contentSx = {}, ...props }) {
    return (
        <Paper
            {...props}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '10px',
                ...sx,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 24%), radial-gradient(circle at bottom left, rgba(139,92,246,0.06), transparent 22%)',
                }}
            />
            <Box sx={{ position: 'relative', ...contentSx }}>{children}</Box>
        </Paper>
    );
}
