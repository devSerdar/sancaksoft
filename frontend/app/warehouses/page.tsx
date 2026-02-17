"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Warehouse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePagination } from "@/hooks/usePagination";

export default function WarehousesPage() {
    const isMobile = useIsMobile();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", location: "" });
    const { paginatedItems, page, totalPages, setPage } = usePagination(warehouses, isMobile);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get<Warehouse[]>("/warehouses");
            setWarehouses(res.data);
        } catch (error) {
            console.error("Failed to fetch warehouses", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/warehouses", formData);
            setShowForm(false);
            setFormData({ name: "", location: "" });
            fetchWarehouses();
        } catch (error: any) {
            alert(`Depo oluşturulamadı: ${error.response?.data?.error || error.message}`);
        }
    };

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Depolar</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Yeni Depo</span>
                    </button>
                </div>
                <p className="text-sm sm:text-base text-gray-600">Depo bilgilerini yönetin</p>
            </div>

            {showForm && (
                <Card className="mb-6 shadow-md border-l-4 border-l-blue-500">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800">Yeni Depo Ekle</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Depo Adı <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Örn: Ana Depo"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Konum</label>
                                <input
                                    type="text"
                                    placeholder="Örn: İstanbul, Türkiye"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                                >
                                    İptal
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition">
                                    Oluştur
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-sm border border-gray-200/80 overflow-hidden">
                <CardHeader className="pb-4 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Depo Listesi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {warehouses.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 text-gray-500 px-4">
                            <WarehouseIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm sm:text-base font-medium">Henüz depo bulunmuyor</p>
                            <p className="text-xs sm:text-sm mt-1">İlk deponuzu eklemek için yukarıdaki butona tıklayın</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobil: Kart listesi */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedItems.map((w) => (
                                    <div key={w.id} className="px-4 py-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="font-semibold text-gray-900">{w.name}</div>
                                        {w.location && <div className="text-gray-500 text-sm mt-0.5">{w.location}</div>}
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: Tablo */}
                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depo Adı</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Konum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((w) => (
                                            <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="py-3.5 px-4 font-medium text-gray-900">{w.name}</td>
                                                <td className="py-3.5 px-4 text-gray-600 text-sm">{w.location || '-'}</td>
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
        </div>
    );
}
