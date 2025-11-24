// Zustand Store for Global State

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Alert, City } from "./types"

interface AppState {
  // Alerts
  alerts: Alert[]
  addAlert: (alert: Omit<Alert, "id" | "created_at">) => void
  removeAlert: (id: string) => void
  toggleAlert: (id: string) => void

  // Preferences
  defaultCity: City
  setDefaultCity: (city: City) => void

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Alerts
      alerts: [],
      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
            },
          ],
        })),
      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        })),

      // Preferences
      defaultCity: "Caerleon",
      setDefaultCity: (city) => set({ defaultCity: city }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "albion-tool-storage",
    },
  ),
)
