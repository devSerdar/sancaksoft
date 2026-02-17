package repository

import (
	"context"
	"fmt"
	"sancaksoft/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type PaymentRepository struct {
	db *pgxpool.Pool
}

func NewPaymentRepository(db *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{db: db}
}

// CreatePayment inserts a new customer payment
func (r *PaymentRepository) CreatePayment(ctx context.Context, p *domain.CustomerPayment) error {
	query := `
		INSERT INTO customer_payments (id, tenant_id, customer_id, amount, payment_method, reference_no, notes, payment_date, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING created_at
	`
	return r.db.QueryRow(ctx, query,
		p.ID,
		p.TenantID,
		p.CustomerID,
		p.Amount,
		p.PaymentMethod,
		p.ReferenceNo,
		p.Notes,
		p.PaymentDate,
	).Scan(&p.CreatedAt)
}

// GetPaymentByID retrieves a single payment by ID (for update/delete validation)
func (r *PaymentRepository) GetPaymentByID(ctx context.Context, tenantID, paymentID uuid.UUID) (*domain.CustomerPayment, error) {
	query := `
		SELECT id, tenant_id, customer_id, amount, payment_method, reference_no, notes, payment_date, created_at
		FROM customer_payments
		WHERE tenant_id = $1 AND id = $2
	`
	var p domain.CustomerPayment
	var refNo, notes *string
	err := r.db.QueryRow(ctx, query, tenantID, paymentID).Scan(
		&p.ID, &p.TenantID, &p.CustomerID, &p.Amount, &p.PaymentMethod,
		&refNo, &notes, &p.PaymentDate, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if refNo != nil {
		p.ReferenceNo = *refNo
	}
	if notes != nil {
		p.Notes = *notes
	}
	return &p, nil
}

// UpdatePayment updates an existing payment
func (r *PaymentRepository) UpdatePayment(ctx context.Context, p *domain.CustomerPayment) error {
	query := `
		UPDATE customer_payments
		SET amount = $2, payment_method = $3, reference_no = $4, notes = $5, payment_date = $6
		WHERE tenant_id = $1 AND id = $7
	`
	result, err := r.db.Exec(ctx, query,
		p.TenantID, p.Amount, p.PaymentMethod, p.ReferenceNo, p.Notes, p.PaymentDate, p.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update payment: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("payment not found")
	}
	return nil
}

// DeletePayment removes a payment
func (r *PaymentRepository) DeletePayment(ctx context.Context, tenantID, paymentID uuid.UUID) error {
	result, err := r.db.Exec(ctx,
		`DELETE FROM customer_payments WHERE tenant_id = $1 AND id = $2`,
		tenantID, paymentID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete payment: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("payment not found")
	}
	return nil
}

// ListPaymentsByCustomer retrieves all payments for a customer
func (r *PaymentRepository) ListPaymentsByCustomer(ctx context.Context, tenantID, customerID uuid.UUID) ([]domain.CustomerPayment, error) {
	query := `
		SELECT id, tenant_id, customer_id, amount, payment_method, reference_no, notes, payment_date, created_at
		FROM customer_payments
		WHERE tenant_id = $1 AND customer_id = $2
		ORDER BY payment_date DESC
		LIMIT 100
	`
	rows, err := r.db.Query(ctx, query, tenantID, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to list payments: %w", err)
	}
	defer rows.Close()

	var payments []domain.CustomerPayment
	for rows.Next() {
		var p domain.CustomerPayment
		var refNo, notes *string
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.CustomerID, &p.Amount, &p.PaymentMethod,
			&refNo, &notes, &p.PaymentDate, &p.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan payment: %w", err)
		}
		if refNo != nil {
			p.ReferenceNo = *refNo
		}
		if notes != nil {
			p.Notes = *notes
		}
		payments = append(payments, p)
	}
	return payments, nil
}

// GetCustomerBalance calculates the current balance for a customer
func (r *PaymentRepository) GetCustomerBalance(ctx context.Context, tenantID, customerID uuid.UUID) (*domain.CustomerBalanceDetail, error) {
	query := `
		WITH sales AS (
			SELECT COALESCE(SUM(total_amount), 0) as total
			FROM invoices
			WHERE tenant_id = $1 AND customer_id = $2 AND deleted_at IS NULL
		),
		returns AS (
			SELECT COALESCE(SUM(total), 0) as total
			FROM customer_returns
			WHERE tenant_id = $1 AND customer_id = $2
		),
		payments AS (
			SELECT COALESCE(SUM(amount), 0) as total
			FROM customer_payments
			WHERE tenant_id = $1 AND customer_id = $2
		),
		customer_info AS (
			SELECT name FROM customers WHERE tenant_id = $1 AND id = $2
		)
		SELECT 
			ci.name,
			s.total as total_sales,
			r.total as total_returns,
			p.total as total_payments,
			(s.total - r.total - p.total) as current_balance
		FROM sales s, returns r, payments p, customer_info ci
	`

	var detail domain.CustomerBalanceDetail
	detail.CustomerID = customerID

	err := r.db.QueryRow(ctx, query, tenantID, customerID).Scan(
		&detail.CustomerName,
		&detail.TotalSales,
		&detail.TotalReturns,
		&detail.TotalPayments,
		&detail.CurrentBalance,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer balance: %w", err)
	}

	return &detail, nil
}

// GetCustomerLedgerDetail returns detailed ledger entries with running balance
// Sıralama: sort_ts (sisteme girilme zamanı) kullanılır - aynı gün fatura/ödeme varsa
// önce fatura, sonra ödeme görünsün (payment_date gece yarısı olunca ödeme faturadan önce geliyordu)
func (r *PaymentRepository) GetCustomerLedgerDetail(ctx context.Context, tenantID, customerID uuid.UUID) ([]domain.CustomerLedgerDetailEntry, error) {
	query := `
		WITH all_movements AS (
			-- Satışlar (Borç)
			SELECT 
				i.id,
				i.created_at as date,
				i.created_at as sort_ts,
				'SALE' as type,
				CONCAT('Fatura #', i.invoice_number) as description,
				i.total_amount as debit,
				0::decimal as credit,
				NULL::varchar as payment_method,
				NULL::varchar as reference_no
			FROM invoices i
			WHERE i.tenant_id = $1 AND i.customer_id = $2 AND i.deleted_at IS NULL
			
			UNION ALL
			
			-- İadeler (Alacak)
			SELECT 
				cr.id,
				cr.created_at as date,
				cr.created_at as sort_ts,
				'RETURN' as type,
				'Ürün İadesi' as description,
				0::decimal as debit,
				cr.total as credit,
				NULL::varchar as payment_method,
				NULL::varchar as reference_no
			FROM customer_returns cr
			WHERE cr.tenant_id = $1 AND cr.customer_id = $2
			
			UNION ALL
			
			-- Ödemeler (Alacak) - sort_ts = created_at (sisteme girilme) böylece faturadan sonra girilen ödeme doğru sırada
			SELECT 
				cp.id,
				cp.payment_date as date,
				cp.created_at as sort_ts,
				'PAYMENT' as type,
				COALESCE(cp.notes, 'Ödeme') as description,
				0::decimal as debit,
				cp.amount as credit,
				cp.payment_method,
				cp.reference_no
			FROM customer_payments cp
			WHERE cp.tenant_id = $1 AND cp.customer_id = $2
		)
		SELECT 
			id, date, type, description, debit, credit, payment_method, reference_no
		FROM all_movements
		ORDER BY sort_ts ASC
	`

	rows, err := r.db.Query(ctx, query, tenantID, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get ledger detail: %w", err)
	}
	defer rows.Close()

	var entries []domain.CustomerLedgerDetailEntry
	runningBalance := decimal.Zero

	for rows.Next() {
		var entry domain.CustomerLedgerDetailEntry
		var paymentMethod, refNo *string

		if err := rows.Scan(
			&entry.ID, &entry.Date, &entry.Type, &entry.Description,
			&entry.Debit, &entry.Credit, &paymentMethod, &refNo,
		); err != nil {
			return nil, fmt.Errorf("failed to scan ledger entry: %w", err)
		}

		// Calculate running balance: + debit (borç), - credit (alacak)
		runningBalance = runningBalance.Add(entry.Debit).Sub(entry.Credit)
		entry.Balance = runningBalance

		if paymentMethod != nil {
			pm := domain.PaymentMethod(*paymentMethod)
			entry.PaymentMethod = &pm
		}
		entry.ReferenceNo = refNo

		entries = append(entries, entry)
	}

	return entries, nil
}
