# API Contract

Apps Script Web App ใช้ endpoint เดียวผ่าน `doPost(e)`

## Request Format

Frontend ส่ง `POST` ด้วย `Content-Type: text/plain;charset=utf-8`

```json
{
  "action": "getProducts",
  "payload": {}
}
```

## Response Format

Success:

```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

Error:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Public APIs

### getShopSettingsPublic

Request:

```json
{ "action": "getShopSettingsPublic", "payload": {} }
```

Response data:

```json
{
  "shop_name": "บ้านขนมตัวอย่าง",
  "shop_description": "ขนมทำสดใหม่",
  "is_shop_open": true,
  "closed_message": "วันนี้ปิดรับออเดอร์",
  "contact_phone": "0812345678",
  "line_id": "@shop",
  "promptpay_display_name": "Example Shop",
  "promptpay_id_masked": "08x-xxx-1234",
  "bank_account_name": "Example Shop",
  "bank_account_number": "123-4-56789-0",
  "payment_instructions": "กรุณาชำระยอดให้ตรงกับออเดอร์",
  "thank_you_message": "ขอบคุณสำหรับออเดอร์ค่ะ"
}
```

### getProducts

Returns active, non-deleted products sorted by `sort_order`.

```json
{ "action": "getProducts", "payload": { "category": "", "search": "" } }
```

### getProductDetail

```json
{ "action": "getProductDetail", "payload": { "product_id": "PRD-000001" } }
```

### createOrder

Request:

```json
{
  "action": "createOrder",
  "payload": {
    "customer": {
      "name": "string",
      "phone": "string",
      "line_id": "string"
    },
    "pickup": {
      "method": "pickup",
      "pickup_date": "2026-05-25",
      "delivery_address": ""
    },
    "items": [
      { "product_id": "PRD-000001", "qty": 1 }
    ],
    "customer_note": "string"
  }
}
```

Backend rules:

- validate required fields
- load product price from `products`
- reject inactive/deleted products
- validate limited stock
- calculate `total_amount` on backend
- create order, order_items, payment row
- create `promptpay_payload` from shop settings + calculated amount
- PromptPay QR payload should use dynamic mode when an amount is present and support phone numbers in `08xxxxxxxx`, `66xxxxxxxxx`, or `+66xxxxxxxxx` formats

Response data:

```json
{
  "order_id": "ORD-260522-0001",
  "order_token": "secure-random-token",
  "total_amount": 298,
  "payment_status": "unpaid",
  "order_status": "received",
  "promptpay_payload": "000201...",
  "payment_id": "PAY-260522-0001"
}
```

### getOrderStatus

```json
{
  "action": "getOrderStatus",
  "payload": {
    "order_id": "ORD-260522-0001",
    "order_token": "secure-random-token"
  }
}
```

Requires matching `order_token`.

### uploadPaymentSlip

```json
{
  "action": "uploadPaymentSlip",
  "payload": {
    "order_id": "ORD-260522-0001",
    "order_token": "secure-random-token",
    "file": {
      "name": "slip.jpg",
      "mime_type": "image/jpeg",
      "base64": "..."
    }
  }
}
```

Backend rules:

- verify order token
- accept only `image/jpeg`, `image/png`, `image/webp`
- limit file size to 5MB
- upload to Drive slip folder
- update `payments.payment_status` and `orders.payment_status` to `pending_review`

## Admin APIs

Admin APIs require `payload.session_token` except `adminLogin`.

### adminLogin

```json
{
  "action": "adminLogin",
  "payload": { "password": "admin password" }
}
```

Response:

```json
{
  "session_token": "raw-token",
  "expires_at": "2026-05-22T23:59:59+07:00"
}
```

### adminLogout

```json
{
  "action": "adminLogout",
  "payload": { "session_token": "raw-token" }
}
```

### adminGetDashboard

Returns dashboard stats, latest orders, best sellers, upcoming pickup dates.

### adminListProducts

```json
{
  "action": "adminListProducts",
  "payload": { "session_token": "...", "include_deleted": false }
}
```

### adminCreateProduct

```json
{
  "action": "adminCreateProduct",
  "payload": {
    "session_token": "...",
    "product": {
      "name": "เค้กกล้วยหอม",
      "description": "ทำสดใหม่",
      "price": 89,
      "category": "Bakery",
      "image_url": "",
      "stock_type": "limited",
      "stock_qty": 50,
      "is_active": true,
      "is_preorder": true,
      "sort_order": 10
    }
  }
}
```

### adminUpdateProduct

```json
{
  "action": "adminUpdateProduct",
  "payload": {
    "session_token": "...",
    "product_id": "PRD-000001",
    "patch": { "price": 95, "is_active": true }
  }
}
```

### adminDeleteProduct

Soft delete by setting `is_deleted=true`.

### adminUploadProductImage

Uploads base64 image to Drive product image folder and returns `image_url`, `image_file_id`.

### adminListOrders

Filters:

- `created_from`
- `created_to`
- `pickup_date`
- `payment_status`
- `order_status`
- `search`

### adminGetOrderDetail

Returns order, items, payment.

### adminApprovePayment

```json
{
  "action": "adminApprovePayment",
  "payload": {
    "session_token": "...",
    "order_id": "ORD-260522-0001"
  }
}
```

Updates payment and order status to `paid`, saves verified fields, logs activity.

### adminRejectPayment

```json
{
  "action": "adminRejectPayment",
  "payload": {
    "session_token": "...",
    "order_id": "ORD-260522-0001",
    "reject_reason": "ยอดไม่ตรง"
  }
}
```

### adminUpdateOrderStatus

```json
{
  "action": "adminUpdateOrderStatus",
  "payload": {
    "session_token": "...",
    "order_id": "ORD-260522-0001",
    "order_status": "preparing|ready|delivering|completed|cancelled",
    "internal_note": "เริ่มผลิตแล้ว"
  }
}
```

`delivering` is used by the Admin Delivery page. Delivery orders with this status appear in the delivery list and map views.

### adminGetProductionSummary

```json
{
  "action": "adminGetProductionSummary",
  "payload": {
    "session_token": "...",
    "pickup_date": "2026-05-25",
    "include_pending_review": false
  }
}
```

### adminGetSalesReport

```json
{
  "action": "adminGetSalesReport",
  "payload": {
    "session_token": "...",
    "from": "2026-05-01",
    "to": "2026-05-31"
  }
}
```

### adminGetShopSettings

Returns all editable settings including full `promptpay_id`.

### adminUpdateShopSettings

```json
{
  "action": "adminUpdateShopSettings",
  "payload": {
    "session_token": "...",
    "settings": {
      "shop_name": "ร้านใหม่",
      "promptpay_id": "0812345678",
      "bank_account_number": "123-4-56789-0"
    }
  }
}
```

### adminExportOrdersCsv

Returns CSV text for the selected filter.

## Common Error Codes

- `INVALID_JSON`
- `UNKNOWN_ACTION`
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `NOT_FOUND`
- `OUT_OF_STOCK`
- `PROMPTPAY_NOT_CONFIGURED`
- `INVALID_PROMPTPAY_ID`
- `UPLOAD_FAILED`
- `INTERNAL_ERROR`


## Performance API extension

### getPublicBootstrap

Preferred storefront bootstrap action. It returns public shop settings, active products, and server_time in one response.

Request action: getPublicBootstrap
Payload: empty object

The Apps Script implementation uses a short server cache. Mutations that affect public settings, products or available stock invalidate that cache.

New frontend builds are backward-compatible. If an older Apps Script deployment returns UNKNOWN_ACTION for getPublicBootstrap, the frontend automatically falls back to getShopSettingsPublic and getProducts.

### Payment slip upload note

The current frontend validates the bank-slip QR from the original image before compression. It then may resize and convert the image to WebP before base64 upload to reduce Apps Script and Google Drive transfer time. The QR payload and transfer reference are included as file metadata fields used by the existing backend validation path.
