import { useCallback, useEffect, useState } from 'react';
import { DatePicker, Form, Input, message, Modal, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { adminUpdateConsumptionRecord } from '@/services/finance';
import { formatAmount } from '@/utils/format';
import type { ConsumptionRecord } from '@/types/member';

interface ConsumptionRecordEditModalProps {
  readonly open: boolean;
  readonly record: ConsumptionRecord | null;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

interface EditFormValues {
  readonly serviceTime: Dayjs;
  readonly note?: string;
}

/** 修改消费记录弹窗：仅开放服务时间与备注两个可编辑字段。 */
export default function ConsumptionRecordEditModal({
  open,
  record,
  onClose,
  onSuccess,
}: ConsumptionRecordEditModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !record) {
      return;
    }
    form.setFieldsValue({
      serviceTime: record.serviceTime ? dayjs(record.serviceTime) : undefined,
      note: record.note ?? '',
    });
  }, [open, record, form]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!record) {
      return;
    }
    try {
      const values = (await form.validateFields()) as EditFormValues;
      setSubmitting(true);
      const response = await adminUpdateConsumptionRecord({
        recordId: record._id,
        serviceTime: values.serviceTime.toISOString(),
        note: values.note ?? '',
      });
      if (!response.success) {
        throw new Error(response.error?.message ?? '消费记录修改失败');
      }
      message.success('消费记录修改成功');
      onSuccess();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [record, form, onSuccess, onClose]);

  return (
    <Modal
      title="修改消费记录"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      {record && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {record.serviceName ?? '-'} · ¥{formatAmount(record.amount)} · {record.technicianName ?? '-'}
          （金额等信息不可修改，如有需要请联系技术处理）
        </Typography.Paragraph>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="serviceTime"
          label="服务时间"
          rules={[{ required: true, message: '请选择服务时间' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="备注">
          <Input.TextArea rows={3} placeholder="备注（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
