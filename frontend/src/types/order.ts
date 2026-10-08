import type { Payment, PaymentStatus } from "./payment";

export type PickupMethod = "pickup" | "delivery";

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";

export interface CustomerInfo {
  name: string;
  phone: string;
  line_id?: string;
}

export interface PickupInfo {
  method: PickupMethod;
  pickup_date: string;
  delivery_address?: string;
}

export interface CreateOrderItemInput {
  product_id: string;
  qty: number;
}

export interface CreateOrderInput {
  customer: CustomerInfo;
  pickup: PickupInfo;
  items: CreateOrderItemInput[];
  customer_note?: string;
}

export interface CreateOrderResponse {
  order_id: string;
  order_token: string;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  promptpay_payload: string;
  payment_id: string;
}

export interface Order {
  order_id: string;
  order_token: string;
  created_at: string;
  customer_name: string;
  phone: string;
  line_id?: string;
  pickup_method: PickupMethod;
  pickup_date: string;
  delivery_address?: string;
  customer_note?: string;
  internal_note?: string;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  source: string;
  updated_at: string;
}

export interface OrderItem {
  item_id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  qty: number;
  subtotal: number;
  image_url?: string;
  created_at: string;
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
  payment: Payment | null;
}

export interface OrderFilters {
  created_from?: string;
  created_to?: string;
  pickup_date?: string;
  payment_status?: PaymentStatus | "";
  order_status?: OrderStatus | "";
  search?: string;
}
