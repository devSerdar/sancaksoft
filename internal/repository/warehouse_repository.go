package repository

import (
	"context"
	"fmt"
	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WarehouseRepository struct {
	db *pgxpool.Pool
}

func NewWarehouseRepository(db *pgxpool.Pool) *WarehouseRepository {
	return &WarehouseRepository{db: db}
}

func (r *WarehouseRepository) CreateWarehouse(ctx context.Context, w *domain.Warehouse) error {
	query := `
		INSERT INTO warehouses (id, tenant_id, name, location, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		w.ID,
		w.TenantID,
		w.Name,
		w.Location,
	).Scan(&w.CreatedAt, &w.UpdatedAt)
}

func (r *WarehouseRepository) ListWarehouses(ctx context.Context, tenantID uuid.UUID) ([]domain.Warehouse, error) {
	query := `
		SELECT id, tenant_id, name, location, created_at, updated_at
		FROM warehouses
		WHERE tenant_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to list warehouses: %w", err)
	}
	defer rows.Close()

	var warehouses []domain.Warehouse
	for rows.Next() {
		var w domain.Warehouse
		if err := rows.Scan(
			&w.ID, &w.TenantID, &w.Name, &w.Location, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan warehouse: %w", err)
		}
		warehouses = append(warehouses, w)
	}
	return warehouses, nil
}

func (r *WarehouseRepository) GetWarehouseByID(ctx context.Context, tenantID, warehouseID uuid.UUID) (*domain.Warehouse, error) {
	query := `
		SELECT id, tenant_id, name, location, created_at, updated_at
		FROM warehouses
		WHERE id = $1 AND tenant_id = $2
	`
	row := r.db.QueryRow(ctx, query, warehouseID, tenantID)

	var w domain.Warehouse
	err := row.Scan(
		&w.ID, &w.TenantID, &w.Name, &w.Location, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get warehouse: %w", err)
	}
	return &w, nil
}
