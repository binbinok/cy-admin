# 技术设计：cy-admin PC 管理系统（提案对齐版）

## Context

`sepc` 文档定义了 cy-admin 管理端与小程序共享 CloudBase 后端的完整方案。当前 OpenSpec 设计文档与其存在实现路径差异（调用链、存储策略、云函数粒度），需要统一设计事实来源，避免实现阶段出现双轨标准。

## Goals / Non-Goals

- Goals:
  - 与 `requirements.md`、`design.md`、`tasks.md` 对齐系统架构、认证流程、接口清单与数据模型
  - 统一管理端调用方式为 CloudBase HTTP API + axios 封装
  - 统一会话管理为 `localStorage` 持久化 + 启动恢复 + 过期清理 + 401 处理
  - 保持 11 个业务模块的一致能力边界
- Non-Goals:
  - 不改变小程序端现有业务流程
  - 不引入新的基础设施或替换 CloudBase
  - 不重写既有云函数业务语义

## Decisions

- Decision: 前端采用 React + Ant Design + React Query + Zustand 的分层结构
  - Rationale: 与 `sepc` 架构图一致，职责边界清晰，便于按业务模块扩展
- Decision: 通过 CloudBase HTTP API 调用云函数，服务层由 `src/services/http.ts` 统一封装
  - Rationale: 与设计文档一致，便于统一注入 `Authorization: Bearer {token}` 与统一错误处理
- Decision: 认证采用 JWT，令牌和管理员信息存储在 `localStorage`
  - Rationale: 满足“关闭浏览器后自动恢复登录态”验收标准，并支持应用启动 `rehydrate`
- Decision: 管理端云函数按业务动作拆分（如 `adminGetMemberList`、`adminCompleteService`）
  - Rationale: 与接口清单一致，便于授权控制、灰度发布与问题定位
- Decision: 统一响应结构 `{ success, data | error }`，错误码标准化
  - Rationale: 提升前后端契约稳定性，降低页面层分支复杂度

## Risks / Trade-offs

- 风险：管理端和小程序共享集合，字段语义变更可能产生联动风险
  - 缓解：保持向后兼容字段，新增字段默认值可回退，关键流程增加属性测试
- 风险：Token 与无操作超时的双重失效策略可能引起边界条件
  - 缓解：统一在 `authStore` + `http` 拦截器处理，增加过期与 401 回归测试
- 风险：云函数数量增加后维护成本上升
  - 缓解：复用 `_shared` 公共模块并约束统一错误码/响应格式

## Migration Plan

1. 对齐提案文档：`proposal.md`、`design.md`、`tasks.md`、`spec delta`
2. 统一实现约束：HTTP API 调用、`localStorage`、JWT 过期与 401 流程
3. 按任务清单逐模块验证：认证、会员、技师、服务、预约、财务、提成、会员关系、会员卡、日志、安全
4. 使用测试检查点确保一致性：`vitest` 单元 + `fast-check` 属性测试

## Open Questions

- 是否需要在提案阶段明确“管理员禁用后立即失效所有活跃会话”的实现机制（黑名单版本号 vs 服务端状态强校验）？
- 生日祝福通知失败重试策略是否作为本提案范围内要求，还是作为后续增强提案单独处理？
