package handler

import (
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type DashboardHandler struct {
	service *service.DashboardService
}

func NewDashboardHandler(s *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{service: s}
}

// GetStats handles GET /dashboard/stats
func (h *DashboardHandler) GetStats(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	stats, err := h.service.GetDashboardStats(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(stats)
}
