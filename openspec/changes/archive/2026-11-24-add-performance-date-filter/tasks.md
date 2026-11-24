# 任务清单

- [x] 1. `adminExportPayroll` 支持 startDate/endDate 区间 + periodLabel，CSV 列对齐新提成口径，保留 month 兼容
- [x] 2. `adminGetTechnicianIncomeDetail` summary 改为全量口径（orderCount=total，totalAmount 全区间求和）
- [x] 3. FinancePage 业绩 Card 增加按月/按年筛选器（Radio + DatePicker）
- [x] 4. 列表、查看明细、导出工资条三处数据源切换为筛选器区间
- [x] 5. 导出弹窗移除月份字段，导出周期取筛选器
- [x] 6. services/finance.ts 导出入参与测试断言同步
- [x] 7. lint + 全量测试通过（553 通过）
- [x] 8. 部署 adminExportPayroll / adminGetTechnicianIncomeDetail 并线上验证
