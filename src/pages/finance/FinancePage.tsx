import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import RevenueLineChart from '@/components/charts/RevenueLineChart';
import ServicePieChart from '@/components/charts/ServicePieChart';
import {
  adminGetFinanceSummary,
  adminGetRevenueTrend,
  adminGetServiceRevenue,
  adminGetConsumptionList,
  adminGetTechnicianPerformance,
  adminCreateIncomeRecord,
} from '@/services/finance';
import { adminGetTechnicianList } from '@/services/technician';
import { adminGetMemberList } from '@/services/member';
import { adminGetServiceCategories } from '@/services/service';
import type { ConsumptionRecord } from '@/types/member';
import type { Member } from '@/types/member';
import type { Technician } from '@/types/technician';
import type { ServiceCategory } from '@/types/service';
import type { FinanceSummary, RevenueTrend, TechnicianPerformance } from '@/types/finance';
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
  const [incomeSubmitting, setIncomeSubmitting] = useState<boolean>(false);
  const [technicianOptions, setTechnicianOptions] = useState<Technician[]>([]);
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ServiceCategory[]>([]);
  const [incomeForm] = Form.useForm();

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
  const fetchIncomeFormOptions = useCallback(async (): Promise<void> => {
    try {
      const [technicianRes, memberRes, categoryRes] = await Promise.all([
        adminGetTechnicianList({ page: 1, pageSize: 100 }),
        adminGetMemberList({ page: 1, pageSize: 100 }),
        adminGetServiceCategories(),
      ]);
      if (technicianRes.success) {
        setTechnicianOptions(technicianRes.data?.list ?? []);
      }
      if (memberRes.success) {
        setMemberOptions(memberRes.data?.list ?? []);
      }
      if (categoryRes.success) {
        setCategoryOptions(categoryRes.data ?? []);
      }
    } catch {
      message.warning('收入录入选项加载失败，请稍后重试');
    }
  }, []);

  const fetchPageData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await Promise.all([fetchSummary(), fetchCharts()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '财务统计数据获取失败');
    } finally {
      setLoading(false);
    }
  }, [fetchCharts, fetchSummary]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    fetchConsumptionList();
  }, [fetchConsumptionList]);

  useEffect(() => {
    fetchTechnicianPerformance();
  }, [fetchTechnicianPerformance]);
  useEffect(() => {
    fetchIncomeFormOptions();
  }, [fetchIncomeFormOptions]);
  const handleOpenIncomeModal = useCallback((): void => {
    incomeForm.resetFields();
    incomeForm.setFieldsValue({
      serviceTime: dayjs(),
    });
    setIncomeModalOpen(true);
  }, [incomeForm]);
  const handleCloseIncomeModal = useCallback((): void => {
    setIncomeModalOpen(false);
    incomeForm.resetFields();
  }, [incomeForm]);
  const handleSubmitIncome = useCallback(async (): Promise<void> => {
    try {
      const values = await incomeForm.validateFields();
      setIncomeSubmitting(true);
      const serviceTimeValue = values.serviceTime as Dayjs;
      const serviceFeeValue = values.serviceFee as number;
      const payload = {
        serviceCategory: values.serviceCategory as string,
        serviceName: values.serviceName as string,
        serviceFee: Math.round(serviceFeeValue * 100),
        serviceTime: serviceTimeValue.toISOString(),
        technicianId: values.technicianId as string,
        memberId: (values.memberId as string) || undefined,
        note: (values.note as string) || undefined,
      };
      const res = await adminCreateIncomeRecord(payload);
      if (!res.success) {
        throw new Error(res.error?.message ?? '收入录入失败');
      }
      message.success('收入录入成功');
      setIncomeModalOpen(false);
      incomeForm.resetFields();
      await Promise.all([
        fetchPageData(),
        fetchConsumptionList(),
        fetchTechnicianPerformance(),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setIncomeSubmitting(false);
    }
  }, [incomeForm, fetchPageData, fetchConsumptionList, fetchTechnicianPerformance]);

  const consumptionColumns: ColumnsType<ConsumptionRecord> = [
    {
      title: '日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (value: Date | string) => formatDate(value),
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
          <Button type="primary" onClick={handleOpenIncomeModal}>
            收入录入
          </Button>
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
      <Modal
        title="收入录入"
        open={incomeModalOpen}
        onOk={handleSubmitIncome}
        onCancel={handleCloseIncomeModal}
        confirmLoading={incomeSubmitting}
        destroyOnClose
      >
        <Form form={incomeForm} layout="vertical">
          <Form.Item
            name="serviceCategory"
            label="服务分类"
            rules={[{ required: true, message: '请选择服务分类' }]}
          >
            <Select
              placeholder="请选择服务分类"
              options={categoryOptions.map((item: ServiceCategory) => ({
                value: item.name,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="serviceName"
            label="服务内容"
            rules={[{ required: true, message: '请输入服务内容' }]}
          >
            <Input placeholder="请输入服务内容" maxLength={30} />
          </Form.Item>
          <Form.Item
            name="technicianId"
            label="服务技师"
            rules={[{ required: true, message: '请选择服务技师' }]}
          >
            <Select
              placeholder="请选择服务技师"
              options={technicianOptions.map((item: Technician) => ({
                value: item._id,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="memberId" label="客户（会员）">
            <Select
              allowClear
              showSearch
              placeholder="请选择会员（可选）"
              optionFilterProp="label"
              options={memberOptions.map((item: Member) => ({
                value: item.memberId,
                label: `${item.nickName}（${item.memberId}）`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="serviceTime"
            label="服务时间"
            rules={[{ required: true, message: '请选择服务时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="serviceFee"
            label="服务费用（元）"
            rules={[{ required: true, message: '请输入服务费用' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入服务费用"
            />
          </Form.Item>
          <Form.Item name="note" label="服务备注">
            <Input.TextArea rows={3} maxLength={100} placeholder="请输入服务备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
