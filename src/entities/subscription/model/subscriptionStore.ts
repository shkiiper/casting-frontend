import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getSubscriptionInfo } from "@/api/customer";
import type { SubscriptionInfoResponse } from "@/types/customer"; // ← ✅ ИСПРАВЛЕНО

let mountedHooks: number = 0;
let intervalId: NodeJS.Timeout | null = null;

const startPolling = () => {
  if (intervalId || mountedHooks === 0) return;
  intervalId = setInterval(() => {
    useSubscriptionStore.getState().refresh();
  }, 30000);
};

const stopPolling = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

interface SubscriptionState {
  info: SubscriptionInfoResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      info: null,
      loading: false,
      error: null,
      refresh: async () => {
        set({ loading: true, error: null });
        try {
          const data = await getSubscriptionInfo();
          set({ info: data, loading: false });
        } catch (err: any) {
          set({ error: err.message || "Ошибка загрузки", loading: false });
        }
      },
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ info: state.info }),
    }
  )
);

export { startPolling, stopPolling };
