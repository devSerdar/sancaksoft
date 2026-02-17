#!/bin/bash
# Reset Database Helper Script (Using Docker)

set -e

echo -e "\033[33mStopping existing containers and removing volumes...\033[0m"
docker compose down -v

echo -e "\033[32mStarting new containers...\033[0m"
docker compose up -d

echo -e "\033[36mWaiting for database to be ready...\033[0m"
sleep 5

# Wait for healthcheck
echo -e "\033[36mChecking database health...\033[0m"
until docker compose exec -T sancaksoft-db pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo -e "\033[32mDatabase is ready based on database.sql!\033[0m"
echo -e "\033[36mFrontend: http://localhost:3000\033[0m"
echo -e "\033[36mBackend:  http://localhost:8080\033[0m"
