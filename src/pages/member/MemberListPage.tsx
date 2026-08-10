import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Select, Space, Typography, Button, Modal, Form, DatePicker, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminGetMemberList, adminCreateMember } from '@/services/member';
import { maskPhone, formatAmount, formatDate } from '@/utils/format';
import { MEMBER_LEVELS, SEARCH_DEBOUNCE_MS } from '@/constants/business';
import type { Member } from '@/types/member';

const { Title } = Typography;
const PAGE_SIZE = 10;

export default function MemberListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [level, setLevel] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 新增会员弹窗状态
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm] = Form.useForm();

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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['memberList', page, debouncedKeyword, level],
    queryFn: async () => {
      const res = await adminGetMemberList({
        page,
        pageSize: PAGE_SIZE,
        keyword: debouncedKeyword || undefined,
        level: level || undefined,
      });
      return res.data;
    },
  });

  const memberList = data?.list ?? [];
  const total = data?.total ?? 0;

  const handleLevelChange = useCallback((value: string | undefined) => {
    setLevel(value);
    setPage(1);
  }, []);

  const handleRowClick = useCallback(
    (record: Member) => {
      navigate(`/members/${record.memberId}`);
    },
    [navigate],
  );

  // 打开新增会员弹窗
  const handleOpenCreateModal = useCallback(() => {
    createForm.resetFields();
    setCreateModalOpen(true);
  }, [createForm]);

  // 关闭新增会员弹窗
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    createForm.resetFields();
  }, [createForm]);

  // 提交新增会员
  const handleSubmitCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      const nickName = values.nickName?.trim() ?? '';
      const phone = values.phone?.trim() ?? '';
      const wechatId = values.wechatId?.trim() ?? '';

      if (!nickName && !phone && !wechatId) {
        message.error('昵称、手机号、微信号至少填写一项');
        return;
      }

      setCreateSubmitting(true);

      const payload: {
        nickName?: string;
        phone?: string;
        birthday?: string;
        wechatId?: string;
      } = {};

      if (nickName) {
        payload.nickName = nickName;
      }
      if (phone) {
        payload.phone = phone;
      }
      if (wechatId) {
        payload.wechatId = wechatId;
      }
      if (values.birthday) {
        payload.birthday = values.birthday.format('YYYY-MM-DD');
      }

      const res = await adminCreateMember(payload);
      if (!res.success) {
        throw new Error(res.error?.message ?? '会员创建失败');
      }

      message.success('会员创建成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      refetch();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setCreateSubmitting(false);
    }
  }, [createForm, refetch]);

  const columns: ColumnsType<Member> = [
    {
      title: '昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 150,
      render: (nickName: string) => nickName || '未命名会员',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone: string) => (phone ? maskPhone(phone) : '-'),
    },
    {
      title: '微信号',
      dataIndex: 'wechatId',
      key: 'wechatId',
      width: 150,
      render: (wechatId: string | undefined) => wechatId || '-',
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (val: string) => {
        const found = MEMBER_LEVELS.find((l) => l.key === val);
        return found?.label ?? val;
      },
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
    },
    {
      title: '累计消费',
      dataIndex: 'totalConsumption',
      key: 'totalConsumption',
      width: 130,
      render: (val: number) => `¥${formatAmount(val)}`,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (val: Date | string) => formatDate(val),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          会员管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          新增会员
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索昵称/手机号/会员编号"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 280 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          placeholder="会员等级"
          allowClear
          style={{ width: 140 }}
          value={level}
          onChange={handleLevelChange}
          options={MEMBER_LEVELS.map((l) => ({
            value: l.key,
            label: l.label,
          }))}
        />
      </Space>

      <Table<Member>
        columns={columns}
        dataSource={memberList}
        rowKey="memberId"
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

      <Modal
        title="新增会员"
        open={createModalOpen}
        onOk={handleSubmitCreate}
        onCancel={handleCloseCreateModal}
        confirmLoading={createSubmitting}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="nickName"
            label="昵称"
            rules={[
              { min: 2, message: '昵称至少2个字符' },
              { max: 20, message: '昵称最多20个字符' },
            ]}
          >
            <Input placeholder="请输入会员昵称" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item
            name="wechatId"
            label="微信号"
            rules={[
              { max: 50, message: '微信号最多50个字符' },
            ]}
          >
            <Input placeholder="请输入微信号" maxLength={50} />
          </Form.Item>
          <Form.Item name="birthday" label="生日">
            <DatePicker style={{ width: '100%' }} placeholder="请选择生日" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
