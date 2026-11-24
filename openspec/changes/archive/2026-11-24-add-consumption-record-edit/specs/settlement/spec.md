# settlement 规格增量

## ADDED Requirements

### Requirement: 消费记录修改

系统 SHALL 允许超级管理员修改消费记录的服务时间与备注，其他字段（金额、支付方式、服务项目、技师）SHALL NOT 通过本功能修改。修改 SHALL 校验记录存在性与服务时间格式，并 SHALL 写入操作日志（动作 `update_consumption_record`）。修改服务时间时，若该记录原为对应会员最近一条消费，系统 SHALL 同步更新该会员的 `lastConsumptionAt`。

#### Scenario: 修改服务时间

- **GIVEN** 一条已存在的消费记录
- **WHEN** 超级管理员提交合法的新服务时间
- **THEN** 系统 SHALL 更新该记录的 `serviceTime` 与 `updatedAt`

#### Scenario: 非超级管理员被拒绝

- **GIVEN** 一个非超级管理员身份
- **WHEN** 调用消费记录修改
- **THEN** 系统 SHALL 返回权限不足错误

#### Scenario: 服务时间格式不正确

- **WHEN** 提交无法解析为有效时间的服务时间
- **THEN** 系统 SHALL 返回校验错误且不修改记录

#### Scenario: 记录不存在

- **GIVEN** 一个不存在的记录 ID
- **WHEN** 调用消费记录修改
- **THEN** 系统 SHALL 返回校验错误

#### Scenario: 修改写入操作日志

- **GIVEN** 一次成功的消费记录修改
- **WHEN** 系统完成更新
- **THEN** 系统 SHALL 在操作日志中记录动作 `update_consumption_record`、目标记录 ID 与操作人

#### Scenario: 会员最近消费时间同步

- **GIVEN** 一条关联会员、且为该会员最近一条的消费记录
- **WHEN** 超级管理员修改其服务时间
- **THEN** 系统 SHALL 将该会员的 `lastConsumptionAt` 更新为新的服务时间
