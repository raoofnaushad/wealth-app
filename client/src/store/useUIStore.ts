import { create } from 'zustand'

interface UIState {
  globalSidebarCollapsed: boolean
  setGlobalSidebarCollapsed: (collapsed: boolean) => void
  toggleGlobalSidebar: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  globalSidebarCollapsed: false,
  setGlobalSidebarCollapsed: (collapsed: boolean) => set({ globalSidebarCollapsed: collapsed }),
  toggleGlobalSidebar: () => set({ globalSidebarCollapsed: !get().globalSidebarCollapsed }),
}))
