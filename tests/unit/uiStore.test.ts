import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../../src/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarCollapsed: false,
      selectedMenuKey: '/',
    });
  });

  it('should have correct default state', () => {
    const state = useUiStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.selectedMenuKey).toBe('/');
  });

  it('toggleSidebar should toggle collapsed state', () => {
    const { toggleSidebar } = useUiStore.getState();

    toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);

    toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed should set collapsed state directly', () => {
    const { setSidebarCollapsed } = useUiStore.getState();

    setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);

    setSidebarCollapsed(false);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSelectedMenuKey should update the selected menu key', () => {
    const { setSelectedMenuKey } = useUiStore.getState();

    setSelectedMenuKey('/members');
    expect(useUiStore.getState().selectedMenuKey).toBe('/members');

    setSelectedMenuKey('/appointments');
    expect(useUiStore.getState().selectedMenuKey).toBe('/appointments');
  });
});
