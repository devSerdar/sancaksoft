package service_test

import (
	"context"
	"fmt"
	"os"
	"testing"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"
	"sancaksoft/internal/service"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// TEST_DB_URL should be set in your environment variables to run this test.
// Example: postgres://user:password@localhost:5432/sancaksoft_test
var testDBURL = os.Getenv("TEST_DB_URL")

func TestCreateInvoice_Integration(t *testing.T) {
	if testDBURL == "" {
		t.Skip("Skipping integration test: TEST_DB_URL not set")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, testDBURL)
	if err != nil {
		t.Fatalf("Unable to connect to database: %v", err)
	}
	defer db.Close()

	// 1. Setup Data
	tenantID := uuid.New()
	warehouseID := uuid.New()
	productID := uuid.New()
	customerID := uuid.New()
	userID := uuid.New()

	// Helper to cleanup
	defer func() {
		_, _ = db.Exec(ctx, "DELETE FROM tenants WHERE id = $1", tenantID)
	}()

	// Create Tenant
	_, err = db.Exec(ctx, "INSERT INTO tenants (id, name) VALUES ($1, 'Test Tenant')", tenantID)
	if err != nil {
		t.Fatalf("Failed to create tenant: %v", err)
	}

	// Create Warehouse
	_, err = db.Exec(ctx, "INSERT INTO warehouses (id, tenant_id, name) VALUES ($1, $2, 'Main Warehouse')", warehouseID, tenantID)
	if err != nil {
		t.Fatalf("Failed to create warehouse: %v", err)
	}

	// Create Product
	_, err = db.Exec(ctx, "INSERT INTO products (id, tenant_id, name, sku, price) VALUES ($1, $2, 'Test Product', $3, 100.00)", productID, tenantID, "SKU-"+uuid.New().String())
	if err != nil {
		t.Fatalf("Failed to create product: %v", err)
	}

	// Create Customer
	_, err = db.Exec(ctx, "INSERT INTO customers (id, tenant_id, name) VALUES ($1, $2, 'Test Customer')", customerID, tenantID)
	if err != nil {
		t.Fatalf("Failed to create customer: %v", err)
	}

	// Add Initial Stock (e.g., 50 units)
	_, err = db.Exec(ctx, `
		INSERT INTO stock_movements (id, tenant_id, product_id, warehouse_id, quantity, type, created_at)
		VALUES ($1, $2, $3, $4, 50, 'IN', NOW())
	`, uuid.New(), tenantID, productID, warehouseID)
	if err != nil {
		t.Fatalf("Failed to add initial stock: %v", err)
	}

	// 2. Initialize Service WITH REPOSITORY
	repo := repository.NewInvoiceRepository()
	svc := service.NewInvoiceService(db, repo)

	// 3. Prepare Request
	req := domain.CreateInvoiceRequest{
		TenantID:       tenantID,
		UserID:         userID,
		WarehouseID:    warehouseID,
		CustomerID:     customerID,
		IdempotencyKey: uuid.New(),
		Items: []domain.InvoiceItemRequest{
			{
				ProductID: productID,
				Quantity:  5,
				UnitPrice: decimal.NewFromFloat(100.00),
			},
		},
	}

	// 4. Run Test
	invoice, err := svc.CreateInvoice(ctx, req)
	if err != nil {
		t.Fatalf("CreateInvoice failed: %v", err)
	}

	// 5. Assertions

	// Check Invoice
	if invoice.TotalAmount.String() != "500" { // 5 * 100
		t.Errorf("Expected total 500, got %s", invoice.TotalAmount.String())
	}
	if invoice.InvoiceNumber == "" {
		t.Error("Invoice number should be generated")
	}

	// Check Stock Deduction
	var currentStock int
	err = db.QueryRow(ctx, `
		SELECT SUM(quantity) FROM stock_movements 
		WHERE tenant_id = $1 AND product_id = $2 AND warehouse_id = $3
	`, tenantID, productID, warehouseID).Scan(&currentStock)
	if err != nil {
		t.Fatalf("Failed to check stock: %v", err)
	}

	if currentStock != 45 { // 50 - 5
		t.Errorf("Expected stock 45, got %d", currentStock)
	}

	// Check Audit Log
	var auditCount int
	err = db.QueryRow(ctx, `
		SELECT COUNT(*) FROM audit_logs 
		WHERE tenant_id = $1 AND entity_id = $2 AND action = 'CREATE'
	`, tenantID, invoice.ID).Scan(&auditCount)
	if auditCount != 1 {
		t.Errorf("Expected 1 audit log, got %d", auditCount)
	}

	// Check Idempotency (Repeat Request)
	_, err = svc.CreateInvoice(ctx, req)
	if err == nil {
		t.Error("Expected error on duplicate request, got nil")
	}

	fmt.Println("TestCreateInvoice_Integration passed successfully!")
}
