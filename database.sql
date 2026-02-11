-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Custom Types
DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM ('IN', 'OUT', 'SALE', 'TRANSFER', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Tenants (SaaS Foundation)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- deleted_at TIMESTAMP NULL -- Optional
);

-- 2. Users (SaaS Foundation)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 3. Customers (Critical for Invoicing)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(tenant_id, email)
);

-- 4. Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    unit VARCHAR(10) NOT NULL DEFAULT 'adet' CHECK (unit IN ('adet', 'kg')),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00 CHECK (vat_rate >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(tenant_id, sku)
);

-- 5. Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 6. Stock Movements (The Core Logic)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity != 0), -- Must be a movement
    type stock_movement_type NOT NULL, -- ENUM ('IN', 'OUT', 'SALE', 'TRANSFER', 'ADJUSTMENT')
    reference_id UUID, -- Links to invoice_id, adjustment_id, etc.
    reference_type VARCHAR(50), -- 'INVOICE', 'ADJUSTMENT', 'PURCHASE_ORDER'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP 
);

-- 6.5 Invoice Sequences (Atomic Numbering)
CREATE TABLE invoice_sequences (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0
);

-- 6.6 Audit Logs (Enterprise Traceability)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID, -- Nullable if system action
    entity_type VARCHAR(50) NOT NULL, -- 'INVOICE', 'PRODUCT', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    details JSONB, -- Optional: Store snapshot or changes
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Invoices (Transaction Center)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL, 
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    idempotency_key UUID, -- Prevent duplicate requests
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(tenant_id, invoice_number),
    UNIQUE(tenant_id, idempotency_key) -- Scoped to tenant
);

-- 8. Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Denormalized for easier tenant scoping
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total DECIMAL(15, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8.5 Customer Returns
CREATE TABLE customer_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total DECIMAL(15, 2) NOT NULL CHECK (total >= 0),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Current Stock View (Performance Optimization)
-- NOTE: For extreme scale, consider converting this to a MATERIALIZED VIEW with refresh strategies.
CREATE OR REPLACE VIEW current_stock AS
SELECT
    tenant_id,
    product_id,
    warehouse_id,
    SUM(quantity) as quantity
FROM stock_movements
GROUP BY tenant_id, product_id, warehouse_id;

-- Indexing for performance
-- Tenants
CREATE INDEX idx_tenants_name ON tenants(name);

-- Users
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);

-- Products
CREATE INDEX idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX idx_products_tenant_name ON products(tenant_id, name);

-- Customers
CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);

-- Stock Movements
CREATE INDEX idx_stock_movements_tenant_product ON stock_movements(tenant_id, product_id);
CREATE INDEX idx_stock_movements_tenant_warehouse ON stock_movements(tenant_id, warehouse_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_id, reference_type);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

-- Audit Logs
CREATE INDEX idx_audit_logs_tenant_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Invoices
CREATE INDEX idx_invoices_tenant_customer ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_tenant_warehouse ON invoices(tenant_id, warehouse_id);
CREATE INDEX idx_invoices_tenant_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_tenant_idempotency ON invoices(tenant_id, idempotency_key); -- For fast checks
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- Invoice Items
CREATE INDEX idx_invoice_items_tenant_invoice ON invoice_items(tenant_id, invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
