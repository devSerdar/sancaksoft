package repository

import (
	"context"
	"fmt"
	"time"

	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// InvoiceRepository handles database operations for invoices and related entities.
type InvoiceRepository struct{}

func NewInvoiceRepository() *InvoiceRepository {
	return &InvoiceRepository{}
}

// CheckIdempotency verifies if the request has already been processed.
func (r *InvoiceRepository) CheckIdempotency(ctx context.Context, tx pgx.Tx, tenantID, idempotencyKey uuid.UUID) error {
	var existingID uuid.UUID
	err := tx.QueryRow(ctx, `SELECT id FROM invoices WHERE tenant_id = $1 AND idempotency_key = $2`, tenantID, idempotencyKey).Scan(&existingID)
	if err == nil {
		return fmt.Errorf("duplicate request: invoice already exists with ID %s", existingID)
	} else if err != pgx.ErrNoRows {
		return fmt.Errorf("failed to check idempotency: %w", err)
	}
	return nil
}

// GenerateNextInvoiceNumber generates the next sequential invoice number atomically.
func (r *InvoiceRepository) GenerateNextInvoiceNumber(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID) (string, error) {
	var lastNumber int
	err := tx.QueryRow(ctx, `
		INSERT INTO invoice_sequences (tenant_id, last_number)
		VALUES ($1, 1)
		ON CONFLICT (tenant_id) DO UPDATE
		SET last_number = invoice_sequences.last_number + 1
		RETURNING last_number
	`, tenantID).Scan(&lastNumber)

	if err != nil {
		return "", fmt.Errorf("failed to generate invoice number: %w", err)
	}

	currentYear := time.Now().Year()
	return fmt.Sprintf("INV-%d-%05d", currentYear, lastNumber), nil
}

// CreateInvoice inserts the invoice header.
func (r *InvoiceRepository) CreateInvoice(ctx context.Context, tx pgx.Tx, invoice *domain.Invoice, idempotencyKey uuid.UUID) error {
	query := `
		INSERT INTO invoices (id, tenant_id, warehouse_id, customer_id, invoice_number, total_amount, idempotency_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at
	`
	return tx.QueryRow(ctx, query,
		invoice.ID,
		invoice.TenantID,
		invoice.WarehouseID,
		invoice.CustomerID,
		invoice.InvoiceNumber,
		invoice.TotalAmount,
		idempotencyKey,
	).Scan(&invoice.CreatedAt)
}

// LockProduct locks a product row for update to prevent concurrent stock modifications.
func (r *InvoiceRepository) LockProduct(ctx context.Context, tx pgx.Tx, tenantID, productID uuid.UUID) error {
	var _lock int
	err := tx.QueryRow(ctx, `SELECT 1 FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, productID, tenantID).Scan(&_lock)
	if err != nil {
		return fmt.Errorf("failed to lock product %s: %w", productID, err)
	}
	return nil
}

// GetStockBalance returns the current stock balance for a product in a warehouse.
// Note: Assumes LockProduct has been called prior for safety.
func (r *InvoiceRepository) GetStockBalance(ctx context.Context, tx pgx.Tx, tenantID, productID, warehouseID uuid.UUID) (int, error) {
	var currentStock int
	err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0)
		FROM stock_movements
		WHERE tenant_id = $1 AND product_id = $2 AND warehouse_id = $3
	`, tenantID, productID, warehouseID).Scan(&currentStock)
	if err != nil {
		return 0, fmt.Errorf("failed to get stock balance: %w", err)
	}
	return currentStock, nil
}

// CreateInvoiceItem inserts a line item.
func (r *InvoiceRepository) CreateInvoiceItem(ctx context.Context, tx pgx.Tx, item *domain.InvoiceItem) error {
	query := `
		INSERT INTO invoice_items (id, tenant_id, invoice_id, product_id, quantity, unit_price, total, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := tx.Exec(ctx, query,
		item.ID,
		item.TenantID,
		item.InvoiceID,
		item.ProductID,
		item.Quantity,
		item.UnitPrice,
		item.Total,
	)
	return err
}

// CreateStockMovement inserts a stock movement record.
func (r *InvoiceRepository) CreateStockMovement(ctx context.Context, tx pgx.Tx, movement *domain.StockMovement) error {
	query := `
		INSERT INTO stock_movements (
			id, tenant_id, product_id, warehouse_id, 
			quantity, type, reference_id, reference_type, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
	`
	_, err := tx.Exec(ctx, query,
		movement.ID,
		movement.TenantID,
		movement.ProductID,
		movement.WarehouseID,
		movement.Quantity,
		movement.Type,
		movement.ReferenceID,
		movement.ReferenceType,
	)
	return err
}

// CreateAuditLog inserts an audit log entry.
func (r *InvoiceRepository) CreateAuditLog(ctx context.Context, tx pgx.Tx, log *domain.AuditLog) error {
	query := `
		INSERT INTO audit_logs (id, tenant_id, user_id, entity_type, entity_id, action, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, err := tx.Exec(ctx, query,
		log.ID,
		log.TenantID,
		log.UserID,
		log.EntityType,
		log.EntityID,
		log.Action,
	)
	return err
}
