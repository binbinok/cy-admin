/**
 * 提成计算工具函数
 * 默认提成比例 30%，按服务实际金额计算
 */

import { DEFAULT_COMMISSION_RATE } from '@/constants/business';

/**
 * 根据服务金额和提成比例计算提成金额
 * @param serviceAmount - 服务实际金额（单位：分，整数）
 * @param rate - 提成比例（1-100 的整数，默认 30）
 * @returns 提成金额（单位：分）
 */
export function calculateCommission(
  serviceAmount: number,
  rate: number = DEFAULT_COMMISSION_RATE,
): number {
  if (serviceAmount <= 0) {
    return 0;
  }
  return Math.floor(serviceAmount * rate / 100);
}
