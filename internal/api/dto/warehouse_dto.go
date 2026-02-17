package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateWarehouseRequestDTO struct {
	Name     string `json:"name" validate:"required"`
	Location string `json:"location"`
}

type WarehouseResponseDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Location  string    `json:"location"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
