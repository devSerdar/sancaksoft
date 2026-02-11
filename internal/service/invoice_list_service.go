package service

import (
	"context"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
)

type InvoiceListService struct {
	repo *repository.InvoiceListRepository
}

func NewInvoiceListService(repo *repository.InvoiceListRepository) *InvoiceListService {
	return &InvoiceListService{repo: repo}
}

func (s *InvoiceListService) ListInvoices(ctx context.Context, tenantID uuid.UUID) ([]domain.Invoice, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.ListInvoices(ctx, tenantID)
}

func (s *InvoiceListService) GetInvoiceDetail(ctx context.Context, tenantID, invoiceID uuid.UUID) (*repository.InvoiceDetail, []repository.InvoiceDetailItem, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetInvoiceDetail(ctx, tenantID, invoiceID)
}
