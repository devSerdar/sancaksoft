package repository

import (
	"context"
	"fmt"
	"sancaksoft/internal/api/dto"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardRepository struct {
	db *pgxpool.Pool
}

func NewDashboardRepository(db *pgxpool.Pool) *DashboardRepository {
	return &DashboardRepository{db: db}
}

// GetStats returns aggregated statistics for the dashboard.
func (r *DashboardRepository) GetStats(ctx context.Context, tenantID uuid.UUID) (*dto.DashboardStatsDTO, error) {
	stats := &dto.DashboardStatsDTO{}

	// 1. Total Revenue & Total Invoices
	err := r.db.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(total_amount), 0), 
			COUNT(*) 
		FROM invoices 
		WHERE tenant_id = $1 AND deleted_at IS NULL
	`, tenantID).Scan(&stats.TotalRevenue, &stats.TotalInvoices)
	if err != nil {
		return nil, fmt.Errorf("failed to get invoice stats: %w", err)
	}

	// 2. Total Products
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM products WHERE tenant_id = $1 AND deleted_at IS NULL
	`, tenantID).Scan(&stats.TotalProducts)
	if err != nil {
		return nil, fmt.Errorf("failed to get product stats: %w", err)
	}

	// 3. Low Stock Count (Example: Stock < 10)
	// Note: accurate stock requires summing stock_movements group by product.
	// For MVP performance, we might do a simpler query or rely on a materialized view later.
	// Here is a slightly expensive aggregation query for real-time accuracy.
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT product_id, SUM(quantity) as balance
			FROM stock_movements
			WHERE tenant_id = $1
			GROUP BY product_id
			HAVING SUM(quantity) < 10
		) as low_stock
	`, tenantID).Scan(&stats.LowStockCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get low stock stats: %w", err)
	}

	// 4. Recent Invoices
	rows, err := r.db.Query(ctx, `
		SELECT i.id, i.invoice_number, i.total_amount, i.created_at, c.name
		FROM invoices i
		LEFT JOIN customers c ON i.customer_id = c.id
		WHERE i.tenant_id = $1
		ORDER BY i.created_at DESC
		LIMIT 5
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent invoices: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var inv dto.RecentInvoiceDTO
		var customerName *string // Handle nullable join if customer deleted (though we have constraints)

		if err := rows.Scan(&inv.ID, &inv.InvoiceNumber, &inv.TotalAmount, &inv.CreatedAt, &customerName); err != nil {
			return nil, fmt.Errorf("failed to scan recent invoice: %w", err)
		}
		if customerName != nil {
			inv.CustomerName = *customerName
		} else {
			inv.CustomerName = "Unknown"
		}
		stats.RecentInvoices = append(stats.RecentInvoices, inv)
	}
	// Initialize empty slice if nil to return [] JSON instead of null
	if stats.RecentInvoices == nil {
		stats.RecentInvoices = []dto.RecentInvoiceDTO{}
	}

	return stats, nil
}
