# admin-system 规格增量

## ADDED Requirements

### Requirement: 操作日志可读性展示

系统 SHALL 在写入操作日志时记录操作对象名称 `targetName`（会员姓名、散客姓名、折扣等级名、次卡卡种名、服务模板名、技师姓名或管理员用户名），日志详情文案 SHALL 使用名称而非数据库 ID 描述操作对象。

操作日志列表 SHALL 将操作类型与操作对象以中文文案展示，SHALL 展示操作对象名称而非对象 ID，且 SHALL NOT 展示 IP 地址列；历史日志缺少 `targetName` 时 SHALL 以占位符回退展示。

#### Scenario: 新日志包含对象名称

- **WHEN** 管理员为会员"张三"开通折扣等级"黄金卡"的会员卡
- **THEN** 操作日志 SHALL 记录 `targetType: 'member_card'`、`targetName: '黄金卡'`，详情文案 SHALL 包含"张三"与"黄金卡"而非其数据库 ID

#### Scenario: 日志列表中文展示

- **WHEN** 管理员打开操作日志列表
- **THEN** 操作类型列 SHALL 展示中文（如"开通会员卡"），操作对象列 SHALL 展示对象名称，且列表 SHALL NOT 包含 IP 地址列

#### Scenario: 历史日志回退

- **GIVEN** 一条无 `targetName` 字段的历史日志
- **WHEN** 列表渲染该条日志
- **THEN** 操作对象名称列 SHALL 以占位符（如 `-`）回退展示
