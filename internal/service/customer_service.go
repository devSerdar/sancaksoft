package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
)

type CustomerService struct {
	repo *repository.CustomerRepository
}

func NewCustomerService(repo *repository.CustomerRepository) *CustomerService {
	return &CustomerService{repo: repo}
}

func (s *CustomerService) CreateCustomer(ctx context.Context, c *domain.Customer) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if c.Name == "" {
		return errors.New("customer name is required")
	}

	c.ID = uuid.New()
	return s.repo.CreateCustomer(ctx, c)
}

func (s *CustomerService) GetCustomer(ctx context.Context, tenantID, customerID uuid.UUID) (*domain.Customer, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetCustomerByID(ctx, tenantID, customerID)
}

func (s *CustomerService) ListCustomers(ctx context.Context, tenantID uuid.UUID) ([]domain.Customer, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.ListCustomers(ctx, tenantID)
}

func (s *CustomerService) ListCustomerLedger(ctx context.Context, tenantID, customerID uuid.UUID, period string) ([]domain.CustomerLedgerEntry, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	switch period {
	case "day", "week", "month":
	default:
		return nil, fmt.Errorf("invalid period: %s", period)
	}

	return s.repo.ListCustomerLedger(ctx, tenantID, customerID, period)
}
