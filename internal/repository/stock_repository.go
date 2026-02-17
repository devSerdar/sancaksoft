package repository

import (
	"context"
	"fmt"
	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StockRepository struct {
	db *pgxpool.Pool
}

func NewStockRepository(db *pgxpool.Pool) *StockRepository {
	return &StockRepository{db: db}
}

// ListStockMovements retrieves stock movements with optional filtering.
// For now, it filters by tenantID. In production, we'd add productID/warehouseID filters.
func (r *StockRepository) ListStockMovements(ctx context.Context, tenantID uuid.UUID) ([]domain.StockMovement, error) {
	query := `
		SELECT id, tenant_id, product_id, warehouse_id, quantity, type, reference_id, reference_type, created_at
		FROM stock_movements
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to list stock movements: %w", err)
	}
	defer rows.Close()

	var movements []domain.StockMovement
	for rows.Next() {
		var sm domain.StockMovement
		if err := rows.Scan(
			&sm.ID, &sm.TenantID, &sm.ProductID, &sm.WarehouseID, &sm.Quantity, &sm.Type, &sm.ReferenceID, &sm.ReferenceType, &sm.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan stock movement: %w", err)
		}
		movements = append(movements, sm)
	}
	return movements, nil
}

// GetStockBalance returns the current stock balance for a product in a warehouse.
func (r *StockRepository) GetStockBalance(ctx context.Context, tenantID, productID, warehouseID uuid.UUID) (int, error) {
	var currentStock int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0)
		FROM stock_movements
		WHERE tenant_id = $1 AND product_id = $2 AND warehouse_id = $3
	`, tenantID, productID, warehouseID).Scan(&currentStock)
	if err != nil {
		return 0, fmt.Errorf("failed to get stock balance: %w", err)
	}
	return currentStock, nil
}

// GetTotalStockBalance returns the total stock balance for a product across all warehouses.
func (r *StockRepository) GetTotalStockBalance(ctx context.Context, tenantID, productID uuid.UUID) (int, error) {
	var totalStock int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0)
		FROM stock_movements
		WHERE tenant_id = $1 AND product_id = $2
	`, tenantID, productID).Scan(&totalStock)
	if err != nil {
		return 0, fmt.Errorf("failed to get total stock balance: %w", err)
	}
	return totalStock, nil
}

// GetStockBalanceByWarehouse returns stock balance per warehouse for a product.
func (r *StockRepository) GetStockBalanceByWarehouse(ctx context.Context, tenantID, productID uuid.UUID) ([]struct {
	WarehouseID   uuid.UUID
	WarehouseName string
	Quantity      int
}, error) {
	query := `
		SELECT w.id, w.name, COALESCE(SUM(sm.quantity), 0)::int as quantity
		FROM warehouses w
		LEFT JOIN stock_movements sm ON sm.warehouse_id = w.id 
			AND sm.tenant_id = $1 AND sm.product_id = $2
		WHERE w.tenant_id = $1
		GROUP BY w.id, w.name
		ORDER BY quantity DESC
	`
	rows, err := r.db.Query(ctx, query, tenantID, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stock by warehouse: %w", err)
	}
	defer rows.Close()

	var result []struct {
		WarehouseID   uuid.UUID
		WarehouseName string
		Quantity      int
	}
	for rows.Next() {
		var row struct {
			WarehouseID   uuid.UUID
			WarehouseName string
			Quantity      int
		}
		if err := rows.Scan(&row.WarehouseID, &row.WarehouseName, &row.Quantity); err != nil {
			return nil, fmt.Errorf("failed to scan stock by warehouse: %w", err)
		}
		result = append(result, row)
	}
	return result, nil
}

// CreateStockMovement inserts a stock movement record.
func (r *StockRepository) CreateStockMovement(ctx context.Context, movement *domain.StockMovement) error {
	query := `
		INSERT INTO stock_movements (
			id, tenant_id, product_id, warehouse_id, 
			quantity, type, reference_id, reference_type, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
	`
	_, err := r.db.Exec(ctx, query,
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