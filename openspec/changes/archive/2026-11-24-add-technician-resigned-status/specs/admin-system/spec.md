# admin-system 规格增量

## ADDED Requirements

### Requirement: 技师离职状态

系统 SHALL 为技师提供 `resigned`（离职）状态，与 空闲/服务中/休息 并列。将技师置为离职时，若其存在 pending 或 in_service 状态的预约，系统 SHALL 拒绝并提示先处理未完成预约。离职技师 SHALL NOT 出现在预约表单、收入录入、预约看板的技师选项中。

#### Scenario: 设置离职

- **GIVEN** 一名无未完成预约的在职技师
- **WHEN** 超级管理员在技师管理页执行「设为离职」并二次确认
- **THEN** 系统 SHALL 将其状态置为 resigned

#### Scenario: 有未完成预约时拦截

- **GIVEN** 一名技师存在 pending 或 in_service 状态的预约
- **WHEN** 管理员尝试将其设为离职
- **THEN** 系统 SHALL 拒绝该操作并提示存在未完成预约

#### Scenario: 离职技师不可被新预约

- **WHEN** 管理员在预约表单、收入录入弹窗或预约看板中选择技师
- **THEN** 系统 SHALL NOT 在选项中展示离职技师

### Requirement: 离职员工报表展示控制

财务统计-技师业绩表与提成核算报表 SHALL 默认隐藏离职技师的数据行，并提供「显示离职员工」开关；勾选后 SHALL 展示包含离职技师的完整数据。技师管理列表 SHALL 提供状态筛选，使管理员能够找回离职技师并恢复其状态。

#### Scenario: 默认隐藏

- **GIVEN** 存在离职技师的历史业绩/提成数据
- **WHEN** 超级管理员打开财务统计-技师业绩表或提成核算报表
- **THEN** 系统 SHALL 默认仅展示在职技师的行

#### Scenario: 勾选后展示

- **WHEN** 用户勾选「显示离职员工」
- **THEN** 系统 SHALL 展示包含离职技师在内的全部行

#### Scenario: 找回离职技师

- **WHEN** 管理员在技师管理页按状态筛选「离职」
- **THEN** 系统 SHALL 列出全部离职技师，并允许将其状态改回在职
