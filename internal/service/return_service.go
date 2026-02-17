package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type ReturnService struct {
	db   *pgxpool.Pool
	repo *repository.ReturnRepository
}

func NewReturnService(db *pgxpool.Pool, repo *repository.ReturnRepository) *ReturnService {
	return &ReturnService{db: db, repo: repo}
}

func (s *ReturnService) CreateCustomerReturn(ctx context.Context, req domain.CreateCustomerReturnRequest) (*domain.CustomerReturn, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if req.Quantity <= 0 {
		return nil, errors.New("quantity must be greater than zero")
	}

	var createdReturn *domain.CustomerReturn
	err := WithTransaction(ctx, s.db, func(tx pgx.Tx) error {
		total := req.UnitPrice.Mul(decimal.NewFromInt(int64(req.Quantity)))
		ret := &domain.CustomerReturn{
			ID:          uuid.New(),
			TenantID:    req.TenantID,
			CustomerID:  req.CustomerID,
			ProductID:   req.ProductID,
			WarehouseID: req.WarehouseID,
			Quantity:    req.Quantity,
			UnitPrice:   req.UnitPrice,
			Total:       total,
			Reason:      req.Reason,
		}

		if err := s.repo.CreateCustomerReturn(ctx, tx, ret); err != nil {
			return fmt.Errorf("failed to create return: %w", err)
		}

		// Returned products are added back to stock.
		refType := "RETURN"
		movement := &domain.StockMovement{
			ID:            uuid.New(),
			TenantID:      req.TenantID,
			ProductID:     req.ProductID,
			WarehouseID:   req.WarehouseID,
			Quantity:      req.Quantity,
			Type:          domain.StockMovementTypeIn,
			ReferenceID:   &ret.ID,
			ReferenceType: &refType,
		}
		if err := s.repo.CreateStockMovement(ctx, tx, movement); err != nil {
			return fmt.Errorf("failed to create return stock movement: %w", err)
		}

		createdReturn = ret
		return nil
	})
	if err != nil {
		return nil, err
	}
	return createdReturn, nil
}

func (s *ReturnService) ListCustomerReturns(ctx context.Context, tenantID uuid.UUID) ([]domain.CustomerReturn, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.repo.ListCustomerReturns(ctx, tenantID)
}

func (s *ReturnService) ListCustomerPurchaseSummaries(ctx context.Context, tenantID, customerID uuid.UUID) ([]domain.CustomerPurchaseSummary, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.repo.ListCustomerPurchaseSummaries(ctx, tenantID, customerID)
}
