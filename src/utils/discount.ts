/**
 * 会员卡折扣计算工具函数
 * 根据原始金额和折扣比例计算折后金额
 */

/**
 * 计算会员卡折扣后的金额
 * @param originalAmount - 原始消费金额（单位：分，整数）
 * @param discountRate - 折扣比例（1–99 的整数，如 80 表示 8 折）
 * @returns 折后金额（单位：分），向下取整
 */
export function calculateDiscountedAmount(
  originalAmount: number,
  discountRate: number,
): number {
  if (originalAmount <= 0) {
    return 0;
  }
  return Math.floor(originalAmount * discountRate / 100);
}
