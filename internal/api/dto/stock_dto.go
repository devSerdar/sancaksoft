package dto

import (
	"time"

	"sancaksoft/internal/domain"

	"github.com/google/uuid"
)

type StockMovementResponseDTO struct {
	ID            uuid.UUID                `json:"id"`
	ProductID     uuid.UUID                `json:"product_id"`
	WarehouseID   uuid.UUID                `json:"warehouse_id"`
	Quantity      int                      `json:"quantity"`
	Type          domain.StockMovementType `json:"type"`
	ReferenceID   *uuid.UUID               `json:"reference_id"`
	ReferenceType *string                  `json:"reference_type"`
	CreatedAt     time.Time                `json:"created_at"`
}

type CreateStockMovementRequestDTO struct {
	ProductID   uuid.UUID                `json:"product_id" validate:"required"`
	WarehouseID uuid.UUID                `json:"warehouse_id" validate:"required"`
	Quantity    int                      `json:"quantity" validate:"required,gt=0"`
	Type        domain.StockMovementType `json:"type" validate:"required"`
}

type WarehouseStockDTO struct {
	WarehouseID   uuid.UUID `json:"warehouse_id"`
	WarehouseName string    `json:"warehouse_name"`
	Quantity      int       `json:"quantity"`
}