package handler

import (
	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ReturnHandler struct {
	service *service.ReturnService
}

func NewReturnHandler(s *service.ReturnService) *ReturnHandler {
	return &ReturnHandler{service: s}
}

func (h *ReturnHandler) CreateCustomerReturn(c *fiber.Ctx) error {
	var reqDTO dto.CreateCustomerReturnRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)
	userID, _ := c.Locals(middleware.LocalsUserID).(uuid.UUID)

	req := domain.CreateCustomerReturnRequest{
		TenantID:    tenantID,
		UserID:      userID,
		CustomerID:  reqDTO.CustomerID,
		ProductID:   reqDTO.ProductID,
		WarehouseID: reqDTO.WarehouseID,
		Quantity:    reqDTO.Quantity,
		UnitPrice:   reqDTO.UnitPrice,
		Reason:      reqDTO.Reason,
	}

	ret, err := h.service.CreateCustomerReturn(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	resp := dto.CustomerReturnResponseDTO{
		ID:          ret.ID,
		CustomerID:  ret.CustomerID,
		ProductID:   ret.ProductID,
		WarehouseID: ret.WarehouseID,
		Quantity:    ret.Quantity,
		UnitPrice:   ret.UnitPrice,
		Total:       ret.Total,
		Reason:      ret.Reason,
		CreatedAt:   ret.CreatedAt,
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *ReturnHandler) ListCustomerReturns(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)
	returns, err := h.service.ListCustomerReturns(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	resp := make([]dto.CustomerReturnResponseDTO, len(returns))
	for i, r := range returns {
		resp[i] = dto.CustomerReturnResponseDTO{
			ID:          r.ID,
			CustomerID:  r.CustomerID,
			ProductID:   r.ProductID,
			WarehouseID: r.WarehouseID,
			Quantity:    r.Quantity,
			UnitPrice:   r.UnitPrice,
			Total:       r.Total,
			Reason:      r.Reason,
			CreatedAt:   r.CreatedAt,
		}
	}
	return c.JSON(resp)
}

func (h *ReturnHandler) ListCustomerPurchases(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)
	customerIDStr := c.Params("customerId")
	customerID, err := uuid.Parse(customerIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	summaries, err := h.service.ListCustomerPurchaseSummaries(c.Context(), tenantID, customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	resp := make([]dto.CustomerPurchaseSummaryDTO, len(summaries))
	for i, s := range summaries {
		resp[i] = dto.CustomerPurchaseSummaryDTO{
			CustomerID:    s.CustomerID,
			ProductID:     s.ProductID,
			ProductName:   s.ProductName,
			ProductUnit:   string(s.ProductUnit),
			WarehouseID:   s.WarehouseID,
			WarehouseName: s.WarehouseName,
			PurchasedQty:  s.PurchasedQty,
			ReturnedQty:   s.ReturnedQty,
			ReturnableQty: s.ReturnableQty,
			LastUnitPrice: s.LastUnitPrice,
		}
	}
	return c.JSON(resp)
}
