package dto

import (
	"sancaksoft/internal/domain"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type CreateProductRequestDTO struct {
	Name    string          `json:"name" validate:"required"`
	SKU     string          `json:"sku" validate:"required"`
	Barcode string          `json:"barcode"`
	Unit    domain.ProductUnit `json:"unit"`
	Price   decimal.Decimal `json:"price" validate:"required,min=0"`
	VATRate decimal.Decimal `json:"vat_rate" validate:"required,min=0"`
}

type ProductResponseDTO struct {
	ID        uuid.UUID       `json:"id"`
	Name      string          `json:"name"`
	SKU       string          `json:"sku"`
	Barcode   string          `json:"barcode"`
	Unit      domain.ProductUnit `json:"unit"`
	Price     decimal.Decimal `json:"price"`
	VATRate   decimal.Decimal `json:"vat_rate"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}
