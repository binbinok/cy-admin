import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tabs, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminGetBirthdayMembers, adminGetDormantMembers } from '@/services/member';
import type { Member } from '@/types/member';
import { formatDate, maskPhone } from '@/utils/format';

const { Title } = Typography;

type BirthdayTabKey = 'today' | 'next3' | 'next7';

interface BirthdayTabConfig {
  key: BirthdayTabKey;
  label: string;
  days: number;
}

const birthdayTabs: BirthdayTabConfig[] = [
  { key: 'today', label: '今天生日', days: 0 },
  { key: 'next3', label: '未来3天', days: 3 },
  { key: 'next7', label: '未来7天', days: 7 },
];

export default function MemberRelationPage() {
  const [activeKey, setActiveKey] = useState<BirthdayTabKey>('today');
  const [birthdayLoading, setBirthdayLoading] = useState<boolean>(false);
  const [dormantLoading, setDormantLoading] = useState<boolean>(false);
  const [birthdayList, setBirthdayList] = useState<Member[]>([]);
  const [dormantList, setDormantList] = useState<Member[]>([]);

  const fetchBirthdayMembers = useCallback(async (days: number): Promise<void> => {
    setBirthdayLoading(true);
    try {
      const res = await adminGetBirthdayMembers({ days, page: 1, pageSize: 50 });
      if (!res.success) {
        throw new Error(res.error?.message ?? '生日会员加载失败');
      }
      setBirthdayList(res.data?.list ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生日会员加载失败');
    } finally {
      setBirthdayLoading(false);
    }
  }, []);

  const fetchDormantMembers = useCallback(async (): Promise<void> => {
    setDormantLoading(true);
    try {
      const res = await adminGetDormantMembers({ page: 1, pageSize: 50 });
      if (!res.success) {
        throw new Error(res.error?.message ?? '沉睡会员加载失败');
      }
      setDormantList(res.data?.list ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '沉睡会员加载失败');
    } finally {
      setDormantLoading(false);
    }
  }, []);

  useEffect(() => {
    const days = birthdayTabs.find((item: BirthdayTabConfig) => item.key === activeKey)?.days ?? 0;
    fetchBirthdayMembers(days);
  }, [activeKey, fetchBirthdayMembers]);

  useEffect(() => {
    fetchDormantMembers();
  }, [fetchDormantMembers]);

  const memberColumns: ColumnsType<Member> = [
    {
      title: '昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 140,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone: string) => maskPhone(phone),
    },
    {
      title: '会员等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
    },
    {
      title: '生日',
      dataIndex: 'birthday',
      key: 'birthday',
      width: 120,
      render: (birthday: string | undefined) => birthday || '-',
    },
    {
      title: '最近消费',
      dataIndex: 'lastConsumptionAt',
      key: 'lastConsumptionAt',
      width: 130,
      render: (value: Date | undefined) => (value ? formatDate(value) : '-'),
    },
  ];

  return (
    <div>
      <Title level={4}>会员关系维护</Title>
      <Card title="生日会员" style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={activeKey}
          onChange={(key: string) => setActiveKey(key as BirthdayTabKey)}
          items={birthdayTabs.map((item: BirthdayTabConfig) => ({
            key: item.key,
            label: item.label,
          }))}
        />
        <Table<Member>
          rowKey="_id"
          loading={birthdayLoading}
          columns={memberColumns}
          dataSource={birthdayList}
          pagination={false}
        />
      </Card>
      <Card title="沉睡会员（超过60天未消费）">
        <Table<Member>
          rowKey="_id"
          loading={dormantLoading}
          columns={memberColumns}
          dataSource={dormantList}
          pagination={false}
        />
      </Card>
    </div>
  );
}
