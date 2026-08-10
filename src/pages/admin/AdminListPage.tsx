import { useState, useCallback } from 'react';
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
  Tabs,
  message,
} from 'antd';
import {
  PlusOutlined,
  LockOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAdminList,
  createAdmin,
  updateAdminStatus,
  adminChangePassword,
  getLoginLogs,
} from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import type { AdminAccount, LoginLog } from '@/types/auth';

const { Title } = Typography;

const PAGE_SIZE = 10;

export default function AdminListPage() {
  const queryClient = useQueryClient();
  const adminInfo = useAuthStore((s) => s.adminInfo);
  const isSuperAdmin = adminInfo?.role === 'super_admin';

  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('adminList');
  const [logPage, setLogPage] = useState(1);

  const [createForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // Fetch login logs
  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ['loginLogs', logPage],
    queryFn: async () => {
      const res = await getLoginLogs({ page: logPage, pageSize: PAGE_SIZE });
      return res.data;
    },
    enabled: activeTab === 'loginLogs',
  });

  const loginLogs = logData?.list ?? [];
  const logTotal = logData?.total ?? 0;

  // Login log table columns
  const logColumns: ColumnsType<LoginLog> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 200,
      render: (val: Date) =>
        val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 160,
    },
    {
      title: '操作结果',
      dataIndex: 'result',
      key: 'result',
      width: 120,
      render: (result: LoginLog['result']) =>
        result === 'success' ? (
          <Tag color="green">成功</Tag>
        ) : (
          <Tag color="red">失败</Tag>
        ),
    },
  ];

  // Fetch admin list
  const { data, isLoading } = useQuery({
    queryKey: ['adminList', page],
    queryFn: async () => {
      const res = await getAdminList({ page, pageSize: PAGE_SIZE });
      return res.data;
    },
  });

  const adminList = data?.list ?? [];
  const total = data?.total ?? 0;

  // Create admin mutation
  const createMutation = useMutation({
    mutationFn: (values: {
      username: string;
      password: string;
      role: string;
    }) => createAdmin(values),
    onSuccess: (res) => {
      if (res.success) {
        message.success('管理员创建成功');
        setCreateModalOpen(false);
        createForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['adminList'] });
      } else {
        message.error(res.error?.message ?? '创建失败，请重试');
      }
    },
    onError: () => {
      message.error('操作失败，请重试');
    },
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: (params: {
      adminId: string;
      status: 'active' | 'disabled';
    }) => updateAdminStatus(params.adminId, params.status),
    onSuccess: (res) => {
      if (res.success) {
        message.success('状态更新成功');
        queryClient.invalidateQueries({ queryKey: ['adminList'] });
      } else {
        message.error(res.error?.message ?? '操作失败，请重试');
      }
    },
    onError: () => {
      message.error('操作失败，请重试');
    },
  });

  // Change password mutation
  const passwordMutation = useMutation({
    mutationFn: (params: {
      currentPassword: string;
      newPassword: string;
    }) => adminChangePassword(params.currentPassword, params.newPassword),
    onSuccess: (res) => {
      if (res.success) {
        message.success('密码修改成功');
        setPasswordModalOpen(false);
        passwordForm.resetFields();
      } else {
        message.error(res.error?.message ?? '密码修改失败，请重试');
      }
    },
    onError: () => {
      message.error('操作失败，请重试');
    },
  });

  // Toggle admin status with confirmation
  const handleToggleStatus = useCallback(
    (record: AdminAccount) => {
      const newStatus =
        record.status === 'active' ? 'disabled' : 'active';
      const actionText =
        newStatus === 'disabled' ? '禁用' : '启用';

      Modal.confirm({
        title: `确认${actionText}`,
        content: `确定要${actionText}管理员「${record.username}」吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: () =>
          statusMutation.mutateAsync({
            adminId: record.adminId,
            status: newStatus,
          }),
      });
    },
    [statusMutation],
  );

  // Handle create admin form submit
  const handleCreateSubmit = useCallback(() => {
    createForm.validateFields().then((values) => {
      createMutation.mutate({
        username: values.username,
        password: values.password,
        role: values.role,
      });
    });
  }, [createForm, createMutation]);

  // Handle change password form submit
  const handlePasswordSubmit = useCallback(() => {
    passwordForm.validateFields().then((values) => {
      if (values.newPassword.length < 8 || values.newPassword.length > 32) {
        message.error('新密码长度必须为 8–32 个字符');
        return;
      }
      passwordMutation.mutate({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    });
  }, [passwordForm, passwordMutation]);

  // Close modals and reset forms
  const handleCreateCancel = useCallback(() => {
    setCreateModalOpen(false);
    createForm.resetFields();
  }, [createForm]);

  const handlePasswordCancel = useCallback(() => {
    setPasswordModalOpen(false);
    passwordForm.resetFields();
  }, [passwordForm]);

  // Table columns
  const columns: ColumnsType<AdminAccount> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: AdminAccount['role']) =>
        role === 'super_admin' ? (
          <Tag color="gold">超级管理员</Tag>
        ) : (
          <Tag color="blue">普通管理员</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AdminAccount['status']) =>
        status === 'active' ? (
          <Tag color="green">正常</Tag>
        ) : (
          <Tag color="red">已禁用</Tag>
        ),
    },
    {
      title: '最后登录时间',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (val: Date | undefined) =>
        val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '最后登录 IP',
      dataIndex: 'lastLoginIp',
      key: 'lastLoginIp',
      width: 150,
      render: (val: string | undefined) => val ?? '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: AdminAccount) => {
        // Super admin can toggle status of other admins
        const canToggle =
          isSuperAdmin && record.adminId !== adminInfo?.adminId;

        return (
          <Space size="small">
            {canToggle && (
              <Button
                type="link"
                size="small"
                icon={<LockOutlined />}
                danger={record.status === 'active'}
                onClick={() => handleToggleStatus(record)}
                disabled={statusMutation.isPending}
              >
                {record.status === 'active' ? '禁用' : '启用'}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

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
          管理员账号管理
        </Title>
        <Space>
          <Button
            icon={<KeyOutlined />}
            onClick={() => setPasswordModalOpen(true)}
          >
            修改密码
          </Button>
          {isSuperAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              新增管理员
            </Button>
          )}
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'adminList',
            label: '管理员列表',
            children: (
              <Table<AdminAccount>
                columns={columns}
                dataSource={adminList}
                rowKey="adminId"
                loading={isLoading}
                pagination={{
                  current: page,
                  pageSize: PAGE_SIZE,
                  total,
                  onChange: setPage,
                  showTotal: (t) => `共 ${t} 条`,
                }}
                scroll={{ x: 860 }}
              />
            ),
          },
          {
            key: 'loginLogs',
            label: '登录日志',
            children: (
              <Table<LoginLog>
                columns={logColumns}
                dataSource={loginLogs}
                rowKey="_id"
                loading={logLoading}
                pagination={{
                  current: logPage,
                  pageSize: PAGE_SIZE,
                  total: logTotal,
                  onChange: setLogPage,
                  showTotal: (t) => `共 ${t} 条`,
                }}
                scroll={{ x: 630 }}
              />
            ),
          },
        ]}
      />

      {/* Create Admin Modal */}
      <Modal
        title="新增管理员"
        open={createModalOpen}
        onOk={handleCreateSubmit}
        onCancel={handleCreateCancel}
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: createMutation.isPending }}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[{ required: true, message: '请输入初始密码' }]}
          >
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="请输入初始密码"
            />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
            initialValue="admin"
          >
            <Select>
              <Select.Option value="admin">普通管理员</Select.Option>
              <Select.Option value="super_admin">
                超级管理员
              </Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title="修改密码"
        open={passwordModalOpen}
        onOk={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        confirmLoading={passwordMutation.isPending}
        okButtonProps={{ disabled: passwordMutation.isPending }}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[
              { required: true, message: '请输入当前密码' },
            ]}
          >
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="请输入当前密码"
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '新密码长度至少 8 个字符' },
              { max: 32, message: '新密码长度最多 32 个字符' },
            ]}
          >
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="请输入新密码（8–32 字符）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
