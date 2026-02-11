package service_test

import (
	"context"
	"testing"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"
	"sancaksoft/internal/service"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComprehensiveERPFlow(t *testing.T) {
	if testDBURL == "" {
		t.Skip("Skipping integration test: TEST_DB_URL not set")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, testDBURL)
	require.NoError(t, err)
	defer db.Close()

	// 1. Setup Tenant & User
	tenantID := uuid.New()
	userID := uuid.New()

	// Cleanup helper
	defer func() {
		_, _ = db.Exec(ctx, "DELETE FROM tenants WHERE id = $1", tenantID)
	}()

	_, err = db.Exec(ctx, "INSERT INTO tenants (id, name) VALUES ($1, 'Comp Test Tenant')", tenantID)
	require.NoError(t, err)

	// 2. Initialize Repositories & Services
	invoiceRepo := repository.NewInvoiceRepository()
	productRepo := repository.NewProductRepository(db)
	customerRepo := repository.NewCustomerRepository(db)
	warehouseRepo := repository.NewWarehouseRepository(db)
	stockRepo := repository.NewStockRepository(db)
	dashboardRepo := repository.NewDashboardRepository(db)

	invoiceService := service.NewInvoiceService(db, invoiceRepo)
	productService := service.NewProductService(productRepo)
	customerService := service.NewCustomerService(customerRepo)
	warehouseService := service.NewWarehouseService(warehouseRepo)
	stockService := service.NewStockService(stockRepo)
	dashboardService := service.NewDashboardService(dashboardRepo)

	// 3. Create Warehouse
	warehouse := &domain.Warehouse{
		TenantID: tenantID,
		Name:     "Main Hub",
		Location: "Istanbul",
	}
	err = warehouseService.CreateWarehouse(ctx, warehouse)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, warehouse.ID)

	// 4. Create Customer
	customer := &domain.Customer{
		TenantID: tenantID,
		Name:     "Loyal Client Ltd",
		Email:    "info@loyal.com",
	}
	err = customerService.CreateCustomer(ctx, customer)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, customer.ID)

	// 5. Create Products
	prodA := &domain.Product{
		TenantID: tenantID,
		Name:     "High Performance Widget",
		SKU:      "WIDGET-001",
		Price:    decimal.NewFromFloat(100.0),
		VATRate:  decimal.NewFromFloat(18.0),
	}
	err = productService.CreateProduct(ctx, prodA)
	require.NoError(t, err)

	prodB := &domain.Product{
		TenantID: tenantID,
		Name:     "Standard Gadget",
		SKU:      "GADGET-001",
		Price:    decimal.NewFromFloat(50.0),
		VATRate:  decimal.NewFromFloat(8.0),
	}
	err = productService.CreateProduct(ctx, prodB)
	require.NoError(t, err)

	// 6. Add Initial Stock (Manual Injection as no API yet)
	_, err = db.Exec(ctx, `
		INSERT INTO stock_movements (id, tenant_id, product_id, warehouse_id, quantity, type, created_at)
		VALUES 
			($1, $2, $3, $4, 100, 'IN', NOW()),
			($5, $2, $6, $4, 50, 'IN', NOW())
	`, uuid.New(), tenantID, prodA.ID, warehouse.ID, uuid.New(), prodB.ID)
	require.NoError(t, err)

	// 7. Verify Initial Dashboard Pars
	stats, err := dashboardService.GetDashboardStats(ctx, tenantID)
	require.NoError(t, err)
	assert.Equal(t, int64(0), stats.TotalInvoices)
	assert.Equal(t, int64(2), stats.TotalProducts)
	assert.True(t, stats.TotalRevenue.Equal(decimal.Zero))

	// 8. Create Invoice
	// Buy 5 Widget (5 * 100 = 500) and 10 Gadget (10 * 50 = 500) -> Total 1000
	req := domain.CreateInvoiceRequest{
		TenantID:       tenantID,
		UserID:         userID,
		WarehouseID:    warehouse.ID,
		CustomerID:     customer.ID,
		IdempotencyKey: uuid.New(),
		Items: []domain.InvoiceItemRequest{
			{ProductID: prodA.ID, Quantity: 5, UnitPrice: prodA.Price},
			{ProductID: prodB.ID, Quantity: 10, UnitPrice: prodB.Price},
		},
	}

	invoice, err := invoiceService.CreateInvoice(ctx, req)
	require.NoError(t, err)
	assert.NotNil(t, invoice)
	expectedTotal := decimal.NewFromFloat(1000.0)
	assert.True(t, expectedTotal.Equal(invoice.TotalAmount), "Total amount mismatch")

	// 9. Verify Stock Deduction
	// Func to get stock
	getStock := func(pID uuid.UUID) int {
		var q int
		_ = db.QueryRow(ctx, "SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id=$1", pID).Scan(&q)
		return q
	}

	assert.Equal(t, 95, getStock(prodA.ID)) // 100 - 5
	assert.Equal(t, 40, getStock(prodB.ID)) // 50 - 10

	// 10. Verify Stock Movement API (Service level)
	movements, err := stockService.ListStockMovements(ctx, tenantID)
	require.NoError(t, err)
	// Should be 2 initial IN + 2 invoice OUT = 4
	assert.GreaterOrEqual(t, len(movements), 4)

	// 11. Verify Dashboard Stats Updated
	statsAfter, err := dashboardService.GetDashboardStats(ctx, tenantID)
	require.NoError(t, err)
	assert.Equal(t, int64(1), statsAfter.TotalInvoices)
	assert.True(t, statsAfter.TotalRevenue.Equal(expectedTotal))

	// Check Recent Invoices
	require.NotEmpty(t, statsAfter.RecentInvoices)
	assert.Equal(t, invoice.InvoiceNumber, statsAfter.RecentInvoices[0].InvoiceNumber)
	assert.Equal(t, customer.Name, statsAfter.RecentInvoices[0].CustomerName)

	t.Log("Comprehensive ERP Flow Test Passed Successfully!")
}
