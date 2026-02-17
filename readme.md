# Toptancı ERP Sistemi

## 1. Proje Amacı

Bu projenin amacı, toptancı işletmelerin günlük operasyonlarını yönetebileceği modern, hızlı ve ölçeklenebilir bir ERP (Enterprise Resource Planning) sistemi geliştirmektir.

Sistem aşağıdaki işlemleri destekleyecektir:

* Ürün yönetimi
* Depo / stok yönetimi
* Müşteri (cari) yönetimi
* Satış faturası oluşturma
* Alış faturası oluşturma
* Ödeme takibi
* Raporlama

---

## 2. Sistem Mimarisi

Genel mimari:

```
Frontend (React / Web Panel)
        ↓
Backend API (Go)
        ↓
Business Logic Layer
        ↓
Repository Layer
        ↓
PostgreSQL Database
```

Opsiyonel bileşenler:

* Redis (cache)
* Nginx (reverse proxy)
* Docker (deployment)

---

## 3. Teknoloji Stack

### Backend

* Dil: Go
* Framework: Fiber veya Gin
* API: REST
* Authentication: JWT

### Database

* PostgreSQL

### Frontend

* React
* TailwindCSS

### Deployment

* Linux Server (Ubuntu)
* Nginx
* Docker (opsiyonel)

---

## 4. Ana Modüller

### 4.1 Ürün Modülü

Özellikler:

* Ürün ekleme
* Ürün güncelleme
* Ürün silme
* Ürün listeleme

Alanlar:

```
id
name
sku
barcode
purchase_price
sale_price
vat_rate
created_at
```

---

### 4.2 Müşteri (Cari) Modülü

Özellikler:

* Müşteri ekleme
* Müşteri listeleme
* Borç/alacak takibi

Alanlar:

```
id
name
phone
address
balance
created_at
```

---

### 4.3 Depo ve Stok Modülü

Özellikler:

* Stok giriş
* Stok çıkış
* Depolar arası transfer
* Stok görüntüleme

Tablo:

```
stock_movements

id
product_id
warehouse_id
quantity
type (IN / OUT)
created_at
```

---

### 4.4 Fatura Modülü

Özellikler:

* Satış faturası oluşturma
* Alış faturası oluşturma
* Fatura listeleme

Tablolar:

```
invoices

id
invoice_number
customer_id
total_amount
created_at
```

```
invoice_items

id
invoice_id
product_id
quantity
price
total
```

---

### 4.5 Ödeme Modülü

Özellikler:

* Ödeme ekleme
* Ödeme geçmişi

Tablo:

```
payments

id
customer_id
amount
method
created_at
```

---

## 5. Backend Klasör Yapısı

```
erp-system/

cmd/
   main.go

internal/

   handlers/
   services/
   repositories/
   models/
   database/

pkg/

configs/
```

---

## 6. API Endpoint Örnekleri

### Ürün

```
POST   /products
GET    /products
GET    /products/{id}
PUT    /products/{id}
DELETE /products/{id}
```

### Müşteri

```
POST   /customers
GET    /customers
```

### Fatura

```
POST   /invoices
GET    /invoices
```

### Stok

```
GET /stock
```

---

## 7. Transaction Akışı Örneği

Satış faturası oluşturma:

```
BEGIN TRANSACTION

INSERT invoice
INSERT invoice_items
INSERT stock_movements (OUT)
UPDATE customer balance

COMMIT
```

---

## 8. Güvenlik

* JWT Authentication
* Role-based access control
* Input validation

---

## 9. Gelecek Özellikler

* Barkod desteği
* e-Fatura entegrasyonu
* Çoklu kullanıcı
* Raporlama sistemi
* Cloud deployment

---

## 10. Hedef

Modern, hızlı ve ölçeklenebilir bir ERP sistemi oluşturmak.

Bu sistem küçük ve orta ölçekli toptancı işletmeler tarafından kullanılabilir.
