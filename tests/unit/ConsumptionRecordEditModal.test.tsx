import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import ConsumptionRecordEditModal from '@/components/finance/ConsumptionRecordEditModal';
import type { ConsumptionRecord } from '@/types/member';

const mockAdminUpdateConsumptionRecord = vi.fn();
vi.mock('@/services/finance', () => ({
  adminUpdateConsumptionRecord: (...args: unknown[]) =>
    mockAdminUpdateConsumptionRecord(...args),
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

const mockRecord: ConsumptionRecord = {
  _id: 'rec1',
  memberId: 'XPW7KB',
  serviceName: '仙女-妈生自然款',
  technicianName: '伊娜',
  amount: 29520,
  serviceTime: '2026-09-12T06:00:00.000Z',
  note: '原始备注',
  createdAt: new Date('2026-09-14T02:00:00.000Z'),
};

const renderModal = (
  props: Partial<Parameters<typeof ConsumptionRecordEditModal>[0]> = {},
) => {
  return render(
    <ConsumptionRecordEditModal
      open
      record={mockRecord}
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      {...props}
    />,
  );
};

describe('ConsumptionRecordEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminUpdateConsumptionRecord.mockResolvedValue({
      success: true,
      data: { recordId: 'rec1' },
    });
  });

  it('回填记录的服务时间与备注', async () => {
    renderModal();
    expect(screen.getByText('修改消费记录')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('原始备注')).toBeInTheDocument();
    });
  });

  it('提交时携带记录 ID、ISO 服务时间与备注，并回调成功', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSuccess, onClose });
    await waitFor(() => {
      expect(screen.getByDisplayValue('原始备注')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/保\s*存/));
    await waitFor(() => {
      expect(mockAdminUpdateConsumptionRecord).toHaveBeenCalledTimes(1);
    });
    const payload = mockAdminUpdateConsumptionRecord.mock.calls[0][0] as {
      recordId: string;
      serviceTime: string;
      note: string;
    };
    expect(payload.recordId).toBe('rec1');
    expect(dayjs(payload.serviceTime).toISOString()).toBe(payload.serviceTime);
    expect(payload.note).toBe('原始备注');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('提交失败时提示错误且不关闭弹窗', async () => {
    mockAdminUpdateConsumptionRecord.mockResolvedValue({
      success: false,
      error: { code: 400, message: '服务时间格式不正确' },
    });
    const onClose = vi.fn();
    renderModal({ onClose });
    await waitFor(() => {
      expect(screen.getByDisplayValue('原始备注')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/保\s*存/));
    await waitFor(() => {
      expect(screen.getByText('服务时间格式不正确')).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
