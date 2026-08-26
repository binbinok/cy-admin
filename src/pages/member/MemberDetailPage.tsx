import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Descriptions,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Alert,
  Radio,
  Space,
  Typography,
  Spin,
  message,
  Empty,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetMemberDetail,
  adminUpdateMember,
  adminGetMemberConsumptions,
} from '@/services/member';
import { useAuthStore } from '@/stores/authStore';
import {
  adminGetDiscountLevels,
  adminRechargeCard,
  adminCreateMemberCard,
  adminCancelMemberCard,
  type DiscountLevel,
} from '@/services/memberCard';
import { maskPhone, formatAmount, formatDate } from '@/utils/format';
import { validateMemberInfo } from '@/utils/validation';
import { MEMBER_LEVELS } from '@/constants/business';
import type { ConsumptionRecord, CardRechargeRecord } from '@/types/member';

const { Title } = Typography;
const CONSUMPTION_PAGE_SIZE = 10;
const CANCEL_REASON_OPTIONS = ['会员要求退卡', '操作错误', '其他'] as const;

export default function MemberDetailPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [consumptionPage, setConsumptionPage] = useState(1);
  const [editForm] = Form.useForm();
  const [rechargeForm] = Form.useForm();
  const [createCardForm] = Form.useForm<{ discountLevelId: string; amount: number }>();
  const [cancelForm] = Form.useForm<{
    reason: string;
    remark?: string;
    balanceAction?: 'refunded_offline' | 'cleared';
    phoneLast4: string;
    password: string;
  }>();
  const [editLoading, setEditLoading] = useState(false);
  const [createCardLoading, setCreateCardLoading] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  // Fetch member detail
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['memberDetail', memberId],
    queryFn: async () => {
      const res = await adminGetMemberDetail(memberId!);
      return res.data;
    },
    enabled: !!memberId,
  });

  const member = detailData?.member;
  const card = detailData?.card;
  const { data: levelData } = useQuery({
    queryKey: ['discountLevels'],
    queryFn: async () => {
      const res = await adminGetDiscountLevels();
      return res.data ?? [];
    },
  });
  const discountLevels = levelData ?? [];
  const cardLevel = card?.discountLevelId
    ? discountLevels.find((l) => l._id === card.discountLevelId)
    : undefined;
  const rechargeMinAmount = cardLevel?.minRechargeAmount ?? 0;

  // Fetch consumption records
  const { data: consumptionData, isLoading: consumptionLoading } = useQuery({
    queryKey: ['memberConsumptions', memberId, consumptionPage],
    queryFn: async () => {
      const res = await adminGetMemberConsumptions({
        memberId: memberId!,
        page: consumptionPage,
        pageSize: CONSUMPTION_PAGE_SIZE,
      });
      return res.data;
    },
    enabled: !!memberId,
  });

  const consumptionList = consumptionData?.list ?? [];
  const consumptionTotal = consumptionData?.total ?? 0;

  const getLevelLabel = useCallback((level: string) => {
    const found = MEMBER_LEVELS.find((l) => l.key === level);
    return found?.label ?? level;
  }, []);

  const handleBack = useCallback(() => {
    navigate('/members');
  }, [navigate]);

  // Edit modal
  const handleOpenEdit = useCallback(() => {
    if (member) {
      editForm.setFieldsValue({
        nickName: member.nickName,
        phone: member.phone,
        birthday: member.birthday ? dayjs(member.birthday) : undefined,
      });
    }
    setEditModalOpen(true);
  }, [member, editForm]);

  const handleEditCancel = useCallback(() => {
    setEditModalOpen(false);
    editForm.resetFields();
  }, [editForm]);

  const handleEditSubmit = useCallback(async () => {
    try {
      const values = await editForm.validateFields();
      const birthday = values.birthday ? (values.birthday as Dayjs).format('YYYY-MM-DD') : '';
      const validation = validateMemberInfo({
        nickName: values.nickName,
        phone: values.phone,
        birthday,
      });
      if (!validation.valid) {
        message.error(validation.errors[0]);
        return;
      }
      setEditLoading(true);
      await adminUpdateMember(memberId!, {
        nickName: values.nickName,
        phone: values.phone,
        birthday,
      });
      message.success('会员信息已更新');
      setEditModalOpen(false);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['memberDetail', memberId] });
    } catch {
      // form validation error or API error
    } finally {
      setEditLoading(false);
    }
  }, [editForm, memberId, queryClient]);

  // Recharge modal
  const handleOpenRecharge = useCallback(() => {
    rechargeForm.resetFields();
    setRechargeModalOpen(true);
  }, [rechargeForm]);

  const handleRechargeCancel = useCallback(() => {
    setRechargeModalOpen(false);
    rechargeForm.resetFields();
  }, [rechargeForm]);

  const handleRechargeSubmit = useCallback(async () => {
    try {
      const values = await rechargeForm.validateFields();
      const amountYuan = Number(values.amount);
      if (amountYuan <= 0) {
        message.error('充值金额必须大于 0');
        return;
      }
      Modal.confirm({
        title: '确认充值',
        content: `确认为该会员充值 ¥${amountYuan.toFixed(2)} 吗？`,
        onOk: async () => {
          setRechargeLoading(true);
          try {
            const res = await adminRechargeCard({
              memberId: memberId!,
              amount: Math.round(amountYuan * 100),
            });
            if (!res.success) {
              throw new Error(res.error?.message ?? '充值失败');
            }
            message.success('充值成功');
            setRechargeModalOpen(false);
            rechargeForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ['memberDetail', memberId] });
          } catch (error) {
            message.error(error instanceof Error ? error.message : '充值失败');
          } finally {
            setRechargeLoading(false);
          }
        },
      });
    } catch {
      // form validation error
    }
  }, [rechargeForm, memberId, queryClient]);
  const handleOpenCreateCard = useCallback(() => {
    createCardForm.resetFields();
    setCreateCardModalOpen(true);
  }, [createCardForm]);
  const handleCloseCreateCard = useCallback(() => {
    createCardForm.resetFields();
    setCreateCardModalOpen(false);
  }, [createCardForm]);
  const handleSubmitCreateCard = useCallback(async () => {
    try {
      const values = await createCardForm.validateFields();
      setCreateCardLoading(true);
      const res = await adminCreateMemberCard({
        memberId: memberId!,
        discountLevelId: values.discountLevelId,
        amount: Math.round(Number(values.amount) * 100),
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '开卡失败');
      }
      message.success('会员卡开通成功');
      handleCloseCreateCard();
      queryClient.invalidateQueries({ queryKey: ['memberDetail', memberId] });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '开卡失败');
    } finally {
      setCreateCardLoading(false);
    }
  }, [createCardForm, handleCloseCreateCard, memberId, queryClient]);
  const handleOpenCancel = useCallback(() => {
    cancelForm.resetFields();
    setCancelModalOpen(true);
  }, [cancelForm]);
  const handleCloseCancel = useCallback(() => {
    setCancelModalOpen(false);
    cancelForm.resetFields();
  }, [cancelForm]);
  const handleSubmitCancel = useCallback(async () => {
    if (!card) {
      return;
    }
    try {
      const values = await cancelForm.validateFields();
      const reason = values.reason === '其他' ? `其他：${values.remark}` : values.reason;
      setCancelLoading(true);
      const res = await adminCancelMemberCard({
        memberId: memberId!,
        reason,
        phoneLast4: values.phoneLast4,
        password: values.password,
        balanceAction: card.balance > 0 ? values.balanceAction : undefined,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '注销失败');
      }
      message.success('会员卡已注销');
      handleCloseCancel();
      queryClient.invalidateQueries({ queryKey: ['memberDetail', memberId] });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注销失败');
    } finally {
      setCancelLoading(false);
    }
  }, [card, memberId, queryClient, cancelForm, handleCloseCancel]);

  // Consumption table columns
  const consumptionColumns: ColumnsType<ConsumptionRecord> = [
    {
      title: '日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: Date | string) => formatDate(val),
      defaultSortOrder: 'descend',
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '服务项目',
      dataIndex: 'serviceName',
      key: 'serviceName',
    },
    {
      title: '实际金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => `¥${formatAmount(val)}`,
    },
    {
      title: '获得积分',
      dataIndex: 'points',
      key: 'points',
    },
  ];

  // Recharge record columns (for card tab)
  const rechargeColumns: ColumnsType<CardRechargeRecord> = [
    {
      title: '充值时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: Date | string) => formatDate(val),
    },
    {
      title: '充值金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => `¥${formatAmount(val)}`,
    },
    {
      title: '充值后余额',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (val: number) => `¥${formatAmount(val)}`,
    },
  ];

  if (detailLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Empty description="会员不存在" />
        <Button onClick={handleBack} style={{ marginTop: 16 }}>
          返回会员列表
        </Button>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'consumption',
      label: '消费记录',
      children: (
        <Table<ConsumptionRecord>
          columns={consumptionColumns}
          dataSource={consumptionList}
          rowKey="_id"
          loading={consumptionLoading}
          pagination={{
            current: consumptionPage,
            pageSize: CONSUMPTION_PAGE_SIZE,
            total: consumptionTotal,
            onChange: setConsumptionPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      ),
    },
    {
      key: 'card',
      label: '持卡信息',
      children: card ? (
        <div>
          <Space style={{ marginBottom: 12 }}>
            <Button danger onClick={handleOpenCancel}>
              注销会员卡
            </Button>
          </Space>
          <Descriptions
            bordered
            column={2}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="卡余额">
              ¥{formatAmount(card.balance)}
            </Descriptions.Item>
            <Descriptions.Item label="累计充值">
              ¥{formatAmount(card.totalRecharge)}
            </Descriptions.Item>
            <Descriptions.Item label="折扣等级">
              {cardLevel
                ? `${cardLevel.name}（${cardLevel.discountRate / 10} 折）`
                : '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="卡状态">
              {card.status === 'active' ? '正常' : '冻结'}
            </Descriptions.Item>
          </Descriptions>
          <Title level={5} style={{ marginBottom: 12 }}>
            充值流水
          </Title>
          <Table<CardRechargeRecord>
            columns={rechargeColumns}
            dataSource={[]}
            rowKey="_id"
            pagination={false}
          />
        </div>
      ) : (
        <div>
          <Empty description="该会员暂无会员卡" />
          <Button type="primary" onClick={handleOpenCreateCard}>
            开通会员卡
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
        >
          返回会员列表
        </Button>
      </Space>

      <Title level={4} style={{ marginBottom: 16 }}>
        会员详情
      </Title>

      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="昵称">
          {member.nickName}
        </Descriptions.Item>
        <Descriptions.Item label="手机号">
          {maskPhone(member.phone)}
        </Descriptions.Item>
        <Descriptions.Item label="等级">
          {getLevelLabel(member.level)}
        </Descriptions.Item>
        <Descriptions.Item label="积分">
          {member.points}
        </Descriptions.Item>
        <Descriptions.Item label="累计消费">
          ¥{formatAmount(member.totalConsumption)}
        </Descriptions.Item>
        <Descriptions.Item label="生日">
          {member.birthday ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="来源渠道">
          {member.source ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="消费次数">
          {member.consumptionCount}
        </Descriptions.Item>
      </Descriptions>

      <Space style={{ marginBottom: 16 }}>
        {isSuperAdmin && (
          <Button type="primary" onClick={handleOpenEdit}>
            编辑信息
          </Button>
        )}
        {card && <Button onClick={handleOpenRecharge}>充值</Button>}
      </Space>

      <Tabs items={tabItems} />

      {/* Edit Modal */}
      <Modal
        title="编辑会员信息"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={handleEditCancel}
        confirmLoading={editLoading}
        forceRender
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="nickName"
            label="昵称"
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, max: 20, message: '昵称长度必须为 2–20 个字符' },
            ]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '手机号格式不正确',
              },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="birthday"
            label="生日"
            rules={[{ required: true, message: '请选择生日' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择生日" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Recharge Modal */}
      <Modal
        title="会员卡充值"
        open={rechargeModalOpen}
        onOk={handleRechargeSubmit}
        onCancel={handleRechargeCancel}
        confirmLoading={rechargeLoading}
        forceRender
      >
        <Form form={rechargeForm} layout="vertical">
          <Form.Item
            name="amount"
            label="充值金额（元）"
            extra={
              rechargeMinAmount > 0
                ? `该卡折扣等级最低充值 ¥${formatAmount(rechargeMinAmount)}`
                : undefined
            }
            rules={[
              { required: true, message: '请输入充值金额' },
              {
                type: 'number',
                min: 0.01,
                message: '充值金额必须大于 0',
              },
              {
                validator: (_, value: number | undefined) =>
                  rechargeMinAmount > 0 && value !== undefined && Math.round(value * 100) < rechargeMinAmount
                    ? Promise.reject(new Error(`该卡折扣等级最低充值 ¥${formatAmount(rechargeMinAmount)}`))
                    : Promise.resolve(),
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={1}
              precision={2}
              placeholder="请输入充值金额"
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="开通会员卡"
        open={createCardModalOpen}
        onOk={handleSubmitCreateCard}
        onCancel={handleCloseCreateCard}
        confirmLoading={createCardLoading}
        forceRender
      >
        <Form form={createCardForm} layout="vertical">
          <Form.Item
            name="discountLevelId"
            label="折扣等级"
            rules={[{ required: true, message: '请选择折扣等级' }]}
          >
            <Select
              placeholder="请选择折扣等级"
              options={discountLevels.map((item: DiscountLevel) => ({
                value: item._id,
                label: `${item.name}（${item.discountRate / 10} 折）`,
              }))}
            />
          </Form.Item>
          <Form.Item noStyle dependencies={['discountLevelId']}>
            {({ getFieldValue }) => {
              const level = discountLevels.find(
                (l) => l._id === getFieldValue('discountLevelId'),
              );
              const minAmount = level?.minRechargeAmount ?? 0;
              return (
                <Form.Item
                  name="amount"
                  label="充值金额（元）"
                  extra={
                    minAmount > 0
                      ? `该等级最低充值 ¥${formatAmount(minAmount)}`
                      : undefined
                  }
                  rules={[
                    { required: true, message: '请输入充值金额' },
                    { type: 'number', min: 0.01, message: '充值金额必须大于 0' },
                    {
                      validator: (_, value: number | undefined) =>
                        minAmount > 0 && value !== undefined && Math.round(value * 100) < minAmount
                          ? Promise.reject(new Error(`该等级最低充值 ¥${formatAmount(minAmount)}`))
                          : Promise.resolve(),
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01}
                    step={1}
                    precision={2}
                    placeholder="开卡首充金额"
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="注销会员卡"
        open={cancelModalOpen}
        onOk={handleSubmitCancel}
        onCancel={handleCloseCancel}
        confirmLoading={cancelLoading}
        okText="确认注销"
        okButtonProps={{ danger: true }}
        forceRender
      >
        {card && (
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="卡余额">
              ¥{formatAmount(card.balance)}
            </Descriptions.Item>
            <Descriptions.Item label="累计充值">
              ¥{formatAmount(card.totalRecharge)}
            </Descriptions.Item>
          </Descriptions>
        )}
        {card && card.balance > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={`该卡余额 ¥${formatAmount(card.balance)}，注销后卡将停用，请选择余额处理方式`}
          />
        )}
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="reason"
            label="注销原因"
            rules={[{ required: true, message: '请选择注销原因' }]}
          >
            <Select
              placeholder="请选择注销原因"
              options={CANCEL_REASON_OPTIONS.map((item) => ({ value: item, label: item }))}
            />
          </Form.Item>
          <Form.Item noStyle dependencies={['reason']}>
            {({ getFieldValue }) =>
              getFieldValue('reason') === '其他' ? (
                <Form.Item
                  name="remark"
                  label="原因说明"
                  rules={[{ required: true, message: '请填写原因说明' }]}
                >
                  <Input.TextArea rows={2} maxLength={200} placeholder="请填写注销原因" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          {card && card.balance > 0 && (
            <Form.Item
              name="balanceAction"
              label="余额处理方式"
              rules={[{ required: true, message: '请选择余额处理方式' }]}
            >
              <Radio.Group
                options={[
                  { value: 'refunded_offline', label: '已线下退款（余额留档）' },
                  { value: 'cleared', label: '余额清零' },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            name="phoneLast4"
            label="会员手机号后 4 位"
            rules={[
              { required: true, message: '请输入会员手机号后 4 位' },
              { pattern: /^\d{4}$/, message: '请输入 4 位数字' },
            ]}
          >
            <Input maxLength={4} placeholder="用于确认会员身份" />
          </Form.Item>
          <Form.Item
            name="password"
            label="管理员密码"
            rules={[{ required: true, message: '请输入当前管理员密码' }]}
          >
            <Input.Password placeholder="请输入当前登录的管理员密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
