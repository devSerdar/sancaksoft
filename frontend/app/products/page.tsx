"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "@/services/api";
import { Product, Warehouse, WarehouseStock } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Package, Minus, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePagination } from "@/hooks/usePagination";

interface ProductWithStock extends Product {
    warehouseStocks?: WarehouseStock[];
    totalStock?: number;
}

export default function ProductsPage() {
    const isMobile = useIsMobile();
    const [products, setProducts] = useState<ProductWithStock[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [showStockForm, setShowStockForm] = useState<string | null>(null);
    const [stockMode, setStockMode] = useState<"add" | "decrease">("add");
    const [stockPopover, setStockPopover] = useState<{ productId: string; x: number; y: number } | null>(null);
    const [formData, setFormData] = useState({ name: "", sku: "", unit: "adet", price: "", vat_rate: "18" });
    const [stockData, setStockData] = useState({ warehouse_id: "", quantity: "" });
    const [loadingStocks, setLoadingStocks] = useState<Record<string, boolean>>({});
    const { paginatedItems, page, totalPages, setPage } = usePagination(products, isMobile);

    useEffect(() => {
        fetchProducts();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (!stockPopover) return;
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-stock-popover]") && !target.closest("[data-stock-trigger]")) {
                setStockPopover(null);
            }
        };
        document.addEventListener("click", onDocClick, { capture: true });
        return () => document.removeEventListener("click", onDocClick, { capture: true });
    }, [stockPopover]);

    const fetchProducts = async () => {
        try {
            const res = await api.get<Product[]>("/products");
            const productsData = res.data;
            setProducts(productsData);
            
            // Fetch stock for each product
            productsData.forEach((product) => {
                fetchProductStock(product.id);
            });
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    const fetchProductStock = async (productId: string) => {
        setLoadingStocks(prev => ({ ...prev, [productId]: true }));
        try {
            const res = await api.get<WarehouseStock[]>(`/stock-balance-by-warehouse?product_id=${productId}`);
            const warehouseStocks = res.data || [];
            const totalStock = warehouseStocks.reduce((sum, w) => sum + w.quantity, 0);
            setProducts(prev => prev.map(p => 
                p.id === productId ? { ...p, warehouseStocks, totalStock } : p
            ));
        } catch (error) {
            console.error(`Failed to fetch stock for product ${productId}`, error);
            setProducts(prev => prev.map(p => 
                p.id === productId ? { ...p, warehouseStocks: [], totalStock: 0 } : p
            ));
        } finally {
            setLoadingStocks(prev => ({ ...prev, [productId]: false }));
        }
    };

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
            await api.post("/products", formData);
            setShowForm(false);
            setFormData({ name: "", sku: "", unit: "adet", price: "", vat_rate: "18" });
            fetchProducts();
        } catch (error: any) {
            alert(`Ürün oluşturulamadı: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleStockSubmit = async (e: React.FormEvent, productId: string) => {
        e.preventDefault();
        const type = stockMode === "add" ? "IN" : "OUT";
        try {
            await api.post("/stock-movements", {
                product_id: productId,
                warehouse_id: stockData.warehouse_id,
                quantity: Number(stockData.quantity),
                type
            });
            setShowStockForm(null);
            setStockData({ warehouse_id: "", quantity: "" });
            setStockMode("add");
            alert(stockMode === "add" ? "Stok başarıyla eklendi!" : "Stok başarıyla düşürüldü!");
            fetchProductStock(productId);
        } catch (error: any) {
            alert(error.response?.data?.error || error.response?.data?.details || `Stok işlemi başarısız: ${error.message}`);
        }
    };

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Ürünler</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4 sm:h-4 sm:w-4" />
                        <span>Yeni Ürün</span>
                    </button>
                </div>
                <p className="text-sm sm:text-base text-gray-600">Ürünlerinizi yönetin ve stok durumunu takip edin</p>
            </div>

            {showForm && (
                <Card className="mb-6 shadow-md border-l-4 border-l-blue-500">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800">Yeni Ürün Ekle</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ürün Adı <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Örn: Laptop"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">SKU <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Örn: LAP-001"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Birim</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value as "adet" | "kg" })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    >
                                        <option value="adet">Adet</option>
                                        <option value="kg">Kg</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fiyat <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">KDV Oranı (%)</label>
                                    <input
                                        type="number"
                                        placeholder="18"
                                        value={formData.vat_rate}
                                        onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        step="0.01"
                                    />
                                </div>
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
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Ürün Listesi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {products.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 text-gray-500 px-4">
                            <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm sm:text-base font-medium">Henüz ürün bulunmuyor</p>
                            <p className="text-xs sm:text-sm mt-1">İlk ürününüzü eklemek için yukarıdaki butona tıklayın</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobil: Kart listesi */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedItems.map((p) => (
                                    <div key={p.id} className="px-4 py-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex justify-between items-start gap-3 mb-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                                                <div className="text-gray-500 text-xs mt-0.5">{p.sku} · {p.unit}</div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="font-semibold text-gray-900 text-sm">
                                                    ₺{parseFloat(p.price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-gray-400 text-xs">KDV dahil: ₺{(parseFloat(p.price) * (1 + parseFloat(p.vat_rate) / 100)).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                            <button
                                                type="button"
                                                data-stock-trigger
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const x = Math.max(12, Math.min(rect.left, window.innerWidth - 232));
                                                    setStockPopover(stockPopover?.productId === p.id ? null : { productId: p.id, x, y: rect.bottom + 6 });
                                                }}
                                                className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded ${(p.totalStock ?? 0) === 0 ? "text-red-600 bg-red-50" : (p.totalStock ?? 0) < 10 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"}`}
                                            >
                                                {loadingStocks[p.id] ? "..." : `${p.totalStock ?? 0} ${p.unit}`}
                                                {(p.warehouseStocks?.filter((w) => w.quantity > 0).length ?? 0) > 0 && <Info className="h-3 w-3 shrink-0" />}
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setShowStockForm(p.id); setStockMode("add"); }}
                                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                                                >
                                                    <Package className="h-3.5 w-3.5" /> Ekle
                                                </button>
                                                <button
                                                    onClick={() => { setShowStockForm(p.id); setStockMode("decrease"); }}
                                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                                                >
                                                    <Minus className="h-3.5 w-3.5" /> Düşür
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: Tablo */}
                            <div className="hidden sm:block overflow-x-auto touch-scroll">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ürün</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">SKU</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Birim</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fiyat</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">KDV Dahil</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Stok</th>
                                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((p) => (
                                            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="py-3.5 px-4 font-medium text-gray-900">{p.name}</td>
                                                <td className="py-3.5 px-4 text-gray-600 text-sm">{p.sku}</td>
                                                <td className="py-3.5 px-4 text-gray-500 text-sm">{p.unit}</td>
                                                <td className="py-3.5 px-4 text-right text-sm font-medium">₺{parseFloat(p.price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="py-3.5 px-4 text-right text-sm font-medium">₺{(parseFloat(p.price) * (1 + parseFloat(p.vat_rate) / 100)).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="py-3.5 px-4">
                                                    {loadingStocks[p.id] ? (
                                                        <span className="text-gray-400 text-sm">...</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            data-stock-trigger
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                const x = Math.max(12, Math.min(rect.left, window.innerWidth - 232));
                                                                setStockPopover(stockPopover?.productId === p.id ? null : { productId: p.id, x, y: rect.bottom + 6 });
                                                            }}
                                                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 text-sm font-medium ${(p.totalStock ?? 0) === 0 ? "text-red-600" : (p.totalStock ?? 0) < 10 ? "text-amber-600" : "text-emerald-600"}`}
                                                        >
                                                            <span>{p.totalStock ?? 0} {p.unit}</span>
                                                            {(p.warehouseStocks?.filter((w) => w.quantity > 0).length ?? 0) > 0 && <Info className="h-3.5 w-3.5 text-gray-400" />}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="flex justify-center gap-1.5">
                                                        <button onClick={() => { setShowStockForm(p.id); setStockMode("add"); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-medium">Ekle</button>
                                                        <button onClick={() => { setShowStockForm(p.id); setStockMode("decrease"); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-xs font-medium">Düşür</button>
                                                    </div>
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

            {typeof document !== "undefined" && stockPopover && createPortal(
                <div
                    data-stock-popover
                    className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-3 px-4 min-w-[200px]"
                    style={{ left: stockPopover.x, top: stockPopover.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(() => {
                        const product = products.find((pr) => pr.id === stockPopover.productId);
                        const items = product?.warehouseStocks?.filter((w) => w.quantity > 0) ?? [];
                        return (
                            <>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Depo dağılımı</p>
                                {items.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {items.map((w) => (
                                            <div key={w.warehouse_id} className="flex justify-between gap-6 text-sm">
                                                <span className="text-gray-700">{w.warehouse_name}</span>
                                                <span className="font-medium text-gray-900">{w.quantity} {product?.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">Depoda stok bulunmuyor</p>
                                )}
                            </>
                        );
                    })()}
                </div>,
                document.body
            )}

            {showStockForm && (() => {
                const product = products.find(p => p.id === showStockForm);
                const warehousesWithStock = stockMode === "decrease" && product?.warehouseStocks
                    ? product.warehouseStocks.filter((w) => w.quantity > 0)
                    : warehouses.map((w) => ({ warehouse_id: w.id, warehouse_name: w.name, quantity: -1 }));
                return (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowStockForm(null);
                            setStockData({ warehouse_id: "", quantity: "" });
                            setStockMode("add");
                        }
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b">
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => { setStockMode("add"); setStockData({ warehouse_id: "", quantity: "" }); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${stockMode === "add" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Stok Ekle
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStockMode("decrease"); setStockData({ warehouse_id: "", quantity: "" }); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${stockMode === "decrease" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                >
                                    Stok Düşür
                                </button>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">
                                {stockMode === "add" ? "Stok Ekle" : "Stok Düşür"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {product?.name}
                            </p>
                        </div>
                        <div className="px-6 py-6">
                            <form onSubmit={(e) => handleStockSubmit(e, showStockForm)} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Depo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={stockData.warehouse_id}
                                        onChange={(e) => setStockData({ ...stockData, warehouse_id: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                        required
                                    >
                                        <option value="">Depo Seçin</option>
                                        {stockMode === "add"
                                            ? warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))
                                            : warehousesWithStock.map((w) => (
                                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                                    {w.warehouse_name} (Mevcut: {w.quantity} {product?.unit})
                                                </option>
                                            ))
                                        }
                                    </select>
                                    {stockMode === "decrease" && warehousesWithStock.length === 0 && (
                                        <p className="text-amber-600 text-sm mt-1">Bu üründe hiç depo stoku bulunmuyor.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Miktar <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder={stockMode === "add" ? "Örn: 100" : "Örn: 5"}
                                        value={stockData.quantity}
                                        onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                        min="1"
                                        max={stockMode === "decrease" && stockData.warehouse_id ? 
                                            (product?.warehouseStocks?.find((w) => w.warehouse_id === stockData.warehouse_id)?.quantity ?? undefined) : undefined}
                                        required
                                    />
                                    {stockMode === "decrease" && stockData.warehouse_id && (
                                        <p className="text-gray-500 text-xs mt-1">
                                            Maksimum: {product?.warehouseStocks?.find((w) => w.warehouse_id === stockData.warehouse_id)?.quantity ?? 0} {product?.unit}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowStockForm(null);
                                            setStockData({ warehouse_id: "", quantity: "" });
                                            setStockMode("add");
                                        }}
                                        className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className={`w-full sm:flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition shadow-sm ${
                                            stockMode === "add" ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
                                        }`}
                                    >
                                        {stockMode === "add" ? "Stok Ekle" : "Stok Düşür"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
