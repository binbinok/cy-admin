import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Tag,
  Modal,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Typography,
  Space,
  Button,
  message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  adminGetAppointmentList,
  adminConfirmArrival,
  adminCompleteService,
  adminCancelAppointment,
} from '@/services/appointment';
import { adminGetTechnicianList } from '@/services/technician';
import { formatAmount } from '@/utils/format';
import { calculatePoints } from '@/utils/points';
import { SEARCH_DEBOUNCE_MS } from '@/constants/business';
import type { Appointment } from '@/types/appointment';
import type { Technician } from '@/types/technician';
import type { PageResult } from '@/types/common';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'pending', label: '待服务' },
  { value: 'in_service', label: '服务中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待服务', color: 'orange' },
  in_service: { label: '服务中', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

export default function AppointmentListPage() {
  const today = dayjs().format('YYYY-MM-DD');

  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<[string, string]>([today, today]);
  const [technicianId, setTechnicianId] = useState<string | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [appointmentList, setAppointmentList] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [technicianOptions, setTechnicianOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actualAmountYuan, setActualAmountYuan] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);

  // Debounce keyword search
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [keyword]);

  // Fetch technician list for filter dropdown
  useEffect(() => {
    let cancelled = false;
    adminGetTechnicianList({ page: 1, pageSize: 100 })
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          const data = res.data as PageResult<Technician>;
          setTechnicianOptions(
            data.list.map((t) => ({ value: t._id, label: t.name })),
          );
        }
      })
      .catch(() => {
        // silently ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch appointment list
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetAppointmentList({
        page,
        pageSize: PAGE_SIZE,
        startDate: dateRange[0] || undefined,
        endDate: dateRange[1] || undefined,
        technicianId: technicianId || undefined,
        status: status || undefined,
        keyword: debouncedKeyword || undefined,
      });
      if (res.success && res.data) {
        const data = res.data as PageResult<Appointment>;
        setAppointmentList(data.list);
        setTotal(data.total);
      }
    } catch {
      message.error('获取预约列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, dateRange, technicianId, status, debouncedKeyword]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        setDateRange([
          dates[0].format('YYYY-MM-DD'),
          dates[1].format('YYYY-MM-DD'),
        ]);
      } else {
        setDateRange(['', '']);
      }
      setPage(1);
    },
    [],
  );

  const handleTechnicianChange = useCallback(
    (value: string | undefined) => {
      setTechnicianId(value);
      setPage(1);
    },
    [],
  );

  const handleStatusChange = useCallback((value: string | undefined) => {
    setStatus(value);
    setPage(1);
  }, []);

  // Confirm arrival: pending → in_service
  const handleConfirmArrival = useCallback(
    (record: Appointment) => {
      Modal.confirm({
        title: '确认到店',
        content: `确认会员已到店，预约编号「${record.appointmentId}」将变为服务中？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            const res = await adminConfirmArrival(record.appointmentId);
            if (res.success) {
              message.success('已确认到店');
              fetchList();
            } else {
              message.error(res.error?.message ?? '操作失败');
            }
          } catch {
            message.error('操作失败，请重试');
          }
        },
      });
    },
    [fetchList],
  );

  // Open complete service modal
  const handleOpenComplete = useCallback((record: Appointment) => {
    setCompletingId(record.appointmentId);
    setActualAmountYuan(0);
    setCompleteModalOpen(true);
  }, []);

  // Submit complete service
  const handleCompleteOk = useCallback(async () => {
    if (completingId === null) return;
    const yuan = actualAmountYuan ?? 0;
    const amountInFen = Math.round(yuan * 100);
    setSubmitting(true);
    try {
      const res = await adminCompleteService(completingId, amountInFen);
      if (res.success) {
        message.success('服务已完成');
        setCompleteModalOpen(false);
        setCompletingId(null);
        setActualAmountYuan(0);
        fetchList();
      } else {
        message.error(res.error?.message ?? '操作失败');
      }
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [completingId, actualAmountYuan, fetchList]);

  const handleCompleteCancel = useCallback(() => {
    setCompleteModalOpen(false);
    setCompletingId(null);
    setActualAmountYuan(0);
  }, []);

  // Cancel appointment
  const handleCancelAppointment = useCallback(
    (record: Appointment) => {
      Modal.confirm({
        title: '取消预约',
        content: `确定要取消预约编号「${record.appointmentId}」吗？此操作不可撤销。`,
        okText: '确认取消',
        cancelText: '返回',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const res = await adminCancelAppointment(record.appointmentId);
            if (res.success) {
              message.success('预约已取消');
              fetchList();
            } else {
              message.error(res.error?.message ?? '操作失败');
            }
          } catch {
            message.error('操作失败，请重试');
          }
        },
      });
    },
    [fetchList],
  );

  // Computed points for the complete modal
  const computedAmountFen = Math.round((actualAmountYuan ?? 0) * 100);
  const computedPoints = calculatePoints(computedAmountFen);

  const columns: ColumnsType<Appointment> = [
    {
      title: '预约编号',
      dataIndex: 'appointmentId',
      key: 'appointmentId',
      width: 140,
    },
    {
      title: '会员',
      key: 'member',
      width: 120,
      render: (_: unknown, record: Appointment) =>
        (record as Appointment & { memberName?: string }).memberName ??
        record.memberId,
    },
    {
      title: '服务项目',
      key: 'service',
      width: 140,
      render: (_: unknown, record: Appointment) =>
        (record as Appointment & { serviceName?: string }).serviceName ??
        record.serviceId,
    },
    {
      title: '技师',
      key: 'technician',
      width: 100,
      render: (_: unknown, record: Appointment) =>
        (record as Appointment & { technicianName?: string })
          .technicianName ?? record.technicianId,
    },
    {
      title: '预约时间',
      key: 'appointmentTime',
      width: 160,
      render: (_: unknown, record: Appointment) =>
        `${record.appointmentDate} ${record.appointmentTime}`,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      render: (val: string | undefined) => val ?? '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (val: string) => {
        const info = STATUS_MAP[val];
        return info ? (
          <Tag color={info.color}>{info.label}</Tag>
        ) : (
          <Tag>{val}</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Appointment) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleConfirmArrival(record)}
            >
              确认到店
            </Button>
          )}
          {record.status === 'in_service' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleOpenComplete(record)}
            >
              完成服务
            </Button>
          )}
          {(record.status === 'pending' ||
            record.status === 'in_service') && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleCancelAppointment(record)}
            >
              取消预约
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        预约订单管理
      </Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker
          value={
            dateRange[0] && dateRange[1]
              ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
              : null
          }
          onChange={handleDateRangeChange}
          allowClear
        />
        <Select
          placeholder="技师"
          allowClear
          style={{ width: 140 }}
          value={technicianId}
          onChange={handleTechnicianChange}
          options={technicianOptions}
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 140 }}
          value={status}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
        />
        <Input
          placeholder="搜索会员"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 220 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </Space>

      <Table<Appointment>
        columns={columns}
        dataSource={appointmentList}
        rowKey="appointmentId"
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Modal
        title="完成服务"
        open={completeModalOpen}
        onOk={handleCompleteOk}
        onCancel={handleCompleteCancel}
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting }}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>实际消费金额（元）：</div>
          <InputNumber
            min={0}
            precision={2}
            step={0.01}
            style={{ width: '100%' }}
            value={actualAmountYuan}
            onChange={(val) => setActualAmountYuan(val)}
            addonAfter="元"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          实际消费：¥{formatAmount(computedAmountFen)}
        </div>
        <div>
          预计获得积分：{computedPoints} 分
        </div>
      </Modal>
    </div>
  );
}
