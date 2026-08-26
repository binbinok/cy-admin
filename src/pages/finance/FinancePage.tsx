import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Checkbox,
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
  adminCreateSettlement,
  adminExportPayroll,
} from '@/services/finance';
import { adminGetTechnicianList } from '@/services/technician';
import { adminGetMemberList, adminGetMemberDetail } from '@/services/member';
import { adminGetDiscountLevels } from '@/services/memberCard';
import { adminGetServiceTemplates } from '@/services/service';

import { useAuthStore } from '@/stores/authStore';
import { useIncomePrefillStore } from '@/stores/incomePrefillStore';
import {
  computeSettlementAmounts,
  validateSettlementInput,
} from '@/utils/settlement';
import type { ConsumptionRecord, PaymentDetail } from '@/types/member';
import type { Member } from '@/types/member';
import type { Technician } from '@/types/technician';
import type { ServiceTemplate, TemplateItem } from '@/types/service';
import type { DiscountLevel } from '@/services/memberCard';

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
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
];

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
  const [incomeSubmitting, setIncomeSubmitting] = useState<boolean>(false);
  const [technicianOptions, setTechnicianOptions] = useState<Technician[]>([]);
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [templateOptions, setTemplateOptions] = useState<ServiceTemplate[]>([]);
  const [discountLevels, setDiscountLevels] = useState<DiscountLevel[]>([]);
  const [discountRate, setDiscountRate] = useState<number>(100);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string>('');

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
      const [technicianRes, memberRes, templateRes, levelRes] = await Promise.all([
        adminGetTechnicianList({ page: 1, pageSize: 100 }),
        adminGetMemberList({ page: 1, pageSize: 100 }),
        adminGetServiceTemplates({ activeOnly: true }),
        adminGetDiscountLevels(),
      ]);
      if (technicianRes.success) {
        setTechnicianOptions(technicianRes.data?.list ?? []);
      }
      if (memberRes.success) {
        setMemberOptions(memberRes.data?.list ?? []);
      }
      if (templateRes.success) {
        setTemplateOptions(templateRes.data ?? []);
      }
      if (levelRes.success) {
        setDiscountLevels(levelRes.data ?? []);
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
    setDiscountRate(100);
    const prefill = useIncomePrefillStore.getState().prefillData;
    useIncomePrefillStore.getState().clearIncomePrefill();
    setLinkedAppointmentId(prefill?.appointmentId ?? '');
    const matchedTemplate = prefill?.categoryName
      ? templateOptions.find((t) => t.categoryName === prefill.categoryName)
      : undefined;
    incomeForm.setFieldsValue({
      serviceTime: prefill?.serviceTime ? dayjs(prefill.serviceTime) : dayjs(),
      paymentDetails: [{ paymentType: 'cash', amount: undefined }],
      technicianId: prefill?.technicianId,
      memberId: prefill?.memberId,
      guestName: prefill?.guestName,
      categoryId: matchedTemplate?.categoryId,
      note: prefill?.note,
    });
    setIncomeModalOpen(true);
  }, [incomeForm, templateOptions]);

  const handleCloseIncomeModal = useCallback((): void => {
    setIncomeModalOpen(false);
    setLinkedAppointmentId('');
    incomeForm.resetFields();
  }, [incomeForm]);

  const prefillData = useIncomePrefillStore((s) => s.prefillData);

  useEffect(() => {
    if (!prefillData || templateOptions.length === 0) {
      return;
    }
    handleOpenIncomeModal();
  }, [prefillData, templateOptions, handleOpenIncomeModal]);

  const handleMemberChange = useCallback(
    async (memberId: string | undefined): Promise<void> => {
      if (!memberId) {
        setDiscountRate(100);
        return;
      }
      try {
        const res = await adminGetMemberDetail(memberId);
        const levelId = res.data?.card?.discountLevelId;
        const level = discountLevels.find((item) => item._id === levelId);
        setDiscountRate(level?.discountRate ?? 100);
      } catch {
        setDiscountRate(100);
      }
    },
    [discountLevels],
  );

  const watchedCategoryId = Form.useWatch('categoryId', incomeForm) as string | undefined;
  const watchedBaseItemId = Form.useWatch('baseItemId', incomeForm) as string | undefined;
  const watchedBasePrice = Form.useWatch('baseItemPrice', incomeForm) as number | undefined;
  const watchedAddonIds = Form.useWatch('addonIds', incomeForm) as string[] | undefined;
  const watchedAddonPrices = Form.useWatch('addonPriceMap', incomeForm) as Record<string, number> | undefined;
  const watchedCustomAddons = Form.useWatch('customAddons', incomeForm) as
    | Array<{ name?: string; price?: number; reason?: string }>
    | undefined;
  const watchedAdjustAmount = Form.useWatch('adjustAmount', incomeForm) as number | undefined;
  const watchedPayments = Form.useWatch('paymentDetails', incomeForm) as
    | Array<{ paymentType?: string; amount?: number }>
    | undefined;

  const currentTemplate = useMemo<ServiceTemplate | undefined>(
    () => templateOptions.find((t) => t.categoryId === watchedCategoryId),
    [templateOptions, watchedCategoryId],
  );
  const baseItemOptions = useMemo<TemplateItem[]>(
    () => (currentTemplate?.baseItems ?? []).filter((item) => item.enabled !== false),
    [currentTemplate],
  );
  const addonItemOptions = useMemo<TemplateItem[]>(
    () => (currentTemplate?.addonItems ?? []).filter((item) => item.enabled !== false),
    [currentTemplate],
  );
  const currentBaseItem = useMemo<TemplateItem | undefined>(
    () => baseItemOptions.find((item) => item.itemId === watchedBaseItemId),
    [baseItemOptions, watchedBaseItemId],
  );

  const pricePreview = useMemo(() => {
    if (!currentBaseItem) {
      return null;
    }
    const toFen = (yuan: number | undefined): number => Math.round((yuan ?? 0) * 100);
    const selectedAddons = (watchedAddonIds ?? [])
      .map((id) => addonItemOptions.find((item) => item.itemId === id))
      .filter((item): item is TemplateItem => !!item)
      .map((item) => ({
        price: toFen(watchedAddonPrices?.[item.itemId] ?? item.defaultPrice / 100),
        discountable: item.discountable !== false,
        commissionable: item.commissionable !== false,
      }));
    const customAddons = (watchedCustomAddons ?? [])
      .filter((addon) => addon && addon.name && typeof addon.price === 'number')
      .map((addon) => ({ price: toFen(addon.price) }));
    return computeSettlementAmounts({
      baseItem: {
        price: toFen(watchedBasePrice ?? currentBaseItem.defaultPrice / 100),
        discountable: currentBaseItem.discountable !== false,
        commissionable: currentBaseItem.commissionable !== false,
      },
      addons: selectedAddons,
      customAddons,
      discountRate,
      adjustAmount: toFen(watchedAdjustAmount),
    });
  }, [
    currentBaseItem,
    watchedAddonIds,
    watchedAddonPrices,
    watchedCustomAddons,
    watchedBasePrice,
    watchedAdjustAmount,
    addonItemOptions,
    discountRate,
  ]);

  const paymentTotalFen = useMemo(
    () =>
      (watchedPayments ?? []).reduce(
        (sum, detail) => sum + Math.round((detail?.amount ?? 0) * 100),
        0,
      ),
    [watchedPayments],
  );

  const handleSubmitIncome = useCallback(async (): Promise<void> => {
    try {
      const values = await incomeForm.validateFields();
      setIncomeSubmitting(true);

      const serviceTimeValue = values.serviceTime as Dayjs;
      const paymentDetails = (
        values.paymentDetails as Array<{ paymentType: string; amount: number }>
      ).map((d) => ({
        paymentType: d.paymentType,
        amount: Math.round(d.amount * 100),
      }));
      const categoryId = values.categoryId as string;
      const template = templateOptions.find((t) => t.categoryId === categoryId);
      const baseItemId = values.baseItemId as string;
      const baseItem = template?.baseItems.find((item) => item.itemId === baseItemId);
      const baseItemPrice = Math.round(((values.baseItemPrice as number) ?? 0) * 100);
      const addonIds = (values.addonIds as string[]) ?? [];
      const addonPriceMap = (values.addonPriceMap as Record<string, number>) ?? {};
      const addons = addonIds.map((id) => {
        const addonItem = template?.addonItems.find((item) => item.itemId === id);
        return {
          itemId: id,
          price: Math.round((addonPriceMap[id] ?? (addonItem?.defaultPrice ?? 0) / 100) * 100),
        };
      });
      const customAddons = ((values.customAddons as Array<{ name: string; price: number; reason: string }>) ?? []).map(
        (addon) => ({
          name: addon.name,
          price: Math.round(addon.price * 100),
          reason: addon.reason,
        }),
      );
      const adjustAmount = Math.round(((values.adjustAmount as number) ?? 0) * 100);
      const adjustReason = (values.adjustReason as string) || '';

      const preview = pricePreview;
      if (!preview || !baseItem) {
        message.error('请选择 1 个基础项目');
        setIncomeSubmitting(false);
        return;
      }
      const validationError = validateSettlementInput({
        baseItemId,
        adjustAmount,
        adjustReason,
        paymentTotal: paymentDetails.reduce((sum, d) => sum + d.amount, 0),
        actualAmount: preview.actualAmount,
        customAddons,
      });
      if (validationError) {
        message.error(validationError);
        setIncomeSubmitting(false);
        return;
      }

      const res = await adminCreateSettlement({
        appointmentId: linkedAppointmentId || undefined,
        memberId: (values.memberId as string) || undefined,
        guestName: (values.guestName as string) || undefined,
        technicianId: values.technicianId as string,
        serviceTime: serviceTimeValue.toISOString(),
        categoryId,
        baseItemId,
        baseItemPrice,
        addons,
        customAddons,
        adjustAmount,
        adjustReason: adjustReason || undefined,
        paymentDetails,
        note: (values.note as string) || undefined,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '结算失败');
      }
      message.success(
        `结算成功：实收 ¥${formatAmount(res.data?.amount ?? 0)}，积分 +${res.data?.pointsEarned ?? 0}`,
      );
      setIncomeModalOpen(false);
      setLinkedAppointmentId('');
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
  }, [incomeForm, templateOptions, pricePreview, linkedAppointmentId, fetchPageData, fetchConsumptionList, fetchTechnicianPerformance]);

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
          <Button type="primary" onClick={handleOpenIncomeModal}>
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

      {/* 收入录入弹窗（结算录入：基础信息 / 基础项目 / 附加项目 / 价格明细 / 支付信息） */}
      <Modal
        title={linkedAppointmentId ? '收入录入（关联预约结算）' : '收入录入'}
        open={incomeModalOpen}
        onOk={handleSubmitIncome}
        onCancel={handleCloseIncomeModal}
        confirmLoading={incomeSubmitting}
        destroyOnHidden
        width={760}
      >
        <Form form={incomeForm} layout="vertical">
          <Divider orientation="left" plain>
            基础信息
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="memberId" label="客户（会员）">
                <Select
                  allowClear
                  showSearch
                  placeholder="请选择会员（可选）"
                  optionFilterProp="label"
                  onChange={handleMemberChange}
                  options={memberOptions.map((item: Member) => ({
                    value: item.memberId,
                    label: `${item.nickName}（${item.memberId}）`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guestName" label="散客姓名">
                <Input placeholder="散客姓名（可选，无会员时填写）" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="serviceTime"
                label="服务时间"
                rules={[{ required: true, message: '请选择服务时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>
            基础项目（必选 1 个）
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="categoryId"
                label="服务大类"
                rules={[{ required: true, message: '请选择服务大类' }]}
              >
                <Select
                  placeholder="请选择服务大类"
                  options={templateOptions.map((t) => ({
                    value: t.categoryId,
                    label: t.categoryName,
                  }))}
                  onChange={() => {
                    incomeForm.setFieldsValue({
                      baseItemId: undefined,
                      baseItemPrice: undefined,
                      addonIds: [],
                      addonPriceMap: {},
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="baseItemId"
                label="基础项目"
                rules={[{ required: true, message: '请选择 1 个基础项目' }]}
              >
                <Select
                  placeholder="请先选择服务大类"
                  options={baseItemOptions.map((item) => ({
                    value: item.itemId,
                    label: item.name,
                  }))}
                  onChange={(itemId: string) => {
                    const item = baseItemOptions.find((i) => i.itemId === itemId);
                    incomeForm.setFieldsValue({
                      baseItemPrice: item ? item.defaultPrice / 100 : undefined,
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="baseItemPrice"
                label="基础项目金额（元）"
                rules={[{ required: true, message: '请输入基础项目金额' }]}
              >
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} addonAfter="元" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>
            附加项目（可多选）
          </Divider>
          <Form.Item name="addonIds">
            <Checkbox.Group
              options={addonItemOptions.map((item) => ({
                value: item.itemId,
                label: `${item.name}（¥${formatAmount(item.defaultPrice)}）`,
              }))}
            />
          </Form.Item>
          {(watchedAddonIds ?? []).map((addonId) => {
            const addonItem = addonItemOptions.find((item) => item.itemId === addonId);
            if (!addonItem) {
              return null;
            }
            return (
              <Form.Item
                key={addonId}
                name={['addonPriceMap', addonId]}
                label={`${addonItem.name}金额（元）`}
                initialValue={addonItem.defaultPrice / 100}
              >
                <InputNumber min={0} step={0.01} precision={2} style={{ width: 240 }} addonAfter="元" />
              </Form.Item>
            );
          })}
          <Form.List name="customAddons">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item
                      name={[field.name, 'name']}
                      rules={[{ required: true, message: '名称必填' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input placeholder="自定义附加项名称" maxLength={30} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'price']}
                      rules={[{ required: true, message: '金额必填' }]}
                      style={{ width: 160, marginBottom: 0 }}
                    >
                      <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} addonAfter="元" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'reason']}
                      rules={[{ required: true, message: '原因必填' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input placeholder="原因（必填，不参与折扣与提成）" maxLength={50} />
                    </Form.Item>
                    <Button type="text" danger icon={<MinusOutlined />} onClick={() => remove(field.name)} />
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                  添加自定义附加项
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left" plain>
            价格明细
          </Divider>
          {pricePreview ? (
            <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="原价">
                ¥{formatAmount(pricePreview.originalAmount)}
              </Descriptions.Item>
              <Descriptions.Item label={`折扣（${discountRate / 10} 折）`}>
                -¥{formatAmount(pricePreview.discountAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="应收">
                ¥{formatAmount(pricePreview.receivableAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="改价">
                {pricePreview.adjustAmount >= 0 ? '+' : '-'}¥{formatAmount(Math.abs(pricePreview.adjustAmount))}
              </Descriptions.Item>
              <Descriptions.Item label="实收">
                <Typography.Text strong>¥{formatAmount(pricePreview.actualAmount)}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="支付合计">
                <Typography.Text
                  type={paymentTotalFen === pricePreview.actualAmount ? 'success' : 'danger'}
                >
                  ¥{formatAmount(paymentTotalFen)}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              选择基础项目后实时显示价格明细
            </Typography.Text>
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="adjustAmount" label="人工改价（元，可负）">
                <InputNumber step={0.01} precision={2} style={{ width: '100%' }} addonAfter="元" placeholder="默认 0" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="adjustReason"
                label="改价原因"
                rules={[
                  {
                    validator: (_, value) => {
                      const adjust = Math.round(((watchedAdjustAmount as number) ?? 0) * 100);
                      if (adjust !== 0 && !String(value || '').trim()) {
                        return Promise.reject(new Error('改价必须填写原因'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input placeholder="改价非 0 时必填，将写入操作日志" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>
            支付信息
          </Divider>
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
            <Input.TextArea rows={2} maxLength={100} placeholder="请输入服务备注（可选）" />
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
