# 项目背景

## 项目目标
cy-admin 是一个面向美甲美睫门店的 PC 管理系统。系统提供员工账号、会员、技师、服务项目、预约、财务、提成、会员卡和操作日志等后台管理能力。管理端与用户端微信小程序共享同一套 CloudBase 后端与数据库。

## 技术栈
- 前端：React 18、TypeScript、Vite
- UI：Ant Design 5、@ant-design/charts
- 状态/数据：Zustand、@tanstack/react-query、axios
- 路由：react-router-dom v6
- 后端：CloudBase 云函数（Node.js 18，CommonJS）
- 数据库：CloudBase 文档数据库（MongoDB-like）
- 测试：Vitest、fast-check（单元测试 + 属性测试）
- 云集成：CloudBase HTTP API 与微信生态集成

## 项目约定

### 代码风格
- 前端代码优先使用 TypeScript；云函数使用 JavaScript（CommonJS）
- 采用按功能分层的目录结构：`src/pages`、`src/services`、`src/stores`、`src/utils`、`src/types`
- 对业务输入做显式校验（用户名/密码、手机号、金额、折扣比例、提成比例）
- API 封装统一放在 `src/services/*`，页面组件避免直接发起 HTTP 请求
- 工具逻辑尽量保持纯函数（格式化、积分、提成、JWT 解析）
- UI、服务层与规格文档中的领域术语保持一致（会员、技师、预约、会员卡）

### 架构模式
- 管理端采用 SPA 分层架构：pages/components → services → HTTP client
- 认证状态与 UI 状态通过 Zustand 集中管理
- 服务端状态通过 React Query 统一处理拉取、缓存与异步变更
- 使用 Axios 请求/响应拦截器统一注入 token 并处理 401
- 后端资源共享：管理端 Web 与小程序端复用 CloudBase 后端能力
- 按业务能力拆分模块：auth、member、technician、service、appointment、finance、commission、member-card、operation-log

### 测试策略
- 测试运行器：Vitest
- 属性测试：fast-check
- 测试目录：
  - `tests/unit/` 用于单元测试
  - `tests/property/` 用于属性/不变量测试
- 重点覆盖业务规则校验：
  - 积分与提成计算
  - 状态流转（预约、技师）
  - 输入与范围校验（价格、折扣比例、提成比例、凭证）
- 在进入后续实现阶段前使用检查点运行测试，确保模块质量

### Git 工作流
- 以 spec/task 拆解为驱动，确保实现过程可追溯到需求
- 提交按模块划分（auth、member、technician 等），避免混合无关改动
- 代码推进时同步更新任务与规格文件中的状态清单
- 合并前执行验证命令（测试/lint/typecheck，按项目可用脚本为准）
- 以 OpenSpec 的 changes 目录作为变更计划与完成状态的事实来源

## 领域上下文
- 业务领域：美甲美睫门店会员运营管理
- 核心实体：
  - 管理员/超级管理员账号
  - 会员与会员等级（普通、银卡、金卡、钻石）
  - 技师、排班与可服务时段
  - 服务项目与预约订单
  - 消费记录与积分记录
  - 会员卡与折扣等级
  - 操作日志
- 关键业务规则：
  - 会员等级按累计消费阈值升级
  - 积分规则：每消费 1 元获得 10 积分
  - 技师默认提成 30%，支持按技师配置（1%–100%）
  - 生日祝福通知同一会员每月最多发送一次
  - 涉及隐私的手机号默认脱敏展示

## 重要约束
- 所有管理端 API 调用必须经过认证；token 缺失或无效时返回 401
- 会话在无操作 2 小时后自动失效
- 连续登录失败 5 次后账号锁定 30 分钟
- 金额相关计算应优先使用整数最小单位存储/处理，避免精度误差
- 服务下架时，已有预约必须保持有效
- 删除与状态变更操作必须进行确认与安全校验（例如技师存在未完成预约）

## 外部依赖
- 腾讯云 CloudBase（环境、云函数、云数据库）
- CloudBase HTTP API（用于云函数调用）
- 微信小程序生态（与 C 端共享后端与数据契约）
- npm 生态依赖：
  - `react`、`typescript`、`vite`
  - `antd`、`@ant-design/charts`
  - `zustand`、`@tanstack/react-query`、`axios`
  - `vitest`、`fast-check`
