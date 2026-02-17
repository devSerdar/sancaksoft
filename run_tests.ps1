# Run Tests Helper Script

# 1. Set Environment Variable (Adjust if your local DB is different)
$env:TEST_DB_URL = "postgres://postgres:password@localhost:5432/sancaksoft?sslmode=disable"

Write-Host "Running tests with DB: $env:TEST_DB_URL" -ForegroundColor Cyan

# 2. Run Tests (Correct syntax for module)
# Use ./internal/service/... to match packages in current module
go test -v ./internal/service/...

# Alternative if user prefers running specific file (though less recommended for package tests)
# go test -v internal/service/invoice_service_test.go
