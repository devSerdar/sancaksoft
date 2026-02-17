package service

import (
	"context"
	"fmt"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type PaymentService struct {
	paymentRepo *repository.PaymentRepository
}

func NewPaymentService(paymentRepo *repository.PaymentRepository) *PaymentService {
	return &PaymentService{paymentRepo: paymentRepo}
}

// CreatePayment creates a new customer payment
func (s *PaymentService) CreatePayment(ctx context.Context, req *domain.CreatePaymentRequest) (*domain.CustomerPayment, error) {
	// Validate amount
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("payment amount must be greater than zero")
	}

	// Validate payment method
	validMethods := map[domain.PaymentMethod]bool{
		domain.PaymentMethodCash:         true,
		domain.PaymentMethodBankTransfer: true,
		domain.PaymentMethodCreditCard:   true,
		domain.PaymentMethodCheck:        true,
	}
	if !validMethods[req.PaymentMethod] {
		return nil, fmt.Errorf("invalid payment method: %s", req.PaymentMethod)
	}

	// Set payment date to now if not provided
	paymentDate := req.PaymentDate
	if paymentDate.IsZero() {
		paymentDate = time.Now()
	}

	payment := &domain.CustomerPayment{
		ID:            uuid.New(),
		TenantID:      req.TenantID,
		CustomerID:    req.CustomerID,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		ReferenceNo:   req.ReferenceNo,
		Notes:         req.Notes,
		PaymentDate:   paymentDate,
	}

	if err := s.paymentRepo.CreatePayment(ctx, payment); err != nil {
		return nil, fmt.Errorf("failed to create payment: %w", err)
	}

	return payment, nil
}

// ListPaymentsByCustomer returns all payments for a customer
func (s *PaymentService) ListPaymentsByCustomer(ctx context.Context, tenantID, customerID uuid.UUID) ([]domain.CustomerPayment, error) {
	return s.paymentRepo.ListPaymentsByCustomer(ctx, tenantID, customerID)
}

// GetCustomerBalance returns the current balance for a customer
func (s *PaymentService) GetCustomerBalance(ctx context.Context, tenantID, customerID uuid.UUID) (*domain.CustomerBalanceDetail, error) {
	return s.paymentRepo.GetCustomerBalance(ctx, tenantID, customerID)
}

// GetCustomerLedgerDetail returns detailed ledger with all transactions
func (s *PaymentService) GetCustomerLedgerDetail(ctx context.Context, tenantID, customerID uuid.UUID) ([]domain.CustomerLedgerDetailEntry, error) {
	return s.paymentRepo.GetCustomerLedgerDetail(ctx, tenantID, customerID)
}
