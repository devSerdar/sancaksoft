# Proje Yol Haritası (Roadmap) — Minimal SaaS ERP (MVP)

**Amaç:** Toptancıların günlük işlerini yönetebileceği basit, hızlı ve sağlam bir ERP sistemi oluşturmak.
**Odak:** Müşteri Yönetimi, Ürün Yönetimi, Depo/Stok Takibi, Faturalama (Otomatik Stok Düşme).

---

## Faz 0: Temel Mimari (Foundation)
- [ ] **Altyapı**: Clean Architecture klasör yapısı.
- [ ] **DB Standartları**:
    - Her tabloda `created_at TIMESTAMP DEFAULT now()`.
    - Her tabloda `deleted_at TIMESTAMP NULL` (Soft Delete).
    - Her tabloda `tenant_id` (Veri İzolasyonu).

## Faz 1: Tenant ve Kullanıcı Sistemi (SaaS Ready)
- [ ] **Tablolar**: `tenants`, `users`.
- [ ] **Özellikler**: Tenant oluşturma, Kullanıcı Login (JWT), Tenant Isolation Middleware.

## Faz 2: Müşteri Modülü (Basic CRM)
Fatura kesebilmek için müşteri kaydı şarttır.
- [ ] **Tablo**: `customers`
- [ ] **Alanlar**:
    - `id`, `tenant_id`
    - `name`, `phone`, `email`
    - `address`, `tax_number`
    - `created_at`, `deleted_at`

## Faz 3: Ürün Modülü
- [ ] **Tablo**: `products`
- [ ] **Alanlar**: `id`, `tenant_id`, `name`, `sku`, `barcode`, `price`, `vat_rate`, `created_at`, `deleted_at`.

## Faz 4: Depo Modülü
- [ ] **Tablo**: `warehouses`
- [ ] **Alanlar**: `id`, `tenant_id`, `name`, `address` (Soft delete destekli).

## Faz 5: Stok Sistemi (Kritik)
- [ ] **Tablo**: `stock_movements`
    - `id`, `tenant_id`, `product_id`, `warehouse_id`, `quantity`, `type` (IN/OUT/SALE), `created_at`.
- [ ] **View**: `current_stock` (Performans için)
    - `GROUP BY tenant_id, product_id, warehouse_id` ile `SUM(quantity)` hesaplayan sanal tablo.

## Faz 6: Fatura Sistemi (Transaction Merkezli)
- [ ] **Tablolar**:
    - `invoices`: `id`, `tenant_id`, `invoice_number` (Otomatik Artan), `customer_id`, `total_amount`, `created_at`.
    - `invoice_items`: `id`, `invoice_id`, `product_id`, `quantity`, `unit_price`, `total`.
- [ ] **Mantık**: Fatura oluştuğunda `stock_movements` tablosuna otomatik eksi bakiye yansır.

## Faz 7: Basic Frontend (Next.js)
Basit arayüz (Dashboard, Ürün/Müşteri/Depo Listeleri, Fatura Oluşturma Ekranı).

---

### MVP Tamamlandığında
✅ Müşteri, Ürün, Depo Yönetimi
✅ Stok Giriş/Çıkış Hareketleri
✅ Fatura Kesme ve Otomatik Stok Düşme
✅ **Firma (Tenant) Bazlı Tam İzolasyon**

### Gelecek Fazlar (MVP Sonrası)
- Ödeme ve Cari Hesap Takibi
- Gelişmiş Raporlar ve Export
- Audit Log ve User Roles
