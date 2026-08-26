# 会员表单放宽 + 折扣删除修复 + 预约散客支持（OpenSpec 提案与实施）

## TL;DR
> **Summary**: 创建 OpenSpec 变更提案 `update-member-and-appointment-forms` 并实施三项功能迭代：会员表单全非必填+微信号、修复折扣等级删除参数不匹配、预约支持散客自由输入。
> **Deliverables**: OpenSpec 提案文档（proposal/tasks/spec delta）；3 个前端文件 + 4 个云函数修改；单元测试；云函数重新部署
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1（提案文档）→ Task 2-7（三条线并行实施）→ Task 8（部署+归档）

## Context

### Original Request
> 创建新openspec提案，功能迭代：
> 1. 新增会员表单中选项全部改为非必填项，添加'微信号'输入框，同样非必填
> 2. 删除会员卡时会报'折扣等级 ID 不能为空'报错
> 3. 新增预约表单会员添加交互，除选择以外需要自由输入选项，因为预约用户可能是非会员系统中的用户

### Interview Summary
- 散客预约采集：**姓名（必填）+ 手机号（选填）**（用户确认）
- 会员表单下限：昵称/手机号/微信号**至少填一项**（用户确认）
- 第 2 项"删除会员卡"经调查实为**会员卡管理页的折扣等级删除**操作

### 调查结论（根因与现状）
1. **会员表单**：`src/pages/member/MemberListPage.tsx:226-252` nickName 必填(2-20)、phone 必填(`/1[3-9]\d{9}/`)、birthday 选填、无 cardId/微信号字段；云函数 `adminCreateMember/index.js` 校验 nickName 必填、phone 必填+唯一性。
2. **折扣删除报错根因**：参数名不匹配。前端 `src/services/memberCard.ts` `adminDeleteDiscountLevel({ discountLevelId })` / `adminUpdateDiscountLevel({ discountLevelId, ... })`；云函数 `adminDeleteDiscountLevel/index.js:24`、`adminUpdateDiscountLevel/index.js:23` 读 `event.levelId` → 空 → 报"折扣等级 ID 不能为空"。`adminAssignDiscountLevel` 云函数已用 `discountLevelId`，一致无问题。
3. **预约表单**：`src/pages/appointment/AppointmentListPage.tsx:555-566` memberId 必选 Select（showSearch，options 来自会员列表 value=memberId）；云函数 `adminCreateAppointment/index.js:53,82-86` memberId 必填且必须在 members 集合存在（MEMBER_NOT_FOUND）。
4. **下游兼容**：`adminCompleteService/index.js:87` 已用 `if (appointment.memberId)` 守卫会员积分/累计消费更新（散客自动跳过）；但 `consumption_records.add`（:76-81）直接写入 `memberId: appointment.memberId`，散客时为空，需补充 guestName 回退。

### 护栏（替代被中断的 Metis 咨询，自行补齐）
- 手机号唯一性语义变化：仅在提供 phone 时查重；多个空手机号会员必须允许共存（where({phone}) 查重跳过空值）
- 空昵称/空手机号在会员列表、预约选择器（label 构成）、操作日志 detail 中的展示不能出现 "undefined"
- 预约选择器 label 目前由昵称+手机号构成，空字段会员需要兜底展示（如"未命名会员"）
- adminCompleteService 散客分支：跳过积分（已守卫），consumption_records 需写入 guestName 便于财务/业绩展示
- 折扣修复保持向后兼容：`event.levelId || event.discountLevelId`，不破坏可能的旧调用方

## Work Objectives

### Core Objective
按 OpenSpec 三阶段流程交付：创建提案 → 实施三项迭代 → 部署云函数并归档。

### Deliverables
- `openspec/changes/update-member-and-appointment-forms/`：proposal.md、tasks.md、specs/admin-system/spec.md
- 前端修改：MemberListPage、AppointmentListPage、types（member/appointment）、services（member/appointment）
- 云函数修改：adminCreateMember、adminCreateAppointment、adminDeleteDiscountLevel、adminUpdateDiscountLevel、adminCompleteService（consumption_records guestName 回退）
- 单元测试更新 + 新增
- 4+1 个云函数重新部署，提案归档

### Definition of Done
- `pnpm run test` 全量通过
- `pnpm exec tsc --noEmit` 无错误
- `pnpm run lint` 通过
- 修改过的云函数（adminCreateMember、adminCreateAppointment、adminDeleteDiscountLevel、adminUpdateDiscountLevel、adminCompleteService）部署成功
- tasks.md 全部勾选，提案归档至 `openspec/changes/archive/`

### Must Have
- 会员表单：昵称/手机号/生日/微信号全部非必填；至少填一项；手机号填时才校验格式+唯一性
- 折扣删除/更新：云函数兼容 `event.levelId || event.discountLevelId`，删除恢复正常
- 预约表单：memberId 非必选，AutoComplete 支持自由输入散客姓名；memberId 与 guestName 二选一必填；散客可填手机号
- 散客预约完成服务时不产生会员积分、消费记录写入 guestName

### Must NOT Have
- 不做数据库迁移（新字段均可选，旧数据不动）
- 不修改 adminAssignDiscountLevel（参数已一致）
- 不改变预约冲突校验逻辑（基于 technicianId+时间，与会员无关）
- 不为散客创建 members 集合记录（散客不落会员库）
- 不修改小程序用户端任何代码

## Verification Strategy
> ZERO HUMAN INTERVENTION - 所有验证由 agent 执行。
- Test decision: tests-after（沿用现有 Vitest 服务层测试模式，参照 `tests/unit/member-service.test.ts`、`tests/unit/appointment-service.test.ts`）
- QA policy: 每个任务带 agent 可执行验证（node --check / vitest / tsc / 部署命令输出）
- 云函数语法验证：`node --check cloudfunctions/<fn>/index.js`

## Execution Strategy

### Parallel Execution Waves
Wave 1: Task 1（OpenSpec 提案文档——后续任务的规范来源）
Wave 2: Task 2（会员线：前端+云函数）、Task 3（折扣线：云函数参数修复）、Task 4（预约线：前端+云函数）——三条线无文件交叉，全并行
Wave 3: Task 5（测试）、Task 6（部署+归档）

### Dependency Matrix
| Task | Depends On |
|------|-----------|
| 1 | - |
| 2 | 1 |
| 3 | 1 |
| 4 | 1 |
| 5 | 2,3,4 |
| 6 | 5 |

### Agent Dispatch Summary
- Wave 1: 1 task（writing）
- Wave 2: 3 tasks（quick / quick / quick）
- Wave 3: 2 tasks（quick / unspecified-high）

## TODOs
> Implementation + Test = ONE task。

- [ ] 1. 创建 OpenSpec 提案文档

  **What to do**: 创建 `openspec/changes/update-member-and-appointment-forms/` 目录及三个文件，格式严格对齐归档提案 `openspec/changes/archive/2026-05-19-add-appointment-creation-and-finance-export/`：
  - `proposal.md`：Why（三问题+折扣删除根因：前端发 `discountLevelId` 云函数读 `event.levelId`）+ What Changes（三项，含"至少填一项"和"散客姓名必填+手机号选填"决策）+ Impact
  - `tasks.md`：实施清单（对应本计划 Task 2-6）
  - `specs/admin-system/spec.md`：delta，capability 为 `admin-system`；用 `## MODIFIED Requirements`（会员创建校验、预约创建校验）+ `## ADDED Requirements`（散客预约）；每条 Requirement 至少一个 `#### Scenario:`（WHEN/THEN 格式）
  **Must NOT do**: 不修改 `openspec/specs/` 下的主 spec（归档时才合并）；不安装 openspec CLI（环境不可用，手工按规范编写）

  **Recommended Agent Profile**:
  - Category: `writing` - 规范文档撰写，格式有归档模板可循
  - Skills: [] - 无匹配
  - Omitted: [`cloudbase`] - 纯文档任务

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4] | Blocked By: []

  **References**:
  - Pattern: `openspec/changes/archive/2026-05-19-add-appointment-creation-and-finance-export/proposal.md` - proposal 结构（Why/What Changes/Impact）
  - Pattern: `openspec/changes/archive/2026-05-19-add-appointment-creation-and-finance-export/specs/admin-system/spec.md` - delta 格式（ADDED Requirements + Scenario）
  - Spec 规范: `openspec/AGENTS.md` - MODIFIED/ADDED Requirements 写法
  - 主 spec: `openspec/specs/admin-system/spec.md` - 被 MODIFIED 的需求需与此处的现行表述对应

  **Acceptance Criteria**:
  - [ ] 三个文件存在于 `openspec/changes/update-member-and-appointment-forms/`
  - [ ] spec delta 中每条 Requirement 含至少一个 `#### Scenario:`
  - [ ] proposal.md 明确记录折扣删除根因（参数名 `discountLevelId` vs `levelId`）与两项用户决策（至少填一项、散客姓名必填+手机号选填）

  **QA Scenarios**:
  ```
  Scenario: 提案文档结构完整
    Tool: Bash
    Steps: Get-ChildItem openspec/changes/update-member-and-appointment-forms -Recurse -Name
    Expected: 输出包含 proposal.md、tasks.md、specs/admin-system/spec.md；Select-String '#### Scenario' 在 spec.md 中命中 ≥3 次
    Evidence: .sisyphus/evidence/task-1-openspec-scaffold.txt

  Scenario: delta 不使用非法节标题
    Tool: Bash
    Steps: Select-String -Path openspec/changes/update-member-and-appointment-forms/specs/admin-system/spec.md -Pattern '^## ' 
    Expected: 仅出现 ## MODIFIED Requirements 和/或 ## ADDED Requirements（符合 openspec/AGENTS.md 规范）
    Evidence: .sisyphus/evidence/task-1-delta-headers.txt
  ```

  **Commit**: YES | Message: `docs(openspec): 新增会员表单放宽与预约散客支持变更提案` | Files: [openspec/changes/update-member-and-appointment-forms/]

- [ ] 2. 会员线：表单放宽 + 微信号（前端 + adminCreateMember 云函数）

  **What to do**:
  - `src/types/member.ts`：`Member` 增加 `wechatId?: string`
  - `src/services/member.ts`：`adminCreateMember` 的 data 类型改为 `{ nickName?: string; phone?: string; birthday?: string; wechatId?: string; cardId?: string }`
  - `src/pages/member/MemberListPage.tsx:226-252`：nickName、phone 的 `required: true` 规则移除；新增微信号 Form.Item（name="wechatId"，非必填，maxLength 50）；phone 保留 pattern 校验（仅填时触发，Ant Design pattern 规则对空值默认不触发）；增加自定义校验：提交前检查 nickName/phone/wechatId 至少一项非空（在 handleSubmitCreate 中 validateFields 后判断，不满足则 message.error('昵称、手机号、微信号至少填写一项') 并 return）
  - `src/pages/member/MemberListPage.tsx` 列表 columns：手机号渲染 `maskPhone(phone)` 需容忍空值（`phone ? maskPhone(phone) : '-'`），新增微信号列（空显示 '-'）；昵称列空值显示 '未命名会员'
  - `cloudfunctions/adminCreateMember/index.js`：nickName 校验改为"提供时才校验 2-20"；phone 改为"提供时才校验格式与唯一性"（`if (phone) { ... }`，查重 where({phone}) 仅在 phone 非空时执行）；新增"nickName/phone/wechatId 至少一项"校验（`VALIDATION_ERROR`，文案"昵称、手机号、微信号至少填写一项"）；`wechatId` 落库（`String(event.wechatId || '').trim()`，长度 ≤50）；memberData 中 nickName/phone 允许空字符串；操作日志 detail 用兜底值（如 `创建会员 ${nickName || wechatId || phone}`）

  **Must NOT do**: 不修改 phone 唯一性的数据库索引；不改动 adminUpdateMember；不为空字段会员自动生成昵称

  **Recommended Agent Profile**:
  - Category: `quick` - 单线多文件但每处改动小且明确
  - Skills: [] - 无匹配
  - Omitted: [`cloudbase`] - 云函数改动为纯 JS 逻辑修改，无需 CloudBase 文档

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5] | Blocked By: [1]

  **References**:
  - 表单现状: `src/pages/member/MemberListPage.tsx:82-115`（handleSubmitCreate）、`:220-252`（表单 JSX）
  - 云函数现状: `cloudfunctions/adminCreateMember/index.js`（校验在约 40-65 行，memberData 在约 75-90 行）
  - 类型: `src/types/member.ts:Member`
  - 工具: `src/utils/format.ts:maskPhone` - 确认空值行为
  - 测试模式: `tests/unit/member-service.test.ts` - adminCreateMember describe 块需同步更新

  **Acceptance Criteria**:
  - [ ] `pnpm vitest --run tests/unit/member-service.test.ts` 通过
  - [ ] `node --check cloudfunctions/adminCreateMember/index.js` 通过
  - [ ] `pnpm exec tsc --noEmit` 无错误
  - [ ] 云函数对 `{ wechatId: 'wx_abc' }`（无 nickName/phone）不返回 VALIDATION_ERROR 类校验错误（通过代码审查确认三分支均含 `if (phone)` / 提供才校验守卫）

  **QA Scenarios**:
  ```
  Scenario: 仅填微信号创建会员（服务层契约）
    Tool: Bash
    Steps: pnpm vitest --run tests/unit/member-service.test.ts -t 'adminCreateMember'
    Expected: 包含 wechatId 转发用例且全部通过
    Evidence: .sisyphus/evidence/task-2-member-service.txt

  Scenario: 三项全空被拒绝（云函数守卫审查）
    Tool: Bash
    Steps: Select-String -Path cloudfunctions/adminCreateMember/index.js -Pattern '至少填写一项' -Encoding UTF8
    Expected: 命中 1 处，且位于 phone 唯一性查重之前
    Evidence: .sisyphus/evidence/task-2-atleast-one.txt
  ```

  **Commit**: YES | Message: `feat(member): 新增会员表单全部字段非必填并新增微信号，至少填写一项` | Files: [src/types/member.ts, src/services/member.ts, src/pages/member/MemberListPage.tsx, cloudfunctions/adminCreateMember/index.js]

- [ ] 3. 折扣线：修复删除/更新折扣等级参数不匹配

  **What to do**:
  - `cloudfunctions/adminDeleteDiscountLevel/index.js:24`：`const levelId = String(event.levelId || event.discountLevelId || '').trim();`
  - `cloudfunctions/adminUpdateDiscountLevel/index.js:23`：解构改为 `const { name, discountRate, minRechargeAmount } = event; const levelId = String(event.levelId || event.discountLevelId || '').trim();`
  - 其余逻辑不动
  **Must NOT do**: 不改前端 `src/services/memberCard.ts`（保持 `discountLevelId`，与 adminAssignDiscountLevel 一致）；不改 DISCOUNT_LEVEL_IN_USE 关联检查逻辑

  **Recommended Agent Profile**:
  - Category: `quick` - 两个文件各一行级修改
  - Skills: [] - 无匹配

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5] | Blocked By: [1]

  **References**:
  - Bug 现场: `cloudfunctions/adminDeleteDiscountLevel/index.js:24`、`cloudfunctions/adminUpdateDiscountLevel/index.js:23`
  - 前端契约: `src/services/memberCard.ts:adminDeleteDiscountLevel`（发送 `{ discountLevelId }`）
  - 一致范例: `cloudfunctions/adminAssignDiscountLevel/index.js`（读 `event.discountLevelId`）

  **Acceptance Criteria**:
  - [ ] `node --check cloudfunctions/adminDeleteDiscountLevel/index.js` 与 `node --check cloudfunctions/adminUpdateDiscountLevel/index.js` 通过
  - [ ] 两个文件均命中 `event.levelId || event.discountLevelId`
  - [ ] 现有测试全量通过（`pnpm run test`，不新增失败）

  **QA Scenarios**:
  ```
  Scenario: 参数兼容读取已生效
    Tool: Bash
    Steps: Select-String -Path cloudfunctions/adminDeleteDiscountLevel/index.js,cloudfunctions/adminUpdateDiscountLevel/index.js -Pattern 'event\.levelId \|\| event\.discountLevelId' -Encoding UTF8
    Expected: 每个文件各命中 1 处
    Evidence: .sisyphus/evidence/task-3-param-compat.txt

  Scenario: 前端契约未被破坏
    Tool: Bash
    Steps: Select-String -Path src/services/memberCard.ts -Pattern 'discountLevelId' -Encoding UTF8
    Expected: adminDeleteDiscountLevel / adminUpdateDiscountLevel 仍发送 discountLevelId；git diff src/services/memberCard.ts 为空
    Evidence: .sisyphus/evidence/task-3-frontend-unchanged.txt
  ```

  **Commit**: YES | Message: `fix(discount): 云函数兼容 discountLevelId 参数修复删除/更新折扣等级报错` | Files: [cloudfunctions/adminDeleteDiscountLevel/index.js, cloudfunctions/adminUpdateDiscountLevel/index.js]

- [ ] 4. 预约线：散客自由输入（前端 + adminCreateAppointment/adminCompleteService 云函数）

  **What to do**:
  - `src/types/appointment.ts`：`Appointment` 增加 `guestName?: string; guestPhone?: string`
  - `src/services/appointment.ts`：`adminCreateAppointment` params 类型改为 `{ memberId?: string; guestName?: string; guestPhone?: string; serviceId: string; technicianId: string; appointmentDate: string; appointmentTime: string; note?: string }`
  - `src/pages/appointment/AppointmentListPage.tsx:555-566`：会员 Form.Item 改为非必填（移除 `required: true`）；Select 替换为 `AutoComplete`（options 仍为 memberOptions，filterOption 按 label 搜索，允许自由输入）；新增"散客手机号"Form.Item（name="guestPhone"，非必填，pattern `/^1[3-9]\d{9}$/`）；handleSubmitCreate 提交逻辑：若输入值命中某会员 option 的 value（memberId）则提交 memberId；否则作为 guestName 提交（trim 后非空），两者皆空则 message.error('请选择会员或输入散客姓名') 并 return；选择会员时清空 guestName/guestPhone
  - 预约列表"会员"列（`:364-369`）：渲染改为 `record.guestName ? \`${record.guestName}（散客）\` : 会员昵称映射`（沿用现有 memberId→昵称展示逻辑，空值显示 '-'）
  - 会员 options 的 label 构成处（约 `:299` 附近）：空昵称/空手机号兜底（如 `m.nickName || '未命名会员'`），避免出现 "undefined"
  - `cloudfunctions/adminCreateAppointment/index.js`：memberId 必填校验（`:53`）改为：memberId 为空时要求 `guestName = String(event.guestName || '').trim()` 非空（否则 `VALIDATION_ERROR`，文案"请选择会员或输入散客姓名"）；会员存在性校验（`:82-86`）包入 `if (memberId) { ... }`；`guestPhone` 提供时校验格式；落库字段增加 `guestName`、`guestPhone`（空 memberId 时 memberId 字段存空字符串）
  - `cloudfunctions/adminCompleteService/index.js:76-81`：consumption_records.add 的 data 增加 `guestName: appointment.guestName || ''`，memberId 保持原样（会员积分更新已有 `if (appointment.memberId)` 守卫，不动）

  **Must NOT do**: 不改动预约冲突校验（technicianId+时间重叠）逻辑；不为散客创建 members 记录；不改动 adminConfirmArrival

  **Recommended Agent Profile**:
  - Category: `quick` - 改动点明确，模式可参照 Task 2
  - Skills: [] - 无匹配

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5] | Blocked By: [1]

  **References**:
  - 表单现状: `src/pages/appointment/AppointmentListPage.tsx:545-600`（创建弹窗表单）、`:299`（memberOptions）、`:364-369`（会员列）
  - 云函数现状: `cloudfunctions/adminCreateAppointment/index.js:46-90`（参数与校验）、`:130-145`（落库）
  - 下游: `cloudfunctions/adminCompleteService/index.js:60-110`（consumption_records 与积分守卫）
  - Ant Design: AutoComplete 组件用法与 Select 基本一致（options + filterOption + onChange 自由文本）
  - 测试模式: `tests/unit/appointment-service.test.ts` - adminCreateAppointment describe 块需同步更新

  **Acceptance Criteria**:
  - [ ] `pnpm vitest --run tests/unit/appointment-service.test.ts` 通过
  - [ ] `node --check cloudfunctions/adminCreateAppointment/index.js`、`node --check cloudfunctions/adminCompleteService/index.js` 通过
  - [ ] `pnpm exec tsc --noEmit` 无错误
  - [ ] 云函数中会员存在性校验被 `if (memberId)` 包裹（Select-String 确认）

  **QA Scenarios**:
  ```
  Scenario: 散客预约参数通过服务层（契约测试）
    Tool: Bash
    Steps: pnpm vitest --run tests/unit/appointment-service.test.ts -t 'adminCreateAppointment'
    Expected: 含 guestName 转发用例且全部通过
    Evidence: .sisyphus/evidence/task-4-appointment-service.txt

  Scenario: 云函数散客分支守卫存在
    Tool: Bash
    Steps: Select-String -Path cloudfunctions/adminCreateAppointment/index.js -Pattern '请选择会员或输入散客姓名|if \(memberId\)' -Encoding UTF8
    Expected: 两类模式均命中；MEMBER_NOT_FOUND 校验位于 if (memberId) 块内
    Evidence: .sisyphus/evidence/task-4-guest-guard.txt
  ```

  **Commit**: YES | Message: `feat(appointment): 新增预约支持散客自由输入姓名与手机号` | Files: [src/types/appointment.ts, src/services/appointment.ts, src/pages/appointment/AppointmentListPage.tsx, cloudfunctions/adminCreateAppointment/index.js, cloudfunctions/adminCompleteService/index.js]

- [ ] 5. 测试补齐与全量验证

  **What to do**:
  - 更新 `tests/unit/member-service.test.ts` adminCreateMember 块：payload 改为可缺省；新增 wechatId 转发用例
  - 更新 `tests/unit/appointment-service.test.ts` adminCreateAppointment 块：新增 guestName/guestPhone 转发用例（无 memberId）
  - 更新 `tests/unit/AppointmentListPage.test.ts`、`tests/unit/MemberListPage.test.ts` 中受影响的断言（required 校验变更、列渲染变更）
  - 全量运行 `pnpm run test`、`pnpm exec tsc --noEmit`、`pnpm run lint`，全部通过
  **Must NOT do**: 不删除既有用例（仅随契约变化调整）；不引入新测试框架

  **Recommended Agent Profile**:
  - Category: `quick` - 测试适配，模式现成
  - Skills: [] - 无匹配

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [6] | Blocked By: [2,3,4]

  **References**:
  - 测试文件: `tests/unit/member-service.test.ts`、`tests/unit/appointment-service.test.ts`、`tests/unit/MemberListPage.test.ts`、`tests/unit/AppointmentListPage.test.ts`
  - 配置: `vitest.config.ts`（include: tests/**/*.test.ts(x)）

  **Acceptance Criteria**:
  - [ ] `pnpm run test` 全量通过（0 failed）
  - [ ] `pnpm exec tsc --noEmit` exit 0
  - [ ] `pnpm run lint` exit 0

  **QA Scenarios**:
  ```
  Scenario: 全量测试通过
    Tool: Bash
    Steps: pnpm run test
    Expected: Test Files 全部 passed，Tests 0 failed
    Evidence: .sisyphus/evidence/task-5-full-test.txt

  Scenario: 静态检查通过
    Tool: Bash
    Steps: pnpm exec tsc --noEmit; pnpm run lint
    Expected: 两个命令 exit code 均为 0
    Evidence: .sisyphus/evidence/task-5-static-check.txt
  ```

  **Commit**: YES | Message: `test: 同步会员/预约契约变更的服务层与页面测试` | Files: [tests/]

- [ ] 6. 云函数部署与提案归档

  **What to do**:
  - 部署 5 个修改过的云函数：`tcb fn deploy adminCreateMember --env-id cloud1-1g7yz5w766dd366f --force`（依次替换为 adminCreateAppointment、adminCompleteService、adminDeleteDiscountLevel、adminUpdateDiscountLevel）
  - 确认 cloudbaserc.json 已包含全部 5 个函数配置（含 JWT_SECRET envVariables），缺失则补齐后再部署
  - 将 `openspec/changes/update-member-and-appointment-forms/tasks.md` 全部勾选为 [x]
  - 归档：`git mv openspec/changes/update-member-and-appointment-forms openspec/changes/archive/2026-08-04-update-member-and-appointment-forms`，并将 spec delta 合并进 `openspec/specs/admin-system/spec.md`（按 openspec/AGENTS.md Stage 3 流程）
  **Must NOT do**: 不部署未修改的云函数；不使用 `--all` 全量部署

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - 部署+归档多步骤，含 CLI 交互风险（登录态）
  - Skills: [`cloud-functions`] - 云函数部署规范
  - Omitted: [`cloudbase`] - 范围过宽，cloud-functions 更精确

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [5]

  **References**:
  - 部署指南: `DEPLOY.md`（tcb fn deploy 命令格式）
  - 配置: `cloudbaserc.json`（函数定义与 JWT_SECRET）
  - 归档流程: `openspec/AGENTS.md` Stage 3；归档范例: `openspec/changes/archive/2026-05-19-add-appointment-creation-and-finance-export/`
  - 登录态: 若 tcb 提示"无有效身份信息"，执行 `tcb login` 并引导用户手动打开授权链接（本环境无法自动打开浏览器）

  **Acceptance Criteria**:
  - [ ] 5 条部署命令输出均含"云函数部署成功"
  - [ ] `openspec/changes/update-member-and-appointment-forms` 已移至 archive/2026-08-04- 前缀目录且 tasks.md 全 [x]
  - [ ] `openspec/specs/admin-system/spec.md` 已合并 delta
  - [ ] `git log --oneline -3` 含部署/归档提交

  **QA Scenarios**:
  ```
  Scenario: 5 个云函数部署成功
    Tool: Bash
    Steps: 逐条执行 tcb fn deploy <fn> --env-id cloud1-1g7yz5w766dd366f --force
    Expected: 每条输出包含"云函数部署成功"
    Evidence: .sisyphus/evidence/task-6-deploy.txt

  Scenario: 归档完整
    Tool: Bash
    Steps: Test-Path openspec/changes/update-member-and-appointment-forms; Get-ChildItem openspec/changes/archive -Name
    Expected: 前者为 False；后者含 2026-08-04-update-member-and-appointment-forms
    Evidence: .sisyphus/evidence/task-6-archive.txt
  ```

  **Commit**: YES | Message: `chore(openspec): 归档会员表单放宽与预约散客支持变更` | Files: [openspec/, cloudbaserc.json]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high（含管理后台 UI 实际操作验证：创建会员仅填微信号、删除折扣等级、创建散客预约）
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
按任务原子提交（docs → fix → feat → test → chore/deploy），遵循仓库 conventional commits 风格（中文描述）。

## Success Criteria
1. 管理后台创建会员时可只填微信号成功建档
2. 折扣等级删除不再报"折扣等级 ID 不能为空"
3. 新增预约可不选会员、自由输入散客姓名成功创建；散客完成服务后消费记录正常且无会员积分变更
4. 全量测试/lint/类型检查通过，5 个云函数部署成功，提案归档
