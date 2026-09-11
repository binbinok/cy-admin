/**
 * 业务常量
 * 会员等级阈值、积分规则、提成比例、账号安全等
 */

// ============================================================
// 会员等级阈值（单位：分）
// 普通 < 1000元(100000分), 银卡 1000-4999元, 金卡 5000-9999元, 钻石 >= 10000元
// ============================================================
export const MEMBER_LEVEL_NORMAL = 'normal';
export const MEMBER_LEVEL_SILVER = 'silver';
export const MEMBER_LEVEL_GOLD = 'gold';
export const MEMBER_LEVEL_DIAMOND = 'diamond';

/** 银卡门槛：1000元 = 100000分 */
export const MEMBER_LEVEL_SILVER_THRESHOLD = 100000;
/** 金卡门槛：5000元 = 500000分 */
export const MEMBER_LEVEL_GOLD_THRESHOLD = 500000;
/** 钻石门槛：10000元 = 1000000分 */
export const MEMBER_LEVEL_DIAMOND_THRESHOLD = 1000000;

export const MEMBER_LEVELS = [
  { key: MEMBER_LEVEL_NORMAL, label: '普通', minAmount: 0 },
  { key: MEMBER_LEVEL_SILVER, label: '银卡', minAmount: MEMBER_LEVEL_SILVER_THRESHOLD },
  { key: MEMBER_LEVEL_GOLD, label: '金卡', minAmount: MEMBER_LEVEL_GOLD_THRESHOLD },
  { key: MEMBER_LEVEL_DIAMOND, label: '钻石', minAmount: MEMBER_LEVEL_DIAMOND_THRESHOLD },
] as const;

// ============================================================
// 积分规则
// 每消费1角(10分钱)获得1积分，即 Math.floor(amountInFen / 10)
// ============================================================
export const POINTS_PER_UNIT = 10;

// ============================================================
// 提成规则
// ============================================================
/** 默认手工提成比例：20% */
export const DEFAULT_COMMISSION_RATE = 20;
/** 默认开卡提成比例：10% */
export const DEFAULT_CARD_OPEN_COMMISSION_RATE = 10;
/** 默认续卡提成比例：5% */
export const DEFAULT_CARD_RENEW_COMMISSION_RATE = 5;
/** 提成比例最小值：0% */
export const MIN_COMMISSION_RATE = 0;
/** 提成比例最大值：100% */
export const MAX_COMMISSION_RATE = 100;

// ============================================================
// 账号安全
// ============================================================
/** 账号锁定阈值：连续失败 5 次 */
export const ACCOUNT_LOCK_THRESHOLD = 5;
/** 账号锁定时长：30 分钟（毫秒） */
export const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000;
/** 账号锁定时长：30 分钟（分钟） */
export const ACCOUNT_LOCK_DURATION_MINUTES = 30;

// ============================================================
// Token 与会话
// ============================================================
/** Token 过期时间：2 小时 */
export const TOKEN_EXPIRY = '2h';
/** 无操作超时时间：2 小时（毫秒） */
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

// ============================================================
// 会员关系维护
// ============================================================
/** 沉睡会员阈值：60 天未消费 */
export const DORMANT_MEMBER_DAYS = 60;

// ============================================================
// UI 交互
// ============================================================
/** 搜索防抖延迟：300ms */
export const SEARCH_DEBOUNCE_MS = 300;

// ============================================================
// 支付方式
// ============================================================
export const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash', label: '现金' },
  { value: 'member_card', label: '会员卡' },
  { value: 'meituan', label: '美团' },
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'douyin', label: '抖音' },
  { value: 'other', label: '其他' },
] as const;
