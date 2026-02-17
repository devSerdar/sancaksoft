"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerLedgerDetail, LedgerDetailEntry, PaymentMethod, Product, Warehouse } from "@/types";
import { ArrowLeft, Plus, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Building2, FileCheck, ShoppingCart, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: "Nakit",
    bank_transfer: "Havale/EFT",
    credit_card: "Kredi Kartı",
    check: "Çek",
};

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="h-4 w-4" />,
    bank_transfer: <Building2 className="h-4 w-4" />,
    credit_card: <CreditCard className="h-4 w-4" />,
    check: <FileCheck className="h-4 w-4" />,
};

interface InvoiceItem {
    id: string;
    product_id: string;
    product_name: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total: number;
}

type FormMode = "none" | "payment" | "sale" | "edit_payment";

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const [ledgerDetail, setLedgerDetail] = useState<CustomerLedgerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [formMode, setFormMode] = useState<FormMode>("none");
    const [submitting, setSubmitting] = useState(false);

    // Products & Warehouses for sale form
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_method: "cash" as PaymentMethod,
        reference_no: "",
        notes: "",
        payment_date: new Date().toISOString().split("T")[0],
    });

    // Sale form state
    const [saleForm, setSaleForm] = useState({
        warehouse_id: "",
        items: [] as InvoiceItem[],
    });
    const [selectedProduct, setSelectedProduct] = useState("");
    const [itemQuantity, setItemQuantity] = useState("");
    const [itemPrice, setItemPrice] = useState("");
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<LedgerDetailEntry | null>(null);

    const fetchLedgerDetail = async () => {
        try {
            const res = await api.get<CustomerLedgerDetail>(`/customers/${customerId}/ledger-detail`);
            setLedgerDetail(res.data);
        } catch (error: any) {
            console.error("Failed to fetch ledger detail", error);
            toast.error("Cari detay getirilemedi", { description: error.response?.data?.error || error.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsAndWarehouses = async () => {
        try {
            const [productsRes, warehousesRes] = await Promise.all([
                api.get<Product[]>("/products"),
                api.get<Warehouse[]>("/warehouses"),
            ]);
            setProducts(productsRes.data || []);
            setWarehouses(warehousesRes.data || []);
            if (warehousesRes.data?.length > 0) {
                setSaleForm(prev => ({ ...prev, warehouse_id: warehousesRes.data[0].id }));
            }
        } catch (error) {
            console.error("Failed to fetch products/warehouses", error);
        }
    };

    useEffect(() => {
        if (customerId) {
            fetchLedgerDetail();
            fetchProductsAndWarehouses();
        }
    }, [customerId]);

    const handleEditPayment = (entry: LedgerDetailEntry) => {
        if (entry.type !== "PAYMENT") return;
        setEditingPaymentId(entry.id);
        setPaymentForm({
            amount: String(entry.credit),
            payment_method: (entry.payment_method as PaymentMethod) || "cash",
            reference_no: entry.reference_no || "",
            notes: entry.description !== "Ödeme" ? entry.description : "",
            payment_date: new Date(entry.date).toISOString().split("T")[0],
        });
        setFormMode("edit_payment");
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.warning("Lütfen geçerli bir tutar girin");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                amount: parseFloat(paymentForm.amount),
                payment_method: paymentForm.payment_method,
                reference_no: paymentForm.reference_no || undefined,
                notes: paymentForm.notes || undefined,
                payment_date: new Date(paymentForm.payment_date).toISOString(),
            };
            if (editingPaymentId) {
                await api.put(`/payments/${editingPaymentId}`, payload);
                toast.success("Ödeme güncellendi");
                setEditingPaymentId(null);
                setFormMode("none");
            } else {
                await api.post("/payments", {
                    customer_id: customerId,
                    ...payload,
                });
                toast.success("Ödeme kaydedildi");
                setFormMode("none");
            }
            setPaymentForm({
                amount: "",
                payment_method: "cash",
                reference_no: "",
                notes: "",
                payment_date: new Date().toISOString().split("T")[0],
            });
            fetchLedgerDetail();
        } catch (error: any) {
            toast.error("Ödeme kaydedilemedi", { description: error.response?.data?.error || error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!entryToDelete) return;
        setSubmitting(true);
        try {
            if (entryToDelete.type === "PAYMENT") {
                await api.delete(`/payments/${entryToDelete.id}`);
                toast.success("Ödeme silindi");
            } else if (entryToDelete.type === "RETURN") {
                await api.delete(`/returns/${entryToDelete.id}`);
                toast.success("İade silindi");
            } else if (entryToDelete.type === "SALE") {
                await api.delete(`/invoices/${entryToDelete.id}`);
                toast.success("Fatura silindi");
            }
            setEntryToDelete(null);
            fetchLedgerDetail();
        } catch (error: any) {
            toast.error("Silme başarısız", { description: error.response?.data?.error || error.message });
        } finally {
            setSubmitting(false);
        }
    };

    // Add item to sale
    const handleAddItem = () => {
        if (!selectedProduct || !itemQuantity || !itemPrice) {
            toast.warning("Lütfen ürün, miktar ve fiyat girin");
            return;
        }

        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        const qty = parseFloat(itemQuantity);
        const price = parseFloat(itemPrice);

        const newItem: InvoiceItem = {
            id: uuidv4(),
            product_id: product.id,
            product_name: product.name,
            unit: product.unit,
            quantity: qty,
            unit_price: price,
            total: qty * price,
        };

        setSaleForm(prev => ({
            ...prev,
            items: [...prev.items, newItem],
        }));

        setSelectedProduct("");
        setItemQuantity("");
        setItemPrice("");
    };

    const handleRemoveItem = (itemId: string) => {
        setSaleForm(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== itemId),
        }));
    };

    const handleSaleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!saleForm.warehouse_id) {
            toast.warning("Lütfen depo seçin");
            return;
        }
        if (saleForm.items.length === 0) {
            toast.warning("Lütfen en az bir ürün ekleyin");
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/invoices", {
                warehouse_id: saleForm.warehouse_id,
                customer_id: customerId,
                idempotency_key: uuidv4(),
                items: saleForm.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                })),
            });

            toast.success("Satış kaydedildi");
            setFormMode("none");
            setSaleForm({
                warehouse_id: warehouses[0]?.id || "",
                items: [],
            });
            fetchLedgerDetail();
        } catch (error: any) {
            toast.error("Satış kaydedilemedi", { description: error.response?.data?.error || error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const saleTotal = saleForm.items.reduce((sum, item) => sum + item.total, 0);

    const formatCurrency = (value: string | number) => {
        return `₺${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
    };

    // Bakiyeyi mutlak değer olarak formatla
    const formatBalance = (value: string | number) => {
        const num = Number(value);
        return `₺${Math.abs(num).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "SALE": return "Satış";
            case "RETURN": return "İade";
            case "PAYMENT": return "Ödeme";
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "SALE": return "bg-blue-100 text-blue-800";
            case "RETURN": return "bg-orange-100 text-orange-800";
            case "PAYMENT": return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-8">
                <div className="flex items-center justify-center h-48">
                    <span className="text-gray-500">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    if (!ledgerDetail) {
        return (
            <div className="p-4 sm:p-8">
                <div className="text-center text-gray-500">Müşteri bulunamadı</div>
            </div>
        );
    }

    // Kalan bakiye: hesap hareketlerindeki son satırın bakiyesi (güncel)
    const balance = ledgerDetail.entries.length > 0
        ? Number(ledgerDetail.entries[ledgerDetail.entries.length - 1].balance)
        : Number(ledgerDetail.current_balance);

    return (
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/customers"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-3"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Müşterilere Dön
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                            {ledgerDetail.customer_name}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">Cari Hesap Detayı</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFormMode(formMode === "sale" ? "none" : "sale")}
                            className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors ${
                                formMode === "sale"
                                    ? "bg-blue-700 text-white"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                        >
                            <ShoppingCart className="h-4 w-4" />
                            <span>Yeni Satış</span>
                        </button>
                        <button
                            onClick={() => { setFormMode(formMode === "payment" ? "none" : "payment"); setEditingPaymentId(null); }}
                            className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors ${
                                formMode === "payment"
                                    ? "bg-green-700 text-white"
                                    : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                        >
                            <Wallet className="h-4 w-4" />
                            <span>Ödeme Kaydet</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Balance Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm mb-1">
                            <TrendingUp className="h-4 w-4" />
                            Toplam Satış
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-gray-900">
                            {formatCurrency(ledgerDetail.entries.reduce((sum, e) => sum + Number(e.debit), 0))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm mb-1">
                            <TrendingDown className="h-4 w-4" />
                            Toplam İade
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-orange-600">
                            {formatCurrency(ledgerDetail.entries.filter(e => e.type === "RETURN").reduce((sum, e) => sum + Number(e.credit), 0))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm mb-1">
                            <Wallet className="h-4 w-4" />
                            Toplam Ödeme
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-green-600">
                            {formatCurrency(ledgerDetail.entries.filter(e => e.type === "PAYMENT").reduce((sum, e) => sum + Number(e.credit), 0))}
                        </div>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 ${balance > 0 ? "border-l-red-500" : balance < 0 ? "border-l-green-500" : "border-l-gray-400"}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm mb-1">
                            <CreditCard className="h-4 w-4" />
                            Kalan Bakiye
                        </div>
                        <div className={`text-lg sm:text-xl font-bold ${balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "text-gray-600"}`}>
                            {formatBalance(balance)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sale Form */}
            {formMode === "sale" && (
                <Card className="mb-6 shadow-md border-l-4 border-l-blue-500">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800">Yeni Satış</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <form onSubmit={handleSaleSubmit} className="space-y-4">
                            {/* Warehouse Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Depo <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={saleForm.warehouse_id}
                                    onChange={(e) => setSaleForm({ ...saleForm, warehouse_id: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    required
                                >
                                    <option value="">Depo seçin</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Add Item Row */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm font-medium text-gray-700 mb-3">Ürün Ekle</div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="sm:col-span-1">
                                        <select
                                            value={selectedProduct}
                                            onChange={(e) => {
                                                setSelectedProduct(e.target.value);
                                                const product = products.find(p => p.id === e.target.value);
                                                if (product) {
                                                    setItemPrice(product.price);
                                                }
                                            }}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                        >
                                            <option value="">Ürün seçin</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="Miktar"
                                            value={itemQuantity}
                                            onChange={(e) => setItemQuantity(e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Birim Fiyat (₺)"
                                            value={itemPrice}
                                            onChange={(e) => setItemPrice(e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="w-full p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                                        >
                                            Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            {saleForm.items.length > 0 && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Ürün</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Miktar</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Birim Fiyat</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Toplam</th>
                                                <th className="w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {saleForm.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="py-2 px-3 text-gray-800">{item.product_name}</td>
                                                    <td className="py-2 px-3 text-right text-gray-600">{item.quantity} {item.unit}</td>
                                                    <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                                                    <td className="py-2 px-3 text-right font-medium text-gray-800">{formatCurrency(item.total)}</td>
                                                    <td className="py-2 px-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-medium">
                                            <tr>
                                                <td colSpan={3} className="py-2 px-3 text-right text-gray-700">Genel Toplam:</td>
                                                <td className="py-2 px-3 text-right text-lg text-blue-600">{formatCurrency(saleTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormMode("none")}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || saleForm.items.length === 0}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition disabled:opacity-50"
                                >
                                    {submitting ? "Kaydediliyor..." : `Satışı Kaydet (${formatCurrency(saleTotal)})`}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Payment Form (create or edit) */}
            {(formMode === "payment" || formMode === "edit_payment") && (
                <Card className="mb-6 shadow-md border-l-4 border-l-green-500">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800">
                            {formMode === "edit_payment" ? "Ödemeyi Düzenle" : "Ödeme Kaydet"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tutar <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₺</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="0.00"
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                            className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ödeme Yöntemi <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={paymentForm.payment_method}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    >
                                        <option value="cash">Nakit</option>
                                        <option value="bank_transfer">Havale / EFT</option>
                                        <option value="credit_card">Kredi Kartı</option>
                                        <option value="check">Çek</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Tarihi</label>
                                    <input
                                        type="date"
                                        value={paymentForm.payment_date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Referans No (Dekont/Çek No)</label>
                                    <input
                                        type="text"
                                        placeholder="Opsiyonel"
                                        value={paymentForm.reference_no}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                                <textarea
                                    placeholder="Ödeme ile ilgili not (opsiyonel)"
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    rows={2}
                                />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setFormMode("none"); setEditingPaymentId(null); }}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition disabled:opacity-50"
                                >
                                    {submitting ? "Kaydediliyor..." : formMode === "edit_payment" ? "Güncelle" : "Ödemeyi Kaydet"}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Ledger Table */}
            <Card className="shadow-sm border border-gray-200 overflow-hidden">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b border-gray-100">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Hesap Hareketleri</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {ledgerDetail.entries.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 px-4">
                            <Wallet className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Henüz hareket bulunmuyor</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {ledgerDetail.entries.map((entry) => (
                                    <div key={entry.id} className="px-4 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                                                {entry.type === "PAYMENT" && entry.payment_method && paymentMethodIcons[entry.payment_method]}
                                                {getTypeLabel(entry.type)}
                                            </span>
                                            <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                                        </div>
                                        <div className="text-sm text-gray-700 mb-2">{entry.description}</div>
                                        {entry.payment_method && (
                                            <div className="text-xs text-gray-500 mb-1">
                                                Yöntem: {paymentMethodLabels[entry.payment_method]}
                                                {entry.reference_no && ` • Ref: ${entry.reference_no}`}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                            <div className="space-x-3">
                                                {Number(entry.debit) > 0 && (
                                                    <span className="text-red-600 font-medium">{formatCurrency(entry.debit)}</span>
                                                )}
                                                {Number(entry.credit) > 0 && (
                                                    <span className="text-green-600 font-medium">{formatCurrency(entry.credit)}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {entry.type === "PAYMENT" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditPayment(entry)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                        title="Düzenle"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setEntryToDelete(entry)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <span className={`font-semibold tabular-nums ${Number(entry.balance) > 0 ? "text-red-600" : Number(entry.balance) < 0 ? "text-green-600" : "text-gray-600"}`}>
                                                    {formatBalance(entry.balance)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-y border-gray-200 bg-gray-50/80">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tür</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Açıklama</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                                                <span className="text-red-600">Satış</span>
                                            </th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                                                <span className="text-green-600">Alacak</span>
                                            </th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Bakiye</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase w-24">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerDetail.entries.map((entry) => (
                                            <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="py-3.5 px-4 text-sm text-gray-600 whitespace-nowrap">
                                                    {formatDate(entry.date)}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                                                        {entry.type === "PAYMENT" && entry.payment_method && paymentMethodIcons[entry.payment_method]}
                                                        {getTypeLabel(entry.type)}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-sm text-gray-700">
                                                    <div>{entry.description}</div>
                                                    {entry.payment_method && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {paymentMethodLabels[entry.payment_method]}
                                                            {entry.reference_no && ` • Ref: ${entry.reference_no}`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-sm tabular-nums">
                                                    {Number(entry.debit) > 0 ? (
                                                        <span className="text-red-600 font-medium">{formatCurrency(entry.debit)}</span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-sm tabular-nums">
                                                    {Number(entry.credit) > 0 ? (
                                                        <span className="text-green-600 font-medium">{formatCurrency(entry.credit)}</span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <span className={`font-semibold tabular-nums ${Number(entry.balance) > 0 ? "text-red-600" : Number(entry.balance) < 0 ? "text-green-600" : "text-gray-600"}`}>
                                                        {formatBalance(entry.balance)}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {entry.type === "PAYMENT" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditPayment(entry)}
                                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                title="Düzenle"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setEntryToDelete(entry)}
                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                            title="Sil"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Delete Confirmation Dialog */}
                            {entryToDelete && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEntryToDelete(null)}>
                                    <div
                                        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Hareketi Sil</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {entryToDelete.type === "SALE" && `${entryToDelete.description} silinecek. Stok otomatik iade edilecektir.`}
                                            {entryToDelete.type === "RETURN" && `Bu iade silinecek. Stok düşülecektir.`}
                                            {entryToDelete.type === "PAYMENT" && "Bu ödeme silinecek."}
                                            {" Devam etmek istiyor musunuz?"}
                                        </p>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setEntryToDelete(null)}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                            >
                                                İptal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeleteEntry}
                                                disabled={submitting}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                                            >
                                                {submitting ? "Siliniyor..." : "Sil"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
