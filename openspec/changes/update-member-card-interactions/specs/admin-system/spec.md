# admin-system 规格增量

## MODIFIED Requirements

### Requirement: 会员信息编辑

WHEN 管理员编辑会员信息 THEN 系统 SHALL 允许修改昵称（2–20 字符）、手机号（符合 `1[3-9]\d{9}` 格式）和生日（YYYY-MM-DD 格式）。

生日字段 SHALL 使用日期选择器录入（与新建会员表单一致），系统 SHALL 在提交时格式化为 `YYYY-MM-DD`，未选择生日时 SHALL 不更新该字段。

#### Scenario: 编辑会员生日

- **WHEN** 管理员打开编辑会员表单并通过日期选择器选择生日
- **THEN** 系统 SHALL 以 `YYYY-MM-DD` 格式保存生日
- **AND** 首页生日提醒与生日会员页 SHALL 正常识别该会员

## ADDED Requirements

### Requirement: 会员卡账户化开通

会员卡 SHALL 作为会员名下的储值折扣账户，与会员 1:1 归属，不支持绑定/解绑/流通。

WHEN 管理员为无卡会员开通会员卡 THEN 系统 SHALL 要求选择折扣等级并输入首充金额（大于 0 且不低于该等级的最低充值门槛 `minRechargeAmount`），创建归属该会员的储值卡（余额与累计充值等于首充金额），生成充值流水记录，并记录操作日志。

IF 首充金额低于所选等级的最低充值门槛 THEN 系统 SHALL 拒绝开通并提示该等级的最低充值金额。

IF 该会员已持有使用中（active）的会员卡 THEN 系统 SHALL 拒绝重复开通。

WHEN 会员的存在中的卡被注销后 THEN 系统 SHALL 允许为该会员再次开通新卡，历史卡留档可审计。

#### Scenario: 开通会员卡

- **WHEN** 管理员在会员详情页选择折扣等级并确认开通
- **THEN** 系统 SHALL 创建归属该会员的储值卡并记录操作日志

#### Scenario: 重复开通被拒绝

- **WHEN** 管理员为已持有使用中会员卡的会员发起开通
- **THEN** 系统 SHALL 拒绝并提示该会员已持有使用中的会员卡

### Requirement: 注销会员卡校验与留痕

WHEN 管理员注销会员的会员卡 THEN 系统 SHALL 要求填写注销原因、输入该会员手机号后 4 位、输入当前管理员登录密码，三者校验全部通过后才执行注销。

IF 手机号后 4 位不匹配或管理员密码错误 THEN 系统 SHALL 拒绝注销并提示对应错误。

WHEN 被注销卡余额大于 0 THEN 系统 SHALL 要求选择余额处理方式（已线下退款，余额留档 / 余额清零），并在确认界面红色警示。

WHEN 注销成功 THEN 系统 SHALL 将卡状态置为 cancelled 留档在原会员名下，在操作日志中记录注销原因与余额处理方式，并在会员卡文档上记录 `cancelReason`、`cancelledAt`、`cancelledBy`、`balanceAction`。

WHEN 查询会员持卡信息或结算用卡 THEN 系统 SHALL 只识别使用中（active）的会员卡，已注销卡 SHALL 不参与折扣与扣款。

#### Scenario: 校验通过完成注销

- **WHEN** 管理员填写原因、正确的手机号后 4 位与管理员密码并确认注销
- **THEN** 系统 SHALL 注销该卡、写入含原因的操作日志并在卡文档上记录注销信息

#### Scenario: 校验失败拒绝注销

- **WHEN** 管理员输入的手机号后 4 位与会员手机号不匹配或管理员密码错误
- **THEN** 系统 SHALL 拒绝注销并保持卡状态不变

#### Scenario: 带余额卡注销需选择余额处理方式

- **WHEN** 管理员注销一张余额大于 0 的会员卡且未选择余额处理方式
- **THEN** 系统 SHALL 拒绝注销并提示选择余额处理方式

### Requirement: 会员卡充值入口

WHEN 管理员为会员充值 THEN 系统 SHALL 只对使用中（active）的会员卡充值，更新余额与累计充值并生成充值流水记录。

IF 会员暂无使用中的会员卡 THEN 系统 SHALL 拒绝充值并提示先开通会员卡，系统 SHALL NOT 自动创建无折扣等级的卡。

IF 充值金额低于该卡折扣等级的最低充值门槛 THEN 系统 SHALL 拒绝充值并提示该等级的最低充值金额。

#### Scenario: 无卡会员充值被拒绝

- **WHEN** 管理员为无卡会员发起充值
- **THEN** 系统 SHALL 拒绝并提示先开通会员卡
