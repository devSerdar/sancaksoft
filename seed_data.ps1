param(
    [string]$DatabaseUrl = "postgres://postgres:password@localhost:5432/sancaksoft?sslmode=disable",
    [string]$TenantId = "00000000-0000-0000-0000-000000000001"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Seeding database with sample data..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database URL: $DatabaseUrl" -ForegroundColor Yellow
Write-Host "Tenant ID: $TenantId" -ForegroundColor Yellow
Write-Host ""

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
$dockerPath = Get-Command docker -ErrorAction SilentlyContinue

$sqlLines = @(
"INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('$TenantId', 'Main Tenant', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;",
"INSERT INTO invoice_sequences (tenant_id, last_number) VALUES ('$TenantId', 0) ON CONFLICT (tenant_id) DO NOTHING;",
"",
"INSERT INTO customers (id, tenant_id, name, email, phone, address, created_at, updated_at) VALUES",
"('00000000-0000-0000-0000-000000000010', '$TenantId', 'Ahmet Yilmaz', 'ahmet@example.com', '05551112233', 'Istanbul', NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000011', '$TenantId', 'Ayse Demir', 'ayse@example.com', '05552223344', 'Ankara', NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000012', '$TenantId', 'Mehmet Kaya', 'mehmet@example.com', '05553334455', 'Izmir', NOW(), NOW())",
"ON CONFLICT DO NOTHING;",
"",
"INSERT INTO warehouses (id, tenant_id, name, location, created_at, updated_at) VALUES",
"('00000000-0000-0000-0000-000000000020', '$TenantId', 'Main Warehouse', 'Istanbul Center', NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000021', '$TenantId', 'Ankara Branch', 'Ankara Cankaya', NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000022', '$TenantId', 'Izmir Warehouse', 'Izmir Konak', NOW(), NOW())",
"ON CONFLICT DO NOTHING;",
"",
"ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(10) NOT NULL DEFAULT 'adet';",
"UPDATE products SET unit = 'adet' WHERE unit IS NULL;",
"CREATE TABLE IF NOT EXISTS customer_returns (",
"id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),",
"tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,",
"customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,",
"product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,",
"warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,",
"quantity INTEGER NOT NULL CHECK (quantity > 0),",
"unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),",
"total DECIMAL(15,2) NOT NULL CHECK (total >= 0),",
"reason TEXT,",
"created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
");",
"",
"INSERT INTO products (id, tenant_id, name, sku, barcode, unit, price, vat_rate, created_at, updated_at) VALUES",
"('00000000-0000-0000-0000-000000000030', '$TenantId', 'Domates', 'GIDA-DOMATES', '1234567890123', 'kg', 45.00, 1.00, NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000031', '$TenantId', 'Patates', 'GIDA-PATATES', '1234567890124', 'kg', 28.00, 1.00, NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000032', '$TenantId', 'Sogan', 'GIDA-SOGAN', '1234567890125', 'kg', 22.00, 1.00, NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000033', '$TenantId', 'Aycicek Yagi 5L', 'GIDA-YAG-5L', '1234567890126', 'adet', 295.00, 10.00, NOW(), NOW()),",
"('00000000-0000-0000-0000-000000000034', '$TenantId', 'Pirinç Baldo', 'GIDA-PIRINC', '1234567890127', 'kg', 62.00, 1.00, NOW(), NOW())",
"ON CONFLICT DO NOTHING;",
"",
"INSERT INTO stock_movements (id, tenant_id, product_id, warehouse_id, quantity, type, created_at) VALUES",
"('00000000-0000-0000-0000-000000000040', '$TenantId', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', 25, 'IN', NOW()),",
"('00000000-0000-0000-0000-000000000041', '$TenantId', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', 50, 'IN', NOW()),",
"('00000000-0000-0000-0000-000000000042', '$TenantId', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000020', 30, 'IN', NOW()),",
"('00000000-0000-0000-0000-000000000043', '$TenantId', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000020', 15, 'IN', NOW()),",
"('00000000-0000-0000-0000-000000000044', '$TenantId', '00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000020', 40, 'IN', NOW()),",
"('00000000-0000-0000-0000-000000000045', '$TenantId', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000021', 10, 'IN', NOW()),",
"('00000000-0000-0000-0000-000000000046', '$TenantId', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', 20, 'IN', NOW())",
"ON CONFLICT DO NOTHING;"
)

$sqlScript = $sqlLines -join [Environment]::NewLine
$tmpSql = Join-Path $env:TEMP ("sancaksoft_seed_" + [Guid]::NewGuid().ToString() + ".sql")

try {
    Set-Content -Path $tmpSql -Value $sqlScript -Encoding UTF8

    if ($psqlPath) {
        Write-Host "Using local psql..." -ForegroundColor Yellow
        $result = psql "$DatabaseUrl" -v ON_ERROR_STOP=1 -f $tmpSql 2>&1
    } elseif ($dockerPath) {
        Write-Host "Local psql not found, trying Docker container sancaksoft-db..." -ForegroundColor Yellow
        $containerExists = docker ps --format "{{.Names}}" | Select-String "^sancaksoft-db$"
        if (-not $containerExists) {
            Write-Host "ERROR: Docker container 'sancaksoft-db' is not running." -ForegroundColor Red
            Write-Host "Start it with: docker-compose up -d" -ForegroundColor Red
            exit 1
        }
        $result = Get-Content -Raw $tmpSql | docker exec -i sancaksoft-db psql -U postgres -d sancaksoft -v ON_ERROR_STOP=1 2>&1
    } else {
        Write-Host "ERROR: Neither psql nor docker command is available." -ForegroundColor Red
        Write-Host "Install PostgreSQL client tools or Docker Desktop." -ForegroundColor Red
        exit 1
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Seed failed." -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Seed completed successfully." -ForegroundColor Green
    Write-Host "Inserted sample customers, warehouses, products and stock movements." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path $tmpSql) {
        Remove-Item $tmpSql -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
