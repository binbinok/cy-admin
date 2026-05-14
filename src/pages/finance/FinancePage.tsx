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
  Space,
} from 'antd';
import { PlusOutlined, MinusOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
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
  adminGetTechnicianIncomeDetail,
  adminCreateIncomeRecord,
  adminExportPayroll,
} from '@/services/finance';
import { adminGetTechnicianList } from '@/services/technician';
import { adminGetMemberList } from '@/services/member';
import { adminGetServiceCategories } from '@/services/service';
import type { ConsumptionRecord, PaymentDetail } from '@/types/member';
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

const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash', label: '现金' },
  { value: 'member_card', label: '会员卡' },
  { value: 'meituan', label: '美团' },
];

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
      paymentDetails: [{ paymentType: 'cash', amount: undefined }],
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
      const paymentDetails = values.paymentDetails as Array<{ paymentType: string; amount: number }>;

      // 转换金额为分
      const formattedPaymentDetails = paymentDetails.map((d) => ({
        paymentType: d.paymentType,
        amount: Math.round(d.amount * 100),
      }));

      const payload = {
        serviceCategory: values.serviceCategory as string,
        serviceName: values.serviceName as string,
        paymentDetails: formattedPaymentDetails,
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
      dataIndex: 'amount',
      key: 'amount',
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
          <Button type="primary" onClick={handleOpenIncomeModal}>
            收入录入
          </Button>
          <Button onClick={handleOpenExportModal}>
            导出工资条
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

      {/* 收入录入弹窗 */}
      <Modal
        title="收入录入"
        open={incomeModalOpen}
        onOk={handleSubmitIncome}
        onCancel={handleCloseIncomeModal}
        confirmLoading={incomeSubmitting}
        destroyOnClose
        width={700}
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

          {/* 多支付方式 */}
          <Form.List
            name="paymentDetails"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('至少添加一组支付方式'));
                  }
                  const types = value.map((v: { paymentType: string }) => v.paymentType);
                  if (new Set(types).size !== types.length) {
                    return Promise.reject(new Error('支付方式不能重复'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'paymentType']}
                      rules={[{ required: true, message: '请选择金额类型' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        placeholder="金额类型"
                        options={PAYMENT_TYPE_OPTIONS.map((opt) => ({
                          ...opt,
                          disabled: fields.some(
                            (f, i) =>
                              i !== index &&
                              incomeForm.getFieldValue(['paymentDetails', f.name, 'paymentType']) ===
                                opt.value,
                          ),
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'amount']}
                      rules={[{ required: true, message: '请输入金额' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0.01}
                        step={0.01}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="金额（元）"
                        addonAfter="元"
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="link"
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                {fields.length < 3 && (
                  <Button
                    type="dashed"
                    onClick={() => add({ paymentType: undefined, amount: undefined })}
                    icon={<PlusOutlined />}
                  >
                    添加支付方式
                  </Button>
                )}
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>

          <Form.Item name="note" label="服务备注">
            <Input.TextArea rows={3} maxLength={100} placeholder="请输入服务备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

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
        destroyOnClose
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
