## 1. 结算链路改造

- [x] 1.1 `settlement.js`：服务提成基数 = 实收 + 次卡覆盖金额；移除次卡单独折算价提成记录；提成记录写 `serviceTime`
- [x] 1.2 `settlement.js`：消费记录落库 `sessionCoveredAmount` / `sessionRecognizedAmount`
- [x] 1.3 `adminCreateIncomeRecord`：补写服务提成记录（实收 × 手工比例，含 `serviceTime`）
- [x] 1.4 同步 `_shared/settlement.js` 到所有函数目录副本

## 2. 统计口径统一

- [x] 2.1 `adminGetTechnicianPerformance`：提成查询改按 `serviceTime`（回退 `createdAt`）
- [x] 2.2 `adminExportPayroll`：同上
- [x] 2.3 `adminGetCommissionReport`：同上
- [x] 2.4 `adminGetTechnicianIncomeDetail`：明细返回 `sessionCoveredAmount`，总收入 = 实收 + 次卡覆盖

## 3. 验证

- [x] 3.1 更新相关单元/属性测试，lint + tsc + test 全部通过
- [x] 3.2 部署：adminCompleteService、adminCreateSettlement、adminCreateIncomeRecord、adminGetTechnicianPerformance、adminExportPayroll、adminGetCommissionReport、adminGetTechnicianIncomeDetail

## 4. 存量数据迁移

- [x] 4.1 回填消费记录次卡覆盖金额（自 session_card_redemptions）
- [x] 4.2 按新口径重算存量服务提成记录（serviceAmount / commissionAmount / serviceTime）
- [x] 4.3 补建手工收入录入缺失的提成记录
- [x] 4.4 迁移后抽样核对 11 月各技师提成 = 实际收入 × 20%，清理临时函数
