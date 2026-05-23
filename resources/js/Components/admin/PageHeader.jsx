import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link } from '@inertiajs/react';

export default function PageHeader({ eyebrow, title, description, actions = null, breadcrumbs = [] }) {
    return (
        <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { lg: 'flex-end' }, justifyContent: 'space-between', mb: 0.25 }}
        >
            <Box sx={{ minWidth: 0 }}>
                {eyebrow ? (
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
                        {eyebrow}
                    </Typography>
                ) : null}

                {breadcrumbs.length > 0 ? (
                    <Breadcrumbs sx={{ mb: 0.9 }} separator="•">
                        {breadcrumbs.map((item, index) =>
                            item.href ? (
                                <MuiLink
                                    key={`${item.label}-${index}`}
                                    component={Link}
                                    href={item.href}
                                    underline="hover"
                                    color="text.secondary"
                                    sx={{ fontSize: '0.8rem', fontWeight: 600 }}
                                >
                                    {item.label}
                                </MuiLink>
                            ) : (
                                <Typography key={`${item.label}-${index}`} sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                    {item.label}
                                </Typography>
                            ),
                        )}
                    </Breadcrumbs>
                ) : null}

                <Typography variant="h4" sx={{ fontWeight: 820, mb: 0.5 }}>
                    {title}
                </Typography>
                {description ? (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                        {description}
                    </Typography>
                ) : null}
            </Box>

            {actions ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ width: { xs: '100%', lg: 'auto' } }}>
                    {actions}
                </Stack>
            ) : null}
        </Stack>
    );
}
