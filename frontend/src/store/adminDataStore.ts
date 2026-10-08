import { create } from "zustand";
import { apiClient } from "../lib/apiClient";
import type {
  AdminBootstrapData,
  AdminBootstrapOptions,
  AdminSyncDelta,
  AdminSyncScope,
} from "../types/api";
import type { Order, OrderItem } from "../types/order";
import type { Payment } from "../types/payment";
import type { Product } from "../types/product";
import type { ShopSettings } from "../types/shop";

interface AdminDataState {
  settings: ShopSettings | null;
  productsById: Record<string, Product>;
  ordersById: Record<string, Order>;
  orderItemsByOrderId: Record<string, OrderItem[]>;
  paymentsByOrderId: Record<string, Payment>;
  lastSyncedAt: string;
  isBootstrapped: boolean;
  isBootstrapping: boolean;
  isSyncing: boolean;
  error: string;
  bootstrap: (
    sessionToken: string,
    options?: AdminBootstrapOptions,
    force?: boolean,
  ) => Promise<void>;
  sync: (sessionToken: string, scope?: AdminSyncScope[]) => Promise<void>;
  mergeBootstrap: (data: AdminBootstrapData) => void;
  mergeDelta: (delta: AdminSyncDelta) => void;
  upsertProduct: (product: Product) => void;
  upsertOrder: (order: Order) => void;
  upsertPayment: (payment: Payment) => void;
  setSettings: (settings: ShopSettings) => void;
  reset: () => void;
}

const initialState = {
  settings: null,
  productsById: {},
  ordersById: {},
  orderItemsByOrderId: {},
  paymentsByOrderId: {},
  lastSyncedAt: "",
  isBootstrapped: false,
  isBootstrapping: false,
  isSyncing: false,
  error: "",
};

let bootstrapPromise: Promise<void> | null = null;
let syncPromise: Promise<void> | null = null;

function indexProducts(products: Product[]) {
  return products.reduce<Record<string, Product>>((map, product) => {
    map[product.product_id] = product;
    return map;
  }, {});
}

function indexOrders(orders: Order[]) {
  return orders.reduce<Record<string, Order>>((map, order) => {
    map[order.order_id] = order;
    return map;
  }, {});
}

function groupOrderItems(items: OrderItem[]) {
  return items.reduce<Record<string, OrderItem[]>>((map, item) => {
    map[item.order_id] = [...(map[item.order_id] || []), item];
    return map;
  }, {});
}

function indexPayments(payments: Payment[]) {
  return payments.reduce<Record<string, Payment>>((map, payment) => {
    map[payment.order_id] = payment;
    return map;
  }, {});
}

function mergeOrderItems(
  current: Record<string, OrderItem[]>,
  incoming: OrderItem[],
) {
  const next = { ...current };
  for (const item of incoming) {
    const existing = next[item.order_id] || [];
    const withoutCurrent = existing.filter((entry) => entry.item_id !== item.item_id);
    next[item.order_id] = [...withoutCurrent, item].sort((a, b) =>
      a.item_id.localeCompare(b.item_id),
    );
  }
  return next;
}

export const useAdminDataStore = create<AdminDataState>()((set, get) => ({
  ...initialState,
  bootstrap: async (sessionToken, options, force = false) => {
    if (!sessionToken) return;
    if (bootstrapPromise) return bootstrapPromise;
    if (get().isBootstrapped && !force) return;

    bootstrapPromise = (async () => {
      set({ isBootstrapping: true, error: "" });
      try {
        const data = await apiClient.adminBootstrap(sessionToken, options);
        get().mergeBootstrap(data);
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "โหลดข้อมูลหลังบ้านไม่สำเร็จ",
        });
        throw err;
      } finally {
        set({ isBootstrapping: false });
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },
  sync: async (sessionToken, scope) => {
    if (!sessionToken) return;
    if (syncPromise) return syncPromise;
    if (!get().isBootstrapped || !get().lastSyncedAt) {
      return get().bootstrap(sessionToken);
    }

    syncPromise = (async () => {
      set({ isSyncing: true, error: "" });
      try {
        const delta = await apiClient.adminSync(
          sessionToken,
          get().lastSyncedAt,
          scope,
        );
        get().mergeDelta(delta);
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "อัปเดตข้อมูลหลังบ้านไม่สำเร็จ",
        });
      } finally {
        set({ isSyncing: false });
        syncPromise = null;
      }
    })();

    return syncPromise;
  },
  mergeBootstrap: (data) =>
    set({
      settings: data.settings,
      productsById: indexProducts(data.products),
      ordersById: indexOrders(data.orders),
      orderItemsByOrderId: groupOrderItems(data.order_items),
      paymentsByOrderId: indexPayments(data.payments),
      lastSyncedAt: data.next_sync_cursor || data.server_time,
      isBootstrapped: true,
      error: "",
    }),
  mergeDelta: (delta) =>
    set((state) => {
      const productsById = { ...state.productsById };
      for (const product of delta.products_upsert || []) {
        productsById[product.product_id] = product;
      }

      const ordersById = { ...state.ordersById };
      for (const order of delta.orders_upsert || []) {
        ordersById[order.order_id] = order;
      }

      const paymentsByOrderId = { ...state.paymentsByOrderId };
      for (const payment of delta.payments_upsert || []) {
        paymentsByOrderId[payment.order_id] = payment;
      }

      return {
        productsById,
        ordersById,
        paymentsByOrderId,
        orderItemsByOrderId: mergeOrderItems(
          state.orderItemsByOrderId,
          delta.order_items_upsert || [],
        ),
        settings: delta.settings_patch
          ? ({ ...(state.settings || delta.settings_patch), ...delta.settings_patch } as ShopSettings)
          : state.settings,
        lastSyncedAt: delta.next_sync_cursor || delta.server_time || state.lastSyncedAt,
        isBootstrapped: true,
        error: "",
      };
    }),
  upsertProduct: (product) =>
    set((state) => ({
      productsById: { ...state.productsById, [product.product_id]: product },
    })),
  upsertOrder: (order) =>
    set((state) => ({
      ordersById: { ...state.ordersById, [order.order_id]: order },
    })),
  upsertPayment: (payment) =>
    set((state) => ({
      paymentsByOrderId: { ...state.paymentsByOrderId, [payment.order_id]: payment },
    })),
  setSettings: (settings) => set({ settings }),
  reset: () => set(initialState),
}));
