# Change: 新增 cy-admin PC 管理系统提案对齐

## Why

现有 OpenSpec 提案与最新 `sepc` 文档存在偏差（如调用方式、Token 持久化方式、云函数拆分粒度和部分需求场景），会导致后续实现与验收标准不一致。需要将提案统一到 `design.md`、`requirements.md`、`tasks.md` 的最新版本，确保需求、设计与任务三者可追溯。

## What Changes

- 将管理端调用方式统一为 CloudBase HTTP API（`/api/v2/envs/{envId}/functions/{name}/invoke`）+ axios 封装，不再使用 `cloudbase/js-sdk` `callFunction` 作为主路径
- 将会话持久化策略统一为 `localStorage`（token + adminInfo），并明确启动恢复、过期清理、401 统一处理与 2 小时无操作自动注销
- 统一云函数能力边界为“按业务动作拆分”的函数清单（如 `adminGetMemberList`、`adminCompleteService`、`adminUpdateCommissionRate` 等）
- 对齐 11 个业务模块的需求覆盖：账号、会员、技师、服务、预约、财务、提成、会员关系、会员卡、操作日志、数据安全
- 补充与对齐规范中的关键验收细节：性能 SLA（1 秒/3 秒）、手机号脱敏展示、二次确认、生日祝福防重、服务下架不影响存量预约

## Impact

- 受影响 specs：`admin-system`
- 受影响变更文件：`openspec/changes/add-pc-admin-management-system/{proposal.md,design.md,tasks.md,specs/admin-system/spec.md}`
- 受影响代码范围（参考）：`src/` 前端模块、`cloudfunctions/` 管理端云函数、`tests/` 单元与属性测试
- 数据影响：沿用共享集合并新增 `admin_accounts`、`member_cards`、`card_discount_levels`、`technician_service_slots`、`commission_records`、`operation_logs`
- Breaking change：无（与小程序共享后端契约，新增能力不破坏用户端）

## Summary

本次提案更新不改变目标能力范围，核心是将 OpenSpec 文档与 `sepc` 三件套严格对齐，形成一致的“需求-设计-任务-验收”基线，为后续实现与归档提供单一事实来源。
