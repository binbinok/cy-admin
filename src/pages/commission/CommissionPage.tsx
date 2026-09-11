import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, DatePicker, Form, InputNumber, Table, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetCommissionConfig,
  adminGetCommissionReport,
  adminUpdateCommissionRate,
  type CommissionGlobalConfig,
  type CommissionReportItem,
} from '@/services/commission';
import { adminGetTechnicianList } from '@/services/technician';
import type { Technician } from '@/types/technician';
import { useAuthStore } from '@/stores/authStore';
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_CARD_OPEN_COMMISSION_RATE,
  DEFAULT_CARD_RENEW_COMMISSION_RATE,
  MIN_COMMISSION_RATE,
  MAX_COMMISSION_RATE,
} from '@/constants/business';
import { formatAmount } from '@/utils/format';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const DEFAULT_CONFIG: CommissionGlobalConfig = {
  manualRate: DEFAULT_COMMISSION_RATE,
  cardOpenRate: DEFAULT_CARD_OPEN_COMMISSION_RATE,
  cardRenewRate: DEFAULT_CARD_RENEW_COMMISSION_RATE,
};

// eslint-disable-next-line react-refresh/only-export-components
export function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { list?: unknown[] }).list)) {
    return (data as { list: T[] }).list;
  }
  return [];
}

const rateRules = [
  { required: true, message: '请输入提成比例' },
  {
    validator: (_: unknown, value: number) => {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return Promise.reject(new Error('提成比例必须为整数'));
      }
      if (value < MIN_COMMISSION_RATE || value > MAX_COMMISSION_RATE) {
        return Promise.reject(
          new Error(`提成比例需在 ${MIN_COMMISSION_RATE}% 到 ${MAX_COMMISSION_RATE}% 之间`),
        );
      }
      return Promise.resolve();
    },
  },
];

export default function CommissionPage() {
  const [reportData, setReportData] = useState<CommissionReportItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showResigned, setShowResigned] = useState<boolean>(false);
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [configForm] = Form.useForm<CommissionGlobalConfig>();

  const params = useMemo(() => {
    return {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    };
  }, [dateRange]);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [reportRes, configRes, technicianRes] = await Promise.all([
        adminGetCommissionReport(params),
        adminGetCommissionConfig(),
        adminGetTechnicianList({ page: 1, pageSize: 100 }),
      ]);
      if (!reportRes.success || !configRes.success) {
        throw new Error(reportRes.error?.message ?? configRes.error?.message ?? '提成数据加载失败');
      }
      setReportData(toArray<CommissionReportItem>(reportRes.data));
      setTechnicians(toArray<Technician>(technicianRes.data));
      configForm.setFieldsValue(configRes.data ?? DEFAULT_CONFIG);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提成数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [params, configForm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = useCallback(async (): Promise<void> => {
    try {
      const values = await configForm.validateFields();
      setSaving(true);
      const res = await adminUpdateCommissionRate(values);
      if (!res.success) {
        throw new Error(res.error?.message ?? '提成比例保存失败');
      }
      message.success('提成比例保存成功');
      fetchData();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  }, [configForm, fetchData]);

  const visibleReportData = useMemo(() => {
    if (showResigned) {
      return reportData;
    }
    const resignedIds = new Set(
      technicians.filter((t) => t.status === 'resigned').map((t) => t._id),
    );
    return reportData.filter((item) => !resignedIds.has(item.technicianId));
  }, [reportData, technicians, showResigned]);

  const columns: ColumnsType<CommissionReportItem> = [
    {
      title: '技师',
      dataIndex: 'technicianName',
      key: 'technicianName',
      width: 140,
    },
    {
      title: '完成服务次数',
      dataIndex: 'completedCount',
      key: 'completedCount',
      width: 130,
    },
    {
      title: '服务总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '手工提成',
      dataIndex: 'manualAmount',
      key: 'manualAmount',
      width: 120,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '开卡提成',
      dataIndex: 'cardOpenAmount',
      key: 'cardOpenAmount',
      width: 120,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '续卡提成',
      dataIndex: 'cardRenewAmount',
      key: 'cardRenewAmount',
      width: 120,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '提成合计',
      dataIndex: 'totalCommission',
      key: 'totalCommission',
      width: 130,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          提成核算
        </Title>
        <RangePicker
          value={dateRange}
          onChange={(values: [Dayjs | null, Dayjs | null] | null) => {
            if (!values || !values[0] || !values[1]) {
              return;
            }
            setDateRange([values[0], values[1]]);
          }}
        />
      </div>
      {isSuperAdmin && (
        <Card title="提成比例配置（全员生效）" style={{ marginBottom: 16 }}>
          <Form form={configForm} layout="inline" initialValues={DEFAULT_CONFIG}>
            <Form.Item label="手工提成" name="manualRate" rules={rateRules}>
              <InputNumber
                min={MIN_COMMISSION_RATE}
                max={MAX_COMMISSION_RATE}
                precision={0}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item label="开卡提成" name="cardOpenRate" rules={rateRules}>
              <InputNumber
                min={MIN_COMMISSION_RATE}
                max={MAX_COMMISSION_RATE}
                precision={0}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item label="续卡提成" name="cardRenewRate" rules={rateRules}>
              <InputNumber
                min={MIN_COMMISSION_RATE}
                max={MAX_COMMISSION_RATE}
                precision={0}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleSaveConfig} loading={saving}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
      <Card
        extra={
          <Checkbox
            checked={showResigned}
            onChange={(e) => setShowResigned(e.target.checked)}
          >
            显示离职员工
          </Checkbox>
        }
      >
        <Table<CommissionReportItem>
          rowKey="technicianId"
          columns={columns}
          dataSource={visibleReportData}
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
}
