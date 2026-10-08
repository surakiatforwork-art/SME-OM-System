# SME OM System

SME OM System (SME Order Management System) คือระบบจัดการออเดอร์และพรีออเดอร์สำหรับร้าน SME และร้านขนาดเล็ก เช่น ร้านขนม ร้านอาหารกล่อง ร้านเค้ก ร้านของฝาก และร้าน handmade ที่ต้องรับออเดอร์ล่วงหน้าและจัดรอบผลิต

ระบบนี้ออกแบบเป็น MVP ที่ใช้จริงได้ก่อน โดยแยกเป็น React frontend, Google Apps Script backend, Google Sheet database และ Google Drive storage เพื่อให้ร้านเริ่มใช้งานได้โดยไม่ต้องมี backend server แยก

## Features

- หน้าร้านสำหรับลูกค้า: ดูสินค้า ค้นหา/กรอง เพิ่มตะกร้า checkout ชำระผ่าน PromptPay QR และเช็กสถานะออเดอร์
- หลังบ้านสำหรับร้าน: dashboard, จัดการสินค้า, จัดการออเดอร์, ตรวจสลิป, สรุปยอดผลิต, รายงานยอดขาย และตั้งค่าร้าน
- Dynamic PromptPay QR: backend คำนวณยอดจริงจากฐานข้อมูลสินค้าและส่ง `promptpay_payload` กลับให้ frontend render QR
- Mock mode: พัฒนา UI ได้ทันทีโดยยังไม่ต้อง deploy Apps Script
- Apps Script API: ใช้ `doPost` รับ JSON ผ่าน `text/plain` เพื่อลดปัญหา CORS/preflight
- Google Sheet schema พร้อม `setupSheets()` และ `seedDemoData()`

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Zustand, localStorage, `qrcode.react`
- Backend: Google Apps Script Web App
- Database: Google Sheet
- Storage: Google Drive
- Deployment: GitHub Pages + Apps Script Web App

## Frontend Setup

```bash
npm install
npm run dev
```

ค่า env ตัวอย่างอยู่ที่ [frontend/.env.example](frontend/.env.example)

```env
VITE_API_URL=
VITE_APP_NAME=SME OM System
VITE_MOCK_MODE=true
```

เมื่อ `VITE_MOCK_MODE=true` หรือยังไม่ตั้ง `VITE_API_URL` ระบบจะใช้ mock data ใน browser localStorage

## Build

```bash
npm run build
```

ไฟล์ build จะอยู่ที่ `frontend/dist`

## Deploy Frontend to GitHub Pages

1. ตั้งค่า `VITE_API_URL` เป็น URL ของ Apps Script Web App
2. ตั้ง `VITE_MOCK_MODE=false`
3. รัน `npm run build`
4. deploy โฟลเดอร์ `frontend/dist` ไป GitHub Pages

ถ้า repo deploy ใต้ path เช่น `https://user.github.io/sme-om-system/` ให้ปรับ `base` ใน [frontend/vite.config.ts](frontend/vite.config.ts) ก่อน build

## Deploy Apps Script

1. สร้าง Google Sheet ใหม่
2. เปิด Apps Script แล้วคัดลอกไฟล์ใน [apps-script](apps-script)
3. ตั้ง Script Properties:
   - `SPREADSHEET_ID`
   - `PRODUCT_IMAGE_FOLDER_ID`
   - `SLIP_FOLDER_ID`
   - `ADMIN_PASSWORD_HASH` หรือใช้ `seedDemoData()` สำหรับ demo เท่านั้น
4. รัน `setupSheets()`
5. รัน `seedDemoData()` ถ้าต้องการข้อมูลตัวอย่าง
6. Deploy เป็น Web App:
   - Execute as: Me
   - Who has access: Anyone
7. นำ Web App URL ไปใส่ใน `VITE_API_URL`

รายละเอียดเต็มอยู่ใน [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

## Known Limitations

- MVP ยังไม่ตรวจสลิปอัตโนมัติ payment จะเป็น `paid` ได้เฉพาะ admin approve
- Apps Script เหมาะกับร้านเล็กถึงกลาง ไม่เหมาะกับ traffic สูงมาก
- Drive public link ต้องตั้ง permission ให้เหมาะสมก่อนใช้งานจริง
- Admin auth เป็น lightweight session สำหรับ MVP ยังไม่ใช่ระบบ identity เต็มรูปแบบ

## Project Docs

- [Master Project Brief](docs/MASTER_PROJECT_BRIEF.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [API Contract](docs/API_CONTRACT.md)
- [UI Guidelines](docs/UI_GUIDELINES.md)
- [Design AI Brief](docs/DESIGN_AI_BRIEF.md)
- [Task Board](docs/TASK_BOARD.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Codex Multi Chat Plan](docs/CODEX_MULTI_CHAT_PLAN.md)
- [Security Notes](docs/SECURITY_NOTES.md)


## 2026 Performance and UX Upgrade

The storefront now uses a public bootstrap request to load shop settings and products together. Apps Script caches this public snapshot for a short period and invalidates it when products, settings, stock-impacting orders, or cancellations change.

The browser also keeps the last successful public snapshot so returning customers can see the shop immediately while fresh data refreshes in the background. Read operations have timeout and safe one-time retry handling, while mutations such as creating an order are intentionally not retried automatically to avoid duplicate orders.

Routes are code-split so the QR scanner, map libraries and admin pages load only when needed. Payment slips and product images are optimized in the browser before being sent to Google Drive. Loading and upload states use lightweight CSS animation and respect reduced-motion accessibility preferences.

Older Apps Script deployments remain compatible: when getPublicBootstrap is not available, the frontend automatically falls back to the existing settings and products actions.

## Payment verification direction

The current production-safe flow remains Dynamic PromptPay QR plus slip QR validation plus admin approval. Automatic confirmation of money received should be enabled only after connecting a trusted merchant or payment-provider server API/webhook. PromptPay QR generation by itself is not treated as proof of payment.

See docs/PAYMENT_AUTOMATION.md for the integration contract and security plan.
