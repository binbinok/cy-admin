# admin-system 规格增量

## MODIFIED Requirements

### Requirement: 会员卡充值

WHEN 管理员为会员充值会员卡 THEN 系统 SHALL 要求输入充值金额（大于 0，单位：分），仅对使用中（active）的会员卡执行充值，更新会员卡余额与累计充值并生成充值流水记录；无 active 卡时系统 SHALL 拒绝并引导先开通会员卡。

IF 会员卡关联的折扣等级配置了最低充值门槛 `minRechargeAmount` THEN 充值金额 SHALL 不低于该门槛，否则系统 SHALL 拒绝充值并提示门槛金额。

WHEN 充值金额达到更高折扣等级的 `minRechargeAmount` 门槛 THEN 系统 SHALL 在本次充值中自动将会员卡升级到满足门槛的最高等级（等级高低按 `minRechargeAmount` 升序推导，门槛相同按 `discountRate` 小者为高），支持跨级升级，且只升不降。

WHEN 充值触发升级 THEN 系统 SHALL 在会员卡文档的 `levelHistory` 中追加变更记录（原/新等级 ID 与名称、trigger='recharge'、充值金额、操作人、时间），在充值流水中携带升级信息，记录 `action: 'upgrade_card_level'` 操作日志，并在响应中返回 `levelUpgraded`（原/新等级）。

#### Scenario: 会员卡充值
- **WHEN** 管理员为会员充值会员卡
- **THEN** 系统 SHALL 要求输入充值金额（大于 0）
- **AND** 系统 SHALL 更新会员卡余额并生成充值流水记录

#### Scenario: 普通充值不升级

- **WHEN** 管理员为会员充值且金额不低于当前等级门槛、但未达到任何更高等级门槛
- **THEN** 系统 SHALL 更新余额与累计充值、生成充值流水
- **AND** 会员卡等级 SHALL 保持不变

#### Scenario: 充值达标自动升级

- **WHEN** 管理员为银卡会员充值且金额达到金卡等级的最低充值门槛
- **THEN** 系统 SHALL 将会员卡升级为满足门槛的最高等级
- **AND** 系统 SHALL 写入 levelHistory、升级操作日志并在响应中返回 levelUpgraded

#### Scenario: 只升不降

- **WHEN** 高等级会员卡发生一笔仅满足当前等级门槛的充值
- **THEN** 系统 SHALL 保持原等级，不产生等级变更记录

#### Scenario: 低于当前等级门槛被拒绝

- **WHEN** 充值金额低于会员卡当前等级的最低充值门槛
- **THEN** 系统 SHALL 拒绝充值并提示该等级的最低充值金额

## ADDED Requirements

### Requirement: 管理员手动调整会员卡等级

WHEN 超级管理员调整会员卡的折扣等级 THEN 系统 SHALL 要求指定目标等级并填写调整原因（必填），校验会员持有使用中（active）的会员卡、目标等级存在且与当前等级不同，校验通过后更新 `discountLevelId`。

系统 SHALL 允许上调与下调（用于错充纠正等兜底场景），且仅超级管理员可执行该操作。

WHEN 手动调整成功 THEN 系统 SHALL 在 `levelHistory` 中追加记录（trigger='manual'，含调整原因）并记录操作日志。

#### Scenario: 超管手动调整等级

- **WHEN** 超级管理员选择目标等级、填写调整原因并确认
- **THEN** 系统 SHALL 更新会员卡等级、写入 levelHistory（trigger='manual'）与操作日志

#### Scenario: 非超管被拒绝

- **WHEN** 非超级管理员尝试调整会员卡等级
- **THEN** 系统 SHALL 拒绝并返回权限错误

#### Scenario: 调整原因为空被拒绝

- **WHEN** 调整原因未填写
- **THEN** 系统 SHALL 拒绝调整并提示原因必填

### Requirement: 会员卡等级变更记录展示

WHEN 管理员查看会员详情页持卡信息 THEN 若该卡存在等级变更历史，系统 SHALL 展示等级变更记录（时间、原等级 → 新等级、触发方式、操作人）。

WHEN 管理员在充值弹窗输入金额 THEN 若金额达到更高等级门槛，系统 SHALL 实时提示可升级到的等级名称与折扣；未达任何更高门槛时 SHALL 不提示。

#### Scenario: 展示等级变更记录

- **WHEN** 会员卡发生过等级升级或手动调整
- **THEN** 会员详情页持卡区 SHALL 按时间展示每次变更的原/新等级与触发方式

#### Scenario: 充值时升级提示

- **WHEN** 管理员在充值弹窗输入达到金卡门槛的金额
- **THEN** 系统 SHALL 提示「充值 ¥X 可升级至【金卡】（N 折）」
