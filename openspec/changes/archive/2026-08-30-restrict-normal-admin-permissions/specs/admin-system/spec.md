# admin-system 规格增量

## ADDED Requirements

### Requirement: 普通管理员权限隔离

系统 SHALL 将普通管理员（role ≠ super_admin）的可用范围限制为预约单模块：前端 SHALL 仅展示「预约订单」菜单并在访问其他路由时重定向到预约页；后端 SHALL 仅放行预约业务白名单云函数（预约增查改、确认到店、完成服务、结算录入、技师/服务模板查询、折扣等级查询、会员次卡查询、会员列表、会员详情、登出），白名单外接口对普通管理员 SHALL 返回 FORBIDDEN。

普通管理员查询会员时 SHALL 先输入手机号后 4 位，系统 SHALL NOT 在未提供手机尾号时向普通管理员返回会员列表；普通管理员获取会员详情时系统 SHALL 返回脱敏手机号且 SHALL NOT 返回消费记录。

#### Scenario: 普通管理员菜单与路由

- **GIVEN** 一名普通管理员已登录
- **WHEN** 其访问任意非预约单路由（如 /members、/finance）
- **THEN** 系统 SHALL 重定向到 /appointments，且侧边菜单仅显示「预约订单」

#### Scenario: 白名单外接口拦截

- **WHEN** 普通管理员直接调用白名单外云函数（如 adminGetOperationLogs、adminGetFinanceStats）
- **THEN** 系统 SHALL 返回 FORBIDDEN 且不执行任何业务逻辑

#### Scenario: 会员尾号查询

- **WHEN** 普通管理员在预约或结算表单中查询会员但未提供手机号后 4 位
- **THEN** 系统 SHALL 拒绝返回会员数据并提示输入手机尾号
- **WHEN** 提供合法 4 位尾号
- **THEN** 系统 SHALL 仅返回尾号匹配的脱敏会员数据供选择

#### Scenario: 普通管理员完成服务

- **WHEN** 普通管理员对"服务中"的预约执行完成服务并提交合法结算表单
- **THEN** 系统 SHALL 正常完成结算与状态更新，不做超级管理员限制
