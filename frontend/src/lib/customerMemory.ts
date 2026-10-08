import { STORAGE_KEYS } from "./constants";
import type { CreateOrderInput, CreateOrderResponse, OrderDetail } from "../types/order";
import type {
  CustomerDeliveryLocation,
  CustomerOrderMemory,
  CustomerProfile,
} from "../types/customer";

const MAX_LOCAL_ORDERS = 20;

export function normalizePhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 9 && /^[689]/.test(digits)) return `0${digits}`;
  return digits;
}

export function readCustomerProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customerProfile);
    return raw ? (JSON.parse(raw) as CustomerProfile) : null;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(profile: CustomerProfile) {
  localStorage.setItem(STORAGE_KEYS.customerProfile, JSON.stringify(profile));
}

export function readCustomerOrders(): CustomerOrderMemory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customerOrders);
    return raw ? (JSON.parse(raw) as CustomerOrderMemory[]) : [];
  } catch {
    return [];
  }
}

export function getCustomerOrderToken(orderId: string) {
  return (
    localStorage.getItem(`${STORAGE_KEYS.orderTokenPrefix}${orderId}`) ||
    readCustomerOrders().find((order) => order.order_id === orderId)?.order_token ||
    ""
  );
}

export function rememberCustomerOrder(order: CustomerOrderMemory) {
  localStorage.setItem(
    `${STORAGE_KEYS.orderTokenPrefix}${order.order_id}`,
    order.order_token,
  );
  const next = [
    order,
    ...readCustomerOrders().filter((item) => item.order_id !== order.order_id),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, MAX_LOCAL_ORDERS);
  localStorage.setItem(STORAGE_KEYS.customerOrders, JSON.stringify(next));
}

export function rememberCustomerOrderDetail(detail: OrderDetail) {
  const token = getCustomerOrderToken(detail.order.order_id);
  if (!token) return;
  rememberCustomerOrder({
    order_id: detail.order.order_id,
    order_token: token,
    created_at: detail.order.created_at,
    pickup_date: detail.order.pickup_date,
    total_amount: detail.order.total_amount,
    payment_status: detail.order.payment_status,
    order_status: detail.order.order_status,
  });
}

export function rememberCustomerAfterCreateOrder(
  input: CreateOrderInput,
  order: CreateOrderResponse,
  deliveryLocation: CustomerDeliveryLocation | null,
) {
  saveCustomerProfile({
    name: input.customer.name,
    phone: input.customer.phone,
    line_id: input.customer.line_id,
    pickup_method: input.pickup.method,
    delivery_address: input.pickup.delivery_address,
    delivery_location: deliveryLocation,
    updated_at: new Date().toISOString(),
  });
  rememberCustomerOrder({
    order_id: order.order_id,
    order_token: order.order_token,
    created_at: new Date().toISOString(),
    pickup_date: input.pickup.pickup_date,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    order_status: order.order_status,
  });
}
