# Reset Database Helper Script (Using Docker)

# 1. Stop and remove existing container (to clear data)
Write-Host "Stopping existing database container..." -ForegroundColor Yellow
docker-compose down -v

# 2. Start new container
Write-Host "Starting new database container..." -ForegroundColor Green
docker-compose up -d

# 3. Wait for DB to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# 4. Apply Schema (Already handled by docker-entrypoint-initdb.d volume mount, but good to verify)
# If you make changes to database.sql, just re-run this script

Write-Host "Database is ready based on database.sql!" -ForegroundColor Green
Write-Host "Now run: .\run_tests.ps1" -ForegroundColor Cyan
