package repository

import (
	"context"
	"fmt"
	"time"

	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InvoiceListRepository struct {
	db *pgxpool.Pool
}

func NewInvoiceListRepository(db *pgxpool.Pool) *InvoiceListRepository {
	return &InvoiceListRepository{db: db}
}

func (r *InvoiceListRepository) ListInvoices(ctx context.Context, tenantID uuid.UUID) ([]domain.Invoice, error) {
	query := `
		SELECT id, tenant_id, warehouse_id, customer_id, invoice_number, total_amount, created_at, updated_at
		FROM invoices
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 100
	`

	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to list invoices: %w", err)
	}
	defer rows.Close()

	var invoices []domain.Invoice
	for rows.Next() {
		var inv domain.Invoice
		if err := rows.Scan(
			&inv.ID,
			&inv.TenantID,
			&inv.WarehouseID,
			&inv.CustomerID,
			&inv.InvoiceNumber,
			&inv.TotalAmount,
			&inv.CreatedAt,
			&inv.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan invoice: %w", err)
		}
		invoices = append(invoices, inv)
	}

	if invoices == nil {
		invoices = []domain.Invoice{}
	}

	return invoices, nil
}

// InvoiceDetail holds invoice header plus related names and items for detail view.
type InvoiceDetail struct {
	ID            uuid.UUID
	InvoiceNumber string
	TotalAmount   float64
	CreatedAt     time.Time
	CustomerName  string
	WarehouseName string
}

// InvoiceDetailItem holds a line item with product name.
type InvoiceDetailItem struct {
	ProductName string
	Quantity    int
	Unit        string
	UnitPrice   float64
	Total       float64
}

// GetInvoiceDetail returns invoice with customer, warehouse names and line items.
func (r *InvoiceListRepository) GetInvoiceDetail(ctx context.Context, tenantID, invoiceID uuid.UUID) (*InvoiceDetail, []InvoiceDetailItem, error) {
	// Invoice header with customer and warehouse names
	var detail InvoiceDetail
	err := r.db.QueryRow(ctx, `
		SELECT i.id, i.invoice_number, i.total_amount, i.created_at,
		       COALESCE(c.name, '') as customer_name,
		       COALESCE(w.name, '') as warehouse_name
		FROM invoices i
		LEFT JOIN customers c ON c.id = i.customer_id AND c.tenant_id = i.tenant_id
		LEFT JOIN warehouses w ON w.id = i.warehouse_id AND w.tenant_id = i.tenant_id
		WHERE i.tenant_id = $1 AND i.id = $2 AND i.deleted_at IS NULL
	`, tenantID, invoiceID).Scan(
		&detail.ID,
		&detail.InvoiceNumber,
		&detail.TotalAmount,
		&detail.CreatedAt,
		&detail.CustomerName,
		&detail.WarehouseName,
	)
	if err != nil {
		return nil, nil, err
	}

	// Line items with product name and unit
	rows, err := r.db.Query(ctx, `
		SELECT COALESCE(p.name, ''), ii.quantity, COALESCE(p.unit, 'adet'), ii.unit_price, ii.total
		FROM invoice_items ii
		LEFT JOIN products p ON p.id = ii.product_id
		WHERE ii.tenant_id = $1 AND ii.invoice_id = $2
		ORDER BY ii.created_at
	`, tenantID, invoiceID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []InvoiceDetailItem
	for rows.Next() {
		var item InvoiceDetailItem
		if err := rows.Scan(&item.ProductName, &item.Quantity, &item.Unit, &item.UnitPrice, &item.Total); err != nil {
			return nil, nil, err
		}
		items = append(items, item)
	}

	return &detail, items, nil
}
