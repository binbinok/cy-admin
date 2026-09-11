# 调整：会员表单交互与会员卡账户化改造

## Why

会员详情页存在交互与安全短板，且卡的"实体化"设计过重：

- 编辑会员表单的生日为手输文本（YYYY-MM-DD），与新建会员表单的日期选择器体验不一致；
- 会员卡原设计为可绑定/解绑/流通的实体卡，"空闲卡"概念带来管理负担与储值转移风险（带余额的解绑卡可被关联给其他会员）；
- 会员卡对门店的真实语义是"会员名下的储值折扣账户"，1:1 归属、不流通；
- 解除关联点击后立即执行，无身份校验、无原因记录；充值弹窗为桩代码（假成功，未调接口）。

## What Changes

### 编辑会员生日统一为日期选择器
- 编辑会员表单的生日字段由手输 Input 改为 `DatePicker`（与新建会员表单一致），提交时格式化为 `YYYY-MM-DD`，存储格式不变。

### 会员卡账户化（卡 = 会员名下储值折扣账户，1:1 不流通）
- 新增云函数 `adminCreateMemberCard`：选择折扣等级 + 首充金额（必填 > 0 且满足该等级 `minRechargeAmount` 最低充值门槛）为会员开通储值卡（余额=首充金额，直接归属该会员），生成充值流水；已有 active 卡的会员拒绝重复开通，注销后可再开。
- **废弃** `adminBindMemberCard` / `adminUnbindMemberCard` / `adminGetAvailableMemberCards`（空闲卡概念消失），前端同步移除。
- 历史遗留空闲卡（`memberId=''`）一次性冻结留档。

### 注销会员卡（替代"解除关联"）
- 新增云函数 `adminCancelMemberCard`：卡状态置 `cancelled` 留档在原会员名下，卡永不流通。
- 校验链：仅超级管理员 → 必填注销原因 → 会员手机号后 4 位匹配 → 当前管理员密码（bcrypt 比对，兼容历史明文）。
- 余额 > 0 时必填 `balanceAction`：`refunded_offline`（已线下退款，余额留档）/ `cleared`（余额清零）。
- 留痕：`operation_logs.detail` 携带原因与余额处理方式；`member_cards` 记录 `cancelReason` / `cancelledAt` / `cancelledBy` / `balanceAction`。
- 前端注销弹窗：卡片摘要、余额 > 0 时红色警示并必选余额处理方式、原因下拉（会员要求退卡 / 操作错误 / 其他，选「其他」必填备注）、手机号后 4 位、管理员密码。

### 充值修复与状态口径统一
- **BREAKING（行为变更）**：`adminRechargeCard` 删除"无卡自动创建白板卡"分支，且仅对 `status='active'` 的卡充值，无卡时报错引导先开通。
- 修复会员详情页充值弹窗桩代码，真正调用 `adminRechargeCard`（元转分）。
- 入口互斥：会员有卡只显示「充值」「注销会员卡」；无卡只显示「开通会员卡」。
- `adminGetMemberDetail` / `adminGetMemberCardAssociation` 的持卡查询增加 `status='active'` 过滤，已注销卡不再展示为持卡信息。

## Impact

- 受影响规格：`admin-system`（会员编辑、会员卡开通/注销）
- 云函数：新增 `adminCreateMemberCard`、`adminCancelMemberCard`；修改 `adminRechargeCard`、`adminGetMemberDetail`、`adminGetMemberCardAssociation`；删除 `adminBindMemberCard`、`adminUnbindMemberCard`、`adminGetAvailableMemberCards`
- 前端：`src/pages/member/MemberDetailPage.tsx`、`src/services/memberCard.ts`、`src/types/member.ts`、`src/constants/api.ts`
- 配置：`cloudbaserc.json` 同步增删
- 数据：历史空闲卡冻结留档（已执行）
