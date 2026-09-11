# 新增：会员卡等级升级逻辑（充值达标自动升级 + 管理员手动调整）

## Why

会员卡账户化改造完成后，卡等级在开卡时一次性确定，此后无法变化：

- 会员消费升级意愿无处承接——充值再多也只能停留在开卡等级，折扣权益无法进阶；
- 门店运营需要"充值达标即升级"的激励路径，但明确**不做累计充值升级**，要求单次充值金额达到目标等级门槛才升级；
- 错充、线下协商等场景需要管理员手动调整等级的兜底能力，且全程留痕可审计。

## What Changes

### 充值达标自动升级（`adminRechargeCard`）

- 充值金额达到更高等级的 `minRechargeAmount` 门槛时，系统 SHALL 自动将会员卡升级到**满足门槛的最高等级**，支持跨级升级（如银卡一次充到位直接升钻卡）。
- 等级高低按 `minRechargeAmount` 升序推导（门槛越高等级越高；门槛相同按 `discountRate` 小者为高）。
- **只升不降**：未达更高等级门槛时保持原等级；现有"充值金额不得低于当前等级门槛"的校验保持不变。
- 升级与余额、累计充值更新在同一充值流程内完成；充值流水记录携带升级信息；响应返回 `levelUpgraded`（原/新等级）供前端提示。

### 等级变更留痕

- `member_cards` 增加 `levelHistory` 数组，每次等级变更写入：`{ fromLevelId, fromLevelName, toLevelId, toLevelName, trigger, rechargeAmount?, reason?, operatorAdminId, createdAt }`，`trigger` 为 `recharge`（充值升级）或 `manual`（手动调整）。
- `operation_logs` 记录 `action: 'upgrade_card_level'` 日志，detail 携带原/新等级名称与触发方式。

### 管理员手动调整等级（新增 `adminUpdateCardLevel`）

- 仅超级管理员可调用；入参 `{ memberId, targetLevelId, reason }`，原因必填。
- 校验：会员须持有 active 卡；目标等级须存在且与当前等级不同；允许上调与下调（用于错充纠正等兜底场景）。
- 变更写入 `levelHistory`（trigger='manual'）并记录操作日志。
- 前端会员详情页持卡区增加「调整等级」入口（仅超管可见），弹窗选择目标等级 + 填写原因。

### 前端充值体验

- 充值弹窗输入金额时实时提示「充值 ¥X 可升级至【等级名】（N 折）」，未达任何更高等级门槛时不提示。
- 充值成功且发生升级时，成功提示注明「已升级为 XX 卡」。
- 持卡信息区展示等级变更记录（时间、原等级 → 新等级、触发方式）。

## Impact

- 受影响规格：`admin-system`（会员卡充值行为变更、新增等级升级与手动调整需求）
- 云函数：修改 `adminRechargeCard`；新增 `adminUpdateCardLevel`（含 `cloudbaserc.json` 注册）
- 前端：`src/pages/member/MemberDetailPage.tsx`、`src/services/memberCard.ts`、`src/types/member.ts`、`src/constants/api.ts`
- 数据：`member_cards` 新增 `levelHistory` 字段（增量，无需迁移历史数据）
- 测试：充值升级判定、只升不降、跨级升级、手动调整权限与留痕
