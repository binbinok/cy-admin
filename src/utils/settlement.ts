import { POINTS_PER_UNIT, DEFAULT_COMMISSION_RATE } from '@/constants/business';

export interface SettlementPriceItem {
  readonly price: number;
  readonly discountable: boolean;
  readonly commissionable: boolean;
}

export interface SettlementAmountsInput {
  readonly baseItem: SettlementPriceItem;
  readonly addons: readonly SettlementPriceItem[];
  readonly customAddons: readonly { readonly price: number }[];
  readonly discountRate: number;
  readonly adjustAmount: number;
}

export interface SettlementAmounts {
  readonly originalAmount: number;
  readonly discountAmount: number;
  readonly receivableAmount: number;
  readonly adjustAmount: number;
  readonly actualAmount: number;
  readonly commissionableAmount: number;
}

const sumPrices = (items: readonly { readonly price: number }[]): number =>
  items.reduce((sum, item) => sum + item.price, 0);

const sumFlaggedPrices = (
  items: readonly SettlementPriceItem[],
  flag: 'discountable' | 'commissionable',
): number => items.filter((item) => item[flag]).reduce((sum, item) => sum + item.price, 0);

export function computeSettlementAmounts(input: SettlementAmountsInput): SettlementAmounts {
  const { baseItem, addons, customAddons, discountRate, adjustAmount } = input;
  const originalAmount = baseItem.price + sumPrices(addons) + sumPrices(customAddons);
  const discountableTotal =
    (baseItem.discountable ? baseItem.price : 0) + sumFlaggedPrices(addons, 'discountable');
  const discountAmount =
    discountableTotal - Math.floor((discountableTotal * discountRate) / 100);
  const receivableAmount = originalAmount - discountAmount;
  const actualAmount = receivableAmount + adjustAmount;
  const commissionableAmount =
    (baseItem.commissionable ? baseItem.price : 0) + sumFlaggedPrices(addons, 'commissionable');
  return { originalAmount, discountAmount, receivableAmount, adjustAmount, actualAmount, commissionableAmount };
}

export function calculateSettlementPoints(actualAmount: number): number {
  if (actualAmount <= 0) {
    return 0;
  }
  return Math.floor(actualAmount / POINTS_PER_UNIT);
}

export function calculateSettlementCommission(
  commissionableAmount: number,
  rate: number = DEFAULT_COMMISSION_RATE,
): number {
  if (commissionableAmount <= 0) {
    return 0;
  }
  return Math.floor((commissionableAmount * rate) / 100);
}

export interface SettlementValidationInput {
  readonly baseItemId: string;
  readonly adjustAmount: number;
  readonly adjustReason: string;
  readonly paymentTotal: number;
  readonly actualAmount: number;
  readonly customAddons: readonly { readonly name: string; readonly price: number; readonly reason: string }[];
}

export function validateSettlementInput(input: SettlementValidationInput): string | null {
  if (!input.baseItemId) {
    return '请选择 1 个基础项目';
  }
  const invalidCustom = input.customAddons.some(
    (addon) => !addon.name.trim() || !Number.isInteger(addon.price) || addon.price <= 0 || !addon.reason.trim(),
  );
  if (invalidCustom) {
    return '自定义附加项必须填写名称、金额和原因';
  }
  if (input.adjustAmount !== 0 && !input.adjustReason.trim()) {
    return '改价必须填写原因';
  }
  if (input.actualAmount < 0) {
    return '实收金额不能小于 0';
  }
  if (input.paymentTotal !== input.actualAmount) {
    return '支付总额必须等于实收金额';
  }
  return null;
}
