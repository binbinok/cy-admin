# 实施清单

## 1. 云函数

- [x] 1.1 `adminGetCommissionConfig`：改为读取全局配置（无配置返回默认 20/10/5）
- [x] 1.2 `adminUpdateCommissionRate`：改为写入全局三类比例（0–100 整数校验）
- [x] 1.3 `_shared/settlement.js`（root + adminCompleteService + adminCreateSettlement 副本）：手工提成改读全局 manualRate
- [x] 1.4 `adminCreateMemberCard`：入参加 commissionTechnicianId（必填），写 type='card_open' 提成记录
- [x] 1.5 `adminRechargeCard`：入参加 commissionTechnicianId（必填），写 type='card_renew' 提成记录
- [x] 1.6 `adminIssueSessionCard`：入参加 commissionTechnicianId（必填），按实收金额写 type='card_open' 提成记录
- [x] 1.7 `adminGetCommissionReport`：按技师 × 类型聚合（无 type 记录归 manual）

## 2. 前端

- [x] 2.1 `src/constants/business.ts`：默认比例常量（20/10/5）
- [x] 2.2 `src/services/commission.ts` + 类型：全局配置读写、报表新结构
- [x] 2.3 CommissionPage 重构：「提成比例配置」区（三个输入 + 保存）+ 报表类型拆分列
- [x] 2.4 开通会员卡表单：提成员工必填下拉
- [x] 2.5 会员卡充值表单：提成员工必填下拉
- [x] 2.6 次卡售出表单：提成员工必填下拉

## 3. 数据清理（一次性函数，用后删除）

- [x] 3.1 删除孤儿提成记录（技师 c789...）
- [x] 3.2 清空 technician_commission_config 旧配置

## 4. 验证与部署

- [x] 4.1 改动云函数 `node --check` 通过
- [x] 4.2 `tsc --noEmit` + `eslint` 通过
- [x] 4.3 `vitest --run` 全部通过（更新受影响测试）
- [x] 4.4 部署 8 个云函数 + 一次性清理函数
- [x] 4.5 `openspec validate refactor-commission-three-types --strict` 通过

## 5. 报表动态重算（方案变更，2026-09-10 追加）

- [x] 5.1 `adminGetCommissionReport`：按当前全局比例对记录基数实时重算各类提成
- [x] 5.2 `adminExportPayroll`：修复 30% 硬编码，按当前全局比例实时重算应得提成
- [x] 5.3 部署 2 个云函数 + 回归验证
