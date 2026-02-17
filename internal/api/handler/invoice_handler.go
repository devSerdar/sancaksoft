package handler

import (
	"errors"

	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

type InvoiceHandler struct {
	service     *service.InvoiceService
	listService *service.InvoiceListService
}

func NewInvoiceHandler(s *service.InvoiceService, ls *service.InvoiceListService) *InvoiceHandler {
	return &InvoiceHandler{
		service:     s,
		listService: ls,
	}
}

// ListInvoices handles GET /invoices
func (h *InvoiceHandler) ListInvoices(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	invoices, err := h.listService.ListInvoices(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(invoices)
}

// CreateInvoice handles POST /invoices
func (h *InvoiceHandler) CreateInvoice(c *fiber.Ctx) error {
	// 1. Parse Request Body
	var reqDTO dto.CreateInvoiceRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	// 2. Extract Context (Tenant/User)
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)
	userID, _ := c.Locals(middleware.LocalsUserID).(uuid.UUID)

	// 3. Map DTO to Domain Request
	// TODO: Use a mapper function or library in production
	domainItems := make([]domain.InvoiceItemRequest, len(reqDTO.Items))
	for i, item := range reqDTO.Items {
		domainItems[i] = domain.InvoiceItemRequest{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
		}
	}

	domainReq := domain.CreateInvoiceRequest{
		TenantID:       tenantID,
		UserID:         userID,
		WarehouseID:    reqDTO.WarehouseID,
		CustomerID:     reqDTO.CustomerID,
		IdempotencyKey: reqDTO.IdempotencyKey,
		Items:          domainItems,
	}

	// 4. Call Service
	invoice, err := h.service.CreateInvoice(c.Context(), domainReq)
	if err != nil {
		// Differentiate errors (e.g. insufficient stock vs internal error)
		// For MVP, generic 500 or 400 based on message check (fragile but works for now)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 5. Map Domain Response to DTO
	respDTO := dto.InvoiceResponseDTO{
		ID:            invoice.ID,
		InvoiceNumber: invoice.InvoiceNumber,
		TotalAmount:   invoice.TotalAmount,
		CreatedAt:     invoice.CreatedAt,
		Status:        "created",
	}

	return c.Status(fiber.StatusCreated).JSON(respDTO)
}

// GetInvoiceDetail handles GET /invoices/:id
func (h *InvoiceHandler) GetInvoiceDetail(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	invoiceID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid invoice id"})
	}

	detail, items, err := h.listService.GetInvoiceDetail(c.Context(), tenantID, invoiceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "invoice not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	itemDTOs := make([]dto.InvoiceDetailItemDTO, len(items))
	for i, it := range items {
		itemDTOs[i] = dto.InvoiceDetailItemDTO{
			ProductName: it.ProductName,
			Quantity:    it.Quantity,
			Unit:        it.Unit,
			UnitPrice:   decimal.NewFromFloat(it.UnitPrice),
			Total:       decimal.NewFromFloat(it.Total),
		}
	}

	resp := dto.InvoiceDetailDTO{
		ID:            detail.ID,
		InvoiceNumber: detail.InvoiceNumber,
		TotalAmount:   decimal.NewFromFloat(detail.TotalAmount),
		CreatedAt:     detail.CreatedAt,
		CustomerName:  detail.CustomerName,
		WarehouseName: detail.WarehouseName,
		Items:         itemDTOs,
	}

	return c.JSON(resp)
}
