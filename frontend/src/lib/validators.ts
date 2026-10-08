import type { CreateOrderInput } from "../types/order";

export function validateCheckout(input: CreateOrderInput) {
  const errors: string[] = [];

  if (!input.customer.name.trim()) errors.push("กรุณากรอกชื่อผู้รับสินค้า");
  if (!input.customer.phone.trim()) errors.push("กรุณากรอกเบอร์โทร");
  if (!input.pickup.pickup_date) errors.push("กรุณาเลือกวันที่รับสินค้า");
  if (
    input.pickup.method === "delivery" &&
    !input.pickup.delivery_address?.trim()
  ) {
    errors.push("กรุณากรอกที่อยู่จัดส่ง");
  }
  if (input.items.length === 0) errors.push("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
  if (input.items.some((item) => item.qty < 1)) {
    errors.push("จำนวนสินค้าต้องมากกว่า 0");
  }

  return errors;
}

export function sanitizeText(value: string, maxLength = 500) {
  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}
