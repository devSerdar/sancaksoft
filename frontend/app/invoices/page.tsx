"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, FileText, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePagination } from "@/hooks/usePagination";

interface Invoice {
    id: string;
    invoice_number: string;
    total_amount: string;
    customer_id: string;
    warehouse_id: string;
    created_at: string;
}

interface InvoiceDetailItem {
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: string;
    total: string;
}

interface InvoiceDetail {
    id: string;
    invoice_number: string;
    total_amount: string;
    created_at: string;
    customer_name: string;
    warehouse_name: string;
    items: InvoiceDetailItem[];
}

export default function InvoicesPage() {
    const isMobile = useIsMobile();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<InvoiceDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const closedRef = useRef(false);
    const { paginatedItems, page, totalPages, setPage } = usePagination(invoices, isMobile, { mobileSize: 5 });

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                // Note: We don't have a list invoices endpoint yet, this is a placeholder
                // You'll need to add GET /invoices to the backend
                const res = await api.get<Invoice[]>("/invoices");
                setInvoices(res.data);
            } catch (error) {
                console.error("Failed to fetch invoices", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const fetchInvoiceDetail = async (invoiceId: string) => {
        closedRef.current = false;
        setDetailOpen(true);
        setLoadingDetail(true);
        setDetail(null);
        try {
            const res = await api.get<InvoiceDetail>(`/invoices/${invoiceId}`);
            if (!closedRef.current) setDetail(res.data);
        } catch (error) {
            if (!closedRef.current) alert("Fatura detayı yüklenemedi.");
            console.error("Failed to fetch invoice detail", error);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeDetail = () => {
        closedRef.current = true;
        setDetailOpen(false);
        setDetail(null);
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Yükleniyor...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Faturalar</h1>
                    <Link
                        href="/invoices/new"
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Yeni Fatura</span>
                    </Link>
                </div>
                <p className="text-sm sm:text-base text-gray-600">Fatura geçmişi ve detayları</p>
            </div>

            <Card className="shadow-sm border border-gray-200/80 overflow-hidden">
                <CardHeader className="pb-4 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Tüm Faturalar</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {invoices.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 text-gray-500 px-4">
                            <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm sm:text-base font-medium">Henüz fatura bulunmuyor</p>
                            <Link
                                href="/invoices/new"
                                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                İlk faturanızı oluşturun
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Mobil: Kart listesi */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedItems.map((inv) => (
                                    <button
                                        key={inv.id}
                                        type="button"
                                        onClick={() => fetchInvoiceDetail(inv.id)}
                                        className="w-full text-left px-4 py-4 hover:bg-gray-50/50 active:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-gray-900">{inv.invoice_number}</div>
                                                <div className="text-gray-500 text-xs mt-0.5">
                                                    {new Date(inv.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                                </div>
                                            </div>
                                            <div className="shrink-0 font-semibold text-gray-900 tabular-nums">
                                                ₺{parseFloat(inv.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Desktop: Tablo */}
                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fatura No</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Toplam Tutar</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((inv) => (
                                            <tr
                                                key={inv.id}
                                                className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                                onClick={() => fetchInvoiceDetail(inv.id)}
                                            >
                                                <td className="py-3.5 px-4 font-semibold text-gray-900">{inv.invoice_number}</td>
                                                <td className="py-3.5 px-4 text-right font-semibold text-gray-900 tabular-nums">₺{parseFloat(inv.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="py-3.5 px-4 text-gray-600 text-sm">{new Date(inv.created_at).toLocaleDateString("tr-TR")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Fatura Detay Popup */}
            {detailOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50"
                    onClick={() => closeDetail()}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:py-4 border-b border-gray-200 shrink-0">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate min-w-0">
                                {loadingDetail ? "Yükleniyor..." : `Fatura: ${detail?.invoice_number}`}
                            </h2>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                                aria-label="Kapat"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="flex-1 flex items-center justify-center py-12">
                                <div className="text-gray-500">Yükleniyor...</div>
                            </div>
                        ) : detail ? (
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div className="min-w-0">
                                        <span className="text-gray-500 block text-xs">Müşteri</span>
                                        <p className="font-medium text-gray-900 truncate">{detail.customer_name || "-"}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-gray-500 block text-xs">Depo</span>
                                        <p className="font-medium text-gray-900 truncate">{detail.warehouse_name || "-"}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-gray-500 block text-xs">Tarih</span>
                                        <p className="font-medium text-gray-900">
                                            {new Date(detail.created_at).toLocaleString("tr-TR")}
                                        </p>
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Satılan Ürünler</h3>
                                    {/* Mobil: Kart layout - sayılar geniş alanda */}
                                    <div className="sm:hidden space-y-2">
                                        {detail.items.map((item, i) => (
                                            <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                                <div className="font-medium text-gray-900">{item.product_name}</div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                    <span className="text-gray-600">
                                                        {item.quantity} {item.unit} × ₺{parseFloat(item.unit_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="font-semibold text-gray-900 tabular-nums">
                                                        = ₺{parseFloat(item.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Desktop: Tablo - yatay kaydırma */}
                                    <div className="hidden sm:block overflow-x-auto touch-scroll rounded-lg border border-gray-200">
                                        <table className="w-full text-sm min-w-[480px]">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="text-left py-2 px-3 font-medium text-gray-600">Ürün</th>
                                                    <th className="text-right py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Miktar</th>
                                                    <th className="text-right py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Birim Fiyat</th>
                                                    <th className="text-right py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Toplam</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detail.items.map((item, i) => (
                                                    <tr key={i} className="border-t border-gray-100">
                                                        <td className="py-2 px-3 text-gray-900 max-w-[200px] truncate">{item.product_name}</td>
                                                        <td className="py-2 px-3 text-right whitespace-nowrap">{item.quantity} {item.unit}</td>
                                                        <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                                                            ₺{parseFloat(item.unit_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-medium tabular-nums whitespace-nowrap">
                                                            ₺{parseFloat(item.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="pt-3 border-t-2 border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <span className="font-semibold text-gray-700">Genel Toplam</span>
                                    <span className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums break-all sm:break-normal">
                                        ₺{parseFloat(detail.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
