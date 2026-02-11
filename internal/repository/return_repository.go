package repository

import (
	"context"
	"fmt"
	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReturnRepository struct {
	db *pgxpool.Pool
}

func NewReturnRepository(db *pgxpool.Pool) *ReturnRepository {
	return &ReturnRepository{db: db}
}

func (r *ReturnRepository) ensureCustomerReturnsTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS customer_returns (
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
		)
	`
	_, err := r.db.Exec(ctx, query)
	return err
}

func (r *ReturnRepository) ensureProductUnitColumn(ctx context.Context) error {
	query := `
		ALTER TABLE products
		ADD COLUMN IF NOT EXISTS unit VARCHAR(10) NOT NULL DEFAULT 'adet'
	`
	_, err := r.db.Exec(ctx, query)
	return err
}

func (r *ReturnRepository) CreateCustomerReturn(ctx context.Context, tx pgx.Tx, ret *domain.CustomerReturn) error {
	if _, err := tx.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS customer_returns (
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
		)
	`); err != nil {
		return fmt.Errorf("failed to ensure returns table: %w", err)
	}

	query := `
		INSERT INTO customer_returns (
			id, tenant_id, customer_id, product_id, warehouse_id,
			quantity, unit_price, total, reason, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		RETURNING created_at
	`
	return tx.QueryRow(ctx, query,
		ret.ID,
		ret.TenantID,
		ret.CustomerID,
		ret.ProductID,
		ret.WarehouseID,
		ret.Quantity,
		ret.UnitPrice,
		ret.Total,
		ret.Reason,
	).Scan(&ret.CreatedAt)
}

func (r *ReturnRepository) CreateStockMovement(ctx context.Context, tx pgx.Tx, movement *domain.StockMovement) error {
	query := `
		INSERT INTO stock_movements (
			id, tenant_id, product_id, warehouse_id, quantity, type, reference_id, reference_type, created_at
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

func (r *ReturnRepository) ListCustomerReturns(ctx context.Context, tenantID uuid.UUID) ([]domain.CustomerReturn, error) {
	if err := r.ensureCustomerReturnsTable(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure returns table: %w", err)
	}

	query := `
		SELECT id, tenant_id, customer_id, product_id, warehouse_id, quantity, unit_price, total, reason, created_at
		FROM customer_returns
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to list returns: %w", err)
	}
	defer rows.Close()

	var returns []domain.CustomerReturn
	for rows.Next() {
		var ret domain.CustomerReturn
		if err := rows.Scan(
			&ret.ID, &ret.TenantID, &ret.CustomerID, &ret.ProductID, &ret.WarehouseID,
			&ret.Quantity, &ret.UnitPrice, &ret.Total, &ret.Reason, &ret.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan return: %w", err)
		}
		returns = append(returns, ret)
	}
	return returns, nil
}

func (r *ReturnRepository) ListCustomerPurchaseSummaries(ctx context.Context, tenantID, customerID uuid.UUID) ([]domain.CustomerPurchaseSummary, error) {
	if err := r.ensureCustomerReturnsTable(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure returns table: %w", err)
	}
	if err := r.ensureProductUnitColumn(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure product unit column: %w", err)
	}

	query := `
		WITH sold AS (
			SELECT
				i.customer_id,
				ii.product_id,
				i.warehouse_id,
				SUM(ii.quantity)::int AS purchased_qty,
				MAX(ii.unit_price) AS last_unit_price
			FROM invoices i
			JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.tenant_id = i.tenant_id
			WHERE i.tenant_id = $1
			  AND i.customer_id = $2
			  AND i.deleted_at IS NULL
			GROUP BY i.customer_id, ii.product_id, i.warehouse_id
		),
		returned AS (
			SELECT
				customer_id,
				product_id,
				warehouse_id,
				SUM(quantity)::int AS returned_qty
			FROM customer_returns
			WHERE tenant_id = $1
			  AND customer_id = $2
			GROUP BY customer_id, product_id, warehouse_id
		)
		SELECT
			s.customer_id,
			s.product_id,
			p.name AS product_name,
			p.unit AS product_unit,
			s.warehouse_id,
			w.name AS warehouse_name,
			s.purchased_qty,
			COALESCE(r.returned_qty, 0) AS returned_qty,
			(s.purchased_qty - COALESCE(r.returned_qty, 0))::int AS returnable_qty,
			s.last_unit_price
		FROM sold s
		JOIN products p ON p.id = s.product_id AND p.tenant_id = $1
		JOIN warehouses w ON w.id = s.warehouse_id AND w.tenant_id = $1
		LEFT JOIN returned r
			ON r.customer_id = s.customer_id
			AND r.product_id = s.product_id
			AND r.warehouse_id = s.warehouse_id
		WHERE (s.purchased_qty - COALESCE(r.returned_qty, 0)) > 0
		ORDER BY p.name, w.name
	`
	rows, err := r.db.Query(ctx, query, tenantID, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to list customer purchase summaries: %w", err)
	}
	defer rows.Close()

	var summaries []domain.CustomerPurchaseSummary
	for rows.Next() {
		var s domain.CustomerPurchaseSummary
		if err := rows.Scan(
			&s.CustomerID,
			&s.ProductID,
			&s.ProductName,
			&s.ProductUnit,
			&s.WarehouseID,
			&s.WarehouseName,
			&s.PurchasedQty,
			&s.ReturnedQty,
			&s.ReturnableQty,
			&s.LastUnitPrice,
		); err != nil {
			return nil, fmt.Errorf("failed to scan purchase summary: %w", err)
		}
		summaries = append(summaries, s)
	}
	return summaries, nil
}
