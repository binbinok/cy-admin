# 会员卡消费流水账本

## 背景

当前储值卡扣款（结算卡扣、手动扣余额）只更新 `member_cards.balance`，不写任何流水，导致会员详情"持卡信息"只能展示充值记录，卡扣消费无迹可查；会员登记表中的历史卡扣消费也无法落库展示。

## 目标

- 新增 `card_consumption_records` 集合，记录每次储值卡扣款（金额、扣款后余额、项目、来源）
- 结算卡扣与手动扣余额时自动写流水
- 会员详情"持卡信息"展示卡扣消费流水（与充值记录并列）
- 历史数据通过一次性补录云函数迁移（跳过提案部分，属数据运维）

## 影响范围

- 云函数：`_shared/settlement.js`（deductMemberCardPayments）、`adminDeductCardBalance`、新增 `adminGetCardConsumptionRecords`、`initDatabaseIndexes`
- 前端：`MemberDetailPage` 持卡信息 tab、services、types
- 数据：新增集合 `card_consumption_records`
