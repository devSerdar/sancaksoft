package service

import (
	"context"
	"errors"
	"time"

	"sancaksoft/internal/domain"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
)

type ProductService struct {
	repo *repository.ProductRepository
}

func NewProductService(repo *repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

func (s *ProductService) CreateProduct(ctx context.Context, p *domain.Product) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if p.Name == "" || p.SKU == "" {
		return errors.New("name and SKU are required")
	}
	if p.Unit == "" {
		p.Unit = domain.ProductUnitPiece
	}
	if p.Unit != domain.ProductUnitPiece && p.Unit != domain.ProductUnitKg {
		return errors.New("unit must be 'adet' or 'kg'")
	}

	p.ID = uuid.New()
	return s.repo.CreateProduct(ctx, p)
}

func (s *ProductService) GetProduct(ctx context.Context, tenantID, productID uuid.UUID) (*domain.Product, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetProductByID(ctx, tenantID, productID)
}

func (s *ProductService) ListProducts(ctx context.Context, tenantID uuid.UUID) ([]domain.Product, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.ListProducts(ctx, tenantID)
}
