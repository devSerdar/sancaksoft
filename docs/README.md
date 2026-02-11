# Sancaksoft ERP Dokümantasyonu

Sancaksoft, toptancı işletmeler için geliştirilmiş modern bir ERP sistemidir.

## İçindekiler

- [Kurulum](./kurulum.md) — Projeyi yerel ortamda çalıştırma
- [Kullanım Kılavuzu](./kullanim-kilavuzu.md) — Ürünler, müşteriler, faturalar ve diğer modüller
- [API Referansı](./api-referans.md) — Backend API endpoint'leri

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js, React, TailwindCSS |
| Backend | Go, Fiber |
| Veritabanı | PostgreSQL |
| Deployment | Docker, Nginx |

## Hızlı Başlangıç

```bash
# Backend
cd sancaksoft
go run ./cmd/api

# Frontend
cd frontend
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.
