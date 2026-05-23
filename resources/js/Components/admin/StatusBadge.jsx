import { Chip } from '@mui/material';
import { getStatusTone } from '@/theme/adminTheme';

export default function StatusBadge({ status, label, sx = {} }) {
    const tone = getStatusTone(status || label);

    return (
        <Chip
            size="small"
            label={label || status || '-'}
            sx={{
                height: 24,
                color: tone.color,
                backgroundColor: tone.background,
                border: '1px solid rgba(255,255,255,0.08)',
                textTransform: 'capitalize',
                '& .MuiChip-label': {
                    px: 1,
                },
                ...sx,
            }}
        />
    );
}
