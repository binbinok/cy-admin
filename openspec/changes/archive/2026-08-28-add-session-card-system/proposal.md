# 新增：次卡体系（可配置核销规则 + 核销确认收入口径）

## Why

门店需要次卡产品（如「小气泡清洁 10 次卡」）作为储值折扣卡之外的营销工具：

- 现有系统只有储值折扣卡，无次卡能力；
- 次卡的核销方式与规则需要**建卡（卡种）时灵活配置**，不同卡种覆盖范围不同；
- 财务上用户明确：不管次卡还是储值卡，开卡时钱已收但**收入以核销为准**，报表需要区分「已收款未核销」的预收部分；
- 核销时如有额外附加项需另收费，不能一卡全包。

## What Changes

### 次卡卡种（新集合 `session_card_types`，核销规则在建卡种时配置）

- 卡种字段：名称、售价（分）、总次数、适用服务大类、基础项目覆盖范围（全部 / 指定款式）、可选纳入抵扣的附加项、有效期规则（永久 / 开卡后 N 天 / 固定截止日期）、退卡规则（不可退 / 按剩余次数折算退款）、启用状态。
- 卡种 CRUD + 启用/停用；停用后不可新开卡，已售卡照常核销；卡种修改不影响已售卡（开卡时快照规则）。

### 次卡销售（新增 `adminIssueSessionCard`）

- 为会员开卡：选择卡种、实收金额（默认卡种售价，可改）、支付方式；生成会员次卡（`member_session_cards`，含规则快照与有效期截止），写售卡流水与操作日志。
- 售卡金额计**预收款**，不进入消费记录、不计营业收入、不产生积分与提成。
- 一个会员可持多张次卡。

### 次卡核销（嵌入结算 `adminCreateSettlement`）

- 结算时若会员持有匹配的有效次卡（适用大类匹配 + 基础项目在覆盖范围 + 未过期 + 剩余次数 > 0），可选择「次卡核销」，**每次结算固定核销 1 次**。
- 核销后：卡覆盖的项目金额从应收中扣除（该部分实收 0）；不在覆盖范围的附加项按模板价格另收费，走正常组合支付。
- 服务端重算并校验（不信任前端），核销写流水（`session_card_redemptions`），卡剩余次数 -1。
- 次卡抵扣部分不再参与储值卡折扣。

### 财务口径（核销确认收入）

- 次卡单次折算价 = `floor(售价 ÷ 总次数)`（分）；**核销时**按折算价确认收入、计提技师提成（折算价 × 提成比例）、按折算价给会员积分（每 1 元 10 积分）。
- 财务汇总扩展预收维度（修改 `adminGetFinanceSummary` 或新增 `adminGetPrepaidSummary`）：储值卡未核销余额合计 + 次卡未核销价值合计 + 本期新增预收（充值 + 售卡）；营业收入仍按结算实收统计（现有口径不变）。

### 次卡退卡（新增 `adminRefundSessionCard`）

- 仅超管；按卡种退卡规则执行：「不可退」直接拒绝；「按剩余次数折算」退款额 = 剩余次数 × 单次折算价。
- 必填退卡原因，卡状态置 `refunded` 留档，写操作日志；退款本身走线下，系统只留痕。

### 前端

- 会员卡管理页加「次卡」Tab：卡种列表 + 新建/编辑/启停卡种（含核销规则配置表单）。
- 会员详情页加「次卡」区块：持卡列表（剩余次数、有效期）、售卡入口、退卡入口、核销记录。
- 结算录入页：匹配次卡时出现核销选项与抵扣明细。
- 财务统计页：展示预收未核销金额与本期新增预收。

## Impact

- 受影响规格：新增 `session-card` 能力；`settlement`（结算集成次卡核销）；`admin-system`（财务统计增加预收口径）
- 云函数：新增 `adminCreateSessionCardType`、`adminUpdateSessionCardType`、`adminGetSessionCardTypes`、`adminToggleSessionCardType`、`adminIssueSessionCard`、`adminRefundSessionCard`、`adminGetMemberSessionCards`、`adminGetPrepaidSummary`；修改 `adminCreateSettlement`；`cloudbaserc.json` 同步注册
- 前端：`src/pages/member-card/`（次卡 Tab）、`src/pages/member/MemberDetailPage.tsx`、结算录入页、`src/pages/finance/FinancePage.tsx`、`src/services/`、`src/types/`、`src/constants/api.ts`
- 数据：新集合 `session_card_types`、`member_session_cards`、`session_card_redemptions`；无需迁移历史数据
- 测试：核销匹配判定、折算价计算、只核销 1 次、过期/次数耗尽拒绝、预收统计口径、退卡规则
