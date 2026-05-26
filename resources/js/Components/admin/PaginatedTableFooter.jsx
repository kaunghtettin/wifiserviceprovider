import { router } from '@inertiajs/react';
import { Box, TablePagination } from '@mui/material';

const cleanParams = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

export default function PaginatedTableFooter({
    pagination,
    baseUrl,
    filters = {},
    pageParam = 'page',
    perPageParam = 'per_page',
}) {
    const total = Number(pagination?.total || 0);
    const currentPage = Math.max(Number(pagination?.current_page || 1), 1);
    const perPage = Math.max(Number(pagination?.per_page || filters?.[perPageParam] || 15), 1);

    if (!total) {
        return null;
    }

    const navigate = (page, nextPerPage = perPage) => {
        router.get(
            baseUrl,
            cleanParams({
                ...filters,
                [pageParam]: page > 1 ? page : undefined,
                [perPageParam]: nextPerPage,
            }),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}>
            <TablePagination
                component="div"
                count={total}
                page={Math.max(currentPage - 1, 0)}
                onPageChange={(_, nextPage) => navigate(nextPage + 1)}
                rowsPerPage={perPage}
                onRowsPerPageChange={(event) => navigate(1, Number(event.target.value))}
                rowsPerPageOptions={[10, 15, 25, 50, 100]}
                labelRowsPerPage="Rows per page"
            />
        </Box>
    );
}
