import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { adminLogin } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { validateAdminCredentials } from '@/utils/validation';
import { isBusinessError } from '@/services/http';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleFinish = async (values: LoginFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    const validation = validateAdminCredentials(values.username, values.password);
    if (!validation.valid) {
      message.error(validation.errors[0]);
      setSubmitting(false);
      return;
    }
    try {
      const res = await adminLogin(values.username, values.password);
      console.log('res ', res);
      if (res.success && res.data) {
        login(res.data);
        navigate('/', { replace: true });
      } else {
        console.log(1)
        message.error('用户名或密码错误');
      }
    } catch (err: unknown) {
      if (isBusinessError(err) && err.code === 'ACCOUNT_LOCKED') {
        message.error(err.message);
      } else {
        console.log(2, err)
        message.error('用户名或密码错误');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>管理系统登录</h1>
        <Form<LoginFormValues>
          name="login"
          onFinish={handleFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 4, message: '用户名长度至少 4 个字符' },
              { max: 20, message: '用户名长度最多 20 个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码长度至少 8 个字符' },
              { max: 32, message: '密码长度最多 32 个字符' },
            ]}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder="密码"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={submitting}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: '#f0f2f5',
};

const cardStyle: React.CSSProperties = {
  width: 400,
  padding: '40px 32px',
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
};

const titleStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 32,
  fontSize: 24,
  fontWeight: 600,
  color: '#1a1a1a',
};
