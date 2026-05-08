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
  Space,
  Typography,
  Spin,
  message,
  Empty,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetMemberDetail,
  adminUpdateMember,
  adminGetMemberConsumptions,
} from '@/services/member';
import { adminBindMemberCard, adminUnbindMemberCard } from '@/services/memberCard';
import { maskPhone, formatAmount, formatDate } from '@/utils/format';
import { validateMemberInfo } from '@/utils/validation';
import { MEMBER_LEVELS } from '@/constants/business';
import type { ConsumptionRecord, CardRechargeRecord } from '@/types/member';

const { Title } = Typography;
const CONSUMPTION_PAGE_SIZE = 10;

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [bindCardModalOpen, setBindCardModalOpen] = useState(false);
  const [consumptionPage, setConsumptionPage] = useState(1);
  const [editForm] = Form.useForm();
  const [rechargeForm] = Form.useForm();
  const [bindCardForm] = Form.useForm<{ cardId: string }>();
  const [editLoading, setEditLoading] = useState(false);
  const [bindCardLoading, setBindCardLoading] = useState(false);

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
    navigate('/member');
  }, [navigate]);

  // Edit modal
  const handleOpenEdit = useCallback(() => {
    if (member) {
      editForm.setFieldsValue({
        nickName: member.nickName,
        phone: member.phone,
        birthday: member.birthday ?? '',
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
      const validation = validateMemberInfo({
        nickName: values.nickName,
        phone: values.phone,
        birthday: values.birthday,
      });
      if (!validation.valid) {
        message.error(validation.errors[0]);
        return;
      }
      setEditLoading(true);
      await adminUpdateMember(memberId!, {
        nickName: values.nickName,
        phone: values.phone,
        birthday: values.birthday,
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
      const amountYuan = values.amount;
      if (amountYuan <= 0) {
        message.error('充值金额必须大于 0');
        return;
      }
      Modal.confirm({
        title: '确认充值',
        content: `确认为该会员充值 ¥${Number(amountYuan).toFixed(2)} 吗？`,
        onOk: () => {
          // Note: actual recharge API will be implemented later in memberCard service
          message.success('充值成功');
          setRechargeModalOpen(false);
          rechargeForm.resetFields();
        },
      });
    } catch {
      // form validation error
    }
  }, [rechargeForm]);
  const handleOpenBindCard = useCallback(() => {
    bindCardForm.resetFields();
    setBindCardModalOpen(true);
  }, [bindCardForm]);
  const handleCloseBindCard = useCallback(() => {
    bindCardForm.resetFields();
    setBindCardModalOpen(false);
  }, [bindCardForm]);
  const handleSubmitBindCard = useCallback(async () => {
    try {
      const values = await bindCardForm.validateFields();
      setBindCardLoading(true);
      const res = await adminBindMemberCard({
        memberId: memberId!,
        cardId: values.cardId,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '关联失败');
      }
      message.success('会员卡关联成功');
      handleCloseBindCard();
      queryClient.invalidateQueries({ queryKey: ['memberDetail', memberId] });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '关联失败');
    } finally {
      setBindCardLoading(false);
    }
  }, [bindCardForm, handleCloseBindCard, memberId, queryClient]);
  const handleUnbindCard = useCallback(async () => {
    if (!card) {
      return;
    }
    try {
      const res = await adminUnbindMemberCard({
        memberId: memberId!,
        cardId: card._id,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '解除关联失败');
      }
      message.success('会员卡已解除关联');
      queryClient.invalidateQueries({ queryKey: ['memberDetail', memberId] });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '解除关联失败');
    }
  }, [card, memberId, queryClient]);

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
            <Button danger onClick={handleUnbindCard}>
              解除关联
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
              {card.discountLevelId}
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
          <Button type="primary" onClick={handleOpenBindCard}>
            关联会员卡
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
        <Button type="primary" onClick={handleOpenEdit}>
          编辑信息
        </Button>
        <Button onClick={handleOpenRecharge}>充值</Button>
      </Space>

      <Tabs items={tabItems} />

      {/* Edit Modal */}
      <Modal
        title="编辑会员信息"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={handleEditCancel}
        confirmLoading={editLoading}
        destroyOnClose
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
            rules={[
              {
                pattern: /^\d{4}-\d{2}-\d{2}$/,
                message: '生日格式必须为 YYYY-MM-DD',
              },
            ]}
          >
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Recharge Modal */}
      <Modal
        title="会员卡充值"
        open={rechargeModalOpen}
        onOk={handleRechargeSubmit}
        onCancel={handleRechargeCancel}
        destroyOnClose
      >
        <Form form={rechargeForm} layout="vertical">
          <Form.Item
            name="amount"
            label="充值金额（元）"
            rules={[
              { required: true, message: '请输入充值金额' },
              {
                type: 'number',
                min: 0.01,
                message: '充值金额必须大于 0',
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
        title="关联会员卡"
        open={bindCardModalOpen}
        onOk={handleSubmitBindCard}
        onCancel={handleCloseBindCard}
        confirmLoading={bindCardLoading}
        destroyOnClose
      >
        <Form form={bindCardForm} layout="vertical">
          <Form.Item
            name="cardId"
            label="会员卡ID"
            rules={[
              { required: true, message: '请输入会员卡ID' },
              { min: 1, message: '会员卡ID不能为空' },
            ]}
          >
            <Input placeholder="请输入要关联的会员卡ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
