"use client";

import { useMemo, useState, useEffect } from "react";

export interface PaginationOptions {
    mobileSize?: number;
    desktopSize?: number;
}

const DEFAULT_MOBILE = 3;
const DEFAULT_DESKTOP = 15;

export function usePagination<T>(items: T[], isMobile: boolean, options?: PaginationOptions) {
    const mobileSize = options?.mobileSize ?? DEFAULT_MOBILE;
    const desktopSize = options?.desktopSize ?? DEFAULT_DESKTOP;
    const itemsPerPage = isMobile ? mobileSize : desktopSize;
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    const [page, setPage] = useState(1);

    // Reset to page 1 when items or itemsPerPage changes
    useEffect(() => {
        setPage(1);
    }, [items.length, itemsPerPage]);

    const paginatedItems = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }, [items, page, itemsPerPage]);

    const goToPage = (p: number) => {
        setPage(Math.max(1, Math.min(p, totalPages)));
    };

    return {
        paginatedItems,
        page,
        totalPages,
        itemsPerPage,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        setPage: goToPage,
        nextPage: () => goToPage(page + 1),
        prevPage: () => goToPage(page - 1),
    };
}
