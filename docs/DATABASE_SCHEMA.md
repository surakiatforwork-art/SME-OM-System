# Database Schema

Google Sheet ทำหน้าที่เป็น database ของ MVP โดย Apps Script จะสร้าง sheet และ headers ผ่าน `setupSheets()`

## General Rules

- Timezone: `Asia/Bangkok`
- Date format สำหรับ API: `YYYY-MM-DD`
- Timestamp format: ISO string หรือ string จาก Apps Script ที่อ่านได้สม่ำเสมอ
- Boolean เก็บเป็น `TRUE/FALSE` หรือ string ที่ Apps Script normalize ได้
- Money เก็บเป็น number หน่วยบาท
- Soft delete ใช้ `is_deleted`

## shop_settings

| field | type | example | notes |
| --- | --- | --- | --- |
| key | string | `shop_name` | unique key |
| value | string | `บ้านขนมตัวอย่าง` | value เป็น string เสมอ |
| updated_at | datetime | `2026-05-22T10:00:00+07:00` | วันที่แก้ล่าสุด |

Important keys:

- `shop_name`
- `shop_description`
- `logo_url`
- `contact_phone`
- `line_id`
- `address`
- `pickup_instructions`
- `delivery_note`
- `is_shop_open`
- `closed_message`
- `promptpay_id`
- `promptpay_display_name`
- `bank_account_name`
- `bank_account_number`
- `payment_instructions`
- `thank_you_message`
- `admin_password_hash` (optional fallback; prefer Script Properties)

## products

| field | type | example | notes |
| --- | --- | --- | --- |
| product_id | string | `PRD-000001` | primary key |
| name | string | `เค้กกล้วยหอม` | required |
| description | string | `นุ่ม หอม ทำสดใหม่` | optional |
| price | number | `89` | required |
| category | string | `Bakery` | ใช้ filter |
| image_url | string | `https://...` | public/accessible image URL |
| image_file_id | string | `drive-file-id` | optional |
| stock_type | enum | `limited` | `limited` หรือ `unlimited` |
| stock_qty | number | `50` | จำนวนเปิดรับรวม |
| sold_qty | number | `12` | จำนวนที่ถูกจอง/ขาย |
| remaining_qty | number | `38` | computed snapshot |
| is_active | boolean | `TRUE` | เปิด/ปิดขาย |
| is_deleted | boolean | `FALSE` | soft delete |
| is_preorder | boolean | `TRUE` | preorder หรือพร้อมส่ง |
| sort_order | number | `10` | เรียงสินค้า |
| created_at | datetime | `...` | created time |
| updated_at | datetime | `...` | updated time |

## orders

| field | type | example | notes |
| --- | --- | --- | --- |
| order_id | string | `ORD-260522-0001` | primary key |
| order_token | string | `secure-random-token` | ใช้ดูสถานะ |
| created_at | datetime | `...` | สร้างออเดอร์ |
| customer_name | string | `คุณเอ` | required |
| phone | string | `0812345678` | required |
| line_id | string | `line_a` | optional |
| pickup_method | enum | `pickup` | `pickup` หรือ `delivery` |
| pickup_date | date | `2026-05-25` | required |
| delivery_address | string | `...` | required ถ้า delivery |
| customer_note | string | `ไม่ใส่ถั่ว` | optional |
| internal_note | string | `โทรยืนยันแล้ว` | admin only |
| total_amount | number | `298` | backend calculated |
| payment_status | enum | `unpaid` | ดู enum ด้านล่าง |
| order_status | enum | `received` | ดู enum ด้านล่าง |
| source | string | `web` | source channel |
| updated_at | datetime | `...` | updated time |

Payment statuses:

- `unpaid`
- `pending_review`
- `paid`
- `rejected`
- `refunded`

Order statuses:

- `received`
- `preparing`
- `ready`
- `delivering`
- `completed`
- `cancelled`

## order_items

| field | type | example | notes |
| --- | --- | --- | --- |
| item_id | string | `ITM-ORD-260522-0001-001` | primary key |
| order_id | string | `ORD-260522-0001` | foreign key |
| product_id | string | `PRD-000001` | product reference |
| product_name_snapshot | string | `เค้กกล้วยหอม` | snapshot ตอนสั่ง |
| unit_price_snapshot | number | `89` | snapshot ตอนสั่ง |
| qty | number | `2` | required |
| subtotal | number | `178` | unit price x qty |
| created_at | datetime | `...` | created time |

## payments

| field | type | example | notes |
| --- | --- | --- | --- |
| payment_id | string | `PAY-260522-0001` | primary key |
| order_id | string | `ORD-260522-0001` | foreign key |
| amount | number | `298` | ต้องตรงกับ order total |
| promptpay_payload | string | `000201...` | QR payload |
| slip_url | string | `https://...` | uploaded slip URL |
| slip_file_id | string | `drive-file-id` | Drive file id |
| payment_status | enum | `pending_review` | payment state |
| uploaded_at | datetime | `...` | slip upload time |
| verified_at | datetime | `...` | admin review time |
| verified_by | string | `admin` | actor |
| reject_reason | string | `ยอดไม่ตรง` | required when rejected |
| created_at | datetime | `...` | created time |
| updated_at | datetime | `...` | updated time |

## customers

| field | type | example | notes |
| --- | --- | --- | --- |
| customer_id | string | `CUS-000001` | primary key |
| name | string | `คุณเอ` | latest name |
| phone | string | `0812345678` | unique-ish |
| line_id | string | `line_a` | optional |
| total_orders | number | `3` | aggregate |
| total_spent | number | `894` | aggregate |
| last_order_at | datetime | `...` | latest order |
| created_at | datetime | `...` | created time |
| updated_at | datetime | `...` | updated time |

## admin_sessions

| field | type | example | notes |
| --- | --- | --- | --- |
| session_id | string | `SES-...` | primary key |
| token_hash | string | `sha256...` | hash only |
| created_at | datetime | `...` | created time |
| expires_at | datetime | `...` | session expiry |
| is_revoked | boolean | `FALSE` | logout/revoke |

## activity_logs

| field | type | example | notes |
| --- | --- | --- | --- |
| log_id | string | `LOG-...` | primary key |
| actor | string | `admin` | actor id |
| action | string | `approve_payment` | action |
| target_type | string | `order` | entity type |
| target_id | string | `ORD-260522-0001` | entity id |
| detail_json | string | `{"amount":298}` | JSON string |
| created_at | datetime | `...` | created time |

## preorder_rounds

| field | type | example | notes |
| --- | --- | --- | --- |
| round_id | string | `RND-000001` | primary key |
| round_name | string | `รอบส่งวันเสาร์` | optional |
| pickup_date | date | `2026-05-25` | pickup date |
| cutoff_at | datetime | `2026-05-24T18:00:00+07:00` | cutoff |
| status | enum | `open` | `open`, `closed`, `archived` |
| note | string | `รับได้ 10:00-16:00` | optional |
| created_at | datetime | `...` | created time |
| updated_at | datetime | `...` | updated time |

MVP สร้าง schema นี้ไว้ก่อน แต่ customer flow ยังใช้ `pickup_date` ใน orders โดยตรง
