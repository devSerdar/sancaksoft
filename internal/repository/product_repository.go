package repository

import (
	"context"
	"fmt"

	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductRepository struct {
	db *pgxpool.Pool
}

func NewProductRepository(db *pgxpool.Pool) *ProductRepository {
	return &ProductRepository{db: db}
}

// CreateProduct inserts a new product.
func (r *ProductRepository) CreateProduct(ctx context.Context, product *domain.Product) error {
	query := `
		INSERT INTO products (id, tenant_id, name, sku, barcode, unit, price, vat_rate, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		product.ID,
		product.TenantID,
		product.Name,
		product.SKU,
		product.Barcode,
		product.Unit,
		product.Price,
		product.VATRate,
	).Scan(&product.CreatedAt, &product.UpdatedAt)
}

// GetProductByID retrieves a product by ID and TenantID.
func (r *ProductRepository) GetProductByID(ctx context.Context, tenantID, productID uuid.UUID) (*domain.Product, error) {
	query := `
		SELECT id, tenant_id, name, sku, barcode, unit, price, vat_rate, created_at, updated_at
		FROM products
		WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
	`
	row := r.db.QueryRow(ctx, query, productID, tenantID)

	var p domain.Product
	err := row.Scan(
		&p.ID, &p.TenantID, &p.Name, &p.SKU, &p.Barcode, &p.Unit, &p.Price, &p.VATRate, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}
	return &p, nil
}

// ListProducts retrieves a list of products for a tenant.
// TODO: Add pagination and filtering.
func (r *ProductRepository) ListProducts(ctx context.Context, tenantID uuid.UUID) ([]domain.Product, error) {
	query := `
		SELECT id, tenant_id, name, sku, barcode, unit, price, vat_rate, created_at, updated_at
		FROM products
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.SKU, &p.Barcode, &p.Unit, &p.Price, &p.VATRate, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}
