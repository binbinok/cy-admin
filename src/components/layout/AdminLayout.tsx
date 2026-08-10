import { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SolutionOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  BarChartOutlined,
  DollarOutlined,
  HeartOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '首页' },
  { key: '/admin', icon: <UserOutlined />, label: '管理员账号' },
  { key: '/members', icon: <TeamOutlined />, label: '会员管理' },
  { key: '/technicians', icon: <SolutionOutlined />, label: '技师管理' },
  { key: '/services', icon: <AppstoreOutlined />, label: '服务项目' },
  { key: '/appointments', icon: <CalendarOutlined />, label: '预约订单' },
  { key: '/finance', icon: <BarChartOutlined />, label: '财务统计' },
  { key: '/commission', icon: <DollarOutlined />, label: '提成核算' },
  { key: '/member-relations', icon: <HeartOutlined />, label: '会员关系' },
  { key: '/member-cards', icon: <CreditCardOutlined />, label: '会员卡管理' },
  {
    key: '/operation-logs',
    icon: <FileTextOutlined />,
    label: '操作日志',
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const adminInfo = useAuthStore((s) => s.adminInfo);
  const logout = useAuthStore((s) => s.logout);

  const selectedKey = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return '/';
    const matched = menuItems.find(
      (item) =>
        item &&
        'key' in item &&
        item.key !== '/' &&
        (path === item.key || path.startsWith(`${item.key}/`)),
    );
    return matched && 'key' in matched ? (matched.key as string) : '/';
  }, [location.pathname]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        theme="dark"
      >
        <div
          style={{
            height: 32,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            strong
            style={{ color: '#fff', fontSize: sidebarCollapsed ? 14 : 16 }}
          >
            {sidebarCollapsed ? '管理' : '店铺管理系统'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={
              sidebarCollapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          />
          <Space>
            <Text>{adminInfo?.username ?? '管理员'}</Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
