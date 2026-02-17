package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type CreateCustomerRequestDTO struct {
	Name    string `json:"name" validate:"required"`
	Email   string `json:"email" validate:"email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}

type CustomerResponseDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Address   string    `json:"address"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CustomerLedgerEntryDTO struct {
	PeriodStart  time.Time       `json:"period_start"`
	SalesAmount  decimal.Decimal `json:"sales_amount"`
	ReturnAmount decimal.Decimal `json:"return_amount"`
	NetAmount    decimal.Decimal `json:"net_amount"`
}
