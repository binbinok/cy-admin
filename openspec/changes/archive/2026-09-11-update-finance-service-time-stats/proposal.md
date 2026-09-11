# 财务统计按服务时间归属

## 背景

当前财务统计页背后的 7 个云函数全部按 `createdAt`（录入时间）过滤 `consumption_records`。当管理员补录历史服务（服务时间与录入时间不同）时，收入会被统计到录入当天而非实际服务当天，导致报表口径失真。

## 目标

- 财务统计（汇总卡片、收入趋势、分类分布、消费记录列表、技师业绩、技师明细、工资条导出）统一改为按消费记录的 `serviceTime`（服务时间）过滤、排序与分桶。
- 消费记录列表「日期」列改为展示服务时间。
- 历史数据不兜底：结算重构后所有记录均有 `serviceTime`，缺字段记录允许统计不到。
- 预收未核销（`adminGetPrepaidSummary`）统计充值/售卡流水，无服务时间概念，不在本次范围。
- 收入录入成功后财务统计页自动刷新：前端已实现（`onSuccess` → 重新拉取全部统计），本次仅验证，无代码改动。

## 影响范围

- 云函数 7 个：`adminGetFinanceSummary`、`adminGetRevenueTrend`、`adminGetServiceRevenue`、`adminGetConsumptionList`、`adminGetTechnicianPerformance`、`adminGetTechnicianIncomeDetail`、`adminExportPayroll`
- 前端：`FinancePage.tsx` 消费记录「日期」列改 `serviceTime`
- 不涉及：提成报表（`adminGetCommissionReport`，基于提成记录自身 createdAt）、预收汇总
