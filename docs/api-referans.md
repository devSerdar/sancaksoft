# API Referansı

Tüm endpoint'ler `http://localhost:8080` üzerinde çalışır.

## Ürünler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/products` | Ürün listesi |
| POST | `/products` | Yeni ürün |

## Müşteriler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/customers` | Müşteri listesi |
| POST | `/customers` | Yeni müşteri |
| GET | `/customers/:id/ledger?period=day\|week\|month` | Cari hareket özeti |

## Depolar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/warehouses` | Depo listesi |
| POST | `/warehouses` | Yeni depo |

## Faturalar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/invoices` | Fatura listesi |
| GET | `/invoices/:id` | Fatura detayı |
| POST | `/invoices` | Yeni fatura |

## Stok

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/stock-movements` | Stok hareketleri |
| POST | `/stock-movements` | Stok giriş/çıkış |
| GET | `/stock-balance?product_id=&warehouse_id=` | Depo bazlı stok |

## İadeler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/returns` | İade listesi |
| GET | `/returns/customer-purchases/:customerId` | Müşterinin iade edilebilir alımları |
| POST | `/returns` | Yeni iade |

## Dashboard

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/dashboard/stats` | Özet istatistikler |
