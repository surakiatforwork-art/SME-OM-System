# Master Project Brief

## Vision

SME OM System คือระบบจัดการออเดอร์สำหรับร้าน SME และร้านขนาดเล็กที่ต้องการรับออเดอร์ล่วงหน้า จัดรอบผลิต ตรวจสลิป และสรุปยอดขายโดยไม่ต้องแก้โค้ดเอง

เป้าหมายของ MVP คือให้เจ้าของร้านเปิดร้านออนไลน์ขนาดเล็กได้เร็ว มีข้อมูลสินค้าและออเดอร์รวมอยู่ใน Google Sheet และต่อยอดเป็นระบบหลายร้านหรือ SaaS ได้ในอนาคต

## Target Users

- เจ้าของร้านขนม เค้ก เบเกอรี่ อาหารกล่อง ของฝาก และสินค้า handmade
- ร้านที่รับ preorder หรือมีรอบผลิตตามวันที่รับสินค้า
- ลูกค้าทั่วไปที่ต้องการสั่งสินค้าและชำระผ่าน PromptPay QR

## Problem Statement

ร้าน SME หลายร้านรับออเดอร์ผ่าน LINE, Facebook หรือ Google Form แล้วต้องตามยอดเองใน spreadsheet ทำให้เกิดปัญหา:

- ยอดสินค้าและยอดผลิตตกหล่น
- ลูกค้าจ่ายเงินผิดยอดหรือส่งสลิปไม่ครบ
- เจ้าของร้านต้องคัดลอกข้อมูลหลายครั้ง
- ไม่มี dashboard เห็นยอดขายและรายการรอตรวจแบบเร็ว
- เพิ่มสินค้าเองยากถ้าระบบผูกกับ code

## MVP Scope

- Customer storefront
- Cart และ checkout
- Dynamic PromptPay QR ต่อออเดอร์
- Slip upload และ admin review
- Admin product management
- Admin order management
- Production summary by pickup date
- Sales report พื้นฐาน
- Shop settings
- Mock mode สำหรับ frontend development
- Apps Script backend + Google Sheet database

## Non-goals

- ยังไม่ทำ payment gateway หรือยืนยันเงินอัตโนมัติ
- ยังไม่ทำ multi-tenant SaaS เต็มรูปแบบ
- ยังไม่ทำ role-based access control หลายระดับ
- ยังไม่ทำ inventory accounting ขั้นสูง
- ยังไม่ทำ notification อัตโนมัติผ่าน LINE OA

## Customer Flow

1. ลูกค้าเปิดหน้าร้าน `/`
2. เลือกสินค้าและเพิ่มลงตะกร้า
3. ตรวจรายการใน `/cart`
4. กรอกข้อมูลรับสินค้าใน `/checkout`
5. Backend สร้างออเดอร์ คำนวณยอดจริง และสร้าง PromptPay payload
6. ลูกค้าไป `/payment/:orderId` เพื่อสแกน QR และอัปโหลดสลิป
7. ลูกค้าติดตามสถานะผ่าน `/order/:orderId` พร้อม `order_token`

## Admin Flow

1. ร้าน login ที่ `/admin/login`
2. ดู dashboard ที่ `/admin`
3. เพิ่ม/แก้สินค้าใน `/admin/products`
4. ดูออเดอร์และตรวจสลิปใน `/admin/orders`
5. สรุปยอดผลิตใน `/admin/production`
6. ดูรายงานยอดขายใน `/admin/reports`
7. แก้ข้อมูลร้านและ PromptPay ใน `/admin/settings`

## Future Architecture Direction

MVP ใช้ Apps Script + Google Sheet เพื่อความง่าย แต่ schema และ API ออกแบบให้แยก service ชัดเจน เพื่อให้ย้ายไป backend จริงในอนาคตได้ เช่น Cloud Run, Firebase, Supabase หรือ Node/Postgres โดย frontend เรียกผ่าน `apiClient` เดิม
