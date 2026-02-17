package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// CreatePaymentRequestDTO is the API request for creating a payment
type CreatePaymentRequestDTO struct {
	CustomerID    uuid.UUID       `json:"customer_id" validate:"required"`
	Amount        decimal.Decimal `json:"amount" validate:"required,gt=0"`
	PaymentMethod string          `json:"payment_method" validate:"required"` // cash, bank_transfer, credit_card, check
	ReferenceNo   string          `json:"reference_no"`                       // Dekont no, çek no vs.
	Notes         string          `json:"notes"`
	PaymentDate   *time.Time      `json:"payment_date"` // Optional, defaults to now
}

// UpdatePaymentRequestDTO is the API request for updating a payment
type UpdatePaymentRequestDTO struct {
	Amount        decimal.Decimal `json:"amount" validate:"required,gt=0"`
	PaymentMethod string          `json:"payment_method" validate:"required"`
	ReferenceNo   string          `json:"reference_no"`
	Notes         string          `json:"notes"`
	PaymentDate   *time.Time      `json:"payment_date"` // Optional
}

// PaymentResponseDTO is the API response for a payment
type PaymentResponseDTO struct {
	ID            uuid.UUID       `json:"id"`
	CustomerID    uuid.UUID       `json:"customer_id"`
	Amount        decimal.Decimal `json:"amount"`
	PaymentMethod string          `json:"payment_method"`
	ReferenceNo   string          `json:"reference_no,omitempty"`
	Notes         string          `json:"notes,omitempty"`
	PaymentDate   time.Time       `json:"payment_date"`
	CreatedAt     time.Time       `json:"created_at"`
}

// CustomerBalanceResponseDTO is the API response for customer balance
type CustomerBalanceResponseDTO struct {
	CustomerID     uuid.UUID       `json:"customer_id"`
	CustomerName   string          `json:"customer_name"`
	TotalSales     decimal.Decimal `json:"total_sales"`
	TotalReturns   decimal.Decimal `json:"total_returns"`
	TotalPayments  decimal.Decimal `json:"total_payments"`
	CurrentBalance decimal.Decimal `json:"current_balance"` // Positive = customer owes, Negative = we owe
}

// LedgerDetailEntryDTO is a single ledger entry in detailed view
type LedgerDetailEntryDTO struct {
	ID            uuid.UUID       `json:"id"`
	Date          time.Time       `json:"date"`
	Type          string          `json:"type"` // SALE, RETURN, PAYMENT
	Description   string          `json:"description"`
	Debit         decimal.Decimal `json:"debit"`  // Borç
	Credit        decimal.Decimal `json:"credit"` // Alacak
	Balance       decimal.Decimal `json:"balance"`
	PaymentMethod *string         `json:"payment_method,omitempty"`
	ReferenceNo   *string         `json:"reference_no,omitempty"`
}

// CustomerLedgerDetailResponseDTO is the full ledger detail response
type CustomerLedgerDetailResponseDTO struct {
	CustomerID     uuid.UUID              `json:"customer_id"`
	CustomerName   string                 `json:"customer_name"`
	CurrentBalance decimal.Decimal        `json:"current_balance"`
	Entries        []LedgerDetailEntryDTO `json:"entries"`
}
