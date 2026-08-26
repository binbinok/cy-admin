import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Typography,
  Space,
  message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetServiceTemplates,
  adminGetServiceCategories,
  adminCreateServiceTemplate,
  adminUpdateServiceTemplate,
  adminToggleServiceTemplateStatus,
} from '@/services/service';
import type { TemplateItemPayload } from '@/services/service';
import { useAuthStore } from '@/stores/authStore';
import { formatAmount } from '@/utils/format';
import type { ServiceTemplate, ServiceCategory, TemplateItem } from '@/types/service';

const { Title } = Typography;

interface TemplateItemFormValue {
  itemId?: string;
  name: string;
  price: number;
  discountable: boolean;
  commissionable: boolean;
}

interface TemplateFormValues {
  categoryId: string;
  defaultDuration: number;
  baseItems: TemplateItemFormValue[];
  addonItems: TemplateItemFormValue[];
}

const toFormItem = (item: TemplateItem): TemplateItemFormValue => ({
  itemId: item.itemId,
  name: item.name,
  price: item.defaultPrice / 100,
  discountable: item.discountable !== false,
  commissionable: item.commissionable !== false,
});

const toPayloadItem = (
  item: TemplateItemFormValue,
  defaultDuration: number,
): TemplateItemPayload => ({
  itemId: item.itemId,
  name: item.name,
  inputType: 'single_select',
  options: [item.name],
  defaultPrice: Math.round(item.price * 100),
  defaultDuration,
  discountable: item.discountable !== false,
  commissionable: item.commissionable !== false,
  enabled: true,
});

const NEW_ITEM: TemplateItemFormValue = {
  name: '',
  price: 0,
  discountable: true,
  commissionable: true,
};

const NEW_ADDON: TemplateItemFormValue = {
  name: '',
  price: 0,
  discountable: true,
  commissionable: false,
};

export default function ServiceListPage() {
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [categoryList, setCategoryList] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<TemplateFormValues>();

  const fetchTemplates = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await adminGetServiceTemplates();
      if (res.success) {
        setTemplates(res.data ?? []);
      }
    } catch {
      message.error('获取服务模板列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async (): Promise<void> => {
    try {
      const res = await adminGetServiceCategories();
      if (res.success) {
        setCategoryList(res.data ?? []);
      }
    } catch {
      message.warning('服务分类加载失败');
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [fetchTemplates, fetchCategories]);

  const creatableCategoryOptions = useMemo(() => {
    const usedCategoryIds = new Set(templates.map((t) => t.categoryId));
    return categoryList
      .filter((c) => !usedCategoryIds.has(c._id))
      .map((c) => ({ value: c._id, label: c.name }));
  }, [templates, categoryList]);

  const handleOpenCreate = useCallback(() => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ defaultDuration: 60, baseItems: [], addonItems: [] });
    setModalOpen(true);
  }, [form]);

  const handleOpenEdit = useCallback(
    (record: ServiceTemplate) => {
      setEditingTemplate(record);
      form.setFieldsValue({
        categoryId: record.categoryId,
        defaultDuration: record.defaultDuration,
        baseItems: (record.baseItems ?? []).map(toFormItem),
        addonItems: (record.addonItems ?? []).map(toFormItem),
      });
      setModalOpen(true);
    },
    [form],
  );

  const handleModalCancel = useCallback(() => {
    setModalOpen(false);
    setEditingTemplate(null);
    form.resetFields();
  }, [form]);

  const handleModalOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!editingTemplate && (!values.baseItems || values.baseItems.length === 0)) {
        message.error('至少配置 1 个基础项目');
        return;
      }
      setSubmitting(true);
      const baseItems = (values.baseItems ?? []).map((item) =>
        toPayloadItem(item, values.defaultDuration),
      );
      const addonItems = (values.addonItems ?? []).map((item) => toPayloadItem(item, 0));

      const res = editingTemplate
        ? await adminUpdateServiceTemplate(editingTemplate._id, {
            defaultDuration: values.defaultDuration,
            baseItems,
            addonItems,
          })
        : await adminCreateServiceTemplate({
            categoryId: values.categoryId,
            defaultDuration: values.defaultDuration,
            baseItems,
            addonItems,
          });

      if (res.success) {
        message.success(editingTemplate ? '模板更新成功' : '模板创建成功');
        setModalOpen(false);
        setEditingTemplate(null);
        form.resetFields();
        fetchTemplates();
      } else {
        message.error(res.error?.message ?? '操作失败，请重试');
      }
    } catch {
      // 表单校验失败或服务端错误提示已由拦截器处理
    } finally {
      setSubmitting(false);
    }
  }, [form, editingTemplate, fetchTemplates]);

  const handleToggleStatus = useCallback(
    (record: ServiceTemplate) => {
      const nextActive = !record.active;
      const actionText = nextActive ? '启用' : '停用';
      Modal.confirm({
        title: `确认${actionText}`,
        content: `确定要${actionText}「${record.categoryName}」的服务模板吗？停用后新预约不可选择该大类，已有预约保持有效。`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          const res = await adminToggleServiceTemplateStatus(record._id, nextActive);
          if (res.success) {
            message.success(`${actionText}成功`);
            fetchTemplates();
          } else {
            message.error(res.error?.message ?? `${actionText}失败`);
          }
        },
      });
    },
    [fetchTemplates],
  );

  const renderItemTags = (items: TemplateItem[] | undefined): ReactNode => {
    if (!items || items.length === 0) {
      return '-';
    }
    return (
      <Space size={4} wrap>
        {items.map((item) => (
          <Tag key={item.itemId}>{`${item.name} ¥${formatAmount(item.defaultPrice)}`}</Tag>
        ))}
      </Space>
    );
  };

  const columns: ColumnsType<ServiceTemplate> = [
    {
      title: '服务大类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 100,
    },
    {
      title: '默认预约时长',
      dataIndex: 'defaultDuration',
      key: 'defaultDuration',
      width: 110,
      render: (val: number) => `${val} 分钟`,
    },
    {
      title: '基础项目（款式）',
      key: 'baseItems',
      render: (_: unknown, record: ServiceTemplate) => renderItemTags(record.baseItems),
    },
    {
      title: '附加项目',
      key: 'addonItems',
      render: (_: unknown, record: ServiceTemplate) => renderItemTags(record.addonItems),
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (active: boolean) =>
        active ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: ServiceTemplate) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger={record.active}
            onClick={() => handleToggleStatus(record)}
          >
            {record.active ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  const displayColumns = isSuperAdmin
    ? columns
    : columns.filter((column) => column.key !== 'action');

  const renderItemListEditor = (
    fields: Array<{ key: number; name: number }>,
    add: (defaultValue?: TemplateItemFormValue) => void,
    remove: (name: number) => void,
    defaultItem: TemplateItemFormValue,
  ): ReactNode => (
    <>
      {fields.map((field) => (
        <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Form.Item
            name={[field.name, 'name']}
            rules={[{ required: true, message: '名称必填' }]}
            style={{ flex: 2, marginBottom: 0 }}
          >
            <Input placeholder="项目名称" maxLength={30} />
          </Form.Item>
          <Form.Item
            name={[field.name, 'price']}
            rules={[{ required: true, message: '价格必填' }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} addonAfter="元" />
          </Form.Item>
          <Form.Item
            name={[field.name, 'discountable']}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Checkbox>折扣</Checkbox>
          </Form.Item>
          <Form.Item
            name={[field.name, 'commissionable']}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Checkbox>提成</Checkbox>
          </Form.Item>
          <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
        </div>
      ))}
      <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ ...defaultItem })}>
        添加项目
      </Button>
    </>
  );

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
          服务模板管理
        </Title>
        {isSuperAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            disabled={creatableCategoryOptions.length === 0}
          >
            新增模板
          </Button>
        )}
      </div>

      <Table<ServiceTemplate>
        columns={displayColumns}
        dataSource={templates}
        rowKey="_id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingTemplate ? `编辑模板（${editingTemplate.categoryName}）` : '新增服务模板'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting }}
        destroyOnHidden
        width={760}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            name="categoryId"
            label="服务大类"
            rules={[{ required: true, message: '请选择服务大类' }]}
          >
            <Select
              placeholder="请选择服务大类"
              options={creatableCategoryOptions}
              disabled={!!editingTemplate}
            />
          </Form.Item>
          <Form.Item
            name="defaultDuration"
            label="默认预约时长（分钟）"
            rules={[
              { required: true, message: '请输入默认预约时长' },
              {
                validator: (_, value) => {
                  if (value === undefined || value === null) {
                    return Promise.resolve();
                  }
                  if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
                    return Promise.reject(new Error('时长必须为大于 0 的整数'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} step={5} precision={0} style={{ width: '100%' }} addonAfter="分钟" />
          </Form.Item>
          <Form.Item label="基础项目（款式，结算时必选 1 个）" required>
            <Form.List name="baseItems">
              {(fields, { add, remove }) =>
                renderItemListEditor(fields, add, remove, NEW_ITEM)
              }
            </Form.List>
          </Form.Item>
          <Form.Item label="附加项目（结算时可选多个）">
            <Form.List name="addonItems">
              {(fields, { add, remove }) =>
                renderItemListEditor(fields, add, remove, NEW_ADDON)
              }
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
