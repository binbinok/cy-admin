## MODIFIED Requirements

### Requirement: 提成核算

系统 SHALL 将提成划分为三类：手工提成（`manual`）、开卡提成（`card_open`）、续卡提成（`card_renew`），三类比例独立配置、全员生效，系统 SHALL NOT 按技师单独配置比例。

WHEN 管理员设置提成比例 THEN 系统 SHALL 以全局配置保存三类比例（各为 0%–100% 整数），默认值 SHALL 为手工 20%、开卡 10%、续卡 5%，并对后续业务生效。

WHEN 技师完成结算 THEN 系统 SHALL 按实际收入 × 全局手工提成比例计提；实际收入 = 实收金额 + 次卡覆盖金额（次卡覆盖项按项目原价计入），与财务统计收入口径一致；自定义附加项与改价金额 SHALL 计入实际收入。

WHEN 管理员手工录入收入 THEN 系统 SHALL 同样按实收金额 × 全局手工提成比例补写手工提成记录。

WHEN 次卡核销 THEN 系统 SHALL NOT 再按卡种单次折算价单独计提提成，覆盖项目价值 SHALL 随结算单实际收入统一计提。

WHEN 管理员为会员开通储值卡或售出次卡 THEN 系统 SHALL 要求指定提成员工（必填），按首充金额（储值卡）或实收金额（次卡）× 全局开卡提成比例为该员工计提开卡提成。

WHEN 管理员为会员储值卡充值 THEN 系统 SHALL 要求指定提成员工（必填），按充值金额 × 全局续卡提成比例为该员工计提续卡提成。

提成记录 SHALL 携带类型字段（`manual` / `card_open` / `card_renew`）与 `serviceTime` 业务归属时间；历史无类型记录 SHALL 归入手工提成，历史无 `serviceTime` 记录 SHALL 回退按 `createdAt` 归属。卡注销与次卡退款 SHALL NOT 回溯已计提的提成。

WHEN 管理员查看提成报表 THEN 系统 SHALL 显示指定时间段内每位技师的完成服务次数、服务总金额、手工提成、开卡提成、续卡提成与提成合计；时间段 SHALL 按 `serviceTime` 过滤；各类提成金额 SHALL 按当前全局比例对记录基数实时重算（比例调整后报表立即反映新比例），记录中计提时的快照金额 SHALL 保留供审计。

WHEN 管理员导出技师工资条 THEN 系统 SHALL 按当前全局比例对该技师当月提成记录基数实时重算应得提成，手工、开卡、续卡记录 SHALL 分别按对应类型比例计算，提成记录 SHALL 按 `serviceTime` 归属月份。

#### Scenario: 全局比例配置

- **WHEN** 管理员在提成核算页修改三类全局比例并保存
- **THEN** 系统 SHALL 保存全局配置并对后续业务生效，不区分技师

#### Scenario: 自定义提成比例

- **WHEN** 管理员设置提成比例
- **THEN** 系统 SHALL 以全局配置保存手工、开卡、续卡三类比例
- **AND** 系统 SHALL 对后续完成的结算、开卡与充值生效
- **AND** 系统 SHALL NOT 再按技师单独配置比例

#### Scenario: 提成比例验证

- **WHEN** 管理员设置的任一类提成比例不在 0%–100% 整数范围内
- **THEN** 系统 SHALL 拒绝保存并提示有效范围

#### Scenario: 默认提成计算

- **WHEN** 全局提成配置不存在
- **THEN** 系统 SHALL 按默认比例手工 20%、开卡 10%、续卡 5% 计算提成

#### Scenario: 手工提成计算

- **WHEN** 技师完成结算
- **THEN** 系统 SHALL 按（实收金额 + 次卡覆盖金额）× 全局手工提成比例计提，类型记为 `manual`
- **AND** 提成记录 SHALL 写入 `serviceTime` 与结算服务时间一致

#### Scenario: 会员折扣单提成

- **WHEN** 一笔结算使用会员卡折扣（实收低于原价）
- **THEN** 提成基数 SHALL 为折后实收金额，而非原价

#### Scenario: 次卡核销单提成

- **WHEN** 一笔结算由次卡全额覆盖（实收为 0）
- **THEN** 提成基数 SHALL 为覆盖项目的原价金额
- **AND** 系统 SHALL NOT 按卡种单次折算价另行计提

#### Scenario: 手工收入录入提成

- **WHEN** 管理员通过收入录入创建一笔实收 10000 分的收入
- **THEN** 系统 SHALL 写入一条 `manual` 提成记录，基数为 10000 分，`serviceTime` 与录入服务时间一致

#### Scenario: 提成报表

- **WHEN** 管理员查看提成报表
- **THEN** 系统 SHALL 显示每位技师的完成服务次数、服务总金额、手工提成、开卡提成、续卡提成与提成合计
- **AND** 提成记录 SHALL 按 `serviceTime` 归属统计时间段
- **AND** 各类提成金额 SHALL 按当前全局比例对记录基数实时重算
- **AND** 历史无类型记录 SHALL 计入手工提成列

#### Scenario: 比例调整后报表重算

- **WHEN** 管理员调整全局提成比例后刷新提成报表
- **THEN** 报表中的各类提成金额 SHALL 立即按新比例重算展示

#### Scenario: 工资条按当前比例计算

- **WHEN** 管理员导出技师某月工资条
- **THEN** 应得提成 SHALL 按当前全局比例对该技师当月提成记录基数实时重算
- **AND** 提成记录 SHALL 按 `serviceTime` 归属月份

#### Scenario: 开卡提成

- **WHEN** 管理员开通储值卡（首充 50000 分）或售出次卡（实收 68000 分）并指定提成员工
- **THEN** 系统 SHALL 按首充/实收金额 × 全局开卡比例为指定员工计提 `card_open` 提成
- **AND** 未指定提成员工时系统 SHALL 拒绝提交

#### Scenario: 续卡提成

- **WHEN** 管理员为储值卡充值并指定提成员工
- **THEN** 系统 SHALL 按充值金额 × 全局续卡比例为指定员工计提 `card_renew` 提成
