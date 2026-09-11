---
name: cy-admin-dev-standards
description: cy-admin 项目（美甲美睫店铺 PC 后台管理系统）开发规范。进行本项目任何代码编写、修改、重构、测试或部署时使用。涵盖核心工作流、项目结构、技术栈、代码风格、前端与云函数开发约定、测试规范、认证安全、OpenSpec 工作流与常见陷阱。
---

# cy-admin 开发规范

本规范是 cy-admin 项目（美甲美睫店铺 PC 端后台管理系统）的权威开发约定。所有代码编写、修改、重构、测试与部署均须遵循。

## 核心工作流（强制执行）

接到任何任务后，必须严格按以下流程执行，**不得跳过任何步骤直接修改代码**。

### 步骤 1：需求确认

在执行任何代码操作之前，必须先审查需求的**完整性、明确性和合理性**：
- 需求描述是否完整？缺少哪些关键信息？
- 需求是否有歧义或不明确的地方？
- 是否有更好的实现方案或优化建议？
- **若存在问题，必须先向用户抛出问题**，附上分析理由与建议方案，等待用户给出可执行的明确回复后，再进入下一步。

### 步骤 2：方案分析（需求变更 / 新功能）

当任务涉及需求调整或新功能时，必须结合现有项目架构进行分析：
- 新方案是否与现有架构兼容？是否存在冲突？
- 方案是否完整覆盖所有边界情况？
- 是否为最佳方案？有无更优替代方案？
- **若发现问题或有改进建议，必须先提出问题**，附上对比分析与推荐理由，等待用户反馈后再进入下一步。

### 步骤 3：Bug 分析（Bug 修复）

当任务为 Bug 修复时，**禁止直接修改代码**，必须按以下步骤执行：
1. **分析问题原因**：排查根本原因，基于代码逻辑、日志或复现证据进行推断，不得凭空猜测
2. **提供真实依据**：引用相关代码文件路径和行号、数据流追踪、边界条件分析等具体证据
3. **提供解决方案**：给出至少 1 个方案（多方案可选时列出 2-3 个供选择），每个方案需说明：
   - 修改思路与具体改动范围
   - 选择该方案的理由与风险权衡
   - 推荐方案（如有）
4. **等待用户选择方案后再执行代码修改**

### 步骤 4：OpenSpec 检查

在需求确认、方案达成一致后，**执行代码修改前**，必须先检查 OpenSpec 状态：
- 运行 `openspec list` 查看活跃变更，确认是否已有对应的提案
- 运行 `openspec list --specs` 查看现有规格
- **若存在对应提案**：更新该提案的 proposal.md、tasks.md、design.md（如有）和 spec deltas，使其反映新的需求或方案变更，再开始实施
- **若不存在对应提案**：先创建新提案（proposal.md + tasks.md + 可选 design.md + spec deltas），通过 `openspec validate --strict` 验证后，再开始实施
- 以下场景可跳过提案：Bug 修复恢复预期行为、错别字/格式/注释修正、非破坏性依赖更新、配置变更、补测试等（详见 openspec/AGENTS.md 决策树）

### 步骤 5：执行与验证

- 按 tasks.md 中的清单逐项实施
- 完成后运行 `pnpm run lint` 和 `pnpm run test` 验证
- 全部通过后更新 tasks.md 勾选状态

### 步骤 6：提案归档（需用户确认）

- **任务完成后不要主动归档 OpenSpec 提案**
- 只有收到用户明确的归档指令（如"归档提案"、"archive"）时，才执行归档操作
- 归档步骤见下方"OpenSpec 工作流"章节

---

## 1. 项目概览

- **业务领域**：美甲美睫门店运营管理（会员、技师、服务、预约、财务、提成、会员卡、操作日志）
- **部署目标**：CloudBase 静态网站托管 + 云函数
- **环境 ID**：`cloud1-1g7yz5w766dd366f`
- **包管理器**：pnpm >= 8.0.0，Node.js >= 18.0.0
- **语言**：所有代码注释和文档使用中文；回复用户使用中文

## 2. 技术栈

### 前端
- React 18 + TypeScript 5.9（strict 模式）+ Vite 5
- Ant Design 5 + @ant-design/charts（UI 与图表）
- React Router v6（HashRouter，future flags: v7_startTransition、v7_relativeSplatPath）
- TanStack React Query 5（服务端状态）+ Zustand 5（客户端状态：authStore、uiStore）
- @cloudbase/js-sdk（匿名登录 + callFunction）+ axios（HTTP 拦截器注入 token）
- dayjs（日期处理）

### 后端
- CloudBase 云函数（Nodejs18.15 runtime，**创建后不可更改**）
- wx-server-sdk（数据库操作）+ bcryptjs（密码哈希，salt 10）+ jsonwebtoken（JWT）
- 云函数使用 **CommonJS**（require/module.exports），**非 TypeScript**

### 测试
- Vitest 2 + @testing-library/react + jsdom + @testing-library/jest-dom
- fast-check 4（属性测试）

## 3. 常用命令

```bash
pnpm run dev              # 开发服务器（端口 3000，vite-plugin-checker 实时类型检查）
pnpm run build            # 生产构建（仅 vite build，不含 tsc）
pnpm run preview          # 预览生产构建
pnpm run lint             # ESLint（忽略 cloudfunctions/，--max-warnings 0）
pnpm run format           # Prettier 格式化 src/**/*.{ts,tsx,css,json}
pnpm run test             # Vitest 一次性运行
pnpm run test:watch       # Vitest 监听模式
pnpm run test:coverage    # Vitest 带覆盖率
```

## 4. 项目结构

```
cy-admin/
├── cloudfunctions/           # 云函数（57 个），每个独立目录含 index.js + _shared/ + package.json
│   └── _shared/              # 根级共享模块（auth.js, db.js, response.js, errors.js, token.js）
├── src/                      # 前端源码（TypeScript / TSX）
│   ├── components/           # 可复用组件（charts/、common/、layout/）
│   ├── constants/            # 常量（api.ts 云函数名, business.ts 业务常量）
│   ├── pages/                # 页面组件（按业务域分组）
│   ├── services/             # 领域服务：封装云函数调用
│   ├── stores/               # Zustand 状态管理（authStore, uiStore）
│   ├── types/                # TypeScript 类型定义（按领域分文件）
│   ├── utils/                # 工具函数（commission, discount, format, jwt, points, validation）
│   ├── App.tsx               # 路由定义 + 懒加载页面
│   └── main.tsx              # React 根组件、QueryClient、auth 状态重水合
├── tests/                    # 测试（setup.ts, unit/, property/）
├── rules/                    # CloudBase 开发规则文档
├── openspec/                 # OpenSpec 变更提案目录
├── cloudbaserc.json          # 云函数定义、运行时、超时、内存、环境变量
├── vite.config.ts            # Vite 配置（proxy, @/ alias, base: './'）
├── vitest.config.ts          # 测试配置（@/ alias, jsdom, setupFiles）
├── tsconfig.json             # strict + noUnusedLocals + noUnusedParameters
└── eslint.config.js          # ESLint（忽略 cloudfunctions/）
```

## 5. 代码风格约定

### 类型系统
- **始终声明每个变量和函数的类型**（参数和返回值）
- **禁止 `any`**（ESLint 规则 no-explicit-any 为 warn，实际应避免）
- 对不可变属性使用 `readonly`，永不改变的 字面量使用 `as const`
- `tsconfig.json`：strict、noUnusedLocals、noUnusedParameters 已启用
- **注意**：`pnpm run build` 只跑 `vite build`（不做类型检查），类型错误只在 dev 模式通过 vite-plugin-checker 暴露；提交前自行确认无类型错误

### 命名约定
- 类：PascalCase
- 变量、函数、方法：camelCase
- 文件和目录名：kebab-case
- 环境变量：全大写
- 避免魔法数字，定义命名常量（见 `src/constants/business.ts`）

### 函数与逻辑
- 保持函数简短、单一职责（**< 20 行**）
- **函数内部不要留空行**
- 使用提前返回避免深层嵌套
- 将逻辑提取到独立工具函数
- 使用高阶函数（map、filter、reduce）简化逻辑
- 简单情况（< 3 条句）使用箭头函数，其他用命名函数
- 使用默认参数值代替 null / undefined 检查
- 使用 **RO-RO**（Receive Object, Return Object）传递和返回多个参数
- 避免在函数内部进行验证，优先使用具有内部验证功能的类

### 模块与导出
- **每个文件只导出一次**（默认导出）
- 导入路径使用 `@/` 别名映射到 `src/`

### 格式化（.prettierrc）
- semi: true，singleQuote: true，tabWidth: 2
- trailingComma: 'es5'，printWidth: 80
- arrowParens: 'always'，endOfLine: 'lf'

### 注释
- **DO NOT ADD ANY COMMENTS unless asked**（除非用户明确要求，不添加任何注释）

## 6. 前端开发规范

### 分层架构
- pages/components → services → HTTP client（`src/services/http.ts`）
- 页面组件避免直接发起 HTTP 请求，API 封装统一放在 `src/services/*`
- 服务端状态通过 React Query 统一处理拉取、缓存与异步变更
- 认证状态与 UI 状态通过 Zustand 集中管理

### 类型组织
- `src/types/` 按领域分文件（auth.ts, member.ts, service.ts, appointment.ts, finance.ts 等）
- UI、服务层与规格文档中的领域术语保持一致（会员、技师、预约、会员卡）

### 常量
- 所有云函数名称定义在 `src/constants/api.ts`
- 业务常量（会员等级、积分规则、提成比例、安全阈值）定义在 `src/constants/business.ts`

### 页面与路由
- `src/pages/` 按业务域分组
- 在 `App.tsx` 中通过 `React.lazy()` 懒加载，`Suspense` + `Spin` 作为 fallback
- 使用 `HashRouter`（非 BrowserRouter），适配静态托管，避免刷新 404
- `vite.config.ts` 中 `base: './'` 使用相对路径

### 状态管理
- `authStore`：Zustand，持久化到 localStorage，含无操作自动登出（2 小时）
- `uiStore`：侧边栏折叠、选中菜单

### UI 设计
- 进行任何 UI 工作前**必读** `rules/ui-design/rule.md`
- 使用 Ant Design 5 组件库
- 手机号默认脱敏显示后 4 位，完整号码需点击"查看完整号码"
- 删除与状态变更操作必须二次确认

## 7. 云函数开发规范

### 基本结构
- 每个云函数目录包含 `index.js`，导出 `exports.main = async (event, context) => {}`
- 共享代码放在每个函数目录的 `_shared/` 下（部署前复制，非真正 monorepo 共享包）
- 云函数**不是 TypeScript**，使用 CommonJS（require / module.exports）

### 认证
- 所有管理端云函数调用必须经过认证，通过 `_shared/auth.js` 的 `verifyAuth()` 解码 JWT
- JWT 密钥来自 `cloudbaserc.json` 中的 `JWT_SECRET` 环境变量
- 未携带有效令牌返回 401

### 数据库操作
- 通过 wx-server-sdk 的 `db.collection()` 操作 CloudBase NoSQL 数据库
- 关键集合：admin_accounts、members、technicians、services、appointments、operation_logs、discount_levels、member_cards、consumption_records、commission_records
- 部署后需调用 `initDatabaseIndexes` 云函数初始化索引
- 进行数据库操作前阅读 `rules/no-sql-web-sdk/rule.md`

### 部署
- 部署云函数：`tcb fn deploy --all --envId cloud1-1g7yz5w766dd366f`
- 云函数部署规范见 `rules/cloud-functions/rule.md`

## 8. 测试规范

### 框架与配置
- 测试运行器：Vitest，DOM 环境：jsdom
- React 测试：@testing-library/react，断言增强：@testing-library/jest-dom
- 属性测试：fast-check
- `@/` 路径别名在 `vitest.config.ts` 中已配置

### 文件位置与命名
- 单元测试：`tests/unit/**/*.test.ts` / `tests/unit/**/*.test.tsx`
- 属性测试：`tests/property/**/*.property.test.ts`
- 全局配置：`tests/setup.ts`

### 测试范围
- 单元测试覆盖：页面组件、services、Zustand stores、工具函数
- 属性测试覆盖：核心业务逻辑（commission, finance, member, appointment 等）
- 重点覆盖业务规则校验：积分与提成计算、状态流转、输入与范围校验

### 验证要求
- **写完或修改代码后必须验证**：运行 lint 和测试
- 新代码写对应测试，修改代码更新相关测试
- 不要假设测试框架，检查 README 或搜索代码库确定测试方式

## 9. 认证与安全

### 架构
- **不使用 CloudBase 内置 admin 登录鉴权**，自建 JWT 体系
- `@cloudbase/js-sdk` 的 `auth.signInAnonymously()` 仅用于获取匿名登录态以启用 callFunction()
- 真正的管理员身份通过自定义 JWT Token 传递和校验

### 登录流程
1. 前端调用 `adminLogin` 云函数传入用户名密码
2. 云函数用 bcryptjs 校验密码，检查失败次数（≥5 次锁定 30 分钟）
3. 校验通过后签发 JWT（有效期 2 小时）返回前端
4. 前端将 token 和 adminInfo 存入 localStorage 和 Zustand authStore
5. 后续调用云函数时 `http.ts` 自动附加 `authorization: Bearer <token>`
6. 遇到 UNAUTHORIZED 或 FORBIDDEN 时 `http.ts` 清除登录态并跳转 `/login`

### 安全要点
- `JWT_SECRET` 通过环境变量注入，生产环境使用强随机字符串
- 密码使用 bcryptjs 哈希，历史明文密码在登录时自动升级
- 无操作超时：`INACTIVITY_TIMEOUT_MS = 2 小时`（见 `src/constants/business.ts`）
- 金额相关计算优先使用整数最小单位存储/处理，避免精度误差
- 服务下架时已有预约保持有效
- 删除与状态变更操作必须确认与安全校验

## 10. OpenSpec 工作流

当需求涉及规划、提案、新功能、破坏性变更、架构调整时，必须查阅 `openspec/AGENTS.md`。

### 三阶段工作流
1. **创建变更**：在 `openspec/changes/<change-id>/` 下创建 proposal.md、tasks.md、可选 design.md、spec deltas
   - change-id 用 kebab-case，verb-led（add-、update-、remove-、refactor-）
   - delta 用 `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`，每个 requirement 至少一个 `#### Scenario:`
   - 验证：`openspec validate <id> --strict`
2. **实施变更**：读 proposal → design → tasks，按序实施，完成后更新 tasks 勾选
3. **归档变更**：部署后移动到 `changes/archive/YYYY-MM-DD-[name]/`，更新 specs/

### 跳过提案的场景
- Bug 修复（恢复预期行为）、错别字、格式、注释
- 非破坏性依赖更新、配置变更、为现有行为补测试

### 当前活跃变更
- `refactor-appointment-template-settlement`：三层架构重构（预约层简化 / 模板层新增 / 结算层新增），8/39 项前端 UI 适配已完成（模板 Cascader/Checkbox、收入录入预填 store），核心云函数与结算逻辑待实施

## 11. 常见陷阱（Gotchas）

1. **不要在前端使用 CloudBase 内置 auth 做管理员登录** — 仅用于匿名登录以启用 callFunction()
2. **云函数不是 TypeScript** — 纯 Node.js CommonJS，不能用 ES Module 语法
3. **没有 CI/CD 或 pre-commit hooks** — 质量门禁完全手动执行（lint、test）
4. **noUnusedLocals / noUnusedParameters 已启用，但 build 不含 tsc** — 生产构建不拦截未使用变量；只有 dev 服务器的 checker 会报
5. **React Router v6** — 使用 future flags：v7_startTransition、v7_relativeSplatPath
6. **环境变量覆盖**：`VITE_CLOUDBASE_ENV_ID` 可覆盖默认环境 ID；`VITE_CLOUDBASE_API_PREFIX` 可覆盖云函数 API 代理前缀（生产默认 `/api/cloud`，经 Nginx 同源反代避免跨域）
7. **云函数 runtime 创建后不可更改** — 当前统一使用 Nodejs18.15
8. **HashRouter 下禁止用 `window.location.href = '/xxx'` 做应用内跳转** — 会把浏览器导航到服务器路径，静态托管上无此文件直接 404；本地 dev server 的 SPA fallback 会掩盖该问题，本地正常、线上 404。应用内跳转转用 `navigate()`；需要强制跳转的场景（如未授权登出）用 `window.location.hash = '/login'`。（2026-09 实例：`http.ts` 未授权跳转与 `authStore` 无操作超时跳转均因此在线上 404）
9. **枚举/常量修改必须全链路同步** — 以支付方式为例：前端 `constants/business.ts`（选项）+ `types/member.ts`（类型）+ 云函数校验（`adminCreateIncomeRecord/index.js` 的 validPaymentTypes、`_shared/settlement.js` 的 VALID_PAYMENT_TYPES）。只改前端会导致用户界面可选、云函数校验拒绝。
10. **`_shared/` 是每个函数目录下的物理副本** — 批量修改后需同步所有函数目录内副本（可用 sed 批量替换），并重新部署运行时真正引用该模块的函数（如结算链路：adminCreateSettlement / adminCompleteService / adminCreateIncomeRecord）；其余函数的副本为死代码，下次部署时自然带上。

## 12. 关键文件速查

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
| `cloudfunctions/{name}/index.js` | 云函数入口 |
| `cloudfunctions/{name}/_shared/` | 云函数共享模块（auth, db, response, errors, token） |
| `cloudbaserc.json` | 云函数定义、运行时、超时、内存、环境变量 |
| `vite.config.ts` | 开发代理、`@/` 别名、TypeScript 检查插件 |
| `vitest.config.ts` | 测试配置、`@/` 别名、jsdom 环境 |
| `eslint.config.js` | ESLint 规则（忽略 `cloudfunctions/`） |

## 13. 相关规则文档

进行对应开发前必读：

- `rules/ui-design/rule.md` — **进行任何 UI 工作前必读**
- `rules/cloud-functions/rule.md` — 云函数部署规范
- `rules/web-development/rule.md` — Web SDK、静态托管规范
- `rules/auth-web/rule.md` — CloudBase Web 认证（注意：本项目使用自定义 JWT，非内置 auth）
- `rules/no-sql-web-sdk/rule.md` — NoSQL 数据库操作规范

## 14. Git 工作流

- **NEVER commit changes unless the user explicitly asks** — 除非用户明确要求，不要提交
- 以 spec/task 拆解为驱动，确保实现过程可追溯到需求
- 提交按模块划分（auth、member、technician 等），避免混合无关改动
- 代码推进时同步更新任务与规格文件中的状态清单
- 合并前执行验证命令（lint、test、typecheck）
- 以 OpenSpec 的 changes 目录作为变更计划与完成状态的事实来源
---

## 15. 实战经验补充（2026-09 数据导入与线上修复）

### 一次性历史数据导入 Playbook

经过 33 名会员 + 1064 条收入记录导入验证的标准流程：

1. **源文件先复制进工作区再操作**，不直接读写工作区外文件
2. **Python 脚本解析** → 输出 JSON + 人类可读核对报告（落盘留存，如 `import-data/parsed/`）
3. **引用数据探查**：用一次性只读云函数拉取 technicians / card_discount_levels / service_categories / session_card_types，结果落盘供映射脚本使用
4. **业务映射用显式映射表**写在脚本里（经手人→技师、卡面文字→折扣等级、项目文本→服务分类关键词），可审计；大额或异常分布（如某经手人占半数行）必须显著标注请用户确认，不得默默归入"其他"
5. **数据规范化细节**：
   - 金额一律 `Math.round(元 * 100)` 转分，避免 `169.2 * 100 = 16919.99` 浮点误差
   - 历史日期用 `new Date('YYYY-MM-DDT12:00:00+08:00')`，取中午避免 UTC 跨日偏移
   - 占位手机号需通过 `1[3-9]\d{9}` 校验（如 `19900000` + 卡号 3 位）；注意 members.phone 唯一约束，源数据同号需改占位
   - 消费/提成记录的 `createdAt` 用服务时间而非当前时间，保证按月统计归属正确
6. **一次性导入云函数规范**：dry-run 默认 + confirm 令牌才执行 + 目标集合非空守卫（防重复导入）+ 执行后逐集合 count 核对
7. **批量写入**：`collection().add({ data: [...] })` 数组分批（100 条/批），函数 timeout 调到 300s
8. **用完即删三处**：云端函数（`tcb fn delete`）+ 本地函数目录 + `cloudbaserc.json` 注册项
9. 此类一次性数据运维**跳过 OpenSpec 提案**

### tcb CLI 实操要点

- `--envId` 已废弃，用 `--env-id`
- `fn delete` 无 `--force` 选项，交互确认可用 `yes |` 管道喂入
- 新函数必须先在 `cloudbaserc.json` 注册才能 deploy
- `fn invoke` 结果看输出中 `Return result：` 行；输出截断时读取工具保存的完整日志文件
- 用脚本修改 `cloudbaserc.json` 后必须 `git diff` 核对，避免全文件重格式化混入无关变更

### 本地验证环境

- pnpm 可能不在 PATH，直接调用：
  - lint：`node node_modules/eslint/bin/eslint.js "src/**/*.{ts,tsx}" --max-warnings 0`
  - 测试：`node node_modules/vitest/vitest.mjs --run`
- openspec CLI 路径：`C:\Users\ASUS\AppData\Roaming\kimi-desktop\daimon-share\daimon\npm-global\openspec.cmd`

### 流程层面经验

- 用户提供 curl 报错日志时，`response_data` 里的 `error.code` / `message` 是一手证据，先读再推断
- Bug 修复先给根因分析（文件路径 + 行号 + 数据流）和方案选项，用户选定后再动手
- 行为变更后必须同步更新对应单测与属性测试断言（如跳转方式变更同时影响 `http.test.ts` 与 `auth.property.test.ts`）
- 前端静态托管无自动部署：多批前端改动会积累，每完成一批改动后主动提醒重新 `build` + `hosting deploy`
