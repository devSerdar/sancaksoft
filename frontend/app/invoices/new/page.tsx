"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from 'uuid';
import api from "@/services/api";
import { Product, Customer, Warehouse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface InvoiceItem {
    id: string; // Unique ID for React key
    product_id: string;
    quantity: number;
    unit_price: string;
    stock?: number; // Available stock for this product in selected warehouse
}

interface InvoiceFormData {
    customer_id: string;
    warehouse_id: string;
    items: InvoiceItem[];
}

export default function NewInvoicePage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<InvoiceItem[]>([{ id: uuidv4(), product_id: "", quantity: 1, unit_price: "0" }]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, watch } = useForm<InvoiceFormData>();
    const selectedWarehouse = watch("warehouse_id");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, custRes, whRes] = await Promise.all([
                    api.get<Product[]>("/products"),
                    api.get<Customer[]>("/customers"),
                    api.get<Warehouse[]>("/warehouses"),
                ]);
                setProducts(prodRes.data);
                setCustomers(custRes.data);
                setWarehouses(whRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchData();
    }, []);

    // Fetch stock when product and warehouse are selected
    const fetchStockForItem = useCallback(async (productId: string, warehouseId: string, index: number) => {
        if (!productId || !warehouseId) {
            setItems(prevItems => {
                const newItems = [...prevItems];
                newItems[index] = { ...newItems[index], stock: undefined };
                return newItems;
            });
            return;
        }

        try {
            const res = await api.get<{ stock: number }>(`/stock-balance?product_id=${productId}&warehouse_id=${warehouseId}`);
            setItems(prevItems => {
                const newItems = [...prevItems];
                newItems[index] = { ...newItems[index], stock: res.data.stock };
                return newItems;
            });
        } catch (error) {
            console.error("Failed to fetch stock", error);
            setItems(prevItems => {
                const newItems = [...prevItems];
                newItems[index] = { ...newItems[index], stock: undefined };
                return newItems;
            });
        }
    }, []);

    // Update stock when warehouse changes
    useEffect(() => {
        if (selectedWarehouse) {
            items.forEach((item, index) => {
                if (item.product_id) {
                    fetchStockForItem(item.product_id, selectedWarehouse, index);
                } else {
                    // Clear stock if no product selected
                    setItems(prevItems => {
                        const newItems = [...prevItems];
                        newItems[index] = { ...newItems[index], stock: undefined };
                        return newItems;
                    });
                }
            });
        } else {
            // Clear all stock when warehouse is deselected
            setItems(prevItems => prevItems.map(item => ({ ...item, stock: undefined })));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWarehouse]);

    const addItem = () => {
        setItems([...items, { id: uuidv4(), product_id: "", quantity: 1, unit_price: "0" }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const onSubmit = async (data: InvoiceFormData) => {
        // Validate that customer and warehouse are selected
        if (!data.customer_id || !data.warehouse_id) {
            alert("Lütfen hem Müşteri hem de Depo seçin!");
            return;
        }

        // Validate that at least one product is selected
        const validItems = items.filter(item => item.product_id && item.quantity > 0);
        if (validItems.length === 0) {
            alert("Lütfen en az bir ürün ekleyin!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                warehouse_id: data.warehouse_id,
                customer_id: data.customer_id,
                idempotency_key: uuidv4(), // Generate unique idempotency key
                items: validItems.map(item => ({
                    product_id: item.product_id,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                })),
            };
            await api.post("/invoices", payload);
            alert("Fatura başarıyla oluşturuldu!");
            router.push("/invoices");
        } catch (error: any) {
            console.error("Error details:", error.response?.data);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
            
            // Parse insufficient stock error to show product name
            if (errorMessage.includes("insufficient stock")) {
                const match = errorMessage.match(/insufficient stock for product ([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\. Available: (\d+), Requested: (\d+)/i);
                if (match) {
                    const productId = match[1];
                    const available = match[2];
                    const requested = match[3];
                    const product = products.find(p => p.id === productId);
                    const productName = product ? product.name : productId;
                    alert(`Insufficient Stock!\n\nProduct: ${productName}\nAvailable: ${available}\nRequested: ${requested}\n\nPlease reduce the quantity or add stock to the warehouse.`);
                } else {
                    alert(`Fatura oluşturulamadı: ${errorMessage}`);
                }
            } else {
                alert(`Failed to create invoice: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            return sum + (Number(item.quantity) * Number(item.unit_price));
        }, 0).toFixed(2);
    };

    const getProductUnit = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        return product?.unit || "adet";
    };

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Yeni Fatura</h1>
                <p className="text-sm text-gray-600">Müşteri seçin, depoyu belirleyin ve birden fazla ürün ekleyin</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Müşteri & Depo */}
                <Card className="shadow-sm border border-gray-200 overflow-hidden">
                    <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Fatura Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Müşteri <span className="text-red-500">*</span></label>
                            <select
                                {...register("customer_id", { required: true })}
                                className="w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[44px]"
                            >
                                <option value="">Müşteri seçin</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Depo <span className="text-red-500">*</span></label>
                            <select
                                {...register("warehouse_id", { required: true })}
                                className="w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[44px]"
                            >
                                <option value="">Depo seçin</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Ürünler - Mobil öncelikli */}
                <Card className="shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Satılan Ürünler</CardTitle>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm active:scale-[0.98] transition w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4" />
                            Ürün Ekle
                        </button>
                    </div>
                    <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="p-3 sm:p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs font-medium text-gray-500">Ürün {index + 1}</span>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                aria-label="Ürünü sil"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Ürün <span className="text-red-500">*</span>
                                            {item.product_id && item.stock !== undefined && (
                                                <span className={`ml-1 font-medium ${item.stock === 0 ? "text-red-600" : item.stock < item.quantity ? "text-amber-600" : "text-green-600"}`}>
                                                    (Stok: {item.stock} {getProductUnit(item.product_id)}{item.stock < item.quantity && " ⚠"})
                                                </span>
                                            )}
                                        </label>
                                        <select
                                            value={item.product_id}
                                            onChange={(e) => {
                                                const selectedProductId = e.target.value;
                                                const prod = products.find((p) => p.id === selectedProductId);
                                                const newItems = [...items];
                                                newItems[index] = {
                                                    ...newItems[index],
                                                    product_id: selectedProductId,
                                                    unit_price: prod ? prod.price : newItems[index].unit_price,
                                                };
                                                setItems(newItems);
                                                if (selectedWarehouse && selectedProductId) {
                                                    fetchStockForItem(selectedProductId, selectedWarehouse, index);
                                                }
                                            }}
                                            className="w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[44px]"
                                        >
                                            <option value="">Ürün seçin</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.unit}) — ₺{parseFloat(p.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Miktar <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Birim Fiyat</label>
                                            <input
                                                type="number"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                                                step="0.01"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Toplam</label>
                                            <div className="w-full p-3 rounded-lg bg-white border border-gray-200 font-semibold text-gray-900 text-right text-sm min-h-[44px] flex items-center justify-end">
                                                ₺{(Number(item.quantity) * Number(item.unit_price)).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-gray-100 rounded-lg p-4">
                            <span className="font-semibold text-gray-700">Fatura Toplamı</span>
                            <span className="text-xl font-bold text-gray-900 tabular-nums">
                                ₺{calculateTotal()}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4 pb-4">
                    <button
                        type="button"
                        onClick={() => router.push("/invoices")}
                        className="w-full sm:w-auto px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition"
                    >
                        {loading ? "Oluşturuluyor..." : "Fatura Oluştur"}
                    </button>
                </div>
            </form>
        </div>
    );
}
