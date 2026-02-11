"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Customer } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePagination } from "@/hooks/usePagination";

export default function CustomersPage() {
    const isMobile = useIsMobile();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
    const { paginatedItems, page, totalPages, setPage } = usePagination(customers, isMobile);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get<Customer[]>("/customers");
            setCustomers(res.data);
        } catch (error) {
            console.error("Failed to fetch customers", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/customers", formData);
            setShowForm(false);
            setFormData({ name: "", email: "", phone: "", address: "" });
            fetchCustomers();
        } catch (error: any) {
            alert(`Müşteri oluşturulamadı: ${error.response?.data?.error || error.message}`);
        }
    };

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Müşteriler</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Yeni Müşteri</span>
                    </button>
                </div>
                <p className="text-sm sm:text-base text-gray-600">Müşteri bilgilerini yönetin</p>
            </div>

            {showForm && (
                <Card className="mb-6 shadow-md border-l-4 border-l-blue-500">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800">Yeni Müşteri Ekle</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri Adı <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Örn: Ahmet Yılmaz"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                                <input
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                                <input
                                    type="text"
                                    placeholder="0555 123 45 67"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                                <textarea
                                    placeholder="Adres bilgisi"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    rows={3}
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
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Müşteri Listesi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {customers.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 text-gray-500 px-4">
                            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm sm:text-base font-medium">Henüz müşteri bulunmuyor</p>
                            <p className="text-xs sm:text-sm mt-1">İlk müşterinizi eklemek için yukarıdaki butona tıklayın</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobil: Kart listesi */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedItems.map((c) => (
                                    <div key={c.id} className="px-4 py-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="font-semibold text-gray-900">{c.name}</div>
                                        {c.email && <div className="text-gray-500 text-sm mt-0.5 truncate">{c.email}</div>}
                                        {c.phone && <div className="text-gray-500 text-sm truncate">{c.phone}</div>}
                                        {c.address && <div className="text-gray-400 text-xs mt-1 line-clamp-2">{c.address}</div>}
                                        <Link
                                            href={`/customers/ledger?customer_id=${c.id}`}
                                            className="mt-3 inline-flex items-center justify-center w-full px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition"
                                        >
                                            Cari Detay
                                        </Link>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: Tablo */}
                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ad</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">E-posta</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Telefon</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Adres</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cari</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((c) => (
                                            <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="py-3.5 px-4 font-medium text-gray-900">{c.name}</td>
                                                <td className="py-3.5 px-4 text-gray-600 text-sm">{c.email || '-'}</td>
                                                <td className="py-3.5 px-4 text-gray-600 text-sm">{c.phone || '-'}</td>
                                                <td className="py-3.5 px-4 text-gray-600 text-sm max-w-[200px] truncate">{c.address || '-'}</td>
                                                <td className="py-3.5 px-4">
                                                    <Link
                                                        href={`/customers/ledger?customer_id=${c.id}`}
                                                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition"
                                                    >
                                                        Detay
                                                    </Link>
                                                </td>
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
