/**
 * 格式化工具函数
 * 手机号脱敏、金额格式化（分→元）、日期格式化
 */

/**
 * 手机号脱敏，仅显示后 4 位
 * @param phone - 手机号字符串
 * @returns 脱敏后的字符串，如 '***5678'
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) {
    return phone;
  }
  return '***' + phone.slice(-4);
}

/**
 * 金额格式化：分→元，保留 2 位小数
 * @param amountInFen - 金额（单位：分，整数）
 * @returns 格式化后的元字符串，如 '99.00'
 */
export function formatAmount(amountInFen: number): string {
  return (amountInFen / 100).toFixed(2);
}

/**
 * 日期格式化为 YYYY-MM-DD
 * @param date - Date 对象或 ISO 日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
