import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  Space,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  adminGetServiceList,
  adminGetServiceCategories,
  adminCreateService,
  adminUpdateService,
  adminToggleServiceStatus,
} from '@/services/service';
import { useAuthStore } from '@/stores/authStore';
import { formatAmount } from '@/utils/format';
import { SEARCH_DEBOUNCE_MS } from '@/constants/business';
import type { Service, ServiceCategory } from '@/types/service';
import type { PageResult } from '@/types/common';

const { Title } = Typography;
const { TextArea } = Input;
const PAGE_SIZE = 10;

const DEFAULT_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '美甲', label: '美甲' },
  { value: '美睫', label: '美睫' },
  { value: '指甲护理', label: '指甲护理' },
  { value: '套餐', label: '套餐' },
];

export default function ServiceListPage() {
  const [page, setPage] = useState(1);
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [categoryList, setCategoryList] = useState<ServiceCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const categoryOptions = useMemo<Array<{ value: string; label: string }>>(() => {
    if (categoryList.length === 0) {
      return DEFAULT_CATEGORY_OPTIONS;
    }
    return categoryList.map((item: ServiceCategory) => ({
      value: item.name,
      label: item.name,
    }));
  }, [categoryList]);
  const categoryLabelMap = useMemo<Record<string, string>>(() => {
    if (categoryList.length === 0) {
      return DEFAULT_CATEGORY_OPTIONS.reduce<Record<string, string>>(
        (acc: Record<string, string>, item: { value: string; label: string }) => {
          acc[item.value] = item.label;
          return acc;
        },
        {},
      );
    }
    return categoryList.reduce<Record<string, string>>(
      (acc: Record<string, string>, item: ServiceCategory) => {
        acc[item.code] = item.name;
        acc[item.name] = item.name;
        item.aliases.forEach((alias: string) => {
          acc[alias] = item.name;
        });
        return acc;
      },
      {},
    );
  }, [categoryList]);
  const fetchCategoryList = useCallback(async (): Promise<void> => {
    try {
      const res = await adminGetServiceCategories();
      if (res.success) {
        setCategoryList(res.data ?? []);
      }
    } catch {
      message.warning('服务分类加载失败，已使用默认分类');
    }
  }, []);

  // Debounce keyword search
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [keyword]);

  // Fetch service list
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetServiceList({
        page,
        pageSize: PAGE_SIZE,
        category: category || undefined,
        keyword: debouncedKeyword || undefined,
      });
      if (res.success && res.data) {
        const data = res.data as PageResult<Service>;
        const safeList = Array.isArray(data.list) ? data.list : [];
        const safeTotal = typeof data.total === 'number' ? data.total : 0;
        setServiceList(safeList);
        setTotal(safeTotal);
      }
    } catch {
      message.error('获取服务列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, category, debouncedKeyword]);

  useEffect(() => {
    fetchCategoryList();
  }, [fetchCategoryList]);
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCategoryChange = useCallback((value: string | undefined) => {
    setCategory(value);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingService(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const handleOpenEdit = useCallback(
    (record: Service) => {
      setEditingService(record);
      form.setFieldsValue({
        name: record.name,
        category: record.category,
        price: record.price / 100,
        duration: record.duration,
        description: record.description ?? '',
      });
      setModalOpen(true);
    },
    [form],
  );

  const handleModalCancel = useCallback(() => {
    setModalOpen(false);
    setEditingService(null);
    form.resetFields();
  }, [form]);

  const handleModalOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        category: values.category,
        price: Math.round(values.price * 100),
        duration: values.duration,
        description: values.description || undefined,
      };

      let res;
      if (editingService) {
        res = await adminUpdateService(editingService._id, payload);
      } else {
        res = await adminCreateService(payload);
      }

      if (res.success) {
        message.success(editingService ? '服务更新成功' : '服务创建成功');
        setModalOpen(false);
        setEditingService(null);
        form.resetFields();
        fetchList();
      } else {
        message.error(res.error?.message ?? '操作失败，请重试');
      }
    } catch {
      // form validation failed — do nothing
    } finally {
      setSubmitting(false);
    }
  }, [form, editingService, fetchList]);

  const handleToggleStatus = useCallback(
    (record: Service) => {
      const nextActive = !record.active;
      const actionText = nextActive ? '上架' : '下架';
      Modal.confirm({
        title: `确认${actionText}`,
        content: `确定要${actionText}服务「${record.name}」吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          const res = await adminToggleServiceStatus(
            record._id,
            nextActive,
          );
          if (res.success) {
            message.success(`${actionText}成功`);
            fetchList();
          } else {
            message.error(res.error?.message ?? `${actionText}失败`);
          }
        },
      });
    },
    [fetchList],
  );

  const columns: ColumnsType<Service> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (val: string) => categoryLabelMap[val] ?? val,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (val: number) => `¥${formatAmount(val)}`,
    },
    {
      title: '时长（分钟）',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (active: boolean) =>
        active ? (
          <Tag color="green">上架</Tag>
        ) : (
          <Tag color="default">下架</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: Service) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleOpenEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger={record.active}
            onClick={() => handleToggleStatus(record)}
          >
            {record.active ? '下架' : '上架'}
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
          服务项目管理
        </Title>
        {isSuperAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            新增服务
          </Button>
        )}
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索服务名称"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          placeholder="服务分类"
          allowClear
          style={{ width: 140 }}
          value={category}
          onChange={handleCategoryChange}
          options={categoryOptions}
        />
      </Space>

      <Table<Service>
        columns={displayColumns}
        dataSource={serviceList}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Modal
        title={editingService ? '编辑服务' : '新增服务'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            name="name"
            label="服务名称"
            rules={[
              { required: true, message: '请输入服务名称' },
              { min: 2, message: '服务名称长度至少 2 个字符' },
              { max: 30, message: '服务名称长度最多 30 个字符' },
            ]}
          >
            <Input placeholder="请输入服务名称（2–30 字符）" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择服务分类' }]}
          >
            <Select placeholder="请选择分类" options={categoryOptions} />
          </Form.Item>
          <Form.Item
            name="price"
            label="价格（元）"
            rules={[
              { required: true, message: '请输入价格' },
              {
                validator: (_, value) => {
                  if (value === undefined || value === null) {
                    return Promise.resolve();
                  }
                  if (typeof value !== 'number' || value <= 0) {
                    return Promise.reject(new Error('价格必须大于 0'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              placeholder="请输入价格"
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              addonAfter="元"
            />
          </Form.Item>
          <Form.Item
            name="duration"
            label="时长（分钟）"
            rules={[
              { required: true, message: '请输入时长' },
              {
                validator: (_, value) => {
                  if (value === undefined || value === null) {
                    return Promise.resolve();
                  }
                  if (
                    typeof value !== 'number' ||
                    value <= 0 ||
                    !Number.isInteger(value)
                  ) {
                    return Promise.reject(
                      new Error('时长必须为大于 0 的整数'),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              placeholder="请输入时长"
              min={1}
              step={1}
              precision={0}
              style={{ width: '100%' }}
              addonAfter="分钟"
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea
              placeholder="请输入服务描述（可选）"
              rows={3}
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
