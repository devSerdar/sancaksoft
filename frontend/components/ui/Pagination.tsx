"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const showPages: (number | "ellipsis")[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
        showPages.push(1);
        if (start > 2) showPages.push("ellipsis");
    }
    for (let i = start; i <= end; i++) showPages.push(i);
    if (end < totalPages) {
        if (end < totalPages - 1) showPages.push("ellipsis");
        showPages.push(totalPages);
    }

    return (
        <div className="flex items-center justify-center gap-1 pt-4 pb-2">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Önceki sayfa"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 mx-2">
                {showPages.map((p, i) =>
                    p === "ellipsis" ? (
                        <span key={`e-${i}`} className="px-2 text-gray-400">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${
                                page === p
                                    ? "bg-blue-600 text-white"
                                    : "border border-gray-200 hover:bg-gray-50 text-gray-700"
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
            </div>
            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Sonraki sayfa"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
