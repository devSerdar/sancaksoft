"use client";

import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { DashboardStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Package, AlertTriangle, Banknote, Receipt } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get<DashboardStats>("/dashboard/stats");
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-8">
                <div className="flex items-center justify-center min-h-[12rem] sm:h-64">
                    <div className="text-gray-500">Yükleniyor...</div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-4 sm:p-8">
                <div className="text-red-500">Veriler yüklenemedi.</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">Ana Sayfa</h1>
                <p className="text-sm sm:text-base text-gray-600">Sistem özet bilgileri ve istatistikler</p>
            </div>

            {/* İstatistik Kartları - Mobil: 2x2, Desktop: 4 sütun */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <Card className="border-l-4 border-l-blue-500 overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 pb-0">
                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                            <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                            <span className="truncate">Toplam Gelir</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-1">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                            ₺{parseFloat(stats.total_revenue).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 pb-0">
                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                            <span className="truncate">Toplam Fatura</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-1">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                            {stats.total_invoices.toLocaleString("tr-TR")}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 pb-0">
                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 shrink-0" />
                            <span className="truncate">Toplam Ürün</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-1">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                            {stats.total_products.toLocaleString("tr-TR")}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 pb-0">
                        <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
                            <span className="truncate">Düşük Stok</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-1">
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                            {stats.low_stock_count.toLocaleString("tr-TR")}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">10 adetten az</p>
                    </CardContent>
                </Card>
            </div>

            {/* Son Faturalar - Mobil öncelikli tasarım */}
            <Card className="shadow-sm border border-gray-200/80 overflow-hidden">
                <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Son Faturalar</h2>
                        <Link
                            href="/invoices"
                            className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700 active:opacity-80"
                        >
                            Tümünü Gör
                        </Link>
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {stats.recent_invoices && stats.recent_invoices.length > 0 ? (
                        stats.recent_invoices.slice(0, isMobile ? 3 : 15).map((invoice) => (
                            <button
                                key={invoice.id}
                                type="button"
                                className="w-full text-left px-4 py-4 sm:px-6 sm:py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[72px] flex items-center justify-between gap-3"
                                onClick={() => router.push("/invoices")}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                        {invoice.invoice_number}
                                    </div>
                                    <div className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">
                                        {invoice.customer_name}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-semibold text-gray-900 text-sm sm:text-base tabular-nums">
                                        ₺{parseFloat(invoice.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-gray-400 text-xs mt-0.5">
                                        {new Date(invoice.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-10 px-4 sm:py-12">
                            <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 text-sm sm:text-base">Henüz fatura bulunmuyor</p>
                            <Link
                                href="/invoices/new"
                                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                İlk faturanızı oluşturun
                            </Link>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
