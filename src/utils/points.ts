/**
 * 积分计算工具函数
 * 每消费 1 角（10 分钱）获得 1 积分
 */

import { POINTS_PER_UNIT } from '@/constants/business';

/**
 * 根据消费金额计算获得的积分
 * @param amountInFen - 消费金额（单位：分，整数）
 * @returns 获得的积分数
 */
export function calculatePoints(amountInFen: number): number {
  if (amountInFen <= 0) {
    return 0;
  }
  return Math.floor(amountInFen / POINTS_PER_UNIT);
}
