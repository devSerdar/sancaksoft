package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Product represents the product entity
type Product struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenant_id"`
	Name      string          `json:"name"`
	SKU       string          `json:"sku"`
	Barcode   string          `json:"barcode"`
	Unit      ProductUnit     `json:"unit"` // "adet" or "kg"
	Price     decimal.Decimal `json:"price"`
	VATRate   decimal.Decimal `json:"vat_rate"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// Customer represents the customer entity
type Customer struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Address   string    `json:"address"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CustomerLedgerEntry represents aggregated customer movement by time bucket.
type CustomerLedgerEntry struct {
	PeriodStart  time.Time       `json:"period_start"`
	SalesAmount  decimal.Decimal `json:"sales_amount"`
	ReturnAmount decimal.Decimal `json:"return_amount"`
	NetAmount    decimal.Decimal `json:"net_amount"`
}

// Warehouse represents the warehouse entity
type Warehouse struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Name      string    `json:"name"`
	Location  string    `json:"location"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Invoice represents the invoice entity
type Invoice struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenant_id"`
	WarehouseID   uuid.UUID       `json:"warehouse_id"`
	CustomerID    uuid.UUID       `json:"customer_id"`
	InvoiceNumber string          `json:"invoice_number"`
	TotalAmount   decimal.Decimal `json:"total_amount"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// InvoiceItem represents a line item in an invoice
type InvoiceItem struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenant_id"`
	InvoiceID uuid.UUID       `json:"invoice_id"`
	ProductID uuid.UUID       `json:"product_id"`
	Quantity  int             `json:"quantity"`
	UnitPrice decimal.Decimal `json:"unit_price"`
	Total     decimal.Decimal `json:"total"`
	CreatedAt time.Time       `json:"created_at"`
}

// StockMovement represents a change in stock levels
type StockMovement struct {
	ID            uuid.UUID         `json:"id"`
	TenantID      uuid.UUID         `json:"tenant_id"`
	ProductID     uuid.UUID         `json:"product_id"`
	WarehouseID   uuid.UUID         `json:"warehouse_id"`
	Quantity      int               `json:"quantity"`
	Type          StockMovementType `json:"type"`
	ReferenceID   *uuid.UUID        `json:"reference_id"`
	ReferenceType *string           `json:"reference_type"`
	CreatedAt     time.Time         `json:"created_at"`
}

// AuditLog represents an audit entry
type AuditLog struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	UserID     uuid.UUID `json:"user_id"`
	EntityType string    `json:"entity_type"`
	EntityID   uuid.UUID `json:"entity_id"`
	Action     string    `json:"action"`
	CreatedAt  time.Time `json:"created_at"`
}

// CreateInvoiceRequest is the DTO for creating a new invoice
type CreateInvoiceRequest struct {
	TenantID       uuid.UUID            `json:"tenant_id"`
	UserID         uuid.UUID            `json:"user_id"` // For Audit Log
	WarehouseID    uuid.UUID            `json:"warehouse_id"`
	CustomerID     uuid.UUID            `json:"customer_id"`
	IdempotencyKey uuid.UUID            `json:"idempotency_key"` // Critical for safety
	Items          []InvoiceItemRequest `json:"items"`
}

type InvoiceItemRequest struct {
	ProductID uuid.UUID       `json:"product_id"`
	Quantity  int             `json:"quantity"` // Must be > 0
	UnitPrice decimal.Decimal `json:"unit_price"`
}

// CustomerReturn represents a product return made by a customer.
type CustomerReturn struct {
	ID          uuid.UUID       `json:"id"`
	TenantID    uuid.UUID       `json:"tenant_id"`
	CustomerID  uuid.UUID       `json:"customer_id"`
	ProductID   uuid.UUID       `json:"product_id"`
	WarehouseID uuid.UUID       `json:"warehouse_id"`
	Quantity    int             `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Total       decimal.Decimal `json:"total"`
	Reason      string          `json:"reason"`
	CreatedAt   time.Time       `json:"created_at"`
}

type CreateCustomerReturnRequest struct {
	TenantID    uuid.UUID       `json:"tenant_id"`
	UserID      uuid.UUID       `json:"user_id"`
	CustomerID  uuid.UUID       `json:"customer_id"`
	ProductID   uuid.UUID       `json:"product_id"`
	WarehouseID uuid.UUID       `json:"warehouse_id"`
	Quantity    int             `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Reason      string          `json:"reason"`
}

// CustomerPurchaseSummary represents what a customer bought and what is still returnable.
type CustomerPurchaseSummary struct {
	CustomerID    uuid.UUID       `json:"customer_id"`
	ProductID     uuid.UUID       `json:"product_id"`
	ProductName   string          `json:"product_name"`
	ProductUnit   ProductUnit     `json:"product_unit"`
	WarehouseID   uuid.UUID       `json:"warehouse_id"`
	WarehouseName string          `json:"warehouse_name"`
	PurchasedQty  int             `json:"purchased_qty"`
	ReturnedQty   int             `json:"returned_qty"`
	ReturnableQty int             `json:"returnable_qty"`
	LastUnitPrice decimal.Decimal `json:"last_unit_price"`
}

// StockMovementType defines the type of movement
type StockMovementType string

const (
	StockMovementTypeSale StockMovementType = "SALE"
	StockMovementTypeIn   StockMovementType = "IN"
	StockMovementTypeOut  StockMovementType = "OUT"
)

type ProductUnit string

const (
	ProductUnitPiece ProductUnit = "adet"
	ProductUnitKg    ProductUnit = "kg"
)
