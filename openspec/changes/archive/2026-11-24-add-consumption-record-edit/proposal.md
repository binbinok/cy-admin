# 消费记录修改功能

## Why

财务统计的消费记录目前只能新增、不能修改。实际运营中存在两类需要修正的场景：

- 收入录入弹窗的「服务时间」默认值为打开表单的当前时刻（`IncomeEntryModal.tsx:150`），隔天补录时若未手动修改，记录的服务时间会落在录入当天，导致财务统计（按 `serviceTime` 口径）日期与真实服务日期不符
- 录入时填错备注等信息，无法更正，只能靠口头或表外记录

## What Changes

- 新增云函数 `adminUpdateConsumptionRecord`：仅超级管理员可调用，修改消费记录的 `serviceTime` 与 `note`，并写入操作日志
- 修改服务时间时同步维护会员档案的 `lastConsumptionAt`（仅当该记录是会员最近一条消费时）
- 财务统计-消费记录表新增「操作」列，超级管理员可打开修改弹窗（服务时间 + 备注）
- 金额、支付方式、服务项目等资金相关字段本期不开放修改：它们牵动会员累计消费、积分、提成核算等派生数据，需要单独的冲销/重算设计

## 影响范围

- 云函数：新增 `adminUpdateConsumptionRecord`（`cloudbaserc.json` 注册）
- 前端：`src/constants/api.ts`、`src/types/finance.ts`、`src/services/finance.ts`、`src/pages/finance/FinancePage.tsx`、新增 `src/components/finance/ConsumptionRecordEditModal.tsx`
- 测试：`tests/unit/finance-service.test.ts`、新增 `tests/unit/ConsumptionRecordEditModal.test.tsx`
