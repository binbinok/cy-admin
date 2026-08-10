import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs,
  Button,
  Modal,
  Form,
  Input,
  Select,
  TimePicker,
  Space,
  Typography,
  Spin,
  Empty,
  Descriptions,
  Card,
  Tag,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  adminGetTechnicianDetail,
  adminUpdateTechnician,
  adminSetTechnicianSchedule,
  adminSetTechnicianServiceSlots,
} from '@/services/technician';
import { adminGetServiceList } from '@/services/service';
import { useAuthStore } from '@/stores/authStore';
import type { Technician } from '@/types/technician';
import type { Service } from '@/types/service';

const { Title } = Typography;

const DAY_LABELS: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  idle: { label: '空闲', color: 'green' },
  busy: { label: '服务中', color: 'blue' },
  rest: { label: '休息', color: 'default' },
};

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface ScheduleState {
  [dayOfWeek: string]: TimeSlot[];
}

interface ServiceSlotState {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  serviceIds: string[];
}

export default function TechnicianDetailPage() {
  const { id: technicianId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [serviceSlots, setServiceSlots] = useState<ServiceSlotState[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);

  // Fetch technician detail
  const buildServiceSlots = useCallback((sched: ScheduleState) => {
    const slots: ServiceSlotState[] = [];
    Object.entries(sched).forEach(([day, timeSlots]) => {
      timeSlots.forEach((slot) => {
        slots.push({
          dayOfWeek: parseInt(day, 10),
          startTime: slot.startTime,
          endTime: slot.endTime,
          serviceIds: [],
        });
      });
    });
    setServiceSlots(slots);
  }, []);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetTechnicianDetail(technicianId!);
      if (res.success && res.data) {
        setTechnician(res.data);
        // Initialize schedule from technician data
        const sched: ScheduleState = {};
        if (res.data.schedule) {
          Object.entries(res.data.schedule).forEach(([day, slots]) => {
            sched[day] = Array.isArray(slots) ? slots : [];
          });
        }
        setSchedule(sched);
        // Build service slots from schedule
        buildServiceSlots(sched);
      }
    } catch {
      message.error('获取技师详情失败');
    } finally {
      setLoading(false);
    }
  }, [technicianId, buildServiceSlots]);

  // Fetch service list for service slot config
  const fetchServices = useCallback(async () => {
    try {
      const res = await adminGetServiceList({ page: 1, pageSize: 100 });
      if (res.success && res.data) {
        setServiceList(res.data.list);
      }
    } catch {
      // silently fail, service list is optional
    }
  }, []);

  useEffect(() => {
    fetchDetail();
    fetchServices();
  }, [fetchDetail, fetchServices]);

  // Navigation
  const handleBack = useCallback(() => {
    navigate('/technician');
  }, [navigate]);

  // Edit modal
  const handleOpenEdit = useCallback(() => {
    if (technician) {
      editForm.setFieldsValue({
        name: technician.name,
        avatarUrl: technician.avatarUrl ?? '',
        specialties: technician.specialties,
      });
    }
    setEditModalOpen(true);
  }, [technician, editForm]);

  const handleEditCancel = useCallback(() => {
    setEditModalOpen(false);
    editForm.resetFields();
  }, [editForm]);

  const handleEditSubmit = useCallback(async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      const res = await adminUpdateTechnician(technicianId!, {
        name: values.name,
        avatarUrl: values.avatarUrl || undefined,
        specialties: values.specialties,
      });
      if (res.success) {
        message.success('技师信息已更新');
        setEditModalOpen(false);
        editForm.resetFields();
        fetchDetail();
      } else {
        message.error(res.error?.message ?? '更新失败');
      }
    } catch {
      // form validation error
    } finally {
      setEditLoading(false);
    }
  }, [editForm, technicianId, fetchDetail]);

  // Schedule management
  const handleAddSlot = useCallback((dayOfWeek: number) => {
    setSchedule((prev) => {
      const key = String(dayOfWeek);
      const existing = prev[key] ?? [];
      return {
        ...prev,
        [key]: [...existing, { startTime: '09:00', endTime: '18:00' }],
      };
    });
  }, []);

  const handleRemoveSlot = useCallback(
    (dayOfWeek: number, index: number) => {
      setSchedule((prev) => {
        const key = String(dayOfWeek);
        const existing = [...(prev[key] ?? [])];
        existing.splice(index, 1);
        return { ...prev, [key]: existing };
      });
    },
    [],
  );

  const handleSlotTimeChange = useCallback(
    (
      dayOfWeek: number,
      index: number,
      field: 'startTime' | 'endTime',
      time: Dayjs | null,
    ) => {
      if (!time) return;
      const timeStr = time.format('HH:mm');
      setSchedule((prev) => {
        const key = String(dayOfWeek);
        const existing = [...(prev[key] ?? [])];
        existing[index] = { ...existing[index], [field]: timeStr };
        return { ...prev, [key]: existing };
      });
    },
    [],
  );

  const handleSaveSchedule = useCallback(async () => {
    if (!technicianId) return;
    setScheduleLoading(true);
    try {
      const res = await adminSetTechnicianSchedule(
        technicianId,
        schedule,
      );
      if (res.success) {
        message.success('排班配置已保存');
        // Rebuild service slots based on new schedule
        buildServiceSlots(schedule);
      } else {
        message.error(res.error?.message ?? '保存失败');
      }
    } catch {
      message.error('保存排班配置失败');
    } finally {
      setScheduleLoading(false);
    }
  }, [technicianId, schedule, buildServiceSlots]);

  // Service slot management
  const handleServiceSlotChange = useCallback(
    (index: number, serviceIds: string[]) => {
      setServiceSlots((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], serviceIds };
        return updated;
      });
    },
    [],
  );

  const handleSaveServiceSlots = useCallback(async () => {
    if (!technicianId) return;
    setSlotLoading(true);
    try {
      const res = await adminSetTechnicianServiceSlots(
        technicianId,
        serviceSlots,
      );
      if (res.success) {
        message.success('服务项目配置已保存');
      } else {
        message.error(res.error?.message ?? '保存失败');
      }
    } catch {
      message.error('保存服务项目配置失败');
    } finally {
      setSlotLoading(false);
    }
  }, [technicianId, serviceSlots]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!technician) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Empty description="技师不存在" />
        <Button onClick={handleBack} style={{ marginTop: 16 }}>
          返回技师列表
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[technician.status] ?? {
    label: technician.status,
    color: 'default',
  };

  const serviceOptions = serviceList.map((s) => ({
    label: s.name,
    value: s._id,
  }));

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <div>
          <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="姓名">
              {technician.name}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="头像">
              {technician.avatarUrl ? (
                <img
                  src={technician.avatarUrl}
                  alt={`${technician.name}的头像`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="擅长项目">
              {technician.specialties?.length > 0
                ? technician.specialties.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))
                : '-'}
            </Descriptions.Item>
          </Descriptions>
          {isSuperAdmin && (
            <Button type="primary" onClick={handleOpenEdit}>
              编辑信息
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      label: '排班配置',
      children: (
        <div>
          {DAY_ORDER.map((day) => {
            const key = String(day);
            const slots = schedule[key] ?? [];
            return (
              <Card
                key={day}
                title={DAY_LABELS[day]}
                size="small"
                style={{ marginBottom: 12 }}
                extra={
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddSlot(day)}
                  >
                    添加时间段
                  </Button>
                }
              >
                {slots.length === 0 ? (
                  <span style={{ color: '#999' }}>休息</span>
                ) : (
                  slots.map((slot, idx) => (
                    <Space
                      key={`${day}-${idx}`}
                      style={{ display: 'flex', marginBottom: 8 }}
                    >
                      <TimePicker
                        value={dayjs(slot.startTime, 'HH:mm')}
                        format="HH:mm"
                        onChange={(time) =>
                          handleSlotTimeChange(day, idx, 'startTime', time)
                        }
                        placeholder="开始时间"
                      />
                      <span>至</span>
                      <TimePicker
                        value={dayjs(slot.endTime, 'HH:mm')}
                        format="HH:mm"
                        onChange={(time) =>
                          handleSlotTimeChange(day, idx, 'endTime', time)
                        }
                        placeholder="结束时间"
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveSlot(day, idx)}
                      />
                    </Space>
                  ))
                )}
              </Card>
            );
          })}
          <Button
            type="primary"
            loading={scheduleLoading}
            onClick={handleSaveSchedule}
            style={{ marginTop: 8 }}
          >
            保存排班
          </Button>
        </div>
      ),
    },
    {
      key: 'serviceSlots',
      label: '时间段服务项目',
      children: (
        <div>
          {serviceSlots.length === 0 ? (
            <Empty description="请先在排班配置中添加时间段" />
          ) : (
            serviceSlots.map((slot, idx) => (
              <Card
                key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${idx}`}
                size="small"
                style={{ marginBottom: 12 }}
                title={`${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime} - ${slot.endTime}`}
              >
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="请选择服务项目"
                  options={serviceOptions}
                  value={slot.serviceIds}
                  onChange={(ids) => handleServiceSlotChange(idx, ids)}
                />
              </Card>
            ))
          )}
          {serviceSlots.length > 0 && (
            <Button
              type="primary"
              loading={slotLoading}
              onClick={handleSaveServiceSlots}
              style={{ marginTop: 8 }}
            >
              保存服务项目配置
            </Button>
          )}
        </div>
      ),
    },
  ];

  const displayTabItems = isSuperAdmin
    ? tabItems
    : tabItems.filter((item) => item.key === 'basic');

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回技师列表
        </Button>
      </Space>

      <Title level={4} style={{ marginBottom: 16 }}>
        技师详情
      </Title>

      <Tabs items={displayTabItems} />

      {/* Edit Modal */}
      <Modal
        title="编辑技师信息"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={handleEditCancel}
        confirmLoading={editLoading}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[
              { required: true, message: '请输入技师姓名' },
              { min: 2, message: '姓名长度至少 2 个字符' },
              { max: 10, message: '姓名长度最多 10 个字符' },
            ]}
          >
            <Input placeholder="请输入技师姓名（2–10 字符）" />
          </Form.Item>
          <Form.Item
            name="avatarUrl"
            label="头像 URL"
          >
            <Input placeholder="请输入头像图片地址（可选）" />
          </Form.Item>
          <Form.Item
            name="specialties"
            label="擅长项目"
            rules={[
              { required: true, message: '请选择至少一项擅长项目' },
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(
                      new Error('请选择至少一项擅长项目'),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              mode="tags"
              placeholder="请输入或选择擅长项目"
              options={[
                { value: '美甲', label: '美甲' },
                { value: '美足', label: '美足' },
                { value: '卸甲', label: '卸甲' },
                { value: '手护', label: '手护' },
                { value: '脚护', label: '脚护' },
                { value: '前置处理', label: '前置处理' },
                { value: '美睫', label: '美睫' },
                { value: '卸睫', label: '卸睫' },
                { value: '修眉', label: '修眉' },
                { value: '纹眉', label: '纹眉' },
                { value: '纹唇', label: '纹唇' },
                { value: '美瞳线', label: '美瞳线' },
                { value: '医美', label: '医美' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
