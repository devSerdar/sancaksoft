package handler

import (
	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type WarehouseHandler struct {
	service *service.WarehouseService
}

func NewWarehouseHandler(s *service.WarehouseService) *WarehouseHandler {
	return &WarehouseHandler{service: s}
}

func (h *WarehouseHandler) CreateWarehouse(c *fiber.Ctx) error {
	var reqDTO dto.CreateWarehouseRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "details": err.Error()})
	}

	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	w := &domain.Warehouse{
		TenantID: tenantID,
		Name:     reqDTO.Name,
		Location: reqDTO.Location,
	}

	if err := h.service.CreateWarehouse(c.Context(), w); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(dto.WarehouseResponseDTO{
		ID:        w.ID,
		Name:      w.Name,
		Location:  w.Location,
		CreatedAt: w.CreatedAt,
		UpdatedAt: w.UpdatedAt,
	})
}

func (h *WarehouseHandler) ListWarehouses(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	warehouses, err := h.service.ListWarehouses(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	resp := make([]dto.WarehouseResponseDTO, len(warehouses))
	for i, w := range warehouses {
		resp[i] = dto.WarehouseResponseDTO{
			ID:        w.ID,
			Name:      w.Name,
			Location:  w.Location,
			CreatedAt: w.CreatedAt,
			UpdatedAt: w.UpdatedAt,
		}
	}

	return c.JSON(resp)
}
