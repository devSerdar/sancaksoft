package service

import (
	"context"
	"errors"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
)

type WarehouseService struct {
	repo *repository.WarehouseRepository
}

func NewWarehouseService(repo *repository.WarehouseRepository) *WarehouseService {
	return &WarehouseService{repo: repo}
}

func (s *WarehouseService) CreateWarehouse(ctx context.Context, w *domain.Warehouse) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if w.Name == "" {
		return errors.New("warehouse name is required")
	}

	w.ID = uuid.New()
	return s.repo.CreateWarehouse(ctx, w)
}

func (s *WarehouseService) ListWarehouses(ctx context.Context, tenantID uuid.UUID) ([]domain.Warehouse, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.repo.ListWarehouses(ctx, tenantID)
}
