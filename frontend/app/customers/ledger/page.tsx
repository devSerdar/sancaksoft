"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, CustomerLedgerEntry } from "@/types";
import { BarChart3 } from "lucide-react";

type Period = "day" | "week" | "month";

function CustomerLedgerContent() {
    const searchParams = useSearchParams();
    const initialCustomerId = searchParams.get("customer_id") || "";

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
    const [period, setPeriod] = useState<Period>("day");
    const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLedger, setLoadingLedger] = useState(false);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === selectedCustomerId),
        [customers, selectedCustomerId]
    );

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await api.get<Customer[]>("/customers");
                setCustomers(res.data);
            } catch (error) {
                console.error("Failed to fetch customers", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    useEffect(() => {
        const fetchLedger = async () => {
            if (!selectedCustomerId) {
                setEntries([]);
                return;
            }
            setLoadingLedger(true);
            try {
                const res = await api.get<CustomerLedgerEntry[]>(
                    `/customers/${selectedCustomerId}/ledger?period=${period}`
                );
                setEntries(res.data);
            } catch (error: any) {
                setEntries([]);
                alert(`Cari detay getirilemedi: ${error.response?.data?.error || error.message}`);
            } finally {
                setLoadingLedger(false);
            }
        };
        fetchLedger();
    }, [selectedCustomerId, period]);

    if (loading) {
        return (
            <div className="p-4 sm:p-8">
                <div className="flex items-center justify-center h-48">
                    <span className="text-gray-500">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Cari Detay</h1>
                <p className="text-sm text-gray-600">Müşteri bazlı günlük/haftalık/aylık hareket özetleri</p>
            </div>

            <Card className="mb-6 shadow-sm border border-gray-200 overflow-hidden">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Filtreler</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Müşteri</label>
                        <select
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            className="w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[44px]"
                        >
                            <option value="">Müşteri seçin</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Periyot</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setPeriod("day")}
                                className={`flex-1 sm:flex-none min-w-[80px] px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                                    period === "day"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Günlük
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriod("week")}
                                className={`flex-1 sm:flex-none min-w-[80px] px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                                    period === "week"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Haftalık
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriod("month")}
                                className={`flex-1 sm:flex-none min-w-[80px] px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                                    period === "month"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Aylık
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200 overflow-hidden">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b border-gray-100">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                        {selectedCustomer ? `${selectedCustomer.name} — Cari Özeti` : "Cari Özeti"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingLedger ? (
                        <div className="py-12 text-center text-gray-500">Yükleniyor...</div>
                    ) : !selectedCustomerId ? (
                        <div className="py-12 text-center text-gray-500 px-4">
                            <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Lütfen önce bir müşteri seçin.</p>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 px-4">
                            <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Bu periyotta hareket bulunmuyor.</p>
                        </div>
                    ) : (
                        <>
                            <div className="sm:hidden divide-y divide-gray-100">
                                {entries.map((entry) => (
                                    <div key={entry.period_start} className="px-4 py-3">
                                        <div className="font-medium text-gray-900 mb-2">
                                            {new Date(entry.period_start).toLocaleDateString("tr-TR", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}
                                        </div>
                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Satış</span>
                                                <span className="font-medium text-gray-800 tabular-nums">
                                                    ₺{Number(entry.sales_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">İade</span>
                                                <span className="font-medium text-orange-600 tabular-nums">
                                                    ₺{Number(entry.return_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between pt-1.5 border-t border-gray-100">
                                                <span className="text-gray-500">Net</span>
                                                <span
                                                    className={`font-semibold tabular-nums ${
                                                        Number(entry.net_amount) >= 0 ? "text-green-600" : "text-red-600"
                                                    }`}
                                                >
                                                    ₺{Number(entry.net_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tarih / Periyot</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Satış</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">İade</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((entry) => (
                                            <tr key={entry.period_start} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="py-3.5 px-4 font-medium text-gray-900">
                                                    {new Date(entry.period_start).toLocaleDateString("tr-TR")}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-gray-800 tabular-nums">
                                                    ₺{Number(entry.sales_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-orange-600 tabular-nums">
                                                    ₺{Number(entry.return_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </td>
                                                <td
                                                    className={`py-3.5 px-4 text-right font-semibold tabular-nums ${
                                                        Number(entry.net_amount) >= 0 ? "text-green-600" : "text-red-600"
                                                    }`}
                                                >
                                                    ₺{Number(entry.net_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function CustomerLedgerPage() {
    return (
        <Suspense fallback={
            <div className="p-4 sm:p-8">
                <div className="flex items-center justify-center h-48">
                    <span className="text-gray-500">Yükleniyor...</span>
                </div>
            </div>
        }>
            <CustomerLedgerContent />
        </Suspense>
    );
}
