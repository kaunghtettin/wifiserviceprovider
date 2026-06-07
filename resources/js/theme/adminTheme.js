import { alpha, createTheme } from '@mui/material/styles';

const getPalette = (mode) => {
    const dark = mode === 'dark';

    return {
        mode,
        primary: {
            main: '#3b82f6',
            light: '#60a5fa',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#8b5cf6',
            light: '#a78bfa',
            dark: '#6d28d9',
        },
        success: {
            main: '#16a34a',
            light: '#4ade80',
            dark: '#15803d',
        },
        warning: {
            main: '#d97706',
            light: '#f59e0b',
            dark: '#b45309',
        },
        error: {
            main: '#dc2626',
            light: '#f87171',
            dark: '#b91c1c',
        },
        info: {
            main: '#2563eb',
            light: '#60a5fa',
            dark: '#1d4ed8',
        },
        background: {
            default: dark ? '#09111f' : '#f5f7fb',
            paper: dark ? '#0f172a' : '#ffffff',
        },
        text: {
            primary: dark ? '#e5eefb' : '#0f172a',
            secondary: dark ? '#94a3b8' : '#64748b',
        },
        divider: dark ? alpha('#cbd5e1', 0.12) : alpha('#0f172a', 0.08),
    };
};

export const getStatusTone = (status) => {
    switch (String(status || '').toLowerCase()) {
        case 'active':
        case 'paid':
        case 'online':
        case 'enabled':
            return { color: '#166534', background: 'rgba(34, 197, 94, 0.14)' };
        case 'pending':
        case 'partial':
        case 'warning':
            return { color: '#b45309', background: 'rgba(245, 158, 11, 0.16)' };
        case 'overdue':
        case 'suspended':
        case 'disabled':
        case 'unpaid':
        case 'offline':
            return { color: '#b91c1c', background: 'rgba(239, 68, 68, 0.14)' };
        default:
            return { color: '#475569', background: 'rgba(148, 163, 184, 0.14)' };
    }
};

export const getAdminTheme = (mode = 'light') =>
    createTheme({
        palette: getPalette(mode),
        shape: {
            borderRadius: 10,
        },
        spacing: 8,
        typography: {
            fontFamily: ['Inter', 'Roboto', '"Segoe UI"', 'Arial', 'sans-serif'].join(','),
            h1: { fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.04em' },
            h2: { fontSize: '2.125rem', fontWeight: 800, letterSpacing: '-0.03em' },
            h3: { fontSize: '1.75rem', fontWeight: 780, letterSpacing: '-0.025em' },
            h4: { fontSize: '1.3rem', fontWeight: 760, letterSpacing: '-0.02em' },
            h5: { fontSize: '1.05rem', fontWeight: 760, letterSpacing: '-0.015em' },
            h6: { fontSize: '1rem', fontWeight: 740, letterSpacing: '-0.01em' },
            subtitle1: { fontSize: '0.95rem', fontWeight: 650 },
            subtitle2: { fontSize: '0.875rem', fontWeight: 650 },
            body1: { fontSize: '0.925rem', lineHeight: 1.55 },
            body2: { fontSize: '0.85rem', lineHeight: 1.5 },
            button: { fontSize: '0.875rem', fontWeight: 700, textTransform: 'none' },
            caption: { fontSize: '0.75rem', fontWeight: 600 },
            overline: { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
        },
        shadows: [
            'none',
            '0 1px 2px rgba(15, 23, 42, 0.03)',
            '0 4px 12px rgba(15, 23, 42, 0.05)',
            '0 12px 24px rgba(15, 23, 42, 0.06)',
            '0 18px 36px rgba(15, 23, 42, 0.08)',
            '0 24px 48px rgba(15, 23, 42, 0.10)',
            ...Array(19).fill('0 24px 48px rgba(15, 23, 42, 0.10)'),
        ],
        components: {
            MuiCssBaseline: {
                styleOverrides: (theme) => ({
                    html: {
                        scrollbarWidth: 'thin',
                        scrollbarColor: `${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.5 : 0.34)} transparent`,
                    },
                    body: {
                        backgroundImage:
                            theme.palette.mode === 'dark'
                                ? 'radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 28%), radial-gradient(circle at top right, rgba(139,92,246,0.10), transparent 24%)'
                                : 'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%), radial-gradient(circle at top right, rgba(139,92,246,0.06), transparent 24%)',
                        backgroundAttachment: 'fixed',
                        scrollbarWidth: 'thin',
                        scrollbarColor: `${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.5 : 0.34)} transparent`,
                    },
                    '*': {
                        boxSizing: 'border-box',
                    },
                    '*::-webkit-scrollbar': {
                        width: 10,
                        height: 10,
                    },
                    '*::-webkit-scrollbar-track': {
                        background: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                        borderRadius: 999,
                    },
                    '*::-webkit-scrollbar-thumb': {
                        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.72 : 0.5)}, ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.56 : 0.36)})`,
                        borderRadius: 999,
                        border: `2px solid ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.9 : 0.96)}`,
                    },
                    '*::-webkit-scrollbar-thumb:hover': {
                        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, theme.palette.mode === 'dark' ? 0.86 : 0.68)}, ${alpha(theme.palette.secondary.light, theme.palette.mode === 'dark' ? 0.72 : 0.52)})`,
                    },
                    '*::-webkit-scrollbar-corner': {
                        background: 'transparent',
                    },
                    '::selection': {
                        background: alpha(theme.palette.primary.main, 0.18),
                    },
                }),
            },
            MuiPaper: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: 14,
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundImage: 'none',
                        backgroundColor:
                            theme.palette.mode === 'dark' ? alpha('#0f172a', 0.88) : alpha('#ffffff', 0.94),
                        backdropFilter: 'blur(18px)',
                        boxShadow:
                            theme.palette.mode === 'dark'
                                ? '0 14px 32px rgba(2, 6, 23, 0.28)'
                                : '0 14px 30px rgba(15, 23, 42, 0.05)',
                    }),
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: 16,
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor:
                            theme.palette.mode === 'dark' ? alpha('#0f172a', 0.9) : alpha('#ffffff', 0.95),
                        boxShadow:
                            theme.palette.mode === 'dark'
                                ? '0 16px 32px rgba(2, 6, 23, 0.28)'
                                : '0 12px 28px rgba(15, 23, 42, 0.06)',
                        backgroundImage: 'none',
                    }),
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor:
                            theme.palette.mode === 'dark' ? alpha('#0f172a', 0.72) : alpha('#ffffff', 0.68),
                        backdropFilter: 'blur(18px)',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        boxShadow: 'none',
                        color: theme.palette.text.primary,
                    }),
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: ({ theme }) => ({
                        backgroundColor:
                            theme.palette.mode === 'dark' ? alpha('#08101e', 0.92) : alpha('#ffffff', 0.76),
                        backgroundImage: 'none',
                        backdropFilter: 'blur(18px)',
                    }),
                },
            },
            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                    size: 'small',
                },
                styleOverrides: {
                    root: {
                        minHeight: 32,
                        borderRadius: 10,
                        paddingInline: 12,
                    },
                    containedPrimary: ({ theme }) => ({
                        boxShadow:
                            theme.palette.mode === 'dark'
                                ? '0 10px 24px rgba(29, 78, 216, 0.35)'
                                : '0 12px 24px rgba(59, 130, 246, 0.18)',
                    }),
                    outlined: ({ theme }) => ({
                        borderColor: alpha(theme.palette.text.primary, 0.08),
                        backgroundColor: alpha(theme.palette.background.paper, 0.48),
                    }),
                    text: ({ theme }) => ({
                        color: theme.palette.text.secondary,
                    }),
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: 10,
                        transition: 'all 180ms ease',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            transform: 'translateY(-1px)',
                        },
                    }),
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: 12,
                        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.38 : 0.7),
                        color: theme.palette.text.primary,
                        transition: 'all 180ms ease',
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha(theme.palette.text.primary, 0.09),
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha(theme.palette.primary.main, 0.26),
                        },
                        '&.Mui-focused': {
                            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
                        },
                        '&.Mui-disabled': {
                            backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.035),
                        },
                    }),
                    input: ({ theme }) => ({
                        paddingTop: 11,
                        paddingBottom: 11,
                        color: theme.palette.text.primary,
                        WebkitTextFillColor: theme.palette.text.primary,
                        caretColor: theme.palette.primary.main,
                        '&::placeholder': {
                            color: theme.palette.text.secondary,
                            opacity: 0.72,
                        },
                        '&:-webkit-autofill': {
                            WebkitTextFillColor: theme.palette.text.primary,
                            WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
                            caretColor: theme.palette.text.primary,
                            borderRadius: 'inherit',
                        },
                        '&.Mui-disabled': {
                            color: theme.palette.text.secondary,
                            WebkitTextFillColor: theme.palette.text.secondary,
                        },
                    }),
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        color: alpha(theme.palette.text.secondary, 0.92),
                        '&.Mui-focused': {
                            color: theme.palette.primary.main,
                        },
                        '&.Mui-error': {
                            color: theme.palette.error.main,
                        },
                        '&.Mui-disabled': {
                            color: alpha(theme.palette.text.secondary, 0.68),
                        },
                    }),
                },
            },
            MuiFormHelperText: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        marginTop: 5,
                        marginLeft: 4,
                        marginRight: 4,
                        color: theme.palette.text.secondary,
                        lineHeight: 1.35,
                        '&.Mui-error': {
                            color: theme.palette.error.main,
                        },
                    }),
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: ({ theme }) => ({
                        borderRadius: 18,
                        backgroundColor:
                            theme.palette.mode === 'dark' ? alpha('#0b1220', 0.96) : alpha('#ffffff', 0.98),
                    }),
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        padding: '18px 20px 6px',
                        fontSize: '1rem',
                        fontWeight: 760,
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: '10px 20px 16px',
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        padding: '0 20px 18px',
                    },
                },
            },
            MuiTableHead: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        '& .MuiTableCell-root': {
                            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.04),
                            borderBottom: `1px solid ${theme.palette.divider}`,
                        },
                    }),
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                        paddingTop: 10,
                        paddingBottom: 10,
                        paddingLeft: 12,
                        paddingRight: 12,
                    }),
                    head: {
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                    },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        transition: 'background-color 160ms ease, transform 160ms ease',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.035),
                        },
                    }),
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: ({ theme }) => ({
                        borderRadius: 14,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow:
                            theme.palette.mode === 'dark'
                                ? '0 18px 40px rgba(2, 6, 23, 0.35)'
                                : '0 16px 38px rgba(15, 23, 42, 0.10)',
                    }),
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        gap: 10,
                        paddingTop: 10,
                        paddingBottom: 10,
                        margin: 4,
                        borderRadius: 10,
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                    }),
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                        fontWeight: 700,
                        height: 24,
                    },
                    labelSmall: {
                        paddingLeft: 8,
                        paddingRight: 8,
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: 12,
                        transition: 'all 180ms ease',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                        },
                        '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.11),
                            color: theme.palette.primary.main,
                            '& .MuiListItemIcon-root': {
                                color: theme.palette.primary.main,
                            },
                        },
                    }),
                },
            },
        },
    });

