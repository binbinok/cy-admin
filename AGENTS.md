1. 所有代码和文档均使用中文。
2. 你应该用英文进行思考和推理，但所有回复必须使用中文。
3. 始终声明每个变量和函数的类型（参数和返回值）。
4. 避免使用任何类型。
5. 创建必要的类型。
6. 使用 JSDoc 记录公共类和方法。
7. 不要在函数中留下空行。
8. 每个文件只导出一次。

# 命名约定
- 类使用 PascalCase。
- 变量、函数和方法使用 camelCase。
- 文件和目录名使用 kebab 大小写。
- 环境变量使用大写。
- 避免使用神奇数字和定义常量。

# 函数和逻辑
- 保持函数的简短和单一用途（<20 行）。
- 通过以下方法避免深度嵌套块
- 使用提前返回。
- 将逻辑提取到实用函数中。
- 使用高阶函数（map、filter、reduce）简化逻辑。
- 在简单情况下使用箭头函数（<3 个指令），在其他情况下使用命名函数。
- 使用默认参数值代替 null/未定义检查。
- 使用 RO-RO（接收对象，返回对象）传递和返回多个参数。

# 数据处理
- 避免过多使用原始类型；将数据封装在复合类型中。
- 避免在函数内部进行验证，而应使用具有内部验证功能的类。
- 优先考虑数据的不可变性：
- 对不可变属性使用 readonly。
- 对于永不改变的字面形式，使用 as const。

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

---

# cy-admin — AI Assistant Notes

Nail & eyelash salon management system. React 18 + Vite + TypeScript frontend, CloudBase cloud functions backend (Node.js 18), CloudBase NoSQL database.

## Architecture

- **Frontend**: React 18, Vite, TypeScript, Ant Design v5, Zustand (auth + UI), React Query (data fetching)
- **Backend**: 40+ CloudBase event functions in `cloudfunctions/`, all Node.js 18.15, runtime cannot be changed after creation.
- **Database**: CloudBase NoSQL. Key collections: `admin_accounts`, `members`, `technicians`, `services`, `appointments`, `operation_logs`, `discount_levels`, `member_cards`
- **Auth**: Custom JWT (NOT CloudBase built-in auth). `adminLogin` issues JWT stored in `localStorage`. Every cloud function call sends `authorization: Bearer <token>` via the HTTP client. JWT secret is in `cloudbaserc.json` env vars.
- **HTTP client**: `src/services/http.ts` wraps `@cloudbase/js-sdk`'s `app.callFunction()`. URLs use `/invoke/{functionName}` format. The SDK requires an anonymous CloudBase login first (handled automatically in `http.ts`).
- **Local dev proxy**: `vite.config.ts` proxies `/api/invoke` to the CloudBase HTTP origin. Configurable via `VITE_CLOUDBASE_HTTP_ORIGIN` and `VITE_CLOUDBASE_HTTP_PREFIX` env vars.

## Commands

```bash
# Dev server (port 3000)
npm run dev

# Build (typecheck + vite build)
npm run build

# Preview production build
npm run preview

# Lint (eslint ignores cloudfunctions/)
npm run lint

# Format
npm run format

# Tests
npm run test              # run once
npm run test:watch        # watch mode
npm run test:coverage     # with coverage
```

## Cloud Functions

- Each function lives in `cloudfunctions/{functionName}/` with `index.js` exporting `exports.main = async (event, context) => {}`
- Common code is in `cloudfunctions/{functionName}/_shared/` (copied per-function, not a true monorepo shared package). There's also a root `cloudfunctions/_shared/` but functions typically use their own copy.
- `cloudbaserc.json` defines all functions, env vars (e.g. `JWT_SECRET`), timeouts, and memory. **Do not edit runtime after creation.**
- To add a new function: create directory, write `index.js`, add entry to `cloudbaserc.json`, deploy.
- Shared modules in `_shared/`: `auth.js` (JWT verify), `db.js` (CloudBase db init), `response.js` (success/error wrappers), `errors.js` (error codes), `token.js`

## Testing

- **Framework**: Vitest + jsdom + `@testing-library/react`. Setup file: `tests/setup.ts`
- **Path alias**: `@/` maps to `src/` (configured in both `vite.config.ts` and `vitest.config.ts`)
- **Property-based**: `fast-check` is used for some property-based tests in `tests/property/`
- **Unit tests**: `tests/unit/` — covers pages, services, stores, and utilities
- Test files pattern: `tests/**/*.test.ts` and `tests/**/*.test.tsx`

## Key Conventions

- **Imports**: Use `@/` alias for `src/`. TypeScript `baseUrl` is `.`.
- **Types**: Defined in `src/types/` — one file per domain (`auth.ts`, `member.ts`, `service.ts`, etc.)
- **Services**: One service file per domain in `src/services/` — wraps cloud function calls using `http.ts`
- **Pages**: Lazy-loaded in `src/App.tsx` via `React.lazy()` with `Suspense` + `Spin` fallback
- **Auth guard**: `AuthGuard` component in `src/components/layout/AuthGuard.tsx` handles route protection
- **API constants**: All cloud function names are constants in `src/constants/api.ts`
- **State management**: `authStore` (Zustand) persists to `localStorage` (token + adminInfo). `uiStore` for UI state like modal visibility.
- **React Query**: Configured in `src/main.tsx` with `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 5min`
- **ESLint**: Ignores `cloudfunctions/` directory. Uses `@typescript-eslint`, `react-hooks`, `react-refresh`, `prettier`.

## Auth Flow

1. `adminLogin` cloud function verifies bcrypt password, checks fail count / lock status, issues JWT (2h expiry)
2. Frontend stores `token` and `adminInfo` in `localStorage` and Zustand authStore
3. `http.ts` attaches `authorization: Bearer <token>` to every cloud function call
4. Cloud functions use `_shared/auth.js`'s `verifyAuth()` to decode JWT via `process.env.JWT_SECRET`
5. On `UNAUTHORIZED` or `FORBIDDEN`, `http.ts` clears auth and redirects to `/login`
6. Password hashing uses `bcryptjs` with salt rounds 10. Legacy plain-text passwords are auto-upgraded on login.

## Gotchas

- **Do not use CloudBase built-in auth for admin login** — this app uses its own JWT-based auth system. The `@cloudbase/js-sdk` auth is only for anonymous login to enable `callFunction()`.
- **Cloud functions are NOT TypeScript** — they are plain Node.js with CommonJS (`require`/`module.exports`).
- **No CI/CD or pre-commit hooks** — all quality gates are manual (`npm run lint`, `npm run test`).
- **`noUnusedLocals` / `noUnusedParameters` are enabled** in `tsconfig.json` — the build will fail on unused vars.
- **React Router v6** with future flags (`v7_startTransition`, `v7_relativeSplatPath`).
- **Environment ID**: Hardcoded fallback `cloud1-1g7yz5w766dd366f` in `src/services/http.ts` and `cloudbaserc.json`. Override via `VITE_CLOUDBASE_ENV_ID`.
- **Deployment**: Frontend deploys to CloudBase static hosting. Cloud functions deploy via CloudBase CLI / MCP tools (`createFunction` / `updateFunctionCode`). Refer to `rules/cloud-functions/rule.md` and `rules/web-development/rule.md` for deployment specifics.

## File Map

| Path | Purpose |
|------|---------|
| `src/main.tsx` | Entry point — React root, QueryClient, auth rehydration |
| `src/App.tsx` | Router + lazy page imports + AuthGuard |
| `src/services/http.ts` | CloudBase function caller + auth header injection |
| `src/services/*.ts` | Domain services wrapping cloud function calls |
| `src/stores/*.ts` | Zustand stores (auth, UI) |
| `src/constants/api.ts` | Cloud function name constants |
| `cloudfunctions/{name}/index.js` | Cloud function entry |
| `cloudfunctions/{name}/_shared/` | Per-function shared utils |
| `cloudbaserc.json` | CloudBase function definitions & env vars |
| `vite.config.ts` | Dev proxy, `@/` alias |
| `vitest.config.ts` | Test config, `@/` alias, jsdom env |

## Rule Files

This repo contains CloudBase rule files under `rules/` (and `.codebuddy/rules/tcb/rules/`). For CloudBase-specific guidance (auth, database, deployment, UI design), read the relevant rule files. The most commonly needed ones:

- `rules/ui-design/rule.md` — **MUST read before any UI work**
- `rules/cloud-functions/rule.md` — Cloud function deployment
- `rules/web-development/rule.md` — Web SDK, static hosting
- `rules/auth-web/rule.md` — CloudBase Web auth (note: this app uses custom JWT, not CloudBase built-in auth)
- `rules/no-sql-web-sdk/rule.md` — NoSQL database operations
