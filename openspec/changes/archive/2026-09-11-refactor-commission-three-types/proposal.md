# 提成模型重构：手工 / 开卡 / 续卡三类全局提成

## 背景

当前提成仅覆盖结算场景，按技师个人配置单一比例。实际问题：
- 开卡、续卡、次卡售出均无提成激励
- 按技师配置导致"无业绩技师无法设置比例"、"已删除技师幽灵行"等问题

## 目标（已与需求方确认）

提成调整为三类，**独立配置、全员生效**，不再按技师单独配置：

| 类型 | 触发场景 | 基数 | 默认比例 |
|---|---|---|---|
| 手工提成 `manual` | 收入录入/完成服务结算 | 可提成项目金额（维持现状） | 20% |
| 开卡提成 `card_open` | 新开储值卡（含首充）、次卡售出 | 首充金额 / 次卡实收金额 | 10% |
| 续卡提成 `card_renew` | 储值卡充值 | 充值金额 | 5% |

- 开卡/续卡时必须**指定提成员工**（必填），提成记录归属该员工
- 报表按类型拆分：技师、完成服务次数、服务总金额、手工提成、开卡提成、续卡提成、提成合计
- 历史无类型提成记录归入手工提成
- 旧按技师配置（`technician_commission_config`）废弃，改为全局单文档配置 `commission_config`
- 卡注销/次卡退款不回溯已计提的提成

## 影响范围

- 云函数（8 个）：`adminGetCommissionConfig`、`adminUpdateCommissionRate`（改为全局读写）、`_shared/settlement.js`（root + adminCompleteService + adminCreateSettlement 副本，手工提成改读全局比例）、`adminCreateMemberCard`、`adminRechargeCard`、`adminIssueSessionCard`（开卡/续卡提成计提）、`adminGetCommissionReport`（按类型聚合）
- 前端：CommissionPage 重构（全局比例配置区 + 类型拆分报表）、开通会员卡/充值/售次卡表单增加"提成员工"必填下拉、services/types 更新、默认比例常量化
- 数据：`commission_records` 新增 `type` 字段（新记录）；清理孤儿提成记录与旧配置
