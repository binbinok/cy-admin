# 实施清单

## 1. 云函数（createdAt → serviceTime）

- [x] 1.1 `adminGetFinanceSummary`：时间范围过滤改 `serviceTime`
- [x] 1.2 `adminGetRevenueTrend`：过滤与按日分桶改 `serviceTime`
- [x] 1.3 `adminGetServiceRevenue`：过滤改 `serviceTime`
- [x] 1.4 `adminGetConsumptionList`：过滤与排序改 `serviceTime`
- [x] 1.5 `adminGetTechnicianPerformance`：过滤改 `serviceTime`
- [x] 1.6 `adminGetTechnicianIncomeDetail`：过滤与排序改 `serviceTime`
- [x] 1.7 `adminExportPayroll`：月份过滤改 `serviceTime`

## 2. 前端

- [x] 2.1 `FinancePage.tsx`：消费记录「日期」列展示 `serviceTime`

## 3. 验证与部署

- [x] 3.1 改动云函数 `node --check` 通过
- [x] 3.2 `tsc --noEmit` + `eslint` 通过
- [x] 3.3 `vitest --run` 全部通过
- [x] 3.4 部署 7 个云函数
- [x] 3.5 验证收入录入提交后财务统计页自动刷新（前端已有 onSuccess 接线）
- [x] 3.6 `openspec validate update-finance-service-time-stats --strict` 通过
