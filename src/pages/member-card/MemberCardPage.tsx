import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  adminCreateDiscountLevel,
  adminDeleteDiscountLevel,
  adminGetDiscountLevels,
  adminUpdateDiscountLevel,
  type DiscountLevel,
} from '@/services/memberCard';
import { formatAmount } from '@/utils/format';

const { Title } = Typography;

interface DiscountLevelForm {
  name: string;
  discountRate: number;
  minRechargeAmount: number;
}

export default function MemberCardPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [list, setList] = useState<DiscountLevel[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<DiscountLevel | null>(null);
  const [form] = Form.useForm<DiscountLevelForm>();

  const fetchLevels = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await adminGetDiscountLevels();
      if (!res.success) {
        throw new Error(res.error?.message ?? '折扣等级列表加载失败');
      }
      setList(res.data ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '折扣等级列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const openCreateModal = useCallback((): void => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback((record: DiscountLevel): void => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      discountRate: record.discountRate,
      minRechargeAmount: record.minRechargeAmount / 100,
    });
    setModalOpen(true);
  }, [form]);

  const closeModal = useCallback((): void => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  }, [form]);

  const saveDiscountLevel = useCallback(async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        name: values.name,
        discountRate: values.discountRate,
        minRechargeAmount: Math.round(values.minRechargeAmount * 100),
      };
      const res = editing
        ? await adminUpdateDiscountLevel({ discountLevelId: editing._id, ...payload })
        : await adminCreateDiscountLevel(payload);
      if (!res.success) {
        throw new Error(res.error?.message ?? '保存失败');
      }
      message.success(editing ? '折扣等级更新成功' : '折扣等级创建成功');
      closeModal();
      fetchLevels();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editing, fetchLevels, form]);

  const deleteDiscountLevel = useCallback(async (record: DiscountLevel): Promise<void> => {
    try {
      const res = await adminDeleteDiscountLevel({ discountLevelId: record._id });
      if (!res.success) {
        throw new Error(res.error?.message ?? '删除失败');
      }
      message.success('删除成功');
      fetchLevels();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  }, [fetchLevels]);

  const columns: ColumnsType<DiscountLevel> = [
    {
      title: '等级名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
    },
    {
      title: '折扣比例',
      dataIndex: 'discountRate',
      key: 'discountRate',
      width: 120,
      render: (value: number) => `${value}%`,
    },
    {
      title: '最低充值门槛',
      dataIndex: 'minRechargeAmount',
      key: 'minRechargeAmount',
      width: 160,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    {
      title: '关联会员数',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 120,
      render: (value: number | undefined) => value ?? 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: DiscountLevel) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该折扣等级？"
            description="若有关联会员卡将删除失败"
            onConfirm={() => deleteDiscountLevel(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          会员卡与折扣等级管理
        </Title>
        <Button type="primary" onClick={openCreateModal}>
          新增折扣等级
        </Button>
      </div>
      <Card>
        <Table<DiscountLevel> rowKey="_id" columns={columns} loading={loading} dataSource={list} pagination={false} />
      </Card>
      <Modal
        title={editing ? '编辑折扣等级' : '新增折扣等级'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={saveDiscountLevel}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="等级名称"
            name="name"
            rules={[
              { required: true, message: '请输入等级名称' },
              { min: 2, message: '等级名称至少 2 个字符' },
              { max: 20, message: '等级名称最多 20 个字符' },
            ]}
          >
            <Input placeholder="例如：金卡会员" />
          </Form.Item>
          <Form.Item
            label="折扣比例（1-99）"
            name="discountRate"
            rules={[
              { required: true, message: '请输入折扣比例' },
              {
                validator: (_: unknown, value: number) => {
                  if (!Number.isInteger(value)) {
                    return Promise.reject(new Error('折扣比例必须为整数'));
                  }
                  if (value < 1 || value > 99) {
                    return Promise.reject(new Error('折扣比例需在 1 到 99 之间'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} max={99} precision={0} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item
            label="最低充值门槛（元）"
            name="minRechargeAmount"
            rules={[
              { required: true, message: '请输入最低充值门槛' },
              {
                validator: (_: unknown, value: number) => {
                  if (typeof value !== 'number' || value < 0) {
                    return Promise.reject(new Error('最低充值门槛不能小于 0'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} addonAfter="元" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
