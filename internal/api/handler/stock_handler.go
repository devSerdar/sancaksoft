package handler

import (
	"strings"

	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type StockHandler struct {
	service *service.StockService
}

func NewStockHandler(s *service.StockService) *StockHandler {
	return &StockHandler{service: s}
}

// ListStockMovements handles GET /stock-movements
func (h *StockHandler) ListStockMovements(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	movements, err := h.service.ListStockMovements(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	resp := make([]dto.StockMovementResponseDTO, len(movements))
	for i, m := range movements {
		resp[i] = dto.StockMovementResponseDTO{
			ID:            m.ID,
			ProductID:     m.ProductID,
			WarehouseID:   m.WarehouseID,
			Quantity:      m.Quantity,
			Type:          m.Type,
			ReferenceID:   m.ReferenceID,
			ReferenceType: m.ReferenceType,
			CreatedAt:     m.CreatedAt,
		}
	}

	return c.JSON(resp)
}

// GetStockBalance handles GET /stock-balance?product_id=...&warehouse_id=...
func (h *StockHandler) GetStockBalance(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	productIDStr := c.Query("product_id")
	warehouseIDStr := c.Query("warehouse_id")

	if productIDStr == "" || warehouseIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "product_id and warehouse_id query parameters are required",
		})
	}

	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid product_id format",
		})
	}

	warehouseID, err := uuid.Parse(warehouseIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid warehouse_id format",
		})
	}

	balance, err := h.service.GetStockBalance(c.Context(), tenantID, productID, warehouseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"product_id":   productID,
		"warehouse_id": warehouseID,
		"stock":         balance,
	})
}

// CreateStockMovement handles POST /stock-movements
func (h *StockHandler) CreateStockMovement(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	var reqDTO dto.CreateStockMovementRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	// Validate movement type
	if reqDTO.Type != domain.StockMovementTypeIn && reqDTO.Type != domain.StockMovementTypeOut {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "type must be either 'IN' or 'OUT'",
		})
	}

	// Create domain model
	movement := &domain.StockMovement{
		ID:          uuid.New(),
		ProductID:   reqDTO.ProductID,
		WarehouseID: reqDTO.WarehouseID,
		Quantity:    reqDTO.Quantity,
		Type:        reqDTO.Type,
	}

	// For IN movements, quantity should be positive
	// For OUT movements, quantity should be negative
	if reqDTO.Type == domain.StockMovementTypeOut {
		movement.Quantity = -reqDTO.Quantity
	}

	if err := h.service.CreateStockMovement(c.Context(), tenantID, movement); err != nil {
		if strings.HasPrefix(err.Error(), "insufficient stock") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTO := dto.StockMovementResponseDTO{
		ID:            movement.ID,
		ProductID:     movement.ProductID,
		WarehouseID:   movement.WarehouseID,
		Quantity:      movement.Quantity,
		Type:          movement.Type,
		ReferenceID:   movement.ReferenceID,
		ReferenceType: movement.ReferenceType,
		CreatedAt:     movement.CreatedAt,
	}

	return c.Status(fiber.StatusCreated).JSON(respDTO)
}

// GetTotalStockBalance handles GET /stock-balance-total?product_id=...
func (h *StockHandler) GetTotalStockBalance(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	productIDStr := c.Query("product_id")
	if productIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "product_id query parameter is required",
		})
	}

	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid product_id format",
		})
	}

	totalStock, err := h.service.GetTotalStockBalance(c.Context(), tenantID, productID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"product_id":   productID,
		"total_stock": totalStock,
	})
}

// GetStockBalanceByWarehouse handles GET /stock-balance-by-warehouse?product_id=...
func (h *StockHandler) GetStockBalanceByWarehouse(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	productIDStr := c.Query("product_id")
	if productIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "product_id query parameter is required",
		})
	}

	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid product_id format",
		})
	}

	items, err := h.service.GetStockBalanceByWarehouse(c.Context(), tenantID, productID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	resp := make([]dto.WarehouseStockDTO, len(items))
	for i, item := range items {
		resp[i] = dto.WarehouseStockDTO{
			WarehouseID:   item.WarehouseID,
			WarehouseName: item.WarehouseName,
			Quantity:      item.Quantity,
		}
	}

	return c.JSON(resp)
}