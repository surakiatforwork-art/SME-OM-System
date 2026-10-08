import type { PickupMethod } from "./order";
import type { PaymentStatus } from "./payment";
import type { OrderStatus } from "./order";

export interface CustomerDeliveryLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface CustomerProfile {
  name: string;
  phone: string;
  line_id?: string;
  pickup_method: PickupMethod;
  delivery_address?: string;
  delivery_location?: CustomerDeliveryLocation | null;
  updated_at: string;
}

export interface CustomerOrderMemory {
  order_id: string;
  order_token: string;
  created_at: string;
  pickup_date?: string;
  total_amount?: number;
  payment_status?: PaymentStatus;
  order_status?: OrderStatus;
}

export interface CustomerProfileLookupResponse {
  found: boolean;
  customer?: {
    name: string;
    phone: string;
    line_id?: string;
  };
  last_delivery?: {
    pickup_method: PickupMethod;
    delivery_address?: string;
    lat?: number;
    lng?: number;
  };
}

export interface CustomerOrderSummary {
  order_id: string;
  created_at: string;
  pickup_date: string;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
}

export interface CustomerOrdersByPhoneResponse {
  orders: CustomerOrderSummary[];
}
