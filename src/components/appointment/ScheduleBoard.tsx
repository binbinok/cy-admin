import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Checkbox, DatePicker, Empty, Popover, Space, Spin, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { adminGetAppointmentList } from '@/services/appointment';
import { adminGetTechnicianList } from '@/services/technician';
import {
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  deriveBoardTimeRange,
  getBlockPosition,
  minutesToTime,
} from '@/utils/schedule';
import type { Appointment } from '@/types/appointment';
import type { Technician } from '@/types/technician';

const { Text } = Typography;

const HEADER_HEIGHT = 40;
const COLUMN_MIN_WIDTH = 160;
const AXIS_WIDTH = 64;

const STATUS_STYLE: Record<string, { label: string; color: string; background: string }> = {
  pending: { label: '待服务', color: '#fa8c16', background: 'rgba(250,140,22,0.12)' },
  in_service: { label: '服务中', color: '#1677ff', background: 'rgba(22,119,255,0.12)' },
  completed: { label: '已完成', color: '#52c41a', background: 'rgba(82,196,26,0.12)' },
  cancelled: { label: '已取消', color: '#999999', background: 'rgba(0,0,0,0.06)' },
};

interface ScheduleBoardProps {
  technicianId?: string;
  onConfirmArrival: (record: Appointment) => void;
  onComplete: (record: Appointment) => void;
  onCancel: (record: Appointment) => void;
}

const EMPTY_TECHNICIANS: Technician[] = [];
const EMPTY_APPOINTMENTS: Appointment[] = [];

const getCustomerName = (record: Appointment): string =>
  record.memberName || record.guestName || record.memberId || '散客';

export default function ScheduleBoard({
  technicianId,
  onConfirmArrival,
  onComplete,
  onCancel,
}: ScheduleBoardProps) {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [showCancelled, setShowCancelled] = useState<boolean>(false);
  const dateStr = date.format('YYYY-MM-DD');
  const dayOfWeek = String(date.day());

  const { data: allTechnicians = EMPTY_TECHNICIANS } = useQuery<Technician[]>({
    queryKey: ['settlementOptions', 'technicians'],
    queryFn: async () => {
      const res = await adminGetTechnicianList({ page: 1, pageSize: 100 });
      return res.data?.list ?? EMPTY_TECHNICIANS;
    },
  });
  const { data: appointments = EMPTY_APPOINTMENTS, isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointmentBoard', dateStr],
    queryFn: async () => {
      const res = await adminGetAppointmentList({
        page: 1,
        pageSize: 100,
        startDate: dateStr,
        endDate: dateStr,
      });
      return res.data?.list ?? EMPTY_APPOINTMENTS;
    },
  });

  const technicians = useMemo<Technician[]>(
    () =>
      allTechnicians.filter(
        (t) => t.status !== 'resigned' && (!technicianId || t._id === technicianId),
      ),
    [allTechnicians, technicianId],
  );
  const visibleAppointments = useMemo<Appointment[]>(
    () => appointments.filter((a) => showCancelled || a.status !== 'cancelled'),
    [appointments, showCancelled],
  );
  const scheduleMap = useMemo(
    () =>
      new Map<string, { startTime: string; endTime: string }[]>(
        technicians.map((t) => [t._id, t.schedule?.[dayOfWeek] ?? []]),
      ),
    [technicians, dayOfWeek],
  );
  const range = useMemo(
    () =>
      deriveBoardTimeRange({
        schedules: technicians.flatMap((t) => scheduleMap.get(t._id) ?? []),
        appointments: visibleAppointments,
      }),
    [technicians, scheduleMap, visibleAppointments],
  );
  const appointmentsByTechnician = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const item of visibleAppointments) {
      const list = map.get(item.technicianId) ?? [];
      list.push(item);
      map.set(item.technicianId, list);
    }
    return map;
  }, [visibleAppointments]);

  const totalHeight = ((range.endMinutes - range.startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  const timeMarks: number[] = [];
  for (let m = range.startMinutes; m < range.endMinutes; m += SLOT_MINUTES) {
    timeMarks.push(m);
  }

  const renderActions = (record: Appointment) => (
    <Space direction="vertical" size={4}>
      <Text>
        {record.appointmentTime} · {getCustomerName(record)} ·{' '}
        {STATUS_STYLE[record.status]?.label ?? record.status}
      </Text>
      <Space size={4}>
        {record.status === 'pending' && (
          <Button size="small" onClick={() => onConfirmArrival(record)}>
            确认到店
          </Button>
        )}
        {record.status === 'in_service' && (
          <Button size="small" type="primary" onClick={() => onComplete(record)}>
            完成服务
          </Button>
        )}
        {(record.status === 'pending' || record.status === 'in_service') && (
          <Button size="small" danger onClick={() => onCancel(record)}>
            取消预约
          </Button>
        )}
      </Space>
    </Space>
  );

  const renderAppointmentBlock = (record: Appointment) => {
    const style = STATUS_STYLE[record.status] ?? STATUS_STYLE.cancelled;
    const pos = getBlockPosition({
      startTime: record.appointmentTime,
      durationMinutes: record.duration,
      rangeStartMinutes: range.startMinutes,
    });
    const block = (
      <div
        style={{
          position: 'absolute',
          top: pos.top,
          height: Math.max(pos.height, 24),
          left: 2,
          right: 2,
          background: style.background,
          borderLeft: `3px solid ${style.color}`,
          borderRadius: 4,
          padding: '2px 6px',
          overflow: 'hidden',
          cursor: record.status === 'cancelled' ? 'default' : 'pointer',
          opacity: record.status === 'cancelled' ? 0.55 : 1,
          textDecoration: record.status === 'cancelled' ? 'line-through' : 'none',
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: 12, lineHeight: '18px', whiteSpace: 'nowrap' }}>
          {record.appointmentTime} {getCustomerName(record)}
        </div>
        <div style={{ fontSize: 12, lineHeight: '16px', color: '#666', whiteSpace: 'nowrap' }}>
          {record.categoryName ?? record.serviceName ?? ''}
        </div>
      </div>
    );
    if (record.status === 'cancelled') {
      return <div key={record._id}>{block}</div>;
    }
    return (
      <Popover key={record._id} content={renderActions(record)} trigger="click" placement="right">
        {block}
      </Popover>
    );
  };

  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          <Button size="small" icon={<LeftOutlined />} onClick={() => setDate(date.subtract(1, 'day'))} />
          <DatePicker
            size="small"
            allowClear={false}
            value={date}
            onChange={(value: Dayjs | null) => value && setDate(value)}
          />
          <Button size="small" icon={<RightOutlined />} onClick={() => setDate(date.add(1, 'day'))} />
          <Button size="small" onClick={() => setDate(dayjs())}>
            今天
          </Button>
          <Checkbox
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          >
            显示已取消
          </Checkbox>
        </Space>
      }
    >
      <Spin spinning={isLoading}>
        {technicians.length === 0 ? (
          <Empty description="暂无技师数据" />
        ) : (
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            <div style={{ width: AXIS_WIDTH, flexShrink: 0 }}>
              <div style={{ height: HEADER_HEIGHT }} />
              {timeMarks.map((m) => (
                <div
                  key={m}
                  style={{
                    height: SLOT_HEIGHT_PX,
                    fontSize: 12,
                    color: '#999',
                    textAlign: 'right',
                    paddingRight: 8,
                    lineHeight: 1,
                    transform: 'translateY(-6px)',
                  }}
                >
                  {minutesToTime(m)}
                </div>
              ))}
            </div>
            {technicians.map((technician) => (
              <div key={technician._id} style={{ flex: 1, minWidth: COLUMN_MIN_WIDTH }}>
                <div
                  style={{
                    height: HEADER_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  {technician.name}
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: totalHeight,
                    borderLeft: '1px solid #f0f0f0',
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_HEIGHT_PX - 1}px, #f5f5f5 ${SLOT_HEIGHT_PX - 1}px, #f5f5f5 ${SLOT_HEIGHT_PX}px)`,
                  }}
                >
                  {(scheduleMap.get(technician._id) ?? []).map((slot, index) => {
                    const start = getBlockPosition({
                      startTime: slot.startTime,
                      rangeStartMinutes: range.startMinutes,
                    });
                    const end = getBlockPosition({
                      startTime: slot.endTime,
                      rangeStartMinutes: range.startMinutes,
                    });
                    const height = end.top - start.top;
                    if (height <= 0) {
                      return null;
                    }
                    return (
                      <div
                        key={index}
                        style={{
                          position: 'absolute',
                          top: start.top,
                          height,
                          left: 0,
                          right: 0,
                          background: 'rgba(22,119,255,0.05)',
                          zIndex: 1,
                        }}
                      />
                    );
                  })}
                  {(appointmentsByTechnician.get(technician._id) ?? []).map(renderAppointmentBlock)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </Card>
  );
}
