package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// CreateInvoiceRequestDTO represents the incoming JSON body for creating an invoice.
// We separate this from domain models to decouple API contract from internal logic.
type CreateInvoiceRequestDTO struct {
	CustomerID     uuid.UUID        `json:"customer_id" validate:"required"`
	WarehouseID    uuid.UUID        `json:"warehouse_id" validate:"required"`
	Items          []InvoiceItemDTO `json:"items" validate:"required,min=1,dive"`
	IdempotencyKey uuid.UUID        `json:"idempotency_key" validate:"required"`
}

type InvoiceItemDTO struct {
	ProductID uuid.UUID       `json:"product_id" validate:"required"`
	Quantity  int             `json:"quantity" validate:"required,min=1"`
	UnitPrice decimal.Decimal `json:"unit_price" validate:"required"` // In real implementation, price might be fetched from DB
}

// InvoiceResponseDTO represents the outgoing JSON structure.
type InvoiceResponseDTO struct {
	ID            uuid.UUID       `json:"id"`
	InvoiceNumber string          `json:"invoice_number"`
	TotalAmount   decimal.Decimal `json:"total_amount"`
	CreatedAt     time.Time       `json:"created_at"`
	Status        string          `json:"status"` // e.g., "created"
}

// InvoiceDetailDTO represents full invoice detail for the detail view.
type InvoiceDetailDTO struct {
	ID            uuid.UUID              `json:"id"`
	InvoiceNumber string                 `json:"invoice_number"`
	TotalAmount   decimal.Decimal        `json:"total_amount"`
	CreatedAt     time.Time              `json:"created_at"`
	CustomerName  string                 `json:"customer_name"`
	WarehouseName string                 `json:"warehouse_name"`
	Items         []InvoiceDetailItemDTO  `json:"items"`
}

type InvoiceDetailItemDTO struct {
	ProductName string          `json:"product_name"`
	Quantity    int             `json:"quantity"`
	Unit        string          `json:"unit"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Total       decimal.Decimal `json:"total"`
}
