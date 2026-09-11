# 普通管理员权限收紧：仅预约单模块

## 背景

当前权限体系仅在部分敏感写操作（约 22 个云函数）校验 `super_admin`，前端菜单与路由完全不做角色过滤，普通管理员可访问全部页面并调用大部分接口（含会员完整手机号、财务数据等敏感信息）。

## 目标（已与需求方确认）

普通管理员（role ≠ super_admin）**只能查看和操作预约单页面**，前后端双层拦截：

- 前端：侧边菜单仅显示「预约订单」；访问其他路由一律重定向到预约页；登录后默认落地预约页
- 后端：仅放行预约业务所需的白名单云函数，其余一律返回 FORBIDDEN
- 白名单：`adminLogout`、`adminGetAppointmentList`、`adminCreateAppointment`、`adminCancelAppointment`、`adminConfirmArrival`、`adminCompleteService`、`adminCreateSettlement`、`adminGetTechnicianList`、`adminGetServiceTemplates`、`adminGetMemberList`、`adminGetMemberDetail`、`adminGetDiscountLevels`、`adminGetMemberSessionCards`
- 「完成服务」（结算）允许普通管理员执行

## 会员数据保护（已与需求方确认）

- 预约/结算表单中的会员选择：普通管理员**默认不展示任何会员数据**，必须输入手机号后 4 位查询后选择
- `adminGetMemberList`：普通管理员必须携带 `phoneLast4`（4 位数字），仅返回尾号匹配的会员（接口层本已脱敏）
- `adminGetMemberDetail`：普通管理员调用时返回的会员手机号脱敏、不返回消费记录（结算流程仅需持卡信息）

## 影响范围

- 云函数：白名单外全部函数新增角色拦截（约 30 个待加，22 个已有 super_admin 校验保持不变）；`adminGetMemberList` / `adminGetMemberDetail` 增加角色化逻辑
- 前端：`AdminLayout`（菜单过滤 + 重定向）、`LoginPage`（落地页）、`AppointmentListPage` 与 `IncomeEntryModal`（会员尾号查询）、`src/services/member.ts`（参数扩展）
- 无数据库结构变更
