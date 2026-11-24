import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
  message,
} from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { adminCreateSettlement } from '@/services/finance';
import { adminGetTechnicianList } from '@/services/technician';
import { adminGetMemberList, adminGetMemberDetail } from '@/services/member';
import { adminGetDiscountLevels } from '@/services/memberCard';
import { adminGetServiceTemplates } from '@/services/service';
import { adminGetMemberSessionCards } from '@/services/sessionCard';
import { useAuthStore } from '@/stores/authStore';
import { PAYMENT_TYPE_OPTIONS } from '@/constants/business';
import { computeSettlementAmounts, validateSettlementInput } from '@/utils/settlement';
import { isSessionCardUsableForItem } from '@/utils/sessionCard';
import { formatAmount } from '@/utils/format';
import type { Member } from '@/types/member';
import type { Technician } from '@/types/technician';
import type { ServiceTemplate, TemplateItem } from '@/types/service';
import type { MemberSessionCard } from '@/types/sessionCard';
import type { DiscountLevel } from '@/services/memberCard';
import type { IncomePrefillData } from '@/types/finance';

interface IncomeEntryModalProps {
  open: boolean;
  prefill?: IncomePrefillData;
  onClose: () => void;
  onSuccess?: () => void;
}

const EMPTY_TECHNICIANS: Technician[] = [];
const EMPTY_MEMBERS: Member[] = [];
const EMPTY_TEMPLATES: ServiceTemplate[] = [];
const EMPTY_LEVELS: DiscountLevel[] = [];
const EMPTY_CARDS: MemberSessionCard[] = [];

export default function IncomeEntryModal({
  open,
  prefill,
  onClose,
  onSuccess,
}: IncomeEntryModalProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [discountRate, setDiscountRate] = useState<number>(100);
  const [selectedSessionCardId, setSelectedSessionCardId] = useState<string>('');
  const [searchedMembers, setSearchedMembers] = useState<Member[]>([]);
  const [form] = Form.useForm();
  const isSuperAdmin = useAuthStore((s) => s.adminInfo?.role === 'super_admin');

  const { data: technicianOptions = EMPTY_TECHNICIANS } = useQuery<Technician[]>({
    queryKey: ['settlementOptions', 'technicians'],
    queryFn: async () => {
      const res = await adminGetTechnicianList({ page: 1, pageSize: 100 });
      return res.data?.list ?? EMPTY_TECHNICIANS;
    },
  });
  const { data: preloadedMembers = EMPTY_MEMBERS } = useQuery<Member[]>({
    queryKey: ['settlementOptions', 'members'],
    queryFn: async () => {
      const res = await adminGetMemberList({ page: 1, pageSize: 100 });
      return res.data?.list ?? EMPTY_MEMBERS;
    },
    enabled: isSuperAdmin,
  });
  const memberOptions = useMemo<Member[]>(
    () => (isSuperAdmin ? preloadedMembers : searchedMembers),
    [isSuperAdmin, preloadedMembers, searchedMembers]
  );
  const { data: templateOptions = EMPTY_TEMPLATES } = useQuery<ServiceTemplate[]>({
    queryKey: ['settlementOptions', 'templates'],
    queryFn: async () => {
      const res = await adminGetServiceTemplates({ activeOnly: true });
      return res.data ?? EMPTY_TEMPLATES;
    },
  });
  const { data: discountLevels = EMPTY_LEVELS } = useQuery<DiscountLevel[]>({
    queryKey: ['settlementOptions', 'discountLevels'],
    queryFn: async () => {
      const res = await adminGetDiscountLevels();
      return res.data ?? EMPTY_LEVELS;
    },
  });

  const watchedCategoryId = Form.useWatch('categoryId', form) as string | undefined;
  const watchedBaseItemId = Form.useWatch('baseItemId', form) as string | undefined;
  const watchedBasePrice = Form.useWatch('baseItemPrice', form) as number | undefined;
  const watchedAddonIds = Form.useWatch('addonIds', form) as string[] | undefined;
  const watchedAddonPrices = Form.useWatch('addonPriceMap', form) as Record<string, number> | undefined;
  const watchedCustomAddons = Form.useWatch('customAddons', form) as
    | Array<{ name?: string; price?: number; reason?: string }>
    | undefined;
  const watchedAdjustAmount = Form.useWatch('adjustAmount', form) as number | undefined;
  const watchedPayments = Form.useWatch('paymentDetails', form) as
    | Array<{ paymentType?: string; amount?: number }>
    | undefined;
  const watchedMemberId = Form.useWatch('memberId', form) as string | undefined;

  const { data: sessionCards = EMPTY_CARDS } = useQuery<MemberSessionCard[]>({
    queryKey: ['memberSessionCards', watchedMemberId],
    queryFn: async () => {
      const res = await adminGetMemberSessionCards({ memberId: watchedMemberId as string });
      return res.data?.cards ?? EMPTY_CARDS;
    },
    enabled: !!watchedMemberId,
  });

  const applyMemberDiscount = useCallback(
    async (memberId: string | undefined): Promise<void> => {
      if (!memberId) {
        setDiscountRate(100);
        return;
      }
      try {
        const res = await adminGetMemberDetail(memberId);
        const levelId = res.data?.card?.discountLevelId;
        const level = discountLevels.find((item) => item._id === levelId);
        setDiscountRate(level?.discountRate ?? 100);
      } catch {
        setDiscountRate(100);
      }
    },
    [discountLevels],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    form.resetFields();
    setDiscountRate(100);
    setSelectedSessionCardId('');
    setSearchedMembers([]);
    form.setFieldsValue({
      serviceTime: prefill?.serviceTime ? dayjs(prefill.serviceTime) : dayjs(),
      paymentDetails: [{ paymentType: 'cash', amount: undefined }],
      technicianId: prefill?.technicianId,
      memberId: prefill?.memberId,
      guestName: prefill?.guestName,
      categoryId: prefill?.categoryId,
      note: prefill?.note,
    });
    if (prefill?.memberId) {
      applyMemberDiscount(prefill.memberId);
      if (!isSuperAdmin) {
        adminGetMemberDetail(prefill.memberId)
          .then((res) => {
            if (res.data?.member) {
              setSearchedMembers([res.data.member]);
            }
          })
          .catch(() => {});
      }
    }
  }, [open, prefill, form, applyMemberDiscount, isSuperAdmin]);

  // 普通管理员：按手机号后 4 位查询会员
  const handleMemberSearch = useCallback(
    async (input: string): Promise<void> => {
      if (isSuperAdmin || !/^\d{4}$/.test(input.trim())) {
        return;
      }
      try {
        const res = await adminGetMemberList({
          page: 1,
          pageSize: 10,
          phoneLast4: input.trim(),
        });
        setSearchedMembers(res.data?.list ?? []);
      } catch {
        message.warning('会员查询失败，请稍后重试');
      }
    },
    [isSuperAdmin],
  );

  useEffect(() => {
    setSelectedSessionCardId('');
  }, [watchedMemberId, watchedCategoryId, watchedBaseItemId]);

  const currentTemplate = useMemo<ServiceTemplate | undefined>(
    () => templateOptions.find((t) => t.categoryId === watchedCategoryId),
    [templateOptions, watchedCategoryId],
  );
  const baseItemOptions = useMemo<TemplateItem[]>(
    () => (currentTemplate?.baseItems ?? []).filter((item) => item.enabled !== false),
    [currentTemplate],
  );
  const addonItemOptions = useMemo<TemplateItem[]>(
    () => (currentTemplate?.addonItems ?? []).filter((item) => item.enabled !== false),
    [currentTemplate],
  );
  const currentBaseItem = useMemo<TemplateItem | undefined>(
    () => baseItemOptions.find((item) => item.itemId === watchedBaseItemId),
    [baseItemOptions, watchedBaseItemId],
  );

  const matchedSessionCards = useMemo<MemberSessionCard[]>(() => {
    if (!watchedCategoryId || !watchedBaseItemId) {
      return [];
    }
    return sessionCards.filter((card) =>
      isSessionCardUsableForItem({
        card,
        categoryId: watchedCategoryId,
        baseItemId: watchedBaseItemId,
      }),
    );
  }, [sessionCards, watchedCategoryId, watchedBaseItemId]);

  const selectedSessionCard = useMemo<MemberSessionCard | undefined>(
    () => matchedSessionCards.find((card) => card._id === selectedSessionCardId),
    [matchedSessionCards, selectedSessionCardId],
  );

  const pricePreview = useMemo(() => {
    if (!currentBaseItem) {
      return null;
    }
    const toFen = (yuan: number | undefined): number => Math.round((yuan ?? 0) * 100);
    const coveredAddonIds = new Set(selectedSessionCard?.snapshot.coveredAddonIds ?? []);
    const selectedAddons = (watchedAddonIds ?? [])
      .map((id) => addonItemOptions.find((item) => item.itemId === id))
      .filter((item): item is TemplateItem => !!item)
      .map((item) => ({
        price: toFen(watchedAddonPrices?.[item.itemId] ?? item.defaultPrice / 100),
        discountable: item.discountable !== false,
        commissionable: item.commissionable !== false,
        paidBySessionCard: !!selectedSessionCard && coveredAddonIds.has(item.itemId),
      }));
    const customAddons = (watchedCustomAddons ?? [])
      .filter((addon) => addon && addon.name && typeof addon.price === 'number')
      .map((addon) => ({ price: toFen(addon.price) }));
    return computeSettlementAmounts({
      baseItem: {
        price: toFen(watchedBasePrice ?? currentBaseItem.defaultPrice / 100),
        discountable: currentBaseItem.discountable !== false,
        commissionable: currentBaseItem.commissionable !== false,
        paidBySessionCard: !!selectedSessionCard,
      },
      addons: selectedAddons,
      customAddons,
      discountRate,
      adjustAmount: toFen(watchedAdjustAmount),
    });
  }, [
    currentBaseItem,
    watchedAddonIds,
    watchedAddonPrices,
    watchedCustomAddons,
    watchedBasePrice,
    watchedAdjustAmount,
    addonItemOptions,
    discountRate,
    selectedSessionCard,
  ]);

  const isFullyCovered = !!selectedSessionCard && (pricePreview?.actualAmount ?? -1) === 0;

  const paymentTotalFen = useMemo(
    () =>
      (watchedPayments ?? []).reduce(
        (sum, detail) => sum + Math.round((detail?.amount ?? 0) * 100),
        0,
      ),
    [watchedPayments],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const serviceTimeValue = values.serviceTime as Dayjs;
      const rawPayments =
        (values.paymentDetails as Array<{ paymentType: string; amount: number }>) ?? [];
      const paymentDetails = isFullyCovered
        ? []
        : rawPayments.map((d) => ({
            paymentType: d.paymentType,
            amount: Math.round(d.amount * 100),
          }));
      const categoryId = values.categoryId as string;
      const template = templateOptions.find((t) => t.categoryId === categoryId);
      const baseItemId = values.baseItemId as string;
      const baseItem = template?.baseItems.find((item) => item.itemId === baseItemId);
      const baseItemPrice = Math.round(((values.baseItemPrice as number) ?? 0) * 100);
      const addonIds = (values.addonIds as string[]) ?? [];
      const addonPriceMap = (values.addonPriceMap as Record<string, number>) ?? {};
      const addons = addonIds.map((id) => {
        const addonItem = template?.addonItems.find((item) => item.itemId === id);
        return {
          itemId: id,
          price: Math.round((addonPriceMap[id] ?? (addonItem?.defaultPrice ?? 0) / 100) * 100),
        };
      });
      const customAddons = ((values.customAddons as Array<{ name: string; price: number; reason: string }>) ?? []).map(
        (addon) => ({
          name: addon.name,
          price: Math.round(addon.price * 100),
          reason: addon.reason,
        }),
      );
      const adjustAmount = Math.round(((values.adjustAmount as number) ?? 0) * 100);
      const adjustReason = (values.adjustReason as string) || '';

      const preview = pricePreview;
      if (!preview || !baseItem) {
        message.error('请选择 1 个基础项目');
        setSubmitting(false);
        return;
      }
      const validationError = validateSettlementInput({
        baseItemId,
        adjustAmount,
        adjustReason,
        paymentTotal: paymentDetails.reduce((sum, d) => sum + d.amount, 0),
        actualAmount: preview.actualAmount,
        customAddons,
      });
      if (validationError) {
        message.error(validationError);
        setSubmitting(false);
        return;
      }

      const res = await adminCreateSettlement({
        appointmentId: prefill?.appointmentId || undefined,
        memberId: (values.memberId as string) || undefined,
        guestName: (values.guestName as string) || undefined,
        technicianId: values.technicianId as string,
        serviceTime: serviceTimeValue.toISOString(),
        categoryId,
        baseItemId,
        baseItemPrice,
        addons,
        customAddons,
        adjustAmount,
        adjustReason: adjustReason || undefined,
        paymentDetails,
        sessionCardId: selectedSessionCardId || undefined,
        note: (values.note as string) || undefined,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? '结算失败');
      }
      message.success(
        res.data?.sessionCardRedemptionId
          ? `结算成功：已核销次卡 1 次，实收 ¥${formatAmount(res.data?.amount ?? 0)}，积分 +${res.data?.pointsEarned ?? 0}`
          : `结算成功：实收 ¥${formatAmount(res.data?.amount ?? 0)}，积分 +${res.data?.pointsEarned ?? 0}`,
      );
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, templateOptions, pricePreview, prefill, isFullyCovered, selectedSessionCardId, onSuccess, onClose]);

  return (
    <Modal
      title={prefill?.appointmentId ? '收入录入（关联预约结算）' : '收入录入'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnHidden
      width={760}
    >
      <Form form={form} layout="vertical">
        <Divider orientation="left" plain>
          基础信息
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="memberId" label="客户（会员）">
              <Select
                allowClear
                showSearch
                placeholder={
                  isSuperAdmin
                    ? '请选择会员（可选）'
                    : '输入会员手机号后 4 位查询'
                }
                optionFilterProp="label"
                filterOption={isSuperAdmin ? undefined : false}
                onSearch={handleMemberSearch}
                onChange={applyMemberDiscount}
                options={memberOptions.map((item: Member) => ({
                  value: item.memberId,
                  label: `${item.nickName}（${item.memberId}）`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="guestName" label="散客姓名">
              <Input placeholder="散客姓名（可选，无会员时填写）" maxLength={20} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="technicianId"
              label="服务技师"
              rules={[{ required: true, message: '请选择服务技师' }]}
            >
              <Select
                placeholder="请选择服务技师"
                options={technicianOptions
                  .filter((item: Technician) => item.status !== 'resigned')
                  .map((item: Technician) => ({
                    value: item._id,
                    label: item.name,
                  }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="serviceTime"
              label="服务时间"
              rules={[{ required: true, message: '请选择服务时间' }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" plain>
          基础项目（必选 1 个）
        </Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="categoryId"
              label="服务大类"
              rules={[{ required: true, message: '请选择服务大类' }]}
            >
              <Select
                placeholder="请选择服务大类"
                options={templateOptions.map((t) => ({
                  value: t.categoryId,
                  label: t.categoryName,
                }))}
                onChange={() => {
                  form.setFieldsValue({
                    baseItemId: undefined,
                    baseItemPrice: undefined,
                    addonIds: [],
                    addonPriceMap: {},
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="baseItemId"
              label="基础项目"
              rules={[{ required: true, message: '请选择 1 个基础项目' }]}
            >
              <Select
                placeholder="请先选择服务大类"
                options={baseItemOptions.map((item) => ({
                  value: item.itemId,
                  label: item.name,
                }))}
                onChange={(itemId: string) => {
                  const item = baseItemOptions.find((i) => i.itemId === itemId);
                  form.setFieldsValue({
                    baseItemPrice: item ? item.defaultPrice / 100 : undefined,
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="baseItemPrice"
              label="基础项目金额（元）"
              rules={[{ required: true, message: '请输入基础项目金额' }]}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} suffix="元" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" plain>
          附加项目（可多选）
        </Divider>
        <Form.Item name="addonIds">
          <Checkbox.Group
            options={addonItemOptions.map((item) => ({
              value: item.itemId,
              label: `${item.name}（¥${formatAmount(item.defaultPrice)}）`,
            }))}
          />
        </Form.Item>
        {(watchedAddonIds ?? []).map((addonId) => {
          const addonItem = addonItemOptions.find((item) => item.itemId === addonId);
          if (!addonItem) {
            return null;
          }
          return (
            <Form.Item
              key={addonId}
              name={['addonPriceMap', addonId]}
              label={`${addonItem.name}金额（元）`}
              initialValue={addonItem.defaultPrice / 100}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: 240 }} suffix="元" />
            </Form.Item>
          );
        })}
        <Form.List name="customAddons">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, 'name']}
                    rules={[{ required: true, message: '名称必填' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <Input placeholder="自定义附加项名称" maxLength={30} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'price']}
                    rules={[{ required: true, message: '金额必填' }]}
                    style={{ width: 160, marginBottom: 0 }}
                  >
                    <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} suffix="元" />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'reason']}
                    rules={[{ required: true, message: '原因必填' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <Input placeholder="原因（必填，不参与折扣与提成）" maxLength={50} />
                  </Form.Item>
                  <Button type="text" danger icon={<MinusOutlined />} onClick={() => remove(field.name)} />
                </div>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                添加自定义附加项
              </Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left" plain>
          价格明细
        </Divider>
        {pricePreview ? (
          <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="原价">
              ¥{formatAmount(pricePreview.originalAmount)}
            </Descriptions.Item>
            <Descriptions.Item label={`折扣（${discountRate / 10} 折）`}>
              -¥{formatAmount(pricePreview.discountAmount)}
            </Descriptions.Item>
            {pricePreview.sessionCoveredAmount > 0 && (
              <Descriptions.Item label="次卡抵扣">
                -¥{formatAmount(pricePreview.sessionCoveredAmount)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="应收">
              ¥{formatAmount(pricePreview.receivableAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="改价">
              {pricePreview.adjustAmount >= 0 ? '+' : '-'}¥{formatAmount(Math.abs(pricePreview.adjustAmount))}
            </Descriptions.Item>
            <Descriptions.Item label="实收">
              <Typography.Text strong>¥{formatAmount(pricePreview.actualAmount)}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="支付合计">
              <Typography.Text
                type={paymentTotalFen === pricePreview.actualAmount ? 'success' : 'danger'}
              >
                ¥{formatAmount(paymentTotalFen)}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            选择基础项目后实时显示价格明细
          </Typography.Text>
        )}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="adjustAmount" label="人工改价（元，可负）">
              <InputNumber step={0.01} precision={2} style={{ width: '100%' }} suffix="元" placeholder="默认 0" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="adjustReason"
              label="改价原因"
              rules={[
                {
                  validator: (_, value) => {
                    const adjust = Math.round(((watchedAdjustAmount as number) ?? 0) * 100);
                    if (adjust !== 0 && !String(value || '').trim()) {
                      return Promise.reject(new Error('改价必须填写原因'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="改价非 0 时必填，将写入操作日志" maxLength={50} />
            </Form.Item>
          </Col>
        </Row>

        {matchedSessionCards.length > 0 && (
          <>
            <Divider orientation="left" plain>
              次卡核销（可选）
            </Divider>
            <Form.Item label="使用次卡">
              <Select
                allowClear
                placeholder="选择要核销的次卡（每次结算核销 1 次）"
                value={selectedSessionCardId || undefined}
                onChange={(value: string | undefined) => setSelectedSessionCardId(value ?? '')}
                options={matchedSessionCards.map((card) => ({
                  value: card._id,
                  label: `${card.cardTypeName}（剩余 ${card.remainingSessions}/${card.totalSessions} 次）`,
                }))}
              />
            </Form.Item>
            {selectedSessionCard && pricePreview && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={`本次核销 1 次：次卡抵扣 ¥${formatAmount(pricePreview.sessionCoveredAmount)}，剩余实收 ¥${formatAmount(pricePreview.actualAmount)}`}
              />
            )}
          </>
        )}

        <Divider orientation="left" plain>
          支付信息
        </Divider>
        {isFullyCovered ? (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="本次消费由次卡全额抵扣，无需填写支付方式"
          />
        ) : (
          <Form.List
            name="paymentDetails"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('至少添加一组支付方式'));
                  }
                  const types = value.map((v: { paymentType: string }) => v.paymentType);
                  if (new Set(types).size !== types.length) {
                    return Promise.reject(new Error('支付方式不能重复'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item
                      name={[field.name, 'paymentType']}
                      rules={[{ required: true, message: '请选择金额类型' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        placeholder="金额类型"
                        options={PAYMENT_TYPE_OPTIONS.map((opt) => ({
                          ...opt,
                          disabled: fields.some(
                            (f, i) =>
                              i !== index &&
                              form.getFieldValue(['paymentDetails', f.name, 'paymentType']) === opt.value,
                          ),
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'amount']}
                      rules={[{ required: true, message: '请输入金额' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0.01}
                        step={0.01}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="金额（元）"
                        suffix="元"
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="link"
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                {fields.length < 3 && (
                  <Button
                    type="dashed"
                    onClick={() => add({ paymentType: undefined, amount: undefined })}
                    icon={<PlusOutlined />}
                  >
                    添加支付方式
                  </Button>
                )}
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>
        )}

        <Form.Item name="note" label="服务备注">
          <Input.TextArea rows={2} maxLength={100} placeholder="请输入服务备注（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
