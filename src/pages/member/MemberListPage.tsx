import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Select, Space, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminGetMemberList } from '@/services/member';
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

  const { data, isLoading } = useQuery({
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
      navigate(`/member/${record.memberId}`);
    },
    [navigate],
  );

  const columns: ColumnsType<Member> = [
    {
      title: '昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 150,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone: string) => maskPhone(phone),
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
      <Title level={4} style={{ marginBottom: 16 }}>
        会员管理
      </Title>

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
    </div>
  );
}
