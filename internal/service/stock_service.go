package service

import (
	"context"
	"fmt"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
)

type StockService struct {
	repo *repository.StockRepository
}

func NewStockService(repo *repository.StockRepository) *StockService {
	return &StockService{repo: repo}
}

func (s *StockService) ListStockMovements(ctx context.Context, tenantID uuid.UUID) ([]domain.StockMovement, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.ListStockMovements(ctx, tenantID)
}

func (s *StockService) GetStockBalance(ctx context.Context, tenantID, productID, warehouseID uuid.UUID) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetStockBalance(ctx, tenantID, productID, warehouseID)
}

func (s *StockService) CreateStockMovement(ctx context.Context, tenantID uuid.UUID, movement *domain.StockMovement) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	movement.TenantID = tenantID

	// For OUT movements, validate sufficient stock in warehouse
	if movement.Type == domain.StockMovementTypeOut {
		currentStock, err := s.repo.GetStockBalance(ctx, tenantID, movement.ProductID, movement.WarehouseID)
		if err != nil {
			return err
		}
		deductQty := -movement.Quantity
		if currentStock < deductQty {
			return fmt.Errorf("insufficient stock in warehouse. Available: %d, Requested: %d", currentStock, deductQty)
		}
	}

	return s.repo.CreateStockMovement(ctx, movement)
}

func (s *StockService) GetTotalStockBalance(ctx context.Context, tenantID, productID uuid.UUID) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetTotalStockBalance(ctx, tenantID, productID)
}

// WarehouseStock holds per-warehouse stock for a product.
type WarehouseStock struct {
	WarehouseID   uuid.UUID
	WarehouseName string
	Quantity      int
}

func (s *StockService) GetStockBalanceByWarehouse(ctx context.Context, tenantID, productID uuid.UUID) ([]WarehouseStock, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := s.repo.GetStockBalanceByWarehouse(ctx, tenantID, productID)
	if err != nil {
		return nil, err
	}
	result := make([]WarehouseStock, len(rows))
	for i, r := range rows {
		result[i] = WarehouseStock{
			WarehouseID:   r.WarehouseID,
			WarehouseName: r.WarehouseName,
			Quantity:      r.Quantity,
		}
	}
	return result, nil
}