import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  selectedMenuKey: string;
}

interface UiActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedMenuKey: (key: string) => void;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  selectedMenuKey: '/',

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  setSelectedMenuKey: (key: string) => {
    set({ selectedMenuKey: key });
  },
}));
