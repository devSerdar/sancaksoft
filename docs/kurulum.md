# Kurulum

## Gereksinimler

- **Go** 1.21+
- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** veya **pnpm**

## 1. Projeyi İndirme

```bash
git clone <repo-url>
cd sancaksoft
```

## 2. Veritabanı Kurulumu

PostgreSQL'de veritabanı oluşturun:

```sql
CREATE DATABASE sancaksoft;
```

`.env` dosyasında bağlantı bilgilerini ayarlayın:

```env
DATABASE_URL=postgres://kullanici:sifre@localhost:5432/sancaksoft
```

## 3. Veritabanı Şeması

```bash
psql -U kullanici -d sancaksoft -f database.sql
```

## 4. Backend Çalıştırma

```bash
go run ./cmd/api
```

API varsayılan olarak `http://localhost:8080` adresinde çalışır.

## 5. Frontend Çalıştırma

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:3000` adresinde çalışır.

## Docker ile Çalıştırma

```bash
docker-compose up -d
```
