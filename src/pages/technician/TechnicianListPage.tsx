import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Space,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetTechnicianList,
  adminCreateTechnician,
  adminUpdateTechnicianStatus,
  adminDeleteTechnician,
} from '@/services/technician';
import { useAuthStore } from '@/stores/authStore';
import type { Technician } from '@/types/technician';

const { Title } = Typography;
const PAGE_SIZE = 10;

const STATUS_MAP: Record<Technician['status'], { label: string; color: string }> = {
  idle: { label: '空闲', color: 'green' },
  busy: { label: '服务中', color: 'blue' },
  rest: { label: '休息', color: 'default' },
  resigned: { label: '离职', color: 'red' },
};

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getScheduleSummary(schedule: Technician['schedule']): string {
  if (!schedule || Object.keys(schedule).length === 0) {
    return '未排班';
  }
  const days = Object.keys(schedule)
    .filter((key) => {
      const slots = schedule[key];
      return Array.isArray(slots) && slots.length > 0;
    })
    .map((key) => {
      const idx = parseInt(key, 10);
      return Number.isNaN(idx) ? key : (DAY_LABELS[idx] ?? key);
    });
  return days.length > 0 ? days.join('、') : '未排班';
}

export default function TechnicianListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<Technician['status'] | 'all'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['technicianList', page],
    queryFn: async () => {
      const res = await adminGetTechnicianList({ page, pageSize: PAGE_SIZE });
      return res.data;
    },
  });

  const technicianList = data?.list ?? [];
  const total = data?.total ?? 0;
  const filteredList =
    statusFilter === 'all'
      ? technicianList
      : technicianList.filter((t) => t.status === statusFilter);

  // Create technician mutation
  const createMutation = useMutation({
    mutationFn: (values: { name: string; specialties: string[] }) =>
      adminCreateTechnician({ name: values.name, specialties: values.specialties }),
    onSuccess: (res) => {
      if (res.success) {
        message.success('技师创建成功');
        setCreateModalOpen(false);
        createForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['technicianList'] });
      } else {
        message.error(res.error?.message ?? '创建失败，请重试');
      }
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '操作失败，请稍后再试');
    },
  });

  // Delete technician mutation
  const deleteMutation = useMutation({
    mutationFn: (technicianId: string) => adminDeleteTechnician(technicianId),
    onSuccess: (res) => {
      if (res.success) {
        message.success('技师已删除');
        queryClient.invalidateQueries({ queryKey: ['technicianList'] });
      } else {
        message.error(res.error?.message ?? '删除失败，请重试');
      }
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '删除失败，请稍后再试');
    },
  });

  const handleCreateSubmit = useCallback(() => {
    createForm.validateFields().then((values) => {
      createMutation.mutate({
        name: values.name,
        specialties: values.specialties,
      });
    });
  }, [createForm, createMutation]);

  const handleCreateCancel = useCallback(() => {
    setCreateModalOpen(false);
    createForm.resetFields();
  }, [createForm]);

  async function requestStatusChange(
    record: Technician,
    newStatus: string,
    force = false,
  ): Promise<void> {
    const res = await adminUpdateTechnicianStatus(record._id, newStatus, force);
    const pendingCount = res.data?.pendingCount ?? 0;
    if (res.success && pendingCount === 0) {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['technicianList'] });
      return;
    }
    if (res.success && pendingCount > 0) {
      const label = newStatus === 'resigned' ? '离职' : '休息';
      Modal.confirm({
        title: '确认修改状态',
        content: `该技师有 ${pendingCount} 个未完成预约，确定要将状态修改为${label}吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: () => requestStatusChange(record, newStatus, true),
      });
      return;
    }
    message.error(res.error?.message ?? '操作失败，请重试');
  }

  const handleDelete = useCallback(
    (record: Technician) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除技师「${record.name}」吗？此操作不可恢复。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () =>
          deleteMutation.mutateAsync(record._id).then((res) => {
            if (!res.success && res.error?.message) {
              message.error(res.error.message);
            }
          }),
      });
    },
    [deleteMutation],
  );

  const handleRowClick = useCallback(
    (record: Technician) => {
      navigate(`/technicians/${record._id}`);
    },
    [navigate],
  );

  const columns: ColumnsType<Technician> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '擅长项目',
      dataIndex: 'specialties',
      key: 'specialties',
      width: 200,
      render: (specialties: string[]) =>
        specialties?.map((s) => <Tag key={s}>{s}</Tag>) ?? '-',
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Technician['status']) => {
        const info = STATUS_MAP[status] ?? { label: status, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '本周排班概览',
      key: 'schedule',
      width: 200,
      render: (_: unknown, record: Technician) =>
        getScheduleSummary(record.schedule),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Technician) => (
        <Space size="small">
          {record.status !== 'rest' && record.status !== 'resigned' && (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                requestStatusChange(record, 'rest');
              }}
            >
              设为休息
            </Button>
          )}
          {record.status === 'rest' && (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                requestStatusChange(record, 'idle');
              }}
            >
              设为空闲
            </Button>
          )}
          {record.status !== 'resigned' && (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                Modal.confirm({
                  title: '确认设为离职',
                  content: `确定要将技师「${record.name}」设为离职吗？离职后不可再被预约。`,
                  okText: '确认',
                  cancelText: '取消',
                  onOk: () => requestStatusChange(record, 'resigned'),
                });
              }}
            >
              设为离职
            </Button>
          )}
          {record.status === 'resigned' && (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                requestStatusChange(record, 'idle');
              }}
            >
              恢复空闲
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record);
            }}
            disabled={deleteMutation.isPending}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const displayColumns = isSuperAdmin
    ? columns
    : columns.filter((column) => column.key !== 'action');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          技师管理
        </Title>
        <Space>
          <Select
            value={statusFilter}
            style={{ width: 120 }}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'idle', label: '空闲' },
              { value: 'busy', label: '服务中' },
              { value: 'rest', label: '休息' },
              { value: 'resigned', label: '离职' },
            ]}
          />
          {isSuperAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              新增技师
            </Button>
          )}
        </Space>
      </div>

      <Table<Technician>
        columns={displayColumns}
        dataSource={filteredList}
        rowKey="_id"
        loading={isLoading}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* Create Technician Modal */}
      <Modal
        title="新增技师"
        open={createModalOpen}
        onOk={handleCreateSubmit}
        onCancel={handleCreateCancel}
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: createMutation.isPending }}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          autoComplete="off"
        >
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
            name="specialties"
            label="擅长项目"
            rules={[
              { required: true, message: '请选择至少一项擅长项目' },
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('请选择至少一项擅长项目'));
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
