# 变更：提成口径统一为实际收入——服务提成按实收+次卡覆盖计提

## Why

用户反馈技师提成与店里手工记账不一致（收入总额正确、提成不对）。根因是系统提成基数按"原价可计提部分"计算，与手工"实际收入 × 20%"口径存在系统性偏差：会员折扣/改价单系统偏高、自定义附加项与次卡单系统偏低（次卡按卡折算价计提，赠送卡提成为 0）。同时手工收入录入不写提成记录、提成与消费时间归属口径不一致、次卡覆盖金额未落库。

## What Changes

- **MODIFIED**：服务提成基数从"原价可计提部分"改为"实际收入 = 实收金额 + 次卡覆盖金额"，次卡覆盖项按项目原价计入，不再按卡种单次折算价单独计提
- **MODIFIED**：消费记录落库 `sessionCoveredAmount` / `sessionRecognizedAmount`
- **MODIFIED**：提成记录新增 `serviceTime` 字段，业绩统计、工资条、提成报表的提成归属时间从 `createdAt` 改为 `serviceTime`（无该字段的历史记录回退 `createdAt`）
- **FIXED**：手工收入录入（`adminCreateIncomeRecord`）补写服务提成记录
- **UNCHANGED**：开卡提成 = 充值实际收入 × 10%、续卡提成 = 充值实际收入 × 5%（现状已符合，仅核对）
- **DATA**：存量数据迁移——回填次卡覆盖金额、按新口径重算存量服务提成记录、补建缺失提成记录、回填 `serviceTime`

## Impact

- **受影响 specs**：`admin-system`（技师业绩/提成 Requirement）
- **受影响代码**：
  - `cloudfunctions/_shared/settlement.js` 及各函数目录副本
  - `cloudfunctions/adminCompleteService`、`adminCreateSettlement`（实际调用方，需部署）
  - `cloudfunctions/adminCreateIncomeRecord/index.js`
  - `cloudfunctions/adminGetTechnicianPerformance`、`adminExportPayroll`、`adminGetCommissionReport`（提成时间口径）
  - `cloudfunctions/adminGetTechnicianIncomeDetail`（明细返回次卡覆盖金额、总收入口径对齐）
- **前端**：无需修改（字段与展示结构不变）
- **数据迁移**：一次性迁移云函数（dry-run + confirm），完成后三处清理
