package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"sancaksoft/internal/api/handler"
	"sancaksoft/internal/api/middleware"
	"sancaksoft/internal/repository"
	"sancaksoft/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// 1. Environment Configuration
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default for local development (Docker)
		dbURL = "postgres://postgres:password@localhost:5432/sancaksoft?sslmode=disable"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 2. Database Connection
	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Database connection failed: %v\n", err)
	}
	fmt.Println("Connected to Database!")

	// 3. Service & Handler Initialization
	invoiceRepo := repository.NewInvoiceRepository()                 // Create Repository
	invoiceService := service.NewInvoiceService(dbPool, invoiceRepo) // Inject Repository

	invoiceListRepo := repository.NewInvoiceListRepository(dbPool)
	invoiceListService := service.NewInvoiceListService(invoiceListRepo)

	invoiceHandler := handler.NewInvoiceHandler(invoiceService, invoiceListService)

	productRepo := repository.NewProductRepository(dbPool)
	productService := service.NewProductService(productRepo)
	productHandler := handler.NewProductHandler(productService)

	customerRepo := repository.NewCustomerRepository(dbPool)
	customerService := service.NewCustomerService(customerRepo)
	customerHandler := handler.NewCustomerHandler(customerService)

	warehouseRepo := repository.NewWarehouseRepository(dbPool)
	warehouseService := service.NewWarehouseService(warehouseRepo)
	warehouseHandler := handler.NewWarehouseHandler(warehouseService)

	stockRepo := repository.NewStockRepository(dbPool)
	stockService := service.NewStockService(stockRepo)
	stockHandler := handler.NewStockHandler(stockService)

	returnRepo := repository.NewReturnRepository(dbPool)
	returnService := service.NewReturnService(dbPool, returnRepo)
	returnHandler := handler.NewReturnHandler(returnService)

	dashboardRepo := repository.NewDashboardRepository(dbPool)
	dashboardService := service.NewDashboardService(dashboardRepo)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)

	// 4. Fiber App Setup
	app := fiber.New()

	// Middlewares
	// CORS - Allow Frontend to access Backend (local + production)
	app.Use(func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		allowed := map[string]bool{
			"http://localhost:3000":    true,
			"http://213.142.151.235":   true,
			"https://213.142.151.235":  true,
		}
		if allowed[origin] {
			c.Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Set("Access-Control-Allow-Origin", "http://localhost:3000")
		}
		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type, X-Tenant-ID, X-User-ID")
		if c.Method() == "OPTIONS" {
			return c.SendStatus(204)
		}
		return c.Next()
	})
	app.Use(logger.New())  // Request Logging
	app.Use(recover.New()) // Panic Recovery

	// 5. Routes
	// /api/v1/... (normal path) - Nginx bazen /api'yi kesiyor, /v1/... da kabul et
	api := app.Group("/api")
	v1 := api.Group("/v1")
	v1Direct := app.Group("/v1") // Nginx proxy /api'yi sildiğinde /v1/... gelir

	// Tenant & Auth Middleware applied to sensitive routes
	protected := v1.Group("/", middleware.TenantMiddleware(), middleware.AuthMiddleware())
	protectedDirect := v1Direct.Group("/", middleware.TenantMiddleware(), middleware.AuthMiddleware())

	// Invoice Routes
	protected.Post("/invoices", invoiceHandler.CreateInvoice)
	protected.Get("/invoices", invoiceHandler.ListInvoices)
	protected.Get("/invoices/:id", invoiceHandler.GetInvoiceDetail)

	// Product Routes
	protected.Post("/products", productHandler.CreateProduct)
	protected.Get("/products", productHandler.ListProducts)

	// Customer Routes
	protected.Post("/customers", customerHandler.CreateCustomer)
	protected.Get("/customers", customerHandler.ListCustomers)
	protected.Get("/customers/:customerId/ledger", customerHandler.GetCustomerLedger)

	// Warehouse Routes
	protected.Post("/warehouses", warehouseHandler.CreateWarehouse)
	protected.Get("/warehouses", warehouseHandler.ListWarehouses)

	// Stock Routes
	protected.Get("/stock-movements", stockHandler.ListStockMovements)
	protected.Post("/stock-movements", stockHandler.CreateStockMovement)
	protected.Get("/stock-balance", stockHandler.GetStockBalance)
	protected.Get("/stock-balance-total", stockHandler.GetTotalStockBalance)
	protected.Get("/stock-balance-by-warehouse", stockHandler.GetStockBalanceByWarehouse)

	// Return Routes
	protected.Post("/returns", returnHandler.CreateCustomerReturn)
	protected.Get("/returns", returnHandler.ListCustomerReturns)
	protected.Get("/returns/customer-purchases/:customerId", returnHandler.ListCustomerPurchases)

	// Dashboard Routes
	protected.Get("/dashboard/stats", dashboardHandler.GetStats)

	// Aynı route'lar /v1/... altında (Nginx /api keserse)
	protectedDirect.Post("/invoices", invoiceHandler.CreateInvoice)
	protectedDirect.Get("/invoices", invoiceHandler.ListInvoices)
	protectedDirect.Get("/invoices/:id", invoiceHandler.GetInvoiceDetail)
	protectedDirect.Post("/products", productHandler.CreateProduct)
	protectedDirect.Get("/products", productHandler.ListProducts)
	protectedDirect.Post("/customers", customerHandler.CreateCustomer)
	protectedDirect.Get("/customers", customerHandler.ListCustomers)
	protectedDirect.Get("/customers/:customerId/ledger", customerHandler.GetCustomerLedger)
	protectedDirect.Post("/warehouses", warehouseHandler.CreateWarehouse)
	protectedDirect.Get("/warehouses", warehouseHandler.ListWarehouses)
	protectedDirect.Get("/stock-movements", stockHandler.ListStockMovements)
	protectedDirect.Post("/stock-movements", stockHandler.CreateStockMovement)
	protectedDirect.Get("/stock-balance", stockHandler.GetStockBalance)
	protectedDirect.Get("/stock-balance-total", stockHandler.GetTotalStockBalance)
	protectedDirect.Get("/stock-balance-by-warehouse", stockHandler.GetStockBalanceByWarehouse)
	protectedDirect.Post("/returns", returnHandler.CreateCustomerReturn)
	protectedDirect.Get("/returns", returnHandler.ListCustomerReturns)
	protectedDirect.Get("/returns/customer-purchases/:customerId", returnHandler.ListCustomerPurchases)
	protectedDirect.Get("/dashboard/stats", dashboardHandler.GetStats)

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	// 6. Start Server
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
