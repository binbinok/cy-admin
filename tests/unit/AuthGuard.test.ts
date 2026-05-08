import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * AuthGuard unit tests
 *
 * Tests the route guard logic:
 * - Unauthenticated users are redirected to /login
 * - Authenticated users accessing /login are redirected to /
 * - Authenticated users can access protected routes
 */

// Mock react-router-dom
let mockPathname = '/';
vi.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => ({
    type: 'Navigate',
    props: { to, replace },
  }),
  useLocation: () => ({ pathname: mockPathname }),
}));

// Mock authStore
let mockIsAuthenticated = false;
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockPathname = '/';
  });

  it('should redirect to /login when user is not authenticated', async () => {
    mockIsAuthenticated = false;
    mockPathname = '/dashboard';

    const { default: AuthGuard } = await import('@/components/layout/AuthGuard');
    const result = AuthGuard({ children: 'protected content' }) as unknown as Record<string, unknown>;

    // Navigate component is rendered with to="/login"
    expect(result).toHaveProperty('props.to', '/login');
    expect(result).toHaveProperty('props.replace', true);
  });

  it('should redirect to / when authenticated user accesses /login', async () => {
    mockIsAuthenticated = true;
    mockPathname = '/login';

    const { default: AuthGuard } = await import('@/components/layout/AuthGuard');
    const result = AuthGuard({ children: 'login page' }) as unknown as Record<string, unknown>;

    // Navigate component is rendered with to="/"
    expect(result).toHaveProperty('props.to', '/');
    expect(result).toHaveProperty('props.replace', true);
  });

  it('should render children when user is authenticated on a protected route', async () => {
    mockIsAuthenticated = true;
    mockPathname = '/dashboard';

    const { default: AuthGuard } = await import('@/components/layout/AuthGuard');
    const result = AuthGuard({ children: 'protected content' }) as unknown as Record<string, unknown>;

    // Should not be a Navigate redirect
    expect(result).not.toHaveProperty('props.to');
  });

  it('should not redirect when unauthenticated user is on /login', async () => {
    mockIsAuthenticated = false;
    mockPathname = '/login';

    const { default: AuthGuard } = await import('@/components/layout/AuthGuard');
    const result = AuthGuard({ children: 'login page' }) as unknown as Record<string, unknown>;

    // Should render children (login page), not redirect
    expect(result).not.toHaveProperty('props.to');
  });
});
