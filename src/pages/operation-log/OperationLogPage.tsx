import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Card, DatePicker, Input, Select, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { adminGetOperationLogs } from '@/services/operationLog';
import type { OperationLog } from '@/types/common';
import { formatDate } from '@/utils/format';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function OperationLogPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [list, setList] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [adminId, setAdminId] = useState<string>('');
  const [action, setAction] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);

  const fetchLogs = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await adminGetOperationLogs({
        page,
        pageSize,
        adminId: adminId || undefined,
        action,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '操作日志加载失败');
      }
      setList(res.data?.list ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作日志加载失败');
    } finally {
      setLoading(false);
    }
  }, [action, adminId, dateRange, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnsType<OperationLog> = [
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value: Date | string) => formatDate(value),
    },
    {
      title: '操作人',
      dataIndex: 'adminName',
      key: 'adminName',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 160,
    },
    {
      title: '操作对象',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 120,
    },
    {
      title: '对象ID',
      dataIndex: 'targetId',
      key: 'targetId',
      width: 140,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
  ];

  return (
    <div>
      <Title level={4}>操作日志</Title>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 180 }}
            placeholder="操作人ID"
            value={adminId}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setAdminId(event.target.value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="操作类型"
            value={action}
            onChange={(value: string | undefined) => {
              setAction(value);
              setPage(1);
            }}
            options={[
              { label: '登录', value: 'login' },
              { label: '登出', value: 'logout' },
              { label: '修改会员', value: 'update_member' },
              { label: '完成服务', value: 'complete_service' },
              { label: '修改提成', value: 'update_commission_rate' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(values: [Dayjs | null, Dayjs | null] | null) => {
              if (!values || !values[0] || !values[1]) {
                return;
              }
              setDateRange([values[0], values[1]]);
              setPage(1);
            }}
          />
        </Space>
        <Table<OperationLog>
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage: number, nextPageSize: number) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
            showTotal: (count: number) => `共 ${count} 条`,
          }}
        />
      </Card>
    </div>
  );
}
