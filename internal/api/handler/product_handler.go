package handler

import (
	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/domain"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ProductHandler struct {
	service *service.ProductService
}

func NewProductHandler(s *service.ProductService) *ProductHandler {
	return &ProductHandler{service: s}
}

// CreateProduct handles POST /products
func (h *ProductHandler) CreateProduct(c *fiber.Ctx) error {
	var reqDTO dto.CreateProductRequestDTO
	if err := c.BodyParser(&reqDTO); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "details": err.Error()})
	}

	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	product := &domain.Product{
		TenantID: tenantID,
		Name:     reqDTO.Name,
		SKU:      reqDTO.SKU,
		Barcode:  reqDTO.Barcode,
		Unit:     reqDTO.Unit,
		Price:    reqDTO.Price,
		VATRate:  reqDTO.VATRate,
	}

	if err := h.service.CreateProduct(c.Context(), product); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTO := dto.ProductResponseDTO{
		ID:        product.ID,
		Name:      product.Name,
		SKU:       product.SKU,
		Barcode:   product.Barcode,
		Unit:      product.Unit,
		Price:     product.Price,
		VATRate:   product.VATRate,
		CreatedAt: product.CreatedAt,
		UpdatedAt: product.UpdatedAt,
	}

	return c.Status(fiber.StatusCreated).JSON(respDTO)
}

// ListProducts handles GET /products
func (h *ProductHandler) ListProducts(c *fiber.Ctx) error {
	tenantID, _ := c.Locals(middleware.LocalsTenantID).(uuid.UUID)

	products, err := h.service.ListProducts(c.Context(), tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	respDTOs := make([]dto.ProductResponseDTO, len(products))
	for i, p := range products {
		respDTOs[i] = dto.ProductResponseDTO{
			ID:        p.ID,
			Name:      p.Name,
			SKU:       p.SKU,
			Barcode:   p.Barcode,
			Unit:      p.Unit,
			Price:     p.Price,
			VATRate:   p.VATRate,
			CreatedAt: p.CreatedAt,
			UpdatedAt: p.UpdatedAt,
		}
	}

	return c.JSON(respDTOs)
}
