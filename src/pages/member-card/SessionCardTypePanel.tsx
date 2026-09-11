import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  adminCreateSessionCardType,
  adminGetSessionCardTypes,
  adminToggleSessionCardType,
  adminUpdateSessionCardType,
} from '@/services/sessionCard';
import { adminGetServiceTemplates } from '@/services/service';
import { useAuthStore } from '@/stores/authStore';
import { formatAmount } from '@/utils/format';
import type { ServiceTemplate } from '@/types/service';
import type { SessionCardType } from '@/types/sessionCard';

const { Text } = Typography;

interface CardTypeFormValues {
  name: string;
  price: number;
  totalSessions: number;
  categoryId: string;
  baseItemScope: 'all' | 'selected';
  baseItemIds?: string[];
  coveredAddonIds?: string[];
  validityType: 'permanent' | 'days' | 'fixed_date';
  validityDays?: number;
  fixedExpireDate?: Dayjs;
  refundPolicy: 'none' | 'prorated';
}

const formatValidity = (record: SessionCardType): string => {
  if (record.validityType === 'days') {
    return `开卡后 ${record.validityDays} 天`;
  }
  if (record.validityType === 'fixed_date') {
    return `截止 ${record.fixedExpireDate}`;
  }
  return '永久有效';
};

const formatScope = (record: SessionCardType): string => {
  const base = record.baseItemScope === 'all' ? '全部基础项目' : `指定 ${record.baseItemIds.length} 个基础项目`;
  const addon = record.coveredAddonIds.length > 0 ? `，含 ${record.coveredAddonIds.length} 个附加项` : '';
  return base + addon;
};

export default function SessionCardTypePanel() {
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [list, setList] = useState<SessionCardType[]>([]);
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<SessionCardType | null>(null);
  const [form] = Form.useForm<CardTypeFormValues>();
  const watchCategoryId = Form.useWatch('categoryId', form);
  const watchBaseItemScope = Form.useWatch('baseItemScope', form);
  const watchValidityType = Form.useWatch('validityType', form);

  const currentTemplate = templates.find((t) => t.categoryId === watchCategoryId);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [typesRes, templatesRes] = await Promise.all([
        adminGetSessionCardTypes(),
        adminGetServiceTemplates(),
      ]);
      if (!typesRes.success) {
        throw new Error(typesRes.error?.message ?? '次卡卡种列表加载失败');
      }
      setList(typesRes.data ?? []);
      setTemplates(templatesRes.data ?? []);
      queryClient.invalidateQueries({ queryKey: ['sessionCardTypes'] });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '次卡卡种列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = useCallback((): void => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ baseItemScope: 'all', validityType: 'permanent', refundPolicy: 'none' });
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback(
    (record: SessionCardType): void => {
      setEditing(record);
      form.setFieldsValue({
        name: record.name,
        price: record.price / 100,
        totalSessions: record.totalSessions,
        categoryId: record.categoryId,
        baseItemScope: record.baseItemScope,
        baseItemIds: record.baseItemIds,
        coveredAddonIds: record.coveredAddonIds,
        validityType: record.validityType,
        validityDays: record.validityDays || undefined,
        fixedExpireDate: record.fixedExpireDate ? dayjs(record.fixedExpireDate) : undefined,
        refundPolicy: record.refundPolicy,
      });
      setModalOpen(true);
    },
    [form],
  );

  const closeModal = useCallback((): void => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  }, [form]);

  const saveCardType = useCallback(async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        name: values.name,
        price: Math.round(values.price * 100),
        totalSessions: values.totalSessions,
        categoryId: values.categoryId,
        baseItemScope: values.baseItemScope,
        baseItemIds: values.baseItemScope === 'selected' ? values.baseItemIds ?? [] : [],
        coveredAddonIds: values.coveredAddonIds ?? [],
        validityType: values.validityType,
        validityDays: values.validityType === 'days' ? values.validityDays : undefined,
        fixedExpireDate:
          values.validityType === 'fixed_date' && values.fixedExpireDate
            ? values.fixedExpireDate.format('YYYY-MM-DD')
            : undefined,
        refundPolicy: values.refundPolicy,
      };
      const res = editing
        ? await adminUpdateSessionCardType({ cardTypeId: editing._id, ...payload })
        : await adminCreateSessionCardType(payload);
      if (!res.success) {
        throw new Error(res.error?.message ?? '保存失败');
      }
      message.success(editing ? '次卡卡种已更新（已售卡不受影响）' : '次卡卡种创建成功');
      closeModal();
      fetchData();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editing, fetchData, form]);

  const toggleActive = useCallback(
    async (record: SessionCardType): Promise<void> => {
      try {
        const res = await adminToggleSessionCardType({ cardTypeId: record._id, active: !record.active });
        if (!res.success) {
          throw new Error(res.error?.message ?? '操作失败');
        }
        message.success(record.active ? '卡种已停用，已售卡可继续核销' : '卡种已启用');
        fetchData();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '操作失败');
      }
    },
    [fetchData],
  );

  const columns: ColumnsType<SessionCardType> = [
    { title: '卡种名称', dataIndex: 'name', key: 'name', width: 160 },
    {
      title: '售价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (value: number) => `¥${formatAmount(value)}`,
    },
    { title: '总次数', dataIndex: 'totalSessions', key: 'totalSessions', width: 80 },
    {
      title: '单次折算价',
      key: 'sessionValue',
      width: 100,
      render: (_: unknown, record: SessionCardType) =>
        `¥${formatAmount(Math.floor(record.price / record.totalSessions))}`,
    },
    { title: '适用大类', dataIndex: 'categoryName', key: 'categoryName', width: 100 },
    { title: '覆盖范围', key: 'scope', width: 200, render: (_: unknown, record: SessionCardType) => formatScope(record) },
    { title: '有效期', key: 'validity', width: 130, render: (_: unknown, record: SessionCardType) => formatValidity(record) },
    {
      title: '退卡规则',
      dataIndex: 'refundPolicy',
      key: 'refundPolicy',
      width: 110,
      render: (value: string) => (value === 'prorated' ? '按剩余次数折算' : '不可退'),
    },
    { title: '已售', dataIndex: 'soldCount', key: 'soldCount', width: 70, render: (v: number | undefined) => v ?? 0 },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (value: boolean) => (value ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: SessionCardType) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title={record.active ? '确认停用该卡种？' : '确认启用该卡种？'}
            description={record.active ? '停用后不可新开卡，已售卡可继续核销' : undefined}
            onConfirm={() => toggleActive(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger={record.active}>
              {record.active ? '停用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const displayColumns = isSuperAdmin
    ? columns
    : columns.filter((column) => column.key !== 'action');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text type="secondary">次卡卡种定义核销方式与规则，开卡时快照到会员次卡</Text>
        {isSuperAdmin && (
          <Button type="primary" onClick={openCreateModal}>
            新增次卡卡种
          </Button>
        )}
      </div>
      <Card>
        <Table<SessionCardType>
          rowKey="_id"
          columns={displayColumns}
          loading={loading}
          dataSource={list}
          pagination={false}
        />
      </Card>
      <Modal
        title={editing ? '编辑次卡卡种' : '新增次卡卡种'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={saveCardType}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={560}
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="卡种名称"
            name="name"
            rules={[
              { required: true, message: '请输入卡种名称' },
              { max: 30, message: '卡种名称最多 30 个字符' },
            ]}
          >
            <Input placeholder="例如：小气泡清洁 10 次卡" />
          </Form.Item>
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              label="售价（元）"
              name="price"
              rules={[{ required: true, message: '请输入售价' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0.01} precision={2} style={{ width: '100%' }} addonAfter="元" />
            </Form.Item>
            <Form.Item
              label="总次数"
              name="totalSessions"
              rules={[{ required: true, message: '请输入总次数' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} addonAfter="次" />
            </Form.Item>
          </Space>
          <Form.Item
            label="适用服务大类"
            name="categoryId"
            rules={[{ required: true, message: '请选择适用服务大类' }]}
          >
            <Select
              placeholder="请选择服务大类"
              options={templates.map((t) => ({ value: t.categoryId, label: t.categoryName }))}
            />
          </Form.Item>
          <Form.Item label="基础项目覆盖范围" name="baseItemScope" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'all', label: '该大类全部基础项目' },
                { value: 'selected', label: '指定基础项目' },
              ]}
            />
          </Form.Item>
          {watchBaseItemScope === 'selected' && (
            <Form.Item
              label="指定基础项目"
              name="baseItemIds"
              rules={[{ required: true, message: '请选择至少 1 个基础项目' }]}
            >
              <Select
                mode="multiple"
                placeholder={currentTemplate ? '请选择基础项目' : '请先选择服务大类'}
                options={(currentTemplate?.baseItems ?? [])
                  .filter((item) => item.enabled !== false)
                  .map((item) => ({ value: item.itemId, label: item.name }))}
              />
            </Form.Item>
          )}
          <Form.Item
            label="纳入抵扣的附加项（默认附加项另收费）"
            name="coveredAddonIds"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={currentTemplate ? '不选择则附加项全部另收费' : '请先选择服务大类'}
              options={(currentTemplate?.addonItems ?? [])
                .filter((item) => item.enabled !== false)
                .map((item) => ({ value: item.itemId, label: item.name }))}
            />
          </Form.Item>
          <Form.Item label="有效期规则" name="validityType" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'permanent', label: '永久有效' },
                { value: 'days', label: '开卡后 N 天' },
                { value: 'fixed_date', label: '固定截止日期' },
              ]}
            />
          </Form.Item>
          {watchValidityType === 'days' && (
            <Form.Item
              label="有效天数"
              name="validityDays"
              rules={[{ required: true, message: '请输入有效天数' }]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          )}
          {watchValidityType === 'fixed_date' && (
            <Form.Item
              label="截止日期"
              name="fixedExpireDate"
              rules={[{ required: true, message: '请选择截止日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item label="退卡规则" name="refundPolicy" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'none', label: '不可退' },
                { value: 'prorated', label: '按剩余次数折算退款' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
