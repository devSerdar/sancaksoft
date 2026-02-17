package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type DashboardStatsDTO struct {
	TotalRevenue   decimal.Decimal    `json:"total_revenue"`
	TotalInvoices  int64              `json:"total_invoices"`
	TotalProducts  int64              `json:"total_products"`
	LowStockCount  int64              `json:"low_stock_count"` // Products with stock < 10 (example threshold)
	RecentInvoices []RecentInvoiceDTO `json:"recent_invoices"`
}

type RecentInvoiceDTO struct {
	ID            uuid.UUID       `json:"id"`
	InvoiceNumber string          `json:"invoice_number"`
	TotalAmount   decimal.Decimal `json:"total_amount"`
	CreatedAt     time.Time       `json:"created_at"`
	CustomerName  string          `json:"customer_name"` // For UI display
}
