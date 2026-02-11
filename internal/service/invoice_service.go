package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository" // Assuming repository package

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type InvoiceService struct {
	db   *pgxpool.Pool
	repo *repository.InvoiceRepository
}

func NewInvoiceService(db *pgxpool.Pool, repo *repository.InvoiceRepository) *InvoiceService {
	return &InvoiceService{db: db, repo: repo}
}

// CreateInvoice handles the creation of an invoice using the repository pattern.
func (s *InvoiceService) CreateInvoice(ctx context.Context, req domain.CreateInvoiceRequest) (*domain.Invoice, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if len(req.Items) == 0 {
		return nil, errors.New("invoice must have at least one item")
	}

	var createdInvoice *domain.Invoice

	// Transaction Wrapper
	err := WithTransaction(ctx, s.db, func(tx pgx.Tx) error {
		// 1. Idempotency
		if req.IdempotencyKey != uuid.Nil {
			if err := s.repo.CheckIdempotency(ctx, tx, req.TenantID, req.IdempotencyKey); err != nil {
				return err
			}
		}

		// 2. Invoice Number
		invoiceNumber, err := s.repo.GenerateNextInvoiceNumber(ctx, tx, req.TenantID)
		if err != nil {
			return err
		}

		// 3. Calc Total
		var totalAmount decimal.Decimal
		for _, item := range req.Items {
			lineTotal := item.UnitPrice.Mul(decimal.NewFromInt(int64(item.Quantity)))
			totalAmount = totalAmount.Add(lineTotal)
		}

		// 4. Create Invoice Object
		invoiceID := uuid.New()
		invoice := &domain.Invoice{
			ID:            invoiceID,
			TenantID:      req.TenantID,
			WarehouseID:   req.WarehouseID,
			CustomerID:    req.CustomerID,
			InvoiceNumber: invoiceNumber,
			TotalAmount:   totalAmount,
		}

		// 5. Save Invoice
		if err := s.repo.CreateInvoice(ctx, tx, invoice, req.IdempotencyKey); err != nil {
			return fmt.Errorf("failed to create invoice: %w", err)
		}

		// 6. Process Items
		for _, itemReq := range req.Items {
			// A. Lock Product
			if err := s.repo.LockProduct(ctx, tx, req.TenantID, itemReq.ProductID); err != nil {
				return err
			}

			// B. Check Stock
			currentStock, err := s.repo.GetStockBalance(ctx, tx, req.TenantID, itemReq.ProductID, req.WarehouseID)
			if err != nil {
				return err
			}
			if currentStock < itemReq.Quantity {
				return fmt.Errorf("insufficient stock for product %s. Available: %d, Requested: %d", itemReq.ProductID, currentStock, itemReq.Quantity)
			}

			// C. Create Invoice Item
			lineTotal := itemReq.UnitPrice.Mul(decimal.NewFromInt(int64(itemReq.Quantity)))
			item := &domain.InvoiceItem{
				ID:        uuid.New(),
				TenantID:  req.TenantID,
				InvoiceID: invoiceID,
				ProductID: itemReq.ProductID,
				Quantity:  itemReq.Quantity,
				UnitPrice: itemReq.UnitPrice,
				Total:     lineTotal,
			}
			if err := s.repo.CreateInvoiceItem(ctx, tx, item); err != nil {
				return fmt.Errorf("failed to create invoice item: %w", err)
			}

			// D. Stock Movement
			refType := "INVOICE"
			movement := &domain.StockMovement{
				ID:            uuid.New(),
				TenantID:      req.TenantID,
				ProductID:     itemReq.ProductID,
				WarehouseID:   req.WarehouseID,
				Quantity:      -itemReq.Quantity, // Negative!
				Type:          domain.StockMovementTypeSale,
				ReferenceID:   &invoiceID,
				ReferenceType: &refType,
			}
			if err := s.repo.CreateStockMovement(ctx, tx, movement); err != nil {
				return fmt.Errorf("failed to create stock movement: %w", err)
			}
		}

		// 7. Audit Log
		auditLog := &domain.AuditLog{
			ID:         uuid.New(),
			TenantID:   req.TenantID,
			UserID:     req.UserID,
			EntityType: "INVOICE",
			EntityID:   invoiceID,
			Action:     "CREATE",
		}
		if err := s.repo.CreateAuditLog(ctx, tx, auditLog); err != nil {
			return fmt.Errorf("failed to create audit log: %w", err)
		}

		createdInvoice = invoice
		return nil
	})

	if err != nil {
		return nil, err
	}

	return createdInvoice, nil
}
