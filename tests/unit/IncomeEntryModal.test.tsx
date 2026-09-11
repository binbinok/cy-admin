import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IncomeEntryModal from '@/components/settlement/IncomeEntryModal';

const mockAdminCreateSettlement = vi.fn();
vi.mock('@/services/finance', () => ({
  adminCreateSettlement: (...args: unknown[]) => mockAdminCreateSettlement(...args),
}));

vi.mock('@/services/technician', () => ({
  adminGetTechnicianList: vi.fn().mockResolvedValue({
    success: true,
    data: { list: [{ _id: 't1', name: '小亭' }], total: 1 },
  }),
}));

const mockAdminGetMemberDetail = vi.fn();
vi.mock('@/services/member', () => ({
  adminGetMemberList: vi.fn().mockResolvedValue({
    success: true,
    data: { list: [{ _id: 'm1', memberId: 'M001', nickName: '测试会员' }], total: 1 },
  }),
  adminGetMemberDetail: (...args: unknown[]) => mockAdminGetMemberDetail(...args),
}));

vi.mock('@/services/memberCard', () => ({
  adminGetDiscountLevels: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('@/services/service', () => ({
  adminGetServiceTemplates: vi.fn().mockResolvedValue({
    success: true,
    data: [
      {
        _id: 'tpl1',
        categoryId: 'cat1',
        categoryName: '美甲',
        baseItems: [
          {
            itemId: 'item1',
            name: '基础款式',
            defaultPrice: 20000,
            defaultDuration: 120,
            discountable: true,
            commissionable: true,
            enabled: true,
          },
        ],
        addonItems: [],
      },
    ],
  }),
}));

vi.mock('@/services/sessionCard', () => ({
  adminGetMemberSessionCards: vi.fn().mockResolvedValue({
    success: true,
    data: { cards: [], redemptions: [] },
  }),
}));

vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

const renderModal = (props: Partial<Parameters<typeof IncomeEntryModal>[0]> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IncomeEntryModal open onClose={vi.fn()} onSuccess={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
};

describe('IncomeEntryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminGetMemberDetail.mockResolvedValue({ success: true, data: { card: null } });
  });

  it('关联预约 prefill 时显示关联标题并预填备注', async () => {
    renderModal({
      prefill: {
        appointmentId: 'a1',
        categoryId: 'cat1',
        technicianId: 't1',
        memberId: 'M001',
        serviceTime: '2026-08-28 15:00',
        note: '预约备注内容',
      },
    });
    expect(screen.getByText('收入录入（关联预约结算）')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('预约备注内容')).toBeInTheDocument();
    });
  });

  it('无 prefill 时显示普通收入录入标题', async () => {
    renderModal();
    expect(screen.getByText('收入录入')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('改价非 0 时必填，将写入操作日志')).toBeInTheDocument();
    });
  });

  it('prefill 会员时调用会员详情查询折扣等级', async () => {
    renderModal({ prefill: { memberId: 'M001' } });
    await waitFor(() => {
      expect(mockAdminGetMemberDetail).toHaveBeenCalledWith('M001');
    });
  });
});
