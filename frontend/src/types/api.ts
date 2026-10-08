import type { Order, OrderDetail, OrderItem } from "./order";
import type { Payment } from "./payment";
import type { Product } from "./product";
import type { ShopSettings } from "./shop";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface AdminSession {
  session_token: string;
  expires_at: string;
}

export interface DashboardStats {
  today_orders: number;
  today_sales: number;
  paid_sales: number;
  pending_review: number;
  preparing_orders: number;
  active_products: number;
  low_stock_products: number;
}

export interface DashboardData {
  stats: DashboardStats;
  latest_orders: Order[];
  best_sellers: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    amount: number;
  }>;
  upcoming_pickups: Array<{
    pickup_date: string;
    orders: number;
    total_amount: number;
  }>;
}

export interface ProductionSummaryItem {
  product_id: string;
  product_name: string;
  total_qty: number;
  number_of_orders: number;
}

export interface SalesReport {
  summary: {
    total_orders: number;
    gross_sales: number;
    paid_sales: number;
    pending_amount: number;
    cancelled_amount: number;
  };
  daily: Array<{
    date: string;
    orders: number;
    paid_amount: number;
    pending_amount: number;
    cancelled_amount: number;
  }>;
  best_sellers: DashboardData["best_sellers"];
}

export interface AdminOrderList {
  orders: Order[];
}

export interface AdminProductList {
  products: Product[];
}

export interface OrderDetailResponse {
  detail: OrderDetail;
}

export type AdminSyncScope =
  | "orders"
  | "payments"
  | "products"
  | "settings"
  | "order_items";

export interface AdminBootstrapOptions {
  range_days?: number;
  max_orders?: number;
  include_deleted_products?: boolean;
}

export interface AdminBootstrapData {
  settings: ShopSettings;
  products: Product[];
  orders: Order[];
  order_items: OrderItem[];
  payments: Payment[];
  server_time: string;
  next_sync_cursor: string;
}

export interface AdminSyncDelta {
  orders_upsert: Order[];
  payments_upsert: Payment[];
  products_upsert: Product[];
  order_items_upsert: OrderItem[];
  settings_patch: ShopSettings | null;
  deleted_product_ids: string[];
  server_time: string;
  next_sync_cursor: string;
}
