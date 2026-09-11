import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Modal,
  Row,
  Select,
  Table,
  Typography,
  message,
  Space,
} from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import RevenueLineChart from '@/components/charts/RevenueLineChart';
import ServicePieChart from '@/components/charts/ServicePieChart';
import IncomeEntryModal from '@/components/settlement/IncomeEntryModal';
import {
  adminGetFinanceSummary,
  adminGetRevenueTrend,
  adminGetServiceRevenue,
  adminGetConsumptionList,
  adminGetTechnicianPerformance,
  adminGetTechnicianIncomeDetail,
  adminExportPayroll,
} from '@/services/finance';
import { adminGetTechnicianList } from '@/services/technician';
import { adminGetPrepaidSummary } from '@/services/sessionCard';
import { useAuthStore } from '@/stores/authStore';
import { PAYMENT_TYPE_OPTIONS } from '@/constants/business';
import type { ConsumptionRecord, PaymentDetail } from '@/types/member';
import type { Technician } from '@/types/technician';
import type { FinanceSummary, RevenueTrend, TechnicianPerformance } from '@/types/finance';
import type { PrepaidSummary } from '@/types/sessionCard';
import { formatAmount, formatDate } from '@/utils/format';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface SummaryState {
  today: FinanceSummary;
  week: FinanceSummary;
  month: FinanceSummary;
}

const EMPTY_SUMMARY: FinanceSummary = { totalRevenue: 0, orderCount: 0 };

export default function FinancePage() {
  const [loading, setLoading] = useState<boolean>(false);
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [summary, setSummary] = useState<SummaryState>({
    today: EMPTY_SUMMARY,
    week: EMPTY_SUMMARY,
    month: EMPTY_SUMMARY,
  });
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [serviceRevenue, setServiceRevenue] = useState<Array<{ category: string; amount: number }>>([]);
  const [consumptionList, setConsumptionList] = useState<ConsumptionRecord[]>([]);
  const [technicianPerformance, setTechnicianPerformance] = useState<TechnicianPerformance[]>([]);
  const [consumptionTotal, setConsumptionTotal] = useState<number>(0);
  const [consumptionPage, setConsumptionPage] = useState<number>(1);
  const pageSize = 10;
  const [consumptionLoading, setConsumptionLoading] = useState<boolean>(false);
  const [performanceLoading, setPerformanceLoading] = useState<boolean>(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState<boolean>(false);
  const [prepaidSummary, setPrepaidSummary] = useState<PrepaidSummary | null>(null);

  // 技师业绩明细弹窗状态
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailList, setDetailList] = useState<ConsumptionRecord[]>([]);
  const [detailTotal, setDetailTotal] = useState<number>(0);
  const [detailPage, setDetailPage] = useState<number>(1);
  const [detailSummary, setDetailSummary] = useState<{ totalAmount: number; orderCount: number }>({
    totalAmount: 0,
    orderCount: 0,
  });
  const [currentTechnicianId, setCurrentTechnicianId] = useState<string>('');

  // 导出工资条弹窗状态
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportSubmitting, setExportSubmitting] = useState<boolean>(false);
  const [exportForm] = Form.useForm();

  const { data: technicianOptions = [] } = useQuery<Technician[]>({
    queryKey: ['settlementOptions', 'technicians'],
    queryFn: async () => {
      const res = await adminGetTechnicianList({ page: 1, pageSize: 100 });
      return res.data?.list ?? [];
    },
  });

  const dateParams = useMemo(() => {
    return {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    };
  }, [dateRange]);

  const fetchSummary = useCallback(async (): Promise<void> => {
    const [todayRes, weekRes, monthRes] = await Promise.all([
      adminGetFinanceSummary({ period: 'today' }),
      adminGetFinanceSummary({ period: 'week' }),
      adminGetFinanceSummary({ period: 'month' }),
    ]);
    if (!todayRes.success || !weekRes.success || !monthRes.success) {
      throw new Error('财务汇总获取失败');
    }
    setSummary({
      today: todayRes.data ?? EMPTY_SUMMARY,
      week: weekRes.data ?? EMPTY_SUMMARY,
      month: monthRes.data ?? EMPTY_SUMMARY,
    });
  }, []);

  const fetchPrepaidSummary = useCallback(async (): Promise<void> => {
    try {
      const res = await adminGetPrepaidSummary({ period: 'month' });
      setPrepaidSummary(res.success ? res.data ?? null : null);
    } catch {
      setPrepaidSummary(null);
    }
  }, []);

  const fetchCharts = useCallback(async (): Promise<void> => {
    const [trendRes, serviceRes] = await Promise.all([
      adminGetRevenueTrend(dateParams),
      adminGetServiceRevenue(dateParams),
    ]);
    if (!trendRes.success || !serviceRes.success) {
      throw new Error('图表数据获取失败');
    }
    setRevenueTrend(trendRes.data ?? []);
    setServiceRevenue(serviceRes.data ?? []);
  }, [dateParams]);

  const fetchConsumptionList = useCallback(async (): Promise<void> => {
    setConsumptionLoading(true);
    try {
      const res = await adminGetConsumptionList({
        page: consumptionPage,
        pageSize,
        ...dateParams,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '消费记录获取失败');
      }
      setConsumptionList(res.data?.list ?? []);
      setConsumptionTotal(res.data?.total ?? 0);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '消费记录获取失败');
    } finally {
      setConsumptionLoading(false);
    }
  }, [consumptionPage, dateParams]);

  const fetchTechnicianPerformance = useCallback(async (): Promise<void> => {
    setPerformanceLoading(true);
    try {
      const res = await adminGetTechnicianPerformance(dateParams);
      if (!res.success) {
        throw new Error(res.error?.message ?? '技师业绩获取失败');
      }
      setTechnicianPerformance(res.data ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '技师业绩获取失败');
    } finally {
      setPerformanceLoading(false);
    }
  }, [dateParams]);

  const fetchPageData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await Promise.all([fetchSummary(), fetchCharts(), fetchPrepaidSummary()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '财务统计数据获取失败');
    } finally {
      setLoading(false);
    }
  }, [fetchCharts, fetchPrepaidSummary, fetchSummary]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    fetchConsumptionList();
  }, [fetchConsumptionList]);

  useEffect(() => {
    fetchTechnicianPerformance();
  }, [fetchTechnicianPerformance]);

  const handleIncomeSuccess = useCallback((): void => {
    void Promise.all([
      fetchPageData(),
      fetchConsumptionList(),
      fetchTechnicianPerformance(),
    ]);
  }, [fetchPageData, fetchConsumptionList, fetchTechnicianPerformance]);

  // 获取技师业绩明细
  const fetchTechnicianDetail = useCallback(async (technicianId: string, page: number) => {
    setDetailLoading(true);
    try {
      const res = await adminGetTechnicianIncomeDetail({
        technicianId,
        startDate: dateParams.startDate,
        endDate: dateParams.endDate,
        page,
        pageSize: 10,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '获取明细失败');
      }
      setDetailList(res.data?.list ?? []);
      setDetailTotal(res.data?.total ?? 0);
      setDetailSummary(res.data?.summary ?? { totalAmount: 0, orderCount: 0 });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取明细失败');
    } finally {
      setDetailLoading(false);
    }
  }, [dateParams]);

  // 打开技师业绩明细弹窗
  const handleOpenDetailModal = useCallback(async (technicianId: string) => {
    setCurrentTechnicianId(technicianId);
    setDetailModalOpen(true);
    setDetailPage(1);
    await fetchTechnicianDetail(technicianId, 1);
  }, [fetchTechnicianDetail]);

  // 关闭技师业绩明细弹窗
  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setDetailList([]);
    setCurrentTechnicianId('');
  }, []);

  // 打开导出工资条弹窗
  const handleOpenExportModal = useCallback(() => {
    exportForm.resetFields();
    setExportModalOpen(true);
  }, [exportForm]);

  // 关闭导出工资条弹窗
  const handleCloseExportModal = useCallback(() => {
    setExportModalOpen(false);
    exportForm.resetFields();
  }, [exportForm]);

  // 提交导出工资条
  const handleSubmitExport = useCallback(async () => {
    try {
      const values = await exportForm.validateFields();
      setExportSubmitting(true);

      const monthValue = (values.month as Dayjs).format('YYYY-MM');

      const res = await adminExportPayroll({
        technicianId: values.technicianId,
        month: monthValue,
      });

      if (!res.success) {
        throw new Error(res.error?.message ?? '导出失败');
      }

      // 创建并下载 CSV 文件
      const blob = new Blob([res.data?.content ?? ''], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = res.data?.filename ?? 'payroll.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('工资条导出成功');
      setExportModalOpen(false);
      exportForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setExportSubmitting(false);
    }
  }, [exportForm]);

  const consumptionColumns: ColumnsType<ConsumptionRecord> = [
    {
      title: '服务时间',
      dataIndex: 'serviceTime',
      key: 'serviceTime',
      width: 120,
      render: (value: Date | string | undefined) => (value ? formatDate(value) : '-'),
    },
    {
      title: '会员ID',
      dataIndex: 'memberId',
      key: 'memberId',
      width: 130,
    },
    {
      title: '服务项目',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 150,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '技师',
      dataIndex: 'technicianName',
      key: 'technicianName',
      width: 120,
    },
  ];

  const performanceColumns: ColumnsType<TechnicianPerformance> = [
    {
      title: '技师',
      dataIndex: 'technicianName',
      key: 'technicianName',
      width: 140,
    },
    {
      title: '完成订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 120,
    },
    {
      title: '服务总收入',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '提成比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      width: 100,
      render: (value: number | undefined) => `${value ?? 30}%`,
    },
    {
      title: '应得提成',
      dataIndex: 'commissionAmount',
      key: 'commissionAmount',
      width: 140,
      render: (value: number | undefined) => `¥${formatAmount(value ?? 0)}`,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: TechnicianPerformance) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetailModal(record.technicianId)}
          >
            查看明细
          </Button>
          {isSuperAdmin && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                exportForm.setFieldsValue({
                  technicianId: record.technicianId,
                });
                setExportModalOpen(true);
              }}
            >
              导出工资条
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const detailColumns: ColumnsType<ConsumptionRecord> = [
    {
      title: '服务时间',
      dataIndex: 'serviceTime',
      key: 'serviceTime',
      width: 160,
      render: (value: Date | string | undefined) => (value ? formatDate(value) : '-'),
    },
    {
      title: '服务项目',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 150,
    },
    {
      title: '支付方式',
      key: 'paymentDetails',
      width: 200,
      render: (_: unknown, record: ConsumptionRecord) => {
        if (!record.paymentDetails || record.paymentDetails.length === 0) {
          return '-';
        }
        return (
          <Space direction="vertical" size={0}>
            {record.paymentDetails.map((detail: PaymentDetail, index: number) => (
              <span key={index}>
                {PAYMENT_TYPE_OPTIONS.find((opt) => opt.value === detail.paymentType)?.label ?? detail.paymentType}:
                ¥{formatAmount(detail.amount)}
              </span>
            ))}
          </Space>
        );
      },
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 100,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '客户',
      dataIndex: 'memberName',
      key: 'memberName',
      width: 120,
      render: (value: string | undefined) => value ?? '散客',
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      width: 150,
      render: (value: string | undefined) => value || '-',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          财务统计
        </Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <RangePicker
            value={dateRange}
            onChange={(values: [Dayjs | null, Dayjs | null] | null) => {
              if (!values || !values[0] || !values[1]) {
                return;
              }
              setDateRange([values[0], values[1]]);
              setConsumptionPage(1);
            }}
          />
          <Button type="primary" onClick={() => setIncomeModalOpen(true)}>
            收入录入
          </Button>
          {isSuperAdmin && (
            <Button onClick={handleOpenExportModal}>
              导出工资条
            </Button>
          )}
        </div>
      </div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card loading={loading} title="今日收入">
            <Title level={3} style={{ margin: 0 }}>
              ¥{formatAmount(summary.today.totalRevenue)}
            </Title>
            <div>订单数：{summary.today.orderCount}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading} title="本周收入">
            <Title level={3} style={{ margin: 0 }}>
              ¥{formatAmount(summary.week.totalRevenue)}
            </Title>
            <div>订单数：{summary.week.orderCount}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading} title="本月收入">
            <Title level={3} style={{ margin: 0 }}>
              ¥{formatAmount(summary.month.totalRevenue)}
            </Title>
            <div>订单数：{summary.month.orderCount}</div>
          </Card>
        </Col>
      </Row>
      {prepaidSummary && (
        <Card title="预收未核销（本月口径）" style={{ marginBottom: 16 }} loading={loading}>
          <Row gutter={16}>
            <Col span={6}>
              <div>储值卡未核销余额</div>
              <Title level={4} style={{ margin: 0 }}>
                ¥{formatAmount(prepaidSummary.storedCardBalance)}
              </Title>
            </Col>
            <Col span={6}>
              <div>次卡未核销价值</div>
              <Title level={4} style={{ margin: 0 }}>
                ¥{formatAmount(prepaidSummary.sessionCardValue)}
              </Title>
            </Col>
            <Col span={6}>
              <div>预收未核销合计</div>
              <Title level={4} style={{ margin: 0 }}>
                ¥{formatAmount(prepaidSummary.prepaidOutstanding)}
              </Title>
            </Col>
            <Col span={6}>
              <div>本月新增预收（充值 + 售卡）</div>
              <Title level={4} style={{ margin: 0 }}>
                ¥{formatAmount(prepaidSummary.periodNewPrepaid)}
              </Title>
            </Col>
          </Row>
        </Card>
      )}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card loading={loading} title="收入趋势">
            <RevenueLineChart data={revenueTrend} />
          </Card>
        </Col>
        <Col span={12}>
          <Card loading={loading} title="服务分类收入分布">
            <ServicePieChart data={serviceRevenue} />
          </Card>
        </Col>
      </Row>
      <Card title="消费记录" style={{ marginBottom: 16 }}>
        <Table<ConsumptionRecord>
          rowKey="_id"
          loading={consumptionLoading}
          columns={consumptionColumns}
          dataSource={consumptionList}
          pagination={{
            current: consumptionPage,
            pageSize,
            total: consumptionTotal,
            onChange: (page: number) => setConsumptionPage(page),
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
      <Card title="技师业绩统计">
        <Table<TechnicianPerformance>
          rowKey="technicianId"
          loading={performanceLoading}
          columns={performanceColumns}
          dataSource={technicianPerformance}
          pagination={false}
        />
      </Card>

      <IncomeEntryModal
        open={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        onSuccess={handleIncomeSuccess}
      />

      {/* 技师业绩明细弹窗 */}
      <Modal
        title="技师业绩明细"
        open={detailModalOpen}
        onCancel={handleCloseDetailModal}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>期间总收入：¥{formatAmount(detailSummary.totalAmount)}</span>
            <span>总订单数：{detailSummary.orderCount}</span>
          </Space>
        </div>
        <Table<ConsumptionRecord>
          rowKey="_id"
          loading={detailLoading}
          columns={detailColumns}
          dataSource={detailList}
          pagination={{
            current: detailPage,
            pageSize: 10,
            total: detailTotal,
            onChange: (page: number) => {
              setDetailPage(page);
              fetchTechnicianDetail(currentTechnicianId, page);
            },
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Modal>

      {/* 导出工资条弹窗 */}
      <Modal
        title="导出工资条"
        open={exportModalOpen}
        onOk={handleSubmitExport}
        onCancel={handleCloseExportModal}
        confirmLoading={exportSubmitting}
        destroyOnHidden
      >
        <Form form={exportForm} layout="vertical">
          <Form.Item
            name="technicianId"
            label="技师"
            rules={[{ required: true, message: '请选择技师' }]}
          >
            <Select
              placeholder="请选择技师"
              options={technicianOptions.map((item: Technician) => ({
                value: item._id,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="month"
            label="月份"
            rules={[{ required: true, message: '请选择月份' }]}
          >
            <DatePicker.MonthPicker style={{ width: '100%' }} placeholder="请选择月份" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
