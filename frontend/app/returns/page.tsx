"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { Customer, Product, Warehouse, CustomerReturn, CustomerPurchaseSummary } from "@/types";
import { RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePagination } from "@/hooks/usePagination";

export default function ReturnsPage() {
    const isMobile = useIsMobile();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [returns, setReturns] = useState<CustomerReturn[]>([]);
    const [purchases, setPurchases] = useState<CustomerPurchaseSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: "",
        purchase_key: "",
        quantity: "1",
        unit_price: "0",
        reason: "",
    });

    const selectedProduct = useMemo(
        () => {
            const [productId] = formData.purchase_key.split("|");
            return products.find((p) => p.id === productId);
        },
        [products, formData.purchase_key]
    );
    const selectedPurchase = useMemo(
        () => purchases.find((p) => `${p.product_id}|${p.warehouse_id}` === formData.purchase_key),
        [purchases, formData.purchase_key]
    );
    const lineTotal = useMemo(
        () => (Number(formData.quantity || 0) * Number(formData.unit_price || 0)).toFixed(2),
        [formData.quantity, formData.unit_price]
    );
    const { paginatedItems: paginatedReturns, page, totalPages, setPage } = usePagination(returns, isMobile);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [custRes, prodRes, whRes, retRes] = await Promise.allSettled([
                    api.get<Customer[]>("/customers"),
                    api.get<Product[]>("/products"),
                    api.get<Warehouse[]>("/warehouses"),
                    api.get<CustomerReturn[]>("/returns"),
                ]);

                if (custRes.status === "fulfilled") {
                    setCustomers(custRes.value.data);
                } else {
                    console.error("Failed to fetch customers", custRes.reason);
                }

                if (prodRes.status === "fulfilled") {
                    setProducts(prodRes.value.data);
                } else {
                    console.error("Failed to fetch products", prodRes.reason);
                }

                if (whRes.status === "fulfilled") {
                    setWarehouses(whRes.value.data);
                } else {
                    console.error("Failed to fetch warehouses", whRes.reason);
                }

                if (retRes.status === "fulfilled") {
                    setReturns(retRes.value.data);
                } else {
                    console.error("Failed to fetch returns", retRes.reason);
                }
            } catch (error) {
                console.error("Failed to fetch returns page data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const fetchCustomerPurchases = async (customerId: string) => {
        if (!customerId) {
            setPurchases([]);
            setFormData((prev) => ({ ...prev, purchase_key: "", quantity: "1", unit_price: "0" }));
            return;
        }
        setLoadingPurchases(true);
        try {
            const res = await api.get<CustomerPurchaseSummary[]>(`/returns/customer-purchases/${customerId}`);
            setPurchases(res.data);
        } catch (error) {
            console.error("Failed to fetch customer purchases", error);
            const message = (error as any)?.response?.data?.error || (error as any)?.message || "Bilinmeyen hata";
            alert(`Musteri satin alimlari yuklenemedi: ${message}`);
            setPurchases([]);
        } finally {
            setLoadingPurchases(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customer_id || !formData.purchase_key) {
            alert("Lutfen musteri ve satin alinan urunu secin.");
            return;
        }
        if (!selectedPurchase) {
            alert("Gecerli bir satin alinan urun secin.");
            return;
        }
        if (Number(formData.quantity) > selectedPurchase.returnable_qty) {
            alert(`Iade miktari en fazla ${selectedPurchase.returnable_qty} ${selectedPurchase.product_unit} olabilir.`);
            return;
        }

        const [productId, warehouseId] = formData.purchase_key.split("|");
        setSaving(true);
        try {
            await api.post("/returns", {
                customer_id: formData.customer_id,
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: Number(formData.quantity),
                unit_price: Number(formData.unit_price),
                reason: formData.reason,
            });
            const retRes = await api.get<CustomerReturn[]>("/returns");
            setReturns(retRes.data);
            await fetchCustomerPurchases(formData.customer_id);
            setFormData({
                customer_id: "",
                purchase_key: "",
                quantity: "1",
                unit_price: "0",
                reason: "",
            });
            alert("Iade kaydi olusturuldu. Stok geri eklendi.");
        } catch (error: any) {
            alert(`Iade olusturulamadi: ${error.response?.data?.error || error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-4 sm:p-8">Yükleniyor...</div>;
    }

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">İadeler</h1>
                <p className="text-sm text-gray-600">Müşteri ürün iadelerini kaydedin ve stoku geri ekleyin.</p>
            </div>

            <Card className="mb-6 shadow-sm border border-gray-200 overflow-hidden">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Yeni İade Kaydı</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Müşteri <span className="text-red-500">*</span></label>
                            <select
                                value={formData.customer_id}
                                onChange={(e) => {
                                    const customerId = e.target.value;
                                    setFormData({
                                        ...formData,
                                        customer_id: customerId,
                                        purchase_key: "",
                                        quantity: "1",
                                        unit_price: "0",
                                    });
                                    fetchCustomerPurchases(customerId);
                                }}
                                className="w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none min-h-[44px]"
                                required
                            >
                                <option value="">Müşteri seçin</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Satın Alınan Ürün <span className="text-red-500">*</span></label>
                            <select
                                value={formData.purchase_key}
                                onChange={(e) => {
                                    const key = e.target.value;
                                    const purchase = purchases.find((p) => `${p.product_id}|${p.warehouse_id}` === key);
                                    setFormData({
                                        ...formData,
                                        purchase_key: key,
                                        unit_price: purchase ? purchase.last_unit_price : formData.unit_price,
                                    });
                                }}
                                className="w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none min-h-[44px]"
                                required
                                disabled={!formData.customer_id || loadingPurchases}
                            >
                                <option value="">
                                    {loadingPurchases ? "Yükleniyor..." : "Ürün seçin"}
                                </option>
                                {purchases.map((p) => (
                                    <option key={`${p.product_id}|${p.warehouse_id}`} value={`${p.product_id}|${p.warehouse_id}`}>
                                        {p.product_name} ({p.product_unit}) — {p.warehouse_name} — İade edilebilir: {p.returnable_qty}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedPurchase && (
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Depo</label>
                                <div className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                                    {selectedPurchase.warehouse_name}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Miktar <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder={selectedProduct ? selectedProduct.unit : "Miktar"}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none min-h-[44px]"
                                    max={selectedPurchase ? selectedPurchase.returnable_qty : undefined}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Birim Fiyat <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none min-h-[44px]"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">İade Nedeni</label>
                            <input
                                type="text"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Opsiyonel"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none min-h-[44px]"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-100 rounded-lg p-4">
                            <span className="text-sm text-gray-600">Toplam iade tutarı</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                                ₺{Number(lineTotal).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition disabled:opacity-50 font-medium"
                        >
                            <RotateCcw className="h-4 w-4" />
                            {saving ? "Kaydediliyor..." : "İade Kaydet"}
                        </button>
                    </form>
                </CardContent>
            </Card>

            {formData.customer_id && (
                <Card className="mb-6 shadow-sm border border-gray-200 overflow-hidden">
                    <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b border-gray-100">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Müşterinin Satın Aldığı Ürünler</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingPurchases ? (
                            <div className="p-6 text-gray-500 text-center">Yükleniyor...</div>
                        ) : purchases.length === 0 ? (
                            <div className="p-6 text-gray-500 text-center">Bu müşteri için iade edilebilir ürün bulunmuyor.</div>
                        ) : (
                            <>
                                <div className="sm:hidden divide-y divide-gray-100">
                                    {purchases.map((p) => (
                                        <div key={`${p.product_id}|${p.warehouse_id}`} className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{p.product_name}</div>
                                            <div className="text-gray-500 text-sm">{p.warehouse_name} · {p.product_unit}</div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm">
                                                <span className="text-gray-500">Alınan: {p.purchased_qty}</span>
                                                <span className="text-gray-500">İade: {p.returned_qty}</span>
                                                <span className="font-semibold text-orange-600">Edilebilir: {p.returnable_qty}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden sm:block overflow-x-auto touch-scroll">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-y border-gray-200 bg-gray-50/80">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ürün</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depo</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Alınan</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">İade Edilen</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">İade Edilebilir</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {purchases.map((p) => (
                                                <tr key={`${p.product_id}|${p.warehouse_id}`} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                    <td className="py-3.5 px-4 font-medium text-gray-900">{p.product_name} ({p.product_unit})</td>
                                                    <td className="py-3.5 px-4 text-gray-600 text-sm">{p.warehouse_name}</td>
                                                    <td className="py-3.5 px-4 text-right text-sm">{p.purchased_qty}</td>
                                                    <td className="py-3.5 px-4 text-right text-sm">{p.returned_qty}</td>
                                                    <td className="py-3.5 px-4 text-right font-semibold text-orange-600 text-sm">{p.returnable_qty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-sm border border-gray-200 overflow-hidden">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b border-gray-100">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Son İadeler</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {returns.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 px-4">
                            <RotateCcw className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">Henüz iade kaydı yok.</p>
                        </div>
                    ) : (
                        <>
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedReturns.map((r) => {
                                    const customerName = customers.find((c) => c.id === r.customer_id)?.name || r.customer_id.slice(0, 8);
                                    const product = products.find((p) => p.id === r.product_id);
                                    return (
                                        <div key={r.id} className="px-4 py-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-gray-900 truncate">{customerName}</div>
                                                    <div className="text-gray-500 text-sm truncate">{product ? product.name : r.product_id.slice(0, 8)}</div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div className="font-semibold text-gray-900 tabular-nums">
                                                        ₺{Number(r.total).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="text-gray-500 text-xs mt-0.5">
                                                        {new Date(r.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-1.5 text-sm text-gray-600">
                                                {r.quantity} {product?.unit || "adet"}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Müşteri</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ürün</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Miktar</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Toplam</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedReturns.map((r) => {
                                            const customerName = customers.find((c) => c.id === r.customer_id)?.name || r.customer_id.slice(0, 8);
                                            const product = products.find((p) => p.id === r.product_id);
                                            return (
                                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                    <td className="py-3.5 px-4 font-medium text-gray-900">{customerName}</td>
                                                    <td className="py-3.5 px-4 text-gray-600 text-sm truncate max-w-[160px]">{product ? product.name : r.product_id.slice(0, 8)}</td>
                                                    <td className="py-3.5 px-4 text-right text-sm">{r.quantity} {product?.unit || "adet"}</td>
                                                    <td className="py-3.5 px-4 text-right font-medium text-sm tabular-nums">₺{Number(r.total).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="py-3.5 px-4 text-gray-600 text-sm">{new Date(r.created_at).toLocaleString("tr-TR")}</td>
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
