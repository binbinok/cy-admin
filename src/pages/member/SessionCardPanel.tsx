import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetMemberSessionCards,
  adminGetSessionCardTypes,
  adminIssueSessionCard,
  adminRefundSessionCard,
} from '@/services/sessionCard';
import { useAuthStore } from '@/stores/authStore';
import { adminGetTechnicianList } from '@/services/technician';
import { formatAmount, formatDate } from '@/utils/format';
import type { MemberSessionCard, SessionCardRedemption } from '@/types/sessionCard';

const { Title, Text } = Typography;

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: '现金' },
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'meituan', label: '美团' },
] as const;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '正常', color: 'green' },
  depleted: { label: '已用完', color: 'default' },
  expired: { label: '已过期', color: 'orange' },
  refunded: { label: '已退卡', color: 'red' },
};

const renderStatus = (status: string) => {
  const item = STATUS_MAP[status] ?? { label: status, color: 'default' };
  return <Tag color={item.color}>{item.label}</Tag>;
};

interface IssueFormValues {
  cardTypeId: string;
  paidAmount: number;
  paymentMethod: string;
  commissionTechnicianId: string;
}

interface RefundFormValues {
  refundAmount: number;
  reason: string;
}

export default function SessionCardPanel({ memberId }: { memberId: string }) {
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');
  const queryClient = useQueryClient();
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [refundTarget, setRefundTarget] = useState<MemberSessionCard | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [issueForm] = Form.useForm<IssueFormValues>();
  const [refundForm] = Form.useForm<RefundFormValues>();
  const watchCardTypeId = Form.useWatch('cardTypeId', issueForm);

  const { data, isLoading } = useQuery({
    queryKey: ['memberSessionCards', memberId],
    queryFn: async () => {
      const res = await adminGetMemberSessionCards({ memberId });
      return res.data ?? { cards: [], redemptions: [] };
    },
  });
  const cards = data?.cards ?? [];
  const redemptions = data?.redemptions ?? [];

  const { data: cardTypes } = useQuery({
    queryKey: ['sessionCardTypes', 'active'],
    queryFn: async () => {
      const res = await adminGetSessionCardTypes({ activeOnly: true });
      return res.data ?? [];
    },
  });
  const typeOptions = (cardTypes ?? []).map((t) => ({
    value: t._id,
    label: `${t.name}（¥${formatAmount(t.price)} / ${t.totalSessions} 次）`,
  }));
  const selectedType = (cardTypes ?? []).find((t) => t._id === watchCardTypeId);

  const { data: technicianData } = useQuery({
    queryKey: ['technicianOptions'],
    queryFn: async () => {
      const res = await adminGetTechnicianList({ page: 1, pageSize: 100 });
      return res.data?.list ?? [];
    },
  });
  const technicianOptions = (technicianData ?? []).map((t) => ({
    label: t.name,
    value: t._id,
  }));

  const handleOpenIssue = useCallback(() => {
    issueForm.resetFields();
    setIssueModalOpen(true);
  }, [issueForm]);

  const handleIssueSubmit = useCallback(async () => {
    try {
      const values = await issueForm.validateFields();
      setIssueLoading(true);
      const res = await adminIssueSessionCard({
        memberId,
        cardTypeId: values.cardTypeId,
        paidAmount: Math.round(values.paidAmount * 100),
        paymentMethod: values.paymentMethod,
        commissionTechnicianId: values.commissionTechnicianId,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '售卡失败');
      }
      message.success('次卡售卡成功（实收计预收）');
      setIssueModalOpen(false);
      issueForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['memberSessionCards', memberId] });
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setIssueLoading(false);
    }
  }, [issueForm, memberId, queryClient]);

  const handleOpenRefund = useCallback(
    (record: MemberSessionCard) => {
      setRefundTarget(record);
      refundForm.resetFields();
      refundForm.setFieldsValue({
        refundAmount: (record.remainingSessions * record.snapshot.sessionValue) / 100,
      });
    },
    [refundForm],
  );

  const handleRefundSubmit = useCallback(async () => {
    if (!refundTarget) {
      return;
    }
    try {
      const values = await refundForm.validateFields();
      setRefundLoading(true);
      const res = await adminRefundSessionCard({
        sessionCardId: refundTarget._id,
        reason: values.reason.trim(),
        refundAmount: Math.round(values.refundAmount * 100),
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '退卡失败');
      }
      message.success('次卡已退卡留档，退款请线下完成');
      setRefundTarget(null);
      refundForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['memberSessionCards', memberId] });
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setRefundLoading(false);
    }
  }, [refundForm, refundTarget, memberId, queryClient]);

  const cardColumns: ColumnsType<MemberSessionCard> = [
    { title: '卡种', dataIndex: 'cardTypeName', key: 'cardTypeName' },
    {
      title: '剩余次数',
      key: 'sessions',
      width: 110,
      render: (_, record) => `${record.remainingSessions} / ${record.totalSessions}`,
    },
    {
      title: '有效期',
      key: 'expiresAt',
      width: 130,
      render: (_, record) => (record.expiresAt ? formatDate(record.expiresAt) : '永久有效'),
    },
    {
      title: '实收金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 110,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '售卡时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value: string) => formatDate(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: renderStatus,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) =>
        isSuperAdmin && record.status === 'active' && record.snapshot.refundPolicy === 'prorated' ? (
          <Button type="link" size="small" danger onClick={() => handleOpenRefund(record)}>
            退卡
          </Button>
        ) : null,
    },
  ];

  const redemptionColumns: ColumnsType<SessionCardRedemption> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string) => formatDate(value),
    },
    { title: '服务大类', dataIndex: 'categoryName', key: 'categoryName', width: 100 },
    { title: '基础项目', dataIndex: 'baseItemName', key: 'baseItemName' },
    {
      title: '抵扣金额',
      dataIndex: 'coveredAmount',
      key: 'coveredAmount',
      width: 110,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '确认收入',
      dataIndex: 'recognizedAmount',
      key: 'recognizedAmount',
      width: 110,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    { title: '技师', dataIndex: 'technicianName', key: 'technicianName', width: 100 },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={handleOpenIssue}>
          售卡（开次卡）
        </Button>
      </Space>
      <Table<MemberSessionCard>
        columns={cardColumns}
        dataSource={cards}
        rowKey="_id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: '该会员暂无次卡' }}
      />
      <Title level={5} style={{ margin: '16px 0 12px' }}>
        核销记录
      </Title>
      <Table<SessionCardRedemption>
        columns={redemptionColumns}
        dataSource={redemptions}
        rowKey="_id"
        pagination={false}
        size="small"
      />

      <Modal
        title="售卡（开次卡）"
        open={issueModalOpen}
        onOk={handleIssueSubmit}
        onCancel={() => setIssueModalOpen(false)}
        confirmLoading={issueLoading}
        forceRender
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item
            name="cardTypeId"
            label="次卡卡种"
            rules={[{ required: true, message: '请选择次卡卡种' }]}
          >
            <Select
              placeholder="请选择卡种"
              options={typeOptions}
              onChange={(value: string) => {
                const t = (cardTypes ?? []).find((item) => item._id === value);
                issueForm.setFieldsValue({ paidAmount: t ? t.price / 100 : undefined });
              }}
            />
          </Form.Item>
          <Form.Item
            name="paidAmount"
            label="实收金额（元）"
            extra={selectedType ? `卡种一口价 ¥${formatAmount(selectedType.price)}，实收计预收` : undefined}
            rules={[
              { required: true, message: '请选择卡种以确定实收金额' },
              {
                validator: (_, value) => {
                  if (!selectedType) {
                    return Promise.resolve();
                  }
                  const fen = Math.round(((value as number) ?? 0) * 100);
                  if (fen !== selectedType.price) {
                    return Promise.reject(new Error('实收金额必须等于卡种售价'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} disabled />
          </Form.Item>
          <Form.Item noStyle dependencies={['cardTypeId']}>
            {({ getFieldValue }) => {
              const t = (cardTypes ?? []).find((item) => item._id === getFieldValue('cardTypeId'));
              return t ? (
                <Text type="secondary">
                  单次折算价 ¥{formatAmount(Math.floor(t.price / t.totalSessions))}
                  （核销时按此确认收入、计提提成、给积分）
                </Text>
              ) : null;
            }}
          </Form.Item>
          <Form.Item
            name="paymentMethod"
            label="支付方式"
            rules={[{ required: true, message: '请选择支付方式' }]}
            style={{ marginTop: 16 }}
          >
            <Select placeholder="请选择支付方式" options={[...PAYMENT_METHOD_OPTIONS]} />
          </Form.Item>
          <Form.Item
            name="commissionTechnicianId"
            label="提成员工"
            rules={[{ required: true, message: '请选择提成员工' }]}
          >
            <Select placeholder="请选择提成员工" options={technicianOptions} showSearch optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="退次卡"
        open={refundTarget !== null}
        onOk={handleRefundSubmit}
        onCancel={() => setRefundTarget(null)}
        confirmLoading={refundLoading}
        okText="确认退卡"
        okButtonProps={{ danger: true }}
        forceRender
      >
        {refundTarget && (
          <div style={{ marginBottom: 16 }}>
            <Text>
              {refundTarget.cardTypeName}：剩余 {refundTarget.remainingSessions} 次，按单次折算价 ¥
              {formatAmount(refundTarget.snapshot.sessionValue)} 计算，默认退款 ¥
              {formatAmount(refundTarget.remainingSessions * refundTarget.snapshot.sessionValue)}
            </Text>
          </div>
        )}
        <Form form={refundForm} layout="vertical">
          <Form.Item
            name="refundAmount"
            label="实退金额（元）"
            rules={[{ required: true, message: '请输入实退金额' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="退卡原因"
            rules={[
              { required: true, message: '请填写退卡原因' },
              { whitespace: true, message: '退卡原因不能为空' },
            ]}
          >
            <Input.TextArea rows={2} maxLength={200} placeholder="退款走线下，系统仅留痕" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
