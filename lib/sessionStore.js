"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const SESSION_KEY = "biopulse-session";

export const useSessionStore = create(
  persist(
    (set) => ({
      session: null,
      hasHydrated: false,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      markHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: SESSION_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated(true);
      },
    }
  )
);
