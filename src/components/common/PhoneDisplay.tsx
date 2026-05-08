import { useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { maskPhone } from '@/utils/format';

interface PhoneDisplayProps {
  phone: string;
}

const { Text } = Typography;

export default function PhoneDisplay(props: PhoneDisplayProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const displayValue = visible ? props.phone : maskPhone(props.phone);
  const toggleVisible = () => setVisible((prev: boolean) => !prev);
  return (
    <Space size={8}>
      <Text>{displayValue}</Text>
      <Button type="link" size="small" onClick={toggleVisible}>
        {visible ? '隐藏完整号码' : '查看完整号码'}
      </Button>
    </Space>
  );
}
