import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, InputNumber, Modal, Table, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetCommissionConfig,
  adminGetCommissionReport,
  adminUpdateCommissionRate,
  type CommissionConfigItem,
  type CommissionReportItem,
} from '@/services/commission';
import { useAuthStore } from '@/stores/authStore';
import { formatAmount } from '@/utils/format';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// eslint-disable-next-line react-refresh/only-export-components
export function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { list?: unknown[] }).list)) {
    return (data as { list: T[] }).list;
  }
  return [];
}

export default function CommissionPage() {
  const [reportData, setReportData] = useState<CommissionReportItem[]>([]);
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [configData, setConfigData] = useState<CommissionConfigItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedConfig, setSelectedConfig] = useState<CommissionConfigItem | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [form] = Form.useForm<{ commissionRate: number }>();

  const params = useMemo(() => {
    return {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    };
  }, [dateRange]);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [reportRes, configRes] = await Promise.all([
        adminGetCommissionReport(params),
        adminGetCommissionConfig(),
      ]);
      if (!reportRes.success || !configRes.success) {
        throw new Error(reportRes.error?.message ?? configRes.error?.message ?? '提成数据加载失败');
      }
      setReportData(toArray<CommissionReportItem>(reportRes.data));
      setConfigData(toArray<CommissionConfigItem>(configRes.data));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提成数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openRateModal = useCallback((configItem: CommissionConfigItem): void => {
    setSelectedConfig(configItem);
    form.setFieldsValue({ commissionRate: configItem.commissionRate });
    setModalOpen(true);
  }, [form]);

  const closeRateModal = useCallback((): void => {
    setModalOpen(false);
    setSelectedConfig(null);
    form.resetFields();
  }, [form]);

  const handleSaveRate = useCallback(async (): Promise<void> => {
    if (!selectedConfig) {
      return;
    }
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await adminUpdateCommissionRate({
        technicianId: selectedConfig.technicianId,
        commissionRate: values.commissionRate,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '提成比例更新失败');
      }
      message.success('提成比例更新成功');
      closeRateModal();
      fetchData();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [closeRateModal, fetchData, form, selectedConfig]);

  const configMap = useMemo(() => {
    return new Map<string, number>(configData.map((item: CommissionConfigItem) => [item.technicianId, item.commissionRate]));
  }, [configData]);

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
      title: '提成比例',
      key: 'commissionRate',
      width: 100,
      render: (_: unknown, record: CommissionReportItem) => `${configMap.get(record.technicianId) ?? 30}%`,
    },
    {
      title: '应得提成',
      dataIndex: 'commissionAmount',
      key: 'commissionAmount',
      width: 130,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: CommissionReportItem) => {
        const configItem = configData.find(
          (item: CommissionConfigItem) => item.technicianId === record.technicianId,
        ) ?? {
          technicianId: record.technicianId,
          technicianName: record.technicianName,
          commissionRate: 30,
        };
        return isSuperAdmin ? (
          <Button type="link" size="small" onClick={() => openRateModal(configItem)}>
            调整比例
          </Button>
        ) : null;
      },
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
      <Card>
        <Table<CommissionReportItem>
          rowKey="technicianId"
          columns={columns}
          dataSource={reportData}
          loading={loading}
          pagination={false}
        />
      </Card>
      <Modal
        title={`设置提成比例${selectedConfig ? ` - ${selectedConfig.technicianName}` : ''}`}
        open={modalOpen}
        onCancel={closeRateModal}
        onOk={handleSaveRate}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="提成比例（1-100）"
            name="commissionRate"
            rules={[
              { required: true, message: '请输入提成比例' },
              {
                validator: (_: unknown, value: number) => {
                  if (typeof value !== 'number' || !Number.isInteger(value)) {
                    return Promise.reject(new Error('提成比例必须为整数'));
                  }
                  if (value < 1 || value > 100) {
                    return Promise.reject(new Error('提成比例需在 1% 到 100% 之间'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} max={100} precision={0} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
