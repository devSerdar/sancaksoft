export interface DashboardStats {
    total_revenue: string; // Decimal comes as string from JSON
    total_invoices: number;
    total_products: number;
    low_stock_count: number;
    recent_invoices: RecentInvoice[];
}

export interface RecentInvoice {
    id: string;
    invoice_number: string;
    total_amount: string;
    created_at: string;
    customer_name: string;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    unit: "adet" | "kg";
    price: string;
    vat_rate: string;
    created_at: string;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    created_at: string;
}

export interface CustomerLedgerEntry {
    period_start: string;
    sales_amount: string;
    return_amount: string;
    net_amount: string;
}

export interface Warehouse {
    id: string;
    name: string;
    location: string;
    created_at: string;
}

export interface WarehouseStock {
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
}

export interface StockMovement {
    id: string;
    product_id: string;
    warehouse_id: string;
    quantity: number;
    type: 'IN' | 'OUT' | 'SALE' | 'TRANSFER' | 'ADJUSTMENT';
    reference_id: string;
    reference_type: string;
    created_at: string;
}

export interface CustomerReturn {
    id: string;
    customer_id: string;
    product_id: string;
    warehouse_id: string;
    quantity: number;
    unit_price: string;
    total: string;
    reason: string;
    created_at: string;
}

export interface CustomerPurchaseSummary {
    customer_id: string;
    product_id: string;
    product_name: string;
    product_unit: "adet" | "kg";
    warehouse_id: string;
    warehouse_name: string;
    purchased_qty: number;
    returned_qty: number;
    returnable_qty: number;
    last_unit_price: string;
}
