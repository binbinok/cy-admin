import { Modal, Typography } from 'antd';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: string;
  confirmLoading?: boolean;
  onOk: () => void;
  onCancel: () => void;
}

const { Text } = Typography;

export default function ConfirmModal(props: ConfirmModalProps) {
  return (
    <Modal
      title={props.title}
      open={props.open}
      confirmLoading={props.confirmLoading}
      onOk={props.onOk}
      onCancel={props.onCancel}
      okText="确认"
      cancelText="取消"
      destroyOnHidden
    >
      <Text>{props.content}</Text>
    </Modal>
  );
}
