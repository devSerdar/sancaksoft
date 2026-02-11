package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type CreateCustomerReturnRequestDTO struct {
	CustomerID  uuid.UUID       `json:"customer_id" validate:"required"`
	ProductID   uuid.UUID       `json:"product_id" validate:"required"`
	WarehouseID uuid.UUID       `json:"warehouse_id" validate:"required"`
	Quantity    int             `json:"quantity" validate:"required,min=1"`
	UnitPrice   decimal.Decimal `json:"unit_price" validate:"required,min=0"`
	Reason      string          `json:"reason"`
}

type CustomerReturnResponseDTO struct {
	ID          uuid.UUID       `json:"id"`
	CustomerID  uuid.UUID       `json:"customer_id"`
	ProductID   uuid.UUID       `json:"product_id"`
	WarehouseID uuid.UUID       `json:"warehouse_id"`
	Quantity    int             `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Total       decimal.Decimal `json:"total"`
	Reason      string          `json:"reason"`
	CreatedAt   time.Time       `json:"created_at"`
}

type CustomerPurchaseSummaryDTO struct {
	CustomerID    uuid.UUID       `json:"customer_id"`
	ProductID     uuid.UUID       `json:"product_id"`
	ProductName   string          `json:"product_name"`
	ProductUnit   string          `json:"product_unit"`
	WarehouseID   uuid.UUID       `json:"warehouse_id"`
	WarehouseName string          `json:"warehouse_name"`
	PurchasedQty  int             `json:"purchased_qty"`
	ReturnedQty   int             `json:"returned_qty"`
	ReturnableQty int             `json:"returnable_qty"`
	LastUnitPrice decimal.Decimal `json:"last_unit_price"`
}
