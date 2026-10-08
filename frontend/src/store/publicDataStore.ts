import { create } from "zustand";
import { apiClient } from "../lib/apiClient";
import type { Product } from "../types/product";
import type { ShopSettings } from "../types/shop";

const STORAGE_KEY = "sme-om-public-bootstrap-v2";
const MAX_PERSISTED_AGE_MS = 6 * 60 * 60_000;
const SOFT_REFRESH_MS = 90_000;

interface PersistedPublicData {
  settings: ShopSettings;
  products: Product[];
  savedAt: number;
}

interface PublicDataState {
  settings: ShopSettings | null;
  products: Product[];
  isBootstrapped: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  lastLoadedAt: number;
  bootstrap: (force?: boolean) => Promise<void>;
}

function readPersisted(): PersistedPublicData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPublicData;
    if (
      !parsed?.settings ||
      !Array.isArray(parsed.products) ||
      !parsed.savedAt ||
      Date.now() - parsed.savedAt > MAX_PERSISTED_AGE_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(settings: ShopSettings, products: Product[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ settings, products, savedAt: Date.now() }),
    );
  } catch {
    // Persistence is a UX optimization only.
  }
}

const cached = readPersisted();
let bootstrapPromise: Promise<void> | null = null;

export const usePublicDataStore = create<PublicDataState>()((set, get) => ({
  settings: cached?.settings ?? null,
  products: cached?.products ?? [],
  isBootstrapped: Boolean(cached),
  isLoading: !cached,
  isRefreshing: false,
  error: "",
  lastLoadedAt: cached?.savedAt ?? 0,

  bootstrap: async (force = false) => {
    if (bootstrapPromise) return bootstrapPromise;

    const state = get();
    if (
      !force &&
      state.isBootstrapped &&
      Date.now() - state.lastLoadedAt < SOFT_REFRESH_MS
    ) {
      return;
    }

    bootstrapPromise = (async () => {
      set({
        isLoading: !get().isBootstrapped,
        isRefreshing: get().isBootstrapped,
        error: "",
      });
      try {
        const data = await apiClient.getPublicBootstrap(force);
        persist(data.settings, data.products);
        set({
          settings: data.settings,
          products: data.products,
          isBootstrapped: true,
          lastLoadedAt: Date.now(),
          error: "",
        });
      } catch (err) {
        set({
          error:
            err instanceof Error
              ? err.message
              : "โหลดข้อมูลหน้าร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        });
        if (!get().isBootstrapped) throw err;
      } finally {
        set({ isLoading: false, isRefreshing: false });
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },
}));
