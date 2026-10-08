import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "../lib/constants";
import type { Product } from "../types/product";

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  totalQty: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty = 1) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.product_id === product.product_id,
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.product_id === product.product_id
                  ? { ...item, qty: Math.max(1, item.qty + qty) }
                  : item,
              ),
            };
          }
          return { items: [...state.items, { product, qty: Math.max(1, qty) }] };
        });
      },
      updateQty: (productId, qty) => {
        set((state) => ({
          items: state.items
            .map((item) =>
              item.product.product_id === productId
                ? { ...item, qty: Math.max(1, qty) }
                : item,
            )
            .filter((item) => item.qty > 0),
        }));
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.product_id !== productId),
        }));
      },
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((sum, item) => sum + item.qty, 0),
      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    }),
    {
      name: STORAGE_KEYS.cart,
    },
  ),
);
