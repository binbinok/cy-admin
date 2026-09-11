# 任务清单：次卡体系

## 1. 云函数：次卡卡种管理

- [x] 1.1 新增 `adminCreateSessionCardType`：名称、售价（分，>0）、总次数（>0 整数）、适用服务大类、基础项目覆盖范围（all / 指定款式 ID 列表）、可选附加项 ID 列表、有效期规则（permanent / days / fixed_date）、退卡规则（none / prorated）；字段校验
- [x] 1.2 新增 `adminUpdateSessionCardType`：编辑卡种（不影响已售卡快照）
- [x] 1.3 新增 `adminGetSessionCardTypes`：卡种列表（含已售数量统计）
- [x] 1.4 新增 `adminToggleSessionCardType`：启用/停用；停用后不可新开卡，已售卡可继续核销
- [x] 1.5 四个函数注册到 `cloudbaserc.json`，复制 `_shared/`

## 2. 云函数：售卡与持卡查询

- [x] 2.1 新增 `adminIssueSessionCard`：memberId + cardTypeId + 实收金额（默认卡种售价）+ 支付方式；生成 `member_session_cards`（规则快照、单次折算价 floor(售价/总次数)、expiresAt 按有效期规则计算、remainingSessions=总次数、status='active'）；写售卡流水与操作日志；不进消费记录、不产生积分提成
- [x] 2.2 新增 `adminGetMemberSessionCards`：按 memberId 返回持卡列表（含按当前时间计算的过期状态）与核销记录
- [x] 2.3 注册到 `cloudbaserc.json`

## 3. 云函数：核销集成（修改 adminCreateSettlement）

- [x] 3.1 入参增加可选 `sessionCardId`；服务端核销校验链：active、未过期、剩余次数 > 0、适用大类匹配、基础项目在覆盖范围
- [x] 3.2 价格重算：覆盖项目金额不计入应收、不参与储值卡折扣；命中 `coveredAddonIds` 的附加项一并抵扣；支付明细仍校验总额 = 扣除后实收
- [x] 3.3 核销后处理：卡 remainingSessions -1（次数归零置 status='depleted'）、写 `session_card_redemptions`（recognizedAmount=单次折算价）、提成记录（折算价 × 提成比例，source='session_card'）、会员积分（折算价 ÷ 100 × 10）
- [x] 3.4 消费记录快照：覆盖项目标注 `paidBySessionCard: true`，记录 `sessionCardRedemptionId`

## 4. 云函数：退卡与预收统计

- [x] 4.1 新增 `adminRefundSessionCard`：仅超管；卡种规则 none 拒绝；prorated 退款额 = 剩余次数 × 单次折算价（实退可改，默认折算额）；必填原因；卡置 refunded、剩余次数清零；写操作日志
- [x] 4.2 新增 `adminGetPrepaidSummary`：储值卡未核销余额合计 + 次卡未核销价值合计（Σ 剩余次数 × 折算价）+ 本期新增预收（期内充值 + 售卡金额，period 参数同财务汇总）
- [x] 4.3 注册到 `cloudbaserc.json`；`initDatabaseIndexes` 补充新集合索引

## 5. 前端：卡种管理（会员卡管理页加「次卡」Tab）

- [x] 5.1 卡种列表（名称、售价、次数、适用大类、有效期、退卡规则、已售数量、状态）
- [x] 5.2 新建/编辑卡种表单：核销规则配置（大类选择、全部/指定基础项目、附加项勾选）、有效期、退卡规则；启停操作二次确认
- [x] 5.3 `src/constants/api.ts`、`src/services/`（新建 sessionCard.ts）、`src/types/` 类型

## 6. 前端：会员次卡与结算核销

- [x] 6.1 会员详情页「次卡」区块：持卡列表（卡种名、剩余/总次数、有效期、状态）、核销记录
- [x] 6.2 售卡弹窗：选择卡种（仅启用）、实收金额（默认售价）、支付方式；退卡弹窗（仅超管，显示折算退款额、必填原因）
- [x] 6.3 结算录入页：选定大类与基础项目且会员有匹配次卡时出现「次卡核销」选项；选中后展示抵扣明细，支付区只收剩余金额
- [x] 6.4 售卡金额一口价校验：前端按卡种自动填充并锁定实收金额，云函数强制实收等于售价，不等则拒绝

## 7. 前端：财务预收展示

- [x] 7.1 财务统计页新增预收区块：储值卡未核销余额、次卡未核销价值、本期新增预收

## 8. 测试

- [x] 8.1 属性测试：折算价计算（floor、整除）、核销匹配判定（大类不符/项目不在范围/过期/次数耗尽均拒绝）、只核销 1 次
- [x] 8.2 单元测试：service 层各新接口端点；退卡规则（none 拒绝 / prorated 折算）
- [x] 8.3 预收统计口径测试

## 9. 验证与部署

- [x] 9.1 `tsc --noEmit`、`eslint --max-warnings 0`、`vitest --run` 全部通过
- [x] 9.2 部署全部新增/修改云函数 + 索引初始化
- [x] 9.3 线上验证：建卡种 → 售卡 → 结算核销（含附加项另收费）→ 预收统计 → 退卡
- [x] 9.4 更新本 tasks.md 勾选状态
