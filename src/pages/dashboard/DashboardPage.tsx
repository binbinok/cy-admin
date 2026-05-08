import { useQuery } from '@tanstack/react-query';
import { Card, Table, List, Typography, Empty, Spin, Row, Col, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import http from '@/services/http';
import { adminSendBirthdayNotification } from '@/services/member';
import type { Appointment } from '@/types/appointment';
import type { Member } from '@/types/member';
import type { ApiResponse, PageResult } from '@/types/common';

const { Title, Text } = Typography;

interface BirthdayMembersResponse {
  list: Member[];
}

function useTodayAppointments() {
  const today = dayjs().format('YYYY-MM-DD');
  return useQuery({
    queryKey: ['dashboard', 'todayAppointments', today],
    queryFn: async () => {
      const res = await http.post<ApiResponse<PageResult<Appointment>>>(
        '/invoke/adminGetAppointmentList',
        {
          dateFrom: today,
          dateTo: today,
          status: 'pending',
          page: 1,
          pageSize: 20,
        },
      );
      return res.data.data;
    },
  });
}

function useBirthdayMembers() {
  return useQuery({
    queryKey: ['dashboard', 'birthdayMembers'],
    queryFn: async () => {
      const res = await http.post<ApiResponse<BirthdayMembersResponse>>(
        '/invoke/adminGetBirthdayMembers',
        { days: 0 },
      );
      return res.data.data;
    },
  });
}

const appointmentColumns: ColumnsType<Appointment> = [
  {
    title: '预约编号',
    dataIndex: 'appointmentId',
    key: 'appointmentId',
    width: 140,
  },
  {
    title: '预约时间',
    dataIndex: 'appointmentTime',
    key: 'appointmentTime',
    width: 100,
  },
  {
    title: '服务项目',
    dataIndex: 'serviceId',
    key: 'serviceId',
    width: 120,
  },
  {
    title: '技师',
    dataIndex: 'technicianId',
    key: 'technicianId',
    width: 100,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    ellipsis: true,
    render: (text: string | undefined) => text || '-',
  },
];

export default function DashboardPage() {
  const {
    data: appointmentData,
    isLoading: appointmentsLoading,
  } = useTodayAppointments();

  const {
    data: birthdayData,
    isLoading: birthdayLoading,
  } = useBirthdayMembers();

  const appointments = appointmentData?.list ?? [];
  const birthdayMembers = birthdayData?.list ?? [];

  const handleSendBirthdayNotification = async (memberId: string): Promise<void> => {
    try {
      const res = await adminSendBirthdayNotification(memberId);
      if (!res.success) {
        message.warning(res.error?.message ?? '发送失败');
        return;
      }
      message.success('生日祝福发送成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发送失败');
    }
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        工作台
      </Title>
      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card
            title="今日待服务预约"
            extra={
              <Text type="secondary">
                共 {appointments.length} 条
              </Text>
            }
          >
            <Spin spinning={appointmentsLoading}>
              {!appointmentsLoading && appointments.length === 0 ? (
                <Empty description="今日暂无待服务预约" />
              ) : (
                <Table<Appointment>
                  columns={appointmentColumns}
                  dataSource={appointments}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 560 }}
                />
              )}
            </Spin>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title="今日生日会员"
            extra={
              <Text type="secondary">
                共 {birthdayMembers.length} 位
              </Text>
            }
          >
            <Spin spinning={birthdayLoading}>
              {!birthdayLoading && birthdayMembers.length === 0 ? (
                <Empty description="今日暂无生日会员" />
              ) : (
                <List<Member>
                  dataSource={birthdayMembers}
                  renderItem={(member) => (
                    <List.Item>
                      <List.Item.Meta
                        title={member.nickName}
                        description={
                          <>
                            <Text type="secondary">
                              手机号：***
                              {member.phone.slice(-4)}
                            </Text>
                            <br />
                            <Text type="secondary">
                              等级：{member.level}
                            </Text>
                          </>
                        }
                      />
                      <Button
                        size="small"
                        type="link"
                        onClick={() => handleSendBirthdayNotification(member._id)}
                      >
                        发送祝福
                      </Button>
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
