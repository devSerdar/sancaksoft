package handler

import (
	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PaymentHandler struct {
	service *service.PaymentService
}

func NewPaymentHandler(s *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{service: s}
}

// CreatePayment handles POST /payments
func (h *PaymentHandler) CreatePayment(c *fiber.Ctx) error {
	var reqDTO dto.CreatePaymentRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "details": err.Error()})
	}

	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)
	userID, _ := c.Locals(middleware.LocalsUserID).(uuid.UUID)

	// Set payment date
	paymentDate := time.Now()
	if reqDTO.PaymentDate != nil {
		paymentDate = *reqDTO.PaymentDate
	}

	req := &domain.CreatePaymentRequest{
		TenantID:      tenantID,
		UserID:        userID,
		CustomerID:    reqDTO.CustomerID,
		Amount:        reqDTO.Amount,
		PaymentMethod: domain.PaymentMethod(reqDTO.PaymentMethod),
		ReferenceNo:   reqDTO.ReferenceNo,
		Notes:         reqDTO.Notes,
		PaymentDate:   paymentDate,
	}

	payment, err := h.service.CreatePayment(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	respDTO := dto.PaymentResponseDTO{
		ID:            payment.ID,
		CustomerID:    payment.CustomerID,
		Amount:        payment.Amount,
		PaymentMethod: string(payment.PaymentMethod),
		ReferenceNo:   payment.ReferenceNo,
		Notes:         payment.Notes,
		PaymentDate:   payment.PaymentDate,
		CreatedAt:     payment.CreatedAt,
	}

	return c.Status(fiber.StatusCreated).JSON(respDTO)
}

// ListPayments handles GET /payments?customer_id=xxx
func (h *PaymentHandler) ListPayments(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	customerIDStr := c.Query("customer_id")
	if customerIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "customer_id is required"})
	}

	customerID, err := uuid.Parse(customerIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer_id"})
	}

	payments, err := h.service.ListPaymentsByCustomer(c.Context(), tenantID, customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTOs := make([]dto.PaymentResponseDTO, len(payments))
	for i, p := range payments {
		respDTOs[i] = dto.PaymentResponseDTO{
			ID:            p.ID,
			CustomerID:    p.CustomerID,
			Amount:        p.Amount,
			PaymentMethod: string(p.PaymentMethod),
			ReferenceNo:   p.ReferenceNo,
			Notes:         p.Notes,
			PaymentDate:   p.PaymentDate,
			CreatedAt:     p.CreatedAt,
		}
	}

	return c.JSON(respDTOs)
}

// UpdatePayment handles PUT /payments/:id
func (h *PaymentHandler) UpdatePayment(c *fiber.Ctx) error {
	paymentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payment id"})
	}
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	var reqDTO dto.UpdatePaymentRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "details": err.Error()})
	}

	paymentDate := time.Now()
	if reqDTO.PaymentDate != nil {
		paymentDate = *reqDTO.PaymentDate
	}

	req := &domain.UpdatePaymentRequest{
		Amount:        reqDTO.Amount,
		PaymentMethod: domain.PaymentMethod(reqDTO.PaymentMethod),
		ReferenceNo:   reqDTO.ReferenceNo,
		Notes:         reqDTO.Notes,
		PaymentDate:   paymentDate,
	}

	payment, err := h.service.UpdatePayment(c.Context(), tenantID, paymentID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	respDTO := dto.PaymentResponseDTO{
		ID:            payment.ID,
		CustomerID:    payment.CustomerID,
		Amount:        payment.Amount,
		PaymentMethod: string(payment.PaymentMethod),
		ReferenceNo:   payment.ReferenceNo,
		Notes:         payment.Notes,
		PaymentDate:   payment.PaymentDate,
		CreatedAt:     payment.CreatedAt,
	}
	return c.JSON(respDTO)
}

// DeletePayment handles DELETE /payments/:id
func (h *PaymentHandler) DeletePayment(c *fiber.Ctx) error {
	paymentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payment id"})
	}
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	if err := h.service.DeletePayment(c.Context(), tenantID, paymentID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetCustomerBalance handles GET /customers/:customerId/balance
func (h *PaymentHandler) GetCustomerBalance(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	customerID, err := uuid.Parse(c.Params("customerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	balance, err := h.service.GetCustomerBalance(c.Context(), tenantID, customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTO := dto.CustomerBalanceResponseDTO{
		CustomerID:     balance.CustomerID,
		CustomerName:   balance.CustomerName,
		TotalSales:     balance.TotalSales,
		TotalReturns:   balance.TotalReturns,
		TotalPayments:  balance.TotalPayments,
		CurrentBalance: balance.CurrentBalance,
	}

	return c.JSON(respDTO)
}

// GetCustomerLedgerDetail handles GET /customers/:customerId/ledger-detail
func (h *PaymentHandler) GetCustomerLedgerDetail(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	customerID, err := uuid.Parse(c.Params("customerId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	// Get balance summary
	balance, err := h.service.GetCustomerBalance(c.Context(), tenantID, customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get detailed ledger entries
	entries, err := h.service.GetCustomerLedgerDetail(c.Context(), tenantID, customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	entryDTOs := make([]dto.LedgerDetailEntryDTO, len(entries))
	for i, e := range entries {
		var pm *string
		if e.PaymentMethod != nil {
			s := string(*e.PaymentMethod)
			pm = &s
		}
		entryDTOs[i] = dto.LedgerDetailEntryDTO{
			ID:            e.ID,
			Date:          e.Date,
			Type:          e.Type,
			Description:   e.Description,
			Debit:         e.Debit,
			Credit:        e.Credit,
			Balance:       e.Balance,
			PaymentMethod: pm,
			ReferenceNo:   e.ReferenceNo,
		}
	}

	respDTO := dto.CustomerLedgerDetailResponseDTO{
		CustomerID:     balance.CustomerID,
		CustomerName:   balance.CustomerName,
		CurrentBalance: balance.CurrentBalance,
		Entries:        entryDTOs,
	}

	return c.JSON(respDTO)
}
