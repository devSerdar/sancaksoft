package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	HeaderTenantID = "X-Tenant-ID"
	HeaderUserID   = "X-User-ID"
	LocalsTenantID = "tenant_id"
	LocalsUserID   = "user_id"
)

// TenantMiddleware extracts the tenant ID from headers and validates it.
// In a real scenario, this would check against a cache or database.
func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantIDStr := c.Get(HeaderTenantID)
		if tenantIDStr == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "X-Tenant-ID header is required",
			})
		}

		tenantID, err := uuid.Parse(tenantIDStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid X-Tenant-ID format",
			})
		}

		// Store in locals for handlers to access
		c.Locals(LocalsTenantID, tenantID)
		return c.Next()
	}
}

// AuthMiddleware extracts the user ID.
// In production, this would validate JWT tokens.
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Mock Auth: Expect X-User-ID for now
		userIDStr := c.Get(HeaderUserID)
		if userIDStr == "" {
			// For MVP/Debug, we might allow bypassing or return 401
			// Let's enforce it for enterprise grade simulation
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required (X-User-ID missing)",
			})
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid User ID",
			})
		}

		c.Locals(LocalsUserID, userID)
		return c.Next()
	}
}
