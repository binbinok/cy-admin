## 1. 修改统计云函数

- [x] 1.1 `adminGetFinanceSummary`：收入合计加上 `sessionCoveredAmount`
- [x] 1.2 `adminGetRevenueTrend`：每日收入加上 `sessionCoveredAmount`
- [x] 1.3 `adminGetServiceRevenue`：分类收入加上 `sessionCoveredAmount`
- [x] 1.4 `adminGetTechnicianPerformance`：技师业绩总收入加上 `sessionCoveredAmount`

## 2. 验证

- [x] 2.1 运行 `pnpm run lint` 无错误（src/tests 目录；import-data 下 HTML 导出残留 js 文件的报错与本次变更无关）
- [x] 2.2 运行 `pnpm run test` 全部通过（52 个测试文件，553 个测试）
- [x] 2.3 部署 4 个统计云函数到 CloudBase 并 invoke 验证
- [ ] 2.4 验证 10 月统计数据与 HTML 记账一致（需在生产环境比对）

## 3. 消费记录展示卡核销金额（前端）

- [x] 3.1 `src/types/member.ts`：`ConsumptionRecord` 补 `sessionCoveredAmount` / `sessionRecognizedAmount`
- [x] 3.2 财务页消费记录表金额列：实收下方内嵌展示次卡核销 / 会员卡金额
- [x] 3.3 财务页明细弹窗支付方式列：补次卡核销行
- [x] 3.4 会员详情页消费记录实际金额列：内嵌展示卡核销金额
- [x] 3.5 运行 lint + tsc + test 验证（553 个测试全部通过）
