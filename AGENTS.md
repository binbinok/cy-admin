# cy-admin — AI 助手项目指南

`cy-admin` 是一个美甲美睫店铺的 PC 端后台管理系统。采用 React 18 + Vite + TypeScript 构建前端，CloudBase（腾讯云开发）云函数 + NoSQL 数据库作为后端。本文档面向 AI 编码助手，帮助你快速理解项目结构、技术栈和开发约定。

---

## 项目概览

- **名称**: cy-admin
- **类型**: 单页应用（SPA）后台管理系统
- **业务领域**: 美甲美睫店铺运营管理（会员、技师、服务、预约、财务、提成、会员卡、操作日志）
- **部署目标**: CloudBase 静态网站托管 + 云函数

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.3.1 | UI 框架 |
| TypeScript | ^5.9.3 | 类型系统 |
| Vite | ^5.4.21 | 构建工具 + 开发服务器 |
| Ant Design | ^5.29.3 | UI 组件库 |
| React Router | ^6.30.3 | 前端路由（HashRouter） |
| React Query (TanStack) | ^5.91.2 | 服务端状态管理 / 数据获取 |
| Zustand | ^5.0.12 | 客户端状态管理（auth + UI） |
| @cloudbase/js-sdk | ^2.9.0 | 调用 CloudBase 云函数 |
| dayjs | ^1.11.19 | 日期处理 |
| @ant-design/charts | ^2.6.7 | 数据可视化图表 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| CloudBase 云函数 | Nodejs18.15 | 事件型云函数（不可更改 runtime） |
| wx-server-sdk | ^3.0.1 | 云函数内操作 CloudBase 数据库 |
| bcryptjs | ^2.4.3 | 密码哈希 |
| jsonwebtoken | ^9.0.0 | JWT 签发与校验 |

### 开发工具

| 技术 | 版本 | 用途 |
|------|------|------|
| Vitest | ^2.1.9 | 单元测试 + 覆盖率 |
| jsdom | ^28.1.0 | 测试 DOM 环境 |
| @testing-library/react | ^16.3.2 | React 组件测试 |
| fast-check | ^4.6.0 | 基于属性的测试 |
| ESLint | ^9.39.4 | 代码检查 |
| Prettier | ^3.8.1 | 代码格式化 |
| vite-plugin-checker | ^0.13.0 | 开发时 TypeScript 类型检查 |

---

## 项目结构

```
cy-admin/
├── cloudfunctions/           # 云函数目录（57 个函数）
│   ├── _shared/              # 根级共享模块（auth.js, db.js, response.js, errors.js, token.js）
│   ├── adminLogin/           # 每个函数独立目录
│   │   ├── index.js          # 函数入口：exports.main = async (event, context) => {}
│   │   ├── _shared/          # 实际部署时复制到每个函数目录下
│   │   └── package.json      # 云函数级依赖（wx-server-sdk, bcryptjs, jsonwebtoken）
│   ├── adminGetMemberList/
│   └── ...                   # 其他云函数
├── src/                      # 前端源码（TypeScript / TSX）
│   ├── components/           # 可复用组件
│   │   ├── charts/           # 图表组件
│   │   ├── common/           # 通用组件（ConfirmModal, PhoneDisplay）
│   │   └── layout/           # 布局组件（AdminLayout, AuthGuard）
│   ├── constants/            # 常量（api.ts 云函数名, business.ts 业务常量）
│   ├── pages/                # 页面组件（按业务域分组）
│   ├── services/             # 领域服务：封装云函数调用
│   ├── stores/               # Zustand 状态管理（authStore, uiStore）
│   ├── types/                # TypeScript 类型定义（按领域分文件）
│   ├── utils/                # 工具函数（commission, discount, format, jwt, points, validation）
│   ├── App.tsx               # 路由定义 + 懒加载页面
│   └── main.tsx              # React 根组件、QueryClient、auth 状态重水合
├── tests/                    # 测试代码
│   ├── setup.ts              # 测试全局配置（引入 @testing-library/jest-dom）
│   ├── unit/                 # 单元测试（页面、服务、store、工具函数）
│   └── property/             # 基于属性的测试（fast-check）
├── rules/                    # CloudBase 开发规则文档（AI 参考用）
├── dist/                     # Vite 构建输出（静态托管）
├── doc/                      # 项目文档（specs, steering）
├── openspec/                 # OpenSpec 变更提案目录
├── package.json              # 前端依赖 + scripts
├── vite.config.ts            # Vite 配置（proxy, @/ alias, base: './'）
├── vitest.config.ts          # 测试配置（@/ alias, jsdom, setupFiles）
├── tsconfig.json             # TypeScript 配置（strict, noUnusedLocals, noUnusedParameters）
├── eslint.config.js          # ESLint 配置（忽略 cloudfunctions/）
├── cloudbaserc.json          # CloudBase 云函数定义、环境变量、超时、内存配置
├── .env.example              # 环境变量示例
├── DEPLOY.md                 # CloudBase 部署指南
└── AGENTS.md                 # 本文件
```

---

## 构建与运行命令

项目使用 **pnpm >= 8.0.0**，**Node.js >= 18.0.0**。

```bash
# 安装依赖
pnpm install

# 开发服务器（端口 3000）
pnpm run dev

# 生产构建
pnpm run build

# 预览生产构建
pnpm run preview

# 代码检查（ESLint 忽略 cloudfunctions/）
pnpm run lint

# 代码格式化
pnpm run format

# 测试（一次性运行）
pnpm run test

# 测试（监听模式）
pnpm run test:watch

# 测试（带覆盖率）
pnpm run test:coverage
```

### 开发环境代理

`vite.config.ts` 在本地开发时将 `/api/cloud` 代理到 CloudBase HTTP 端点（与生产 Nginx 反向代理路径一致）：
- 默认目标：`http://cloud1-1g7yz5w766dd366f-1394837822.ap-shanghai.app.tcloudbase.com`
- 可通过环境变量覆盖：`VITE_CLOUDBASE_HTTP_ORIGIN`、`VITE_CLOUDBASE_HTTP_PREFIX`

---

## 代码风格与开发约定

### 语言与注释
- **所有代码和文档均使用中文**。
- 你应该用英文进行思考和推理，但所有回复必须使用中文。

### 类型系统
- **始终声明每个变量和函数的类型**（参数和返回值）。
- **避免使用 `any` 类型**。
- 创建必要的类型，将数据封装在复合类型中。
- 对不可变属性使用 `readonly`。
- 对于永不改变的字面量，使用 `as const`。
- `tsconfig.json` 启用了 `noUnusedLocals` 和 `noUnusedParameters`。注意：`pnpm run build` 只跑 `vite build`（不做类型检查），类型错误只在 **dev 模式**下通过 `vite-plugin-checker`（buildMode）暴露；提交前请自行确认无类型错误。

### 命名约定
- **类**: PascalCase
- **变量、函数、方法**: camelCase
- **文件和目录名**: kebab-case
- **环境变量**: 全大写
- **避免魔法数字**，定义命名常量（见 `src/constants/business.ts`）

### 函数与逻辑
- 保持函数简短、单一职责（**< 20 行**）。
- **函数内部不要留空行**。
- 使用提前返回避免深层嵌套。
- 将逻辑提取到独立工具函数中。
- 使用高阶函数（`map`、`filter`、`reduce`）简化逻辑。
- 简单情况（< 3 条语句）使用箭头函数，其他情况使用命名函数。
- 使用默认参数值代替 `null` / `undefined` 检查。
- 使用 **RO-RO**（Receive Object, Return Object）传递和返回多个参数。
- 避免在函数内部进行验证，优先使用具有内部验证功能的类。

### 模块与导出
- **每个文件只导出一次**（默认导出）。
- 导入路径使用 `@/` 别名映射到 `src/`。

### 前端代码组织
- **类型**: `src/types/` 按领域分文件（`auth.ts`, `member.ts`, `service.ts` 等）。
- **服务**: `src/services/` 每个领域一个文件，通过 `http.ts` 调用云函数。
- **页面**: `src/pages/` 按业务域分组，在 `App.tsx` 中通过 `React.lazy()` 懒加载，`Suspense` + `Spin` 作为 fallback。
- **常量**: 所有云函数名称定义在 `src/constants/api.ts`。
- **状态管理**: `authStore`（Zustand，持久化到 `localStorage`），`uiStore`（侧边栏折叠、选中菜单）。

### 云函数代码组织
- 每个云函数目录包含 `index.js`，导出 `exports.main = async (event, context) => {}`。
- 共享代码放在每个函数目录的 `_shared/` 下（实际部署前复制，非真正 monorepo 共享包）。
- 云函数**不是 TypeScript**，使用 CommonJS（`require` / `module.exports`）。

---

## 测试策略

### 框架与配置
- **测试运行器**: Vitest
- **DOM 环境**: jsdom
- **React 测试**: `@testing-library/react`
- **断言增强**: `@testing-library/jest-dom`
- **属性测试**: `fast-check`

### 测试文件位置与命名
- 单元测试: `tests/unit/**/*.test.ts` / `tests/unit/**/*.test.tsx`
- 属性测试: `tests/property/**/*.property.test.ts`
- 全局配置: `tests/setup.ts`

### 测试范围
- **单元测试**覆盖：页面组件、services、Zustand stores、工具函数。
- **属性测试**覆盖：核心业务逻辑（commission, finance, member, appointment 等）。
- `@/` 路径别名在 `vitest.config.ts` 中已配置，测试中可以正常使用。

### 运行测试
```bash
pnpm run test              # CI 模式
pnpm run test:watch        # 开发监听
pnpm run test:coverage     # 覆盖率报告
```

---

## 认证与安全

### 架构说明
本项目**不使用 CloudBase 内置的 admin 登录鉴权**，而是自建 JWT 体系：
- `@cloudbase/js-sdk` 的 `auth.signInAnonymously()` 仅用于获取匿名登录态，以启用 `callFunction()` 能力。
- 真正的管理员身份通过自定义 JWT Token 传递和校验。

### 登录流程
1. 前端调用 `adminLogin` 云函数，传入用户名密码。
2. 云函数使用 `bcryptjs`（salt rounds 10）校验密码，检查失败次数（≥5 次锁定 30 分钟）。
3. 校验通过后签发 JWT（有效期 2 小时），返回给前端。
4. 前端将 `token` 和 `adminInfo` 存入 `localStorage` 和 Zustand `authStore`。
5. 后续每次调用云函数时，`http.ts` 自动在 payload 中附加 `authorization: Bearer <token>`。
6. 云函数通过 `_shared/auth.js` 的 `verifyAuth()` 解码 JWT（密钥来自 `cloudbaserc.json` 中的 `JWT_SECRET` 环境变量）。
7. 遇到 `UNAUTHORIZED` 或 `FORBIDDEN` 时，`http.ts` 清除登录态并强制跳转 `/login`。

### 无操作超时
- `authStore` 实现了无操作自动登出：鼠标移动、按键、点击、滚动会重置计时器。
- 超时阈值：`INACTIVITY_TIMEOUT_MS = 2 小时`（见 `src/constants/business.ts`）。

### 安全注意事项
- `JWT_SECRET` 在 `cloudbaserc.json` 中通过环境变量注入所有云函数。**生产环境应使用强随机字符串**。
- 密码使用 `bcryptjs` 哈希，历史明文密码在登录时自动升级。
- 前端使用 `HashRouter`（非 `BrowserRouter`），适配静态托管环境，避免刷新 404。
- `vite.config.ts` 中 `base: './'` 使用相对路径，确保静态资源正确加载。

---

## 数据库

- **类型**: CloudBase NoSQL（基于 MongoDB）。
- **关键集合**: `admin_accounts`, `members`, `technicians`, `service_templates`, `appointments`, `operation_logs`, `discount_levels`, `member_cards`, `consumption_records`, `commission_records`。
- **三层架构**（2026-08 重构）：
  - 预约层：`appointments` 只承担排班（`categoryId` + `duration`），`serviceId` 字段废弃（历史数据保留只读）。
  - 模板层：`service_templates` 是结算规则中心（默认预约时长、基础项目、附加项目、折扣/提成标志），替代旧 `services` 集合（停止写入，只读兜底）。
  - 结算层：`adminCreateSettlement` 是收入确认唯一入口，`consumption_records` 扩展结算明细快照字段（baseItem/addons/customAddons/originalAmount/discountAmount/receivableAmount/adjustAmount/paymentDetails）。
- 云函数内通过 `wx-server-sdk` 的 `db.collection()` 操作数据库。
- 部署后需调用 `initDatabaseIndexes` 初始化索引，并调用 `initServiceTemplates` 初始化六大类服务模板种子（幂等，详见 `DEPLOY.md`）。

---

## 部署流程

### 环境信息
- **环境 ID**: `cloud1-1g7yz5w766dd366f`
- **CloudBase CLI**: v3.3.3
- **前端构建输出**: `dist/`（使用 `HashRouter` + 相对路径）

### 部署步骤
1. **构建前端**: `npm run build`
2. **部署云函数**: `tcb fn deploy --all --envId cloud1-1g7yz5w766dd366f`
3. **初始化索引**: 调用 `initDatabaseIndexes` 云函数
4. **部署静态网站**: `tcb hosting deploy dist ./cy-admin -e cloud1-1g7yz5w766dd366f`

完整部署脚本和安全建议见 `DEPLOY.md`。

---

## 关键文件速查

| 路径 | 用途 |
|------|------|
| `src/main.tsx` | React 入口：根组件、QueryClient、auth 状态重水合 |
| `src/App.tsx` | 路由配置、懒加载页面、AuthGuard 包裹 |
| `src/services/http.ts` | CloudBase 云函数调用封装、JWT 注入、错误处理 |
| `src/constants/api.ts` | 所有云函数名称常量 |
| `src/constants/business.ts` | 业务常量（会员等级、积分规则、提成比例、安全阈值） |
| `src/stores/authStore.ts` | 认证状态 + 本地存储持久化 + 无操作超时 |
| `src/stores/uiStore.ts` | UI 状态（侧边栏折叠、当前菜单） |
| `src/types/*.ts` | 按领域划分的 TypeScript 类型 |
| `src/utils/settlement.ts` | 结算金额计算与入参校验（前端实时明细，与云函数 `_shared/settlement.js` 逻辑一致） |
| `src/utils/appointment.ts` | 预约时段区间计算与冲突判定 |
| `cloudfunctions/{name}/index.js` | 云函数入口 |
| `cloudfunctions/{name}/_shared/` | 云函数共享模块（auth, db, response, errors, token, settlement） |
| `cloudbaserc.json` | 云函数定义、运行时、超时、内存、环境变量 |
| `vite.config.ts` | 开发代理、`@/` 别名、TypeScript 检查插件 |
| `vitest.config.ts` | 测试配置、`@/` 别名、jsdom 环境 |
| `eslint.config.js` | ESLint 规则（忽略 `cloudfunctions/`） |

---

## 常见陷阱（Gotchas）

1. **不要在前端使用 CloudBase 内置 auth 做管理员登录** — 仅用于匿名登录以启用 `callFunction()`。
2. **云函数不是 TypeScript** — 纯 Node.js CommonJS，不能用 ES Module 语法。
3. **没有 CI/CD 或 pre-commit hooks** — 质量门禁完全手动执行（`npm run lint`, `npm run test`）。
4. **`noUnusedLocals` / `noUnusedParameters` 已启用，但 `build` 不含 `tsc`** — 生产构建不会拦截未使用变量；只有 dev 服务器的 checker 会报。不要让未使用变量溜进提交。
5. **React Router v6** — 使用了 future flags：`v7_startTransition`、`v7_relativeSplatPath`。
6. **环境变量覆盖**: `VITE_CLOUDBASE_ENV_ID` 可覆盖默认环境 ID；`VITE_CLOUDBASE_API_PREFIX` 可覆盖云函数 API 代理前缀（生产默认 `/api/cloud`，经 Nginx 同源反代避免跨域；显式置空则直连 CloudBase 域名）。
7. **云函数 runtime 创建后不可更改** — 当前统一使用 `Nodejs18.15`。

---

## 相关规则文档

项目根目录 `rules/` 下包含 CloudBase 各领域的规则文件。进行对应开发前建议阅读：

- `rules/ui-design/rule.md` — **进行任何 UI 工作前必读**
- `rules/cloud-functions/rule.md` — 云函数部署规范
- `rules/web-development/rule.md` — Web SDK、静态托管规范
- `rules/auth-web/rule.md` — CloudBase Web 认证（注意：本项目使用自定义 JWT，非内置 auth）
- `rules/no-sql-web-sdk/rule.md` — NoSQL 数据库操作规范

---

## OpenSpec 说明

当需求涉及以下关键词时，必须查阅 `@/openspec/AGENTS.md`：
- 规划、提案（proposal, spec, change, plan）
- 新功能、破坏性变更、架构调整、性能/安全大改动
- 需求模糊，需要权威规范后再编码

`openspec/` 目录包含变更提案的创建和应用流程、规范格式与约定。

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
