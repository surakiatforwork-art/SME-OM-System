# UI Guidelines

## Theme

Theme name: Mint Light SME

Mood:

- friendly
- clean
- trustworthy
- soft
- modern
- easy for non-technical shop owners

Palette:

- background: warm cream / off-white
- surface: white
- primary: mint green
- secondary: soft brown
- accent: golden cream
- danger: soft red
- warning: amber
- success: green

## Layout Principles

- Mobile-first for customer flow
- Desktop admin uses sidebar navigation
- Mobile admin uses compact top/bottom navigation
- Do not bury primary actions
- Customer order flow should fit 3-4 steps
- Admin pages should be scan-friendly with filters, status badges, and compact tables

## Component Rules

- Product cards: image, name, category, price, remaining stock, active/preorder badge, large add button
- Cart item: compact image, qty stepper, remove action, subtotal
- QR payment panel: prominent amount, QR area, order id, masked PromptPay ID, optional bank account number with copy action, payment instructions, slip upload
- Dashboard stat card: one metric, one label, optional trend/helper text
- Admin table: responsive; collapse to stacked rows on small screens
- Modal/confirm: required before delete/cancel/reject where destructive
- Upload field: show accepted formats and size limit
- Empty state: plain Thai text and clear next action
- Loading state: skeleton or calm message
- Error state: human-readable Thai message, no raw stack traces

## Buttons

- Primary button: mint background, high contrast text
- Secondary button: white with border
- Danger button: soft red
- Touch target at least 44px high
- Use icons where they clarify actions

## Status Badge Colors

Payment:

- `unpaid`: gray
- `pending_review`: amber
- `paid`: green
- `rejected`: red
- `refunded`: blue-gray

Order:

- `received`: blue
- `preparing`: amber
- `ready`: mint
- `delivering`: blue
- `completed`: green
- `cancelled`: red

## Thai Copy Tone

- ใช้ภาษาง่าย เป็นธรรมชาติ
- ฝั่งลูกค้าไม่ใช้ศัพท์เทคนิค เช่น payload, API, session
- ฝั่ง admin ใช้คำชัด เช่น "รอตรวจสลิป", "เริ่มผลิต", "พร้อมรับสินค้า"
- ข้อความ error ควรบอกวิธีแก้ เช่น "กรุณาเลือกวันที่รับสินค้า"

## Accessibility

- Contrast ต้องอ่านง่ายบนมือถือ
- Form label ชัดเจน
- ปุ่ม icon-only ต้องมี `aria-label`
- Focus state ต้องเห็นชัด
- ข้อความในปุ่มและ card ห้ามล้น container

## Responsive Behavior

- Customer storefront: 1 column on mobile, 2 columns tablet, 3-4 columns desktop
- Cart/checkout/payment: single-column on mobile, summary panel can move right on desktop
- Admin table: horizontal scroll or stacked cards on mobile
- Admin sidebar: fixed on desktop, top nav on mobile
