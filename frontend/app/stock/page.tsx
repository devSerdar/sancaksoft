"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { StockMovement, Product, Warehouse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePagination } from "@/hooks/usePagination";

function getTypeLabel(type: string) {
    if (type === "IN") return "GİRİŞ";
    if (type === "SALE") return "SATIŞ";
    if (type === "OUT") return "ÇIKIŞ";
    if (type === "TRANSFER") return "TRANSFER";
    if (type === "ADJUSTMENT") return "DÜZELTME";
    return type;
}

function getTypeStyles(type: string) {
    if (type === "IN") return "bg-green-100 text-green-800";
    if (type === "SALE") return "bg-red-100 text-red-800";
    if (type === "OUT") return "bg-orange-100 text-orange-800";
    if (type === "TRANSFER") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
}

export default function StockPage() {
    const isMobile = useIsMobile();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [movRes, prodRes, whRes] = await Promise.all([
                    api.get<StockMovement[]>("/stock-movements"),
                    api.get<Product[]>("/products"),
                    api.get<Warehouse[]>("/warehouses"),
                ]);
                setMovements(movRes.data);
                setProducts(prodRes.data);
                setWarehouses(whRes.data);
            } catch (error) {
                console.error("Failed to fetch stock movements", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const productMap = useMemo(() => {
        const m: Record<string, string> = {};
        products.forEach((p) => { m[p.id] = p.name; });
        return m;
    }, [products]);

    const warehouseMap = useMemo(() => {
        const m: Record<string, string> = {};
        warehouses.forEach((w) => { m[w.id] = w.name; });
        return m;
    }, [warehouses]);
    const { paginatedItems, page, totalPages, setPage } = usePagination(movements, isMobile, { mobileSize: 4 });

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
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Stok Hareketleri</h1>
                <p className="text-sm text-gray-600">Tüm stok giriş ve çıkış işlemleri</p>
            </div>

            <Card className="shadow-sm border border-gray-200 overflow-hidden">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b border-gray-100">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Tüm Hareketler</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {movements.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 px-4">
                            <TrendingUp className="h-12 w-12 sm:h-14 sm:w-14 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm sm:text-base font-medium text-gray-600 mb-1">Henüz stok hareketi bulunmuyor</p>
                            <p className="text-xs sm:text-sm text-gray-500">Stok eklediğinizde veya fatura oluşturduğunuzda hareketler burada görünecek</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobil: Kart listesi */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedItems.map((m) => {
                                    const productName = productMap[m.product_id] || `${m.product_id.substring(0, 8)}...`;
                                    const warehouseName = warehouseMap[m.warehouse_id] || `${m.warehouse_id.substring(0, 8)}...`;
                                    return (
                                        <div
                                            key={m.id}
                                            className="px-4 py-3 active:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${m.quantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                    {m.quantity > 0 ? (
                                                        <ArrowUpRight className="h-5 w-5" />
                                                    ) : (
                                                        <ArrowDownRight className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-900 truncate">{productName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{warehouseName}</p>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${getTypeStyles(m.type)}`}>
                                                            {getTypeLabel(m.type)}
                                                        </span>
                                                        <span className={`text-sm font-semibold tabular-nums ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                                                            {m.quantity > 0 ? "+" : ""}{m.quantity}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(m.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop: Tablo */}
                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ürün</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depo</th>
                                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Miktar</th>
                                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tip</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Referans</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((m) => {
                                            const productName = productMap[m.product_id] || `${m.product_id.substring(0, 8)}...`;
                                            const warehouseName = warehouseMap[m.warehouse_id] || `${m.warehouse_id.substring(0, 8)}...`;
                                            return (
                                                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-3.5 px-4 font-medium text-gray-900 truncate max-w-[180px]">{productName}</td>
                                                    <td className="py-3.5 px-4 text-gray-600 text-sm truncate max-w-[120px]">{warehouseName}</td>
                                                    <td className={`py-3.5 px-4 text-center font-semibold tabular-nums text-sm ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                                                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeStyles(m.type)}`}>
                                                            {getTypeLabel(m.type)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-gray-600 hidden md:table-cell">
                                                        {m.reference_type || "—"}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-gray-600">
                                                        {new Date(m.created_at).toLocaleString("tr-TR")}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
