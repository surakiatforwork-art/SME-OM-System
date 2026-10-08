import type { OrderStatus } from "../types/order";
import type { PaymentStatus } from "../types/payment";

export const APP_NAME =
  import.meta.env.VITE_APP_NAME?.trim() || "SME OM System";

export const API_URL = import.meta.env.VITE_API_URL?.trim() || "";

export const MOCK_MODE =
  import.meta.env.VITE_MOCK_MODE === "true" || API_URL.length === 0;

export const STORAGE_KEYS = {
  cart: "sme-om-cart",
  adminSession: "sme-om-admin-session",
  mockDb: "sme-om-mock-db-v1",
  customerProfile: "sme-om-customer-profile",
  customerOrders: "sme-om-customer-orders",
  orderTokenPrefix: "sme-om-order-token:",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "ยังไม่ชำระ",
  pending_review: "รอตรวจสลิป",
  paid: "ชำระแล้ว",
  rejected: "สลิปถูกปฏิเสธ",
  refunded: "คืนเงินแล้ว",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "รับออเดอร์แล้ว",
  preparing: "กำลังผลิต",
  ready: "พร้อมรับสินค้า",
  delivering: "กำลังจัดส่ง",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export const MAX_UPLOAD_MB = 5;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
