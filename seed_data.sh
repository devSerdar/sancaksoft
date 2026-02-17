#!/bin/bash
# Seed Database with Sample Data

set -e

TENANT_ID="00000000-0000-0000-0000-000000000001"

echo -e "\033[36m========================================\033[0m"
echo -e "\033[36mSeeding database with sample data...\033[0m"
echo -e "\033[36m========================================\033[0m"
echo -e "\033[33mTenant ID: $TENANT_ID\033[0m"
echo ""

docker compose exec -T sancaksoft-db psql -U postgres -d sancaksoft << EOF
-- Insert default tenant if not exists
INSERT INTO tenants (id, name, created_at, updated_at) 
VALUES ('$TENANT_ID', 'Main Tenant', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_sequences (tenant_id, last_number) 
VALUES ('$TENANT_ID', 0) 
ON CONFLICT (tenant_id) DO NOTHING;

-- Sample Customers
INSERT INTO customers (id, tenant_id, name, email, phone, address, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000010', '$TENANT_ID', 'Ahmet Yilmaz', 'ahmet@example.com', '05551112233', 'Istanbul', NOW(), NOW()),
('00000000-0000-0000-0000-000000000011', '$TENANT_ID', 'Ayse Demir', 'ayse@example.com', '05552223344', 'Ankara', NOW(), NOW()),
('00000000-0000-0000-0000-000000000012', '$TENANT_ID', 'Mehmet Kaya', 'mehmet@example.com', '05553334455', 'Izmir', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Sample Warehouses
INSERT INTO warehouses (id, tenant_id, name, location, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000020', '$TENANT_ID', 'Main Warehouse', 'Istanbul Center', NOW(), NOW()),
('00000000-0000-0000-0000-000000000021', '$TENANT_ID', 'Ankara Branch', 'Ankara Cankaya', NOW(), NOW()),
('00000000-0000-0000-0000-000000000022', '$TENANT_ID', 'Izmir Warehouse', 'Izmir Konak', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Sample Products
INSERT INTO products (id, tenant_id, name, sku, barcode, unit, price, vat_rate, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000030', '$TENANT_ID', 'Domates', 'GIDA-DOMATES', '1234567890123', 'kg', 45.00, 1.00, NOW(), NOW()),
('00000000-0000-0000-0000-000000000031', '$TENANT_ID', 'Patates', 'GIDA-PATATES', '1234567890124', 'kg', 28.00, 1.00, NOW(), NOW()),
('00000000-0000-0000-0000-000000000032', '$TENANT_ID', 'Sogan', 'GIDA-SOGAN', '1234567890125', 'kg', 22.00, 1.00, NOW(), NOW()),
('00000000-0000-0000-0000-000000000033', '$TENANT_ID', 'Aycicek Yagi 5L', 'GIDA-YAG-5L', '1234567890126', 'adet', 295.00, 10.00, NOW(), NOW()),
('00000000-0000-0000-0000-000000000034', '$TENANT_ID', 'Pirinç Baldo', 'GIDA-PIRINC', '1234567890127', 'kg', 62.00, 1.00, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Sample Stock Movements (Initial Stock)
INSERT INTO stock_movements (id, tenant_id, product_id, warehouse_id, quantity, type, created_at) VALUES
('00000000-0000-0000-0000-000000000040', '$TENANT_ID', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', 25, 'IN', NOW()),
('00000000-0000-0000-0000-000000000041', '$TENANT_ID', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', 50, 'IN', NOW()),
('00000000-0000-0000-0000-000000000042', '$TENANT_ID', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000020', 30, 'IN', NOW()),
('00000000-0000-0000-0000-000000000043', '$TENANT_ID', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000020', 15, 'IN', NOW()),
('00000000-0000-0000-0000-000000000044', '$TENANT_ID', '00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000020', 40, 'IN', NOW()),
('00000000-0000-0000-0000-000000000045', '$TENANT_ID', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000021', 10, 'IN', NOW()),
('00000000-0000-0000-0000-000000000046', '$TENANT_ID', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', 20, 'IN', NOW())
ON CONFLICT DO NOTHING;

SELECT 'Seed completed successfully!' as status;
EOF

echo ""
echo -e "\033[32mSeed completed successfully.\033[0m"
echo -e "\033[32mInserted sample customers, warehouses, products and stock movements.\033[0m"
echo -e "\033[36m========================================\033[0m"
