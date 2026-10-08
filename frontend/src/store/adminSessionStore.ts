import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "../lib/constants";
import type { AdminSession } from "../types/api";

interface AdminSessionState {
  session: AdminSession | null;
  setSession: (session: AdminSession) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminSessionStore = create<AdminSessionState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      isAuthenticated: () => {
        const session = get().session;
        return Boolean(session && new Date(session.expires_at) > new Date());
      },
    }),
    {
      name: STORAGE_KEYS.adminSession,
    },
  ),
);
