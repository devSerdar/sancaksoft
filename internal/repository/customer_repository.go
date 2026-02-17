package repository

import (
	"context"
	"fmt"
	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CustomerRepository struct {
	db *pgxpool.Pool
}

func NewCustomerRepository(db *pgxpool.Pool) *CustomerRepository {
	return &CustomerRepository{db: db}
}

// CreateCustomer inserts a new customer.
func (r *CustomerRepository) CreateCustomer(ctx context.Context, c *domain.Customer) error {
	query := `
		INSERT INTO customers (id, tenant_id, name, email, phone, address, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		c.ID,
		c.TenantID,
		c.Name,
		c.Email,
		c.Phone,
		c.Address,
	).Scan(&c.CreatedAt, &c.UpdatedAt)
}

// GetCustomerByID retrieves a customer by ID and TenantID.
func (r *CustomerRepository) GetCustomerByID(ctx context.Context, tenantID, customerID uuid.UUID) (*domain.Customer, error) {
	query := `
		SELECT id, tenant_id, name, email, phone, address, created_at, updated_at
		FROM customers
		WHERE id = $1 AND tenant_id = $2
	`
	row := r.db.QueryRow(ctx, query, customerID, tenantID)

	var c domain.Customer
	err := row.Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Email, &c.Phone, &c.Address, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}
	return &c, nil
}

// ListCustomers retrieves a list of customers for a tenant.
func (r *CustomerRepository) ListCustomers(ctx context.Context, tenantID uuid.UUID) ([]domain.Customer, error) {
	query := `
		SELECT id, tenant_id, name, email, phone, address, created_at, updated_at
		FROM customers
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to list customers: %w", err)
	}
	defer rows.Close()

	var customers []domain.Customer
	for rows.Next() {
		var c domain.Customer
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.Name, &c.Email, &c.Phone, &c.Address, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan customer: %w", err)
		}
		customers = append(customers, c)
	}
	return customers, nil
}

func (r *CustomerRepository) ensureCustomerReturnsTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS customer_returns (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
			product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
			warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
			quantity INTEGER NOT NULL CHECK (quantity > 0),
			unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
			total DECIMAL(15, 2) NOT NULL CHECK (total >= 0),
			reason TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`
	_, err := r.db.Exec(ctx, query)
	return err
}

// ListCustomerLedger returns aggregated customer movements by period: day|week|month.
func (r *CustomerRepository) ListCustomerLedger(ctx context.Context, tenantID, customerID uuid.UUID, period string) ([]domain.CustomerLedgerEntry, error) {
	if err := r.ensureCustomerReturnsTable(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure returns table: %w", err)
	}

	query := `
		SELECT 
			bucket AS period_start,
			COALESCE(SUM(CASE WHEN movement_type = 'SALE' THEN amount END), 0) AS sales_amount,
			COALESCE(SUM(CASE WHEN movement_type = 'RETURN' THEN amount END), 0) AS return_amount,
			COALESCE(SUM(CASE WHEN movement_type = 'SALE' THEN amount ELSE -amount END), 0) AS net_amount
		FROM (
			SELECT 
				date_trunc($3, i.created_at) AS bucket,
				i.total_amount AS amount,
				'SALE' AS movement_type
			FROM invoices i
			WHERE i.tenant_id = $1 AND i.customer_id = $2 AND i.deleted_at IS NULL

			UNION ALL

			SELECT
				date_trunc($3, cr.created_at) AS bucket,
				cr.total AS amount,
				'RETURN' AS movement_type
			FROM customer_returns cr
			WHERE cr.tenant_id = $1 AND cr.customer_id = $2
		) movements
		GROUP BY bucket
		ORDER BY bucket DESC
		LIMIT 100
	`

	rows, err := r.db.Query(ctx, query, tenantID, customerID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to list customer ledger: %w", err)
	}
	defer rows.Close()

	var entries []domain.CustomerLedgerEntry
	for rows.Next() {
		var entry domain.CustomerLedgerEntry
		if err := rows.Scan(&entry.PeriodStart, &entry.SalesAmount, &entry.ReturnAmount, &entry.NetAmount); err != nil {
			return nil, fmt.Errorf("failed to scan customer ledger entry: %w", err)
		}
		entries = append(entries, entry)
	}
	return entries, nil
}
