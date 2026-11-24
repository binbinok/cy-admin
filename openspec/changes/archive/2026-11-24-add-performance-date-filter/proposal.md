# add-performance-date-filter

## Why

财务统计-技师业绩统计目前跟随页面级"近 30 天"日期范围，门店需要按**年**或**月**维度复盘技师业绩；且"查看明细"弹窗与"导出工资条"的时间口径需与筛选联动，保证三个视图数据一致。同时修复明细弹窗汇总按当前页计算的缺陷（总订单数/期间总收入只统计当前分页）。

## What Changes

- 技师业绩统计 Card 增加独立筛选器：按月 / 按年切换 + 对应月份/年份选择器（默认当月）
- 技师业绩列表、"查看明细"弹窗、"导出工资条"三处统一使用该筛选器的日期范围
- `adminGetTechnicianPerformance`：无需改动（已支持任意日期区间）
- `adminGetTechnicianIncomeDetail`：汇总改为全量口径（订单数 = 总数，总收入 = 全区间求和），修复分页截断缺陷
- `adminExportPayroll`：支持 `startDate/endDate` 区间导出（保留 `month` 兼容），CSV 列对齐新提成口径（提成基数/服务提成/会员卡开卡续卡/会员卡提成/总提成）
- 前端导出弹窗移除独立月份选择，周期直接取筛选器

## Impact

- Affected specs：`admin-system`（技师业绩/财务统计）
- Affected code：
  - `src/pages/finance/FinancePage.tsx`（筛选器 UI + 三处联动）
  - `src/services/finance.ts`（导出入参）
  - `cloudfunctions/adminExportPayroll/index.js`
  - `cloudfunctions/adminGetTechnicianIncomeDetail/index.js`
  - `tests/unit/finance-service.test.ts`（导出断言）
