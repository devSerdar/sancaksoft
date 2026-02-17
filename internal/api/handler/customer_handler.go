package handler

import (
	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CustomerHandler struct {
	service *service.CustomerService
}

func NewCustomerHandler(s *service.CustomerService) *CustomerHandler {
	return &CustomerHandler{service: s}
}

// CreateCustomer handles POST /customers
func (h *CustomerHandler) CreateCustomer(c *fiber.Ctx) error {
	var reqDTO dto.CreateCustomerRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "details": err.Error()})
	}

	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	customer := &domain.Customer{
		TenantID: tenantID,
		Name:     reqDTO.Name,
		Email:    reqDTO.Email,
		Phone:    reqDTO.Phone,
		Address:  reqDTO.Address,
	}

	if err := h.service.CreateCustomer(c.Context(), customer); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTO := dto.CustomerResponseDTO{
		ID:        customer.ID,
		Name:      customer.Name,
		Email:     customer.Email,
		Phone:     customer.Phone,
		Address:   customer.Address,
		CreatedAt: customer.CreatedAt,
		UpdatedAt: customer.UpdatedAt,
	}

	return c.Status(fiber.StatusCreated).JSON(respDTO)
}

// ListCustomers handles GET /customers
func (h *CustomerHandler) ListCustomers(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	customers, err := h.service.ListCustomers(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTOs := make([]dto.CustomerResponseDTO, len(customers))
	for i, cust := range customers {
		respDTOs[i] = dto.CustomerResponseDTO{
			ID:        cust.ID,
			Name:      cust.Name,
			Email:     cust.Email,
			Phone:     cust.Phone,
			Address:   cust.Address,
			CreatedAt: cust.CreatedAt,
			UpdatedAt: cust.UpdatedAt,
		}
	}

	return c.JSON(respDTOs)
}

// GetCustomerLedger handles GET /customers/:customerId/ledger?period=day|week|month
func (h *CustomerHandler) GetCustomerLedger(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)
	customerID, err := uuid.Parse(c.Params("customerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	period := c.Query("period", "day")
	entries, err := h.service.ListCustomerLedger(c.Context(), tenantID, customerID, period)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	resp := make([]dto.CustomerLedgerEntryDTO, len(entries))
	for i, e := range entries {
		resp[i] = dto.CustomerLedgerEntryDTO{
			PeriodStart:  e.PeriodStart,
			SalesAmount:  e.SalesAmount,
			ReturnAmount: e.ReturnAmount,
			NetAmount:    e.NetAmount,
		}
	}
	return c.JSON(resp)
}
