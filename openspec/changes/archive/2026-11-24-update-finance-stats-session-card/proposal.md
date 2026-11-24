# 变更：财务统计口径调整——次卡覆盖金额计入营业收入

## Why

当前系统财务统计按 `consumption_records.amount`（实收金额）汇总营业收入，但次卡全额覆盖的消费记录 `amount = 0`，导致这些记录未计入收入。HTML 手工记账口径将次卡实际价值计入收入，两者存在差异（10 月差额 340.80 元）。

## What Changes

- **MODIFIED**：财务统计口径从"仅实收金额"调整为"实收金额 + 次卡覆盖金额"
- 涉及统计接口：`adminGetFinanceSummary`、`adminGetRevenueTrend`、`adminGetServiceRevenue`、`adminGetTechnicianPerformance`
- 次卡核销收入不再单独展示，并入营业收入统一统计
- **MODIFIED**：消费记录列表金额列内嵌展示卡核销金额（次卡核销取 `sessionCoveredAmount`，会员卡取 `paymentDetails` 中 `member_card` 项），明细弹窗支付方式补充次卡核销行

## Impact

- **受影响 specs**：`admin-system`（财务统计 Requirement）
- **受影响代码**：
  - `cloudfunctions/adminGetFinanceSummary/index.js`
  - `cloudfunctions/adminGetRevenueTrend/index.js`
  - `cloudfunctions/adminGetServiceRevenue/index.js`
  - `cloudfunctions/adminGetTechnicianPerformance/index.js`
- **前端**：
  - `src/types/member.ts`：`ConsumptionRecord` 补充 `sessionCoveredAmount` / `sessionRecognizedAmount` 字段
  - `src/pages/finance/FinancePage.tsx`：消费记录表金额列 + 明细弹窗支付方式列展示卡核销金额
  - `src/pages/member/MemberDetailPage.tsx`：消费记录实际金额列展示卡核销金额
  - 后端查询接口已全字段返回，无需改动云函数
- **历史数据**：已有次卡覆盖记录将按新口径重新统计
