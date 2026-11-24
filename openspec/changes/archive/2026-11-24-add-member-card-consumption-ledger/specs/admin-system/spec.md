# admin-system 规格增量

## ADDED Requirements

### Requirement: 储值卡扣款流水

系统 SHALL 在每次储值卡余额扣减时写入 `card_consumption_records` 流水记录，字段包含：cardId、memberId、amount（分）、balanceAfter（分）、item（项目说明）、note、consumptionId（关联消费记录，可为空）、createdAt。

#### Scenario: 结算时卡扣自动留痕

- **WHEN** 收入录入或完成服务使用会员卡支付并扣减余额
- **THEN** 系统写入一条 card_consumption_records 流水，amount 为卡扣金额，balanceAfter 为扣款后余额，并关联 consumptionId

#### Scenario: 手动扣款留痕

- **WHEN** 超级管理员通过 adminDeductCardBalance 手动扣减会员卡余额
- **THEN** 系统写入一条 card_consumption_records 流水

### Requirement: 储值卡扣款流水查询

系统 SHALL 提供按会员卡查询扣款流水的接口，按时间倒序返回。

#### Scenario: 会员详情展示卡扣流水

- **WHEN** 管理员在会员详情"持卡信息"中查看卡扣消费记录
- **THEN** 系统显示扣款时间、项目、扣款金额、扣款后余额，按时间倒序排列
