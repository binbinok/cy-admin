import { create } from 'zustand';
import { INACTIVITY_TIMEOUT_MS } from '@/constants/business';
import type { LoginResponse } from '@/types/auth';

const TOKEN_KEY = 'admin_token';
const ADMIN_INFO_KEY = 'admin_info';

interface AdminInfo {
  adminId: string;
  username: string;
  role: 'super_admin' | 'admin';
}

interface AuthState {
  adminInfo: AdminInfo | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (data: LoginResponse) => void;
  logout: () => void;
  clearAuth: () => void;
  startInactivityTimer: () => void;
  stopInactivityTimer: () => void;
  rehydrate: () => void;
}

type AuthStore = AuthState & AuthActions;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let activityListenersAttached = false;

const resetInactivityTimer = () => {
  if (inactivityTimer !== null) {
    clearTimeout(inactivityTimer);
  }
  inactivityTimer = setTimeout(() => {
    const { clearAuth } = useAuthStore.getState();
    clearAuth();
    window.location.href = '/login';
  }, INACTIVITY_TIMEOUT_MS);
};

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
];

const attachActivityListeners = () => {
  if (activityListenersAttached) return;
  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, resetInactivityTimer, { passive: true });
  });
  activityListenersAttached = true;
};

const detachActivityListeners = () => {
  ACTIVITY_EVENTS.forEach((event) => {
    window.removeEventListener(event, resetInactivityTimer);
  });
  activityListenersAttached = false;
};

export const useAuthStore = create<AuthStore>((set) => ({
  adminInfo: null,
  token: null,
  isAuthenticated: false,

  login: (data: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(data.adminInfo));
    set({
      adminInfo: data.adminInfo,
      token: data.token,
      isAuthenticated: true,
    });
    // Start inactivity timer after login
    resetInactivityTimer();
    attachActivityListeners();
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
    if (inactivityTimer !== null) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    detachActivityListeners();
    set({
      adminInfo: null,
      token: null,
      isAuthenticated: false,
    });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
    if (inactivityTimer !== null) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    detachActivityListeners();
    set({
      adminInfo: null,
      token: null,
      isAuthenticated: false,
    });
  },

  startInactivityTimer: () => {
    resetInactivityTimer();
    attachActivityListeners();
  },

  stopInactivityTimer: () => {
    if (inactivityTimer !== null) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    detachActivityListeners();
  },

  rehydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        // Decode JWT payload (no signature verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          // Token expired — clear localStorage
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ADMIN_INFO_KEY);
          return;
        }

        // Try to restore adminInfo from localStorage first, fallback to JWT payload
        let adminInfo: AdminInfo;
        const storedInfo = localStorage.getItem(ADMIN_INFO_KEY);
        if (storedInfo) {
          adminInfo = JSON.parse(storedInfo) as AdminInfo;
        } else {
          adminInfo = {
            adminId: payload.adminId,
            username: payload.username,
            role: payload.role,
          };
        }

        set({
          adminInfo,
          token,
          isAuthenticated: true,
        });
        resetInactivityTimer();
        attachActivityListeners();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ADMIN_INFO_KEY);
      }
    }
  },
}));
