# 预约列表清空查全部 + 超时自动确认到店

## TL;DR
> **Summary**: ①预约列表清空时间范围后查询全部数据（前后端各一处改动）；②新增定时云函数，pending 预约超时 10 分钟自动置为 in_service（确认到店），每 30 分钟扫描。
> **Deliverables**: 2 个云函数改动/新增 + 1 个前端改动 + cloudbaserc.json 触发器配置 + 部署
> **Effort**: Short
> **Parallel**: NO（顺序执行）

## Context
### 已确认的用户决策
- 自动处理规则：**pending 且超过预约时间 10 分钟 → 自动改为 in_service（确认到店）**
- 扫描频率：**每 30 分钟**（CloudBase timer 触发器，cron 7 段格式 `0 */30 * * * * *`）

### 关键背景
- `adminGetAppointmentList/index.js:33-38` 当前逻辑：dateFrom/dateTo 缺省（含空串）→ 默认今天；需区分 undefined vs '' 语义
- 前端 `AppointmentListPage.tsx:132-133`：清空时 dateRange=['',''] → `|| undefined` → 云端默认今天
- `adminConfirmArrival/index.js:36-42` 的字段语义：更新 `{ status: 'in_service', arrivedAt: new Date(), updatedAt: new Date() }`（自动任务需镜像）
- 无条件的 query 构造分支当前缺失（conditions.length === 0 时 `where(undefined)` 行为不可靠，需显式全表分支）
- 新定时函数无 JWT（定时触发器无 token），不引 _shared/auth；package.json 只需 wx-server-sdk ^3.0.1

## TODOs

- [ ] 1. 云函数支持空字符串日期查全部

  **What to do**: 修改 `cloudfunctions/adminGetAppointmentList/index.js`：
  - 日期段（30-38 行）改为：
    ```js
    // 日期范围（未传参默认当天；显式传空字符串表示不限制，查询全部）
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const rawFrom = event.dateFrom ?? event.startDate;
    const rawTo = event.dateTo ?? event.endDate;
    if (rawFrom !== '' || rawTo !== '') {
      const dateFrom = String(rawFrom || todayStr).trim();
      const dateTo = String(rawTo || todayStr).trim();
      conditions.push({ appointmentDate: _.gte(dateFrom).and(_.lte(dateTo + '\uffff')) });
    }
    ```
  - 组合条件段（63-69 行）补 0 条件分支：`else { query = db.collection('appointments'); }`
  - 更新 JSDoc 入参说明
  **Acceptance**: `node --check cloudfunctions/adminGetAppointmentList/index.js` 通过
  **Commit**: `feat(appointment): 列表云函数支持空字符串日期参数查询全部` | Files: [cloudfunctions/adminGetAppointmentList/index.js]

- [ ] 2. 前端清空日期显式发送空字符串

  **What to do**: 修改 `src/pages/appointment/AppointmentListPage.tsx` 约 132-133 行：
  ```ts
  startDate: dateRange[0] === '' && dateRange[1] === '' ? '' : dateRange[0] || undefined,
  endDate: dateRange[0] === '' && dateRange[1] === '' ? '' : dateRange[1] || undefined,
  ```
  **Acceptance**: `pnpm vitest --run tests/unit/appointment-service.test.ts` 通过；`pnpm exec tsc --noEmit` 0 错误；`pnpm run lint` 通过
  **Commit**: `feat(appointment): 清空时间范围后查询全部预约数据` | Files: [src/pages/appointment/AppointmentListPage.tsx, tests/（如需适配）]

- [ ] 3. 新增超时自动确认到店定时云函数

  **What to do**:
  - 新建 `cloudfunctions/autoConfirmArrivalAppointments/index.js`（CommonJS）：
    ```js
    'use strict';
    // 定时任务：pending 预约超过预约时间 10 分钟自动确认到店（无 JWT，由 timer 触发器调用）
    const { db } = require('./_shared/db');
    const GRACE_MINUTES = 10;
    const BATCH_SIZE = 100;
    exports.main = async () => {
      const { data: list } = await db.collection('appointments').where({ status: 'pending' }).limit(BATCH_SIZE).get();
      const now = Date.now();
      let updated = 0;
      for (const appt of list || []) {
        const at = new Date(`${appt.appointmentDate}T${appt.appointmentTime}:00`).getTime();
        if (Number.isNaN(at) || at + GRACE_MINUTES * 60 * 1000 >= now) continue;
        await db.collection('appointments').doc(appt._id).update({
          data: { status: 'in_service', arrivedAt: new Date(), updatedAt: new Date() },
        });
        updated += 1;
      }
      console.log(`autoConfirmArrivalAppointments: scanned=${(list || []).length} updated=${updated}`);
      return { updated };
    };
    ```
  - 新建 `package.json`：`{ "name": "autoConfirmArrivalAppointments", "version": "1.0.0", "main": "index.js", "dependencies": { "wx-server-sdk": "^3.0.1" } }`
  - 复制 `cloudfunctions/_shared/` 到 `cloudfunctions/autoConfirmArrivalAppointments/_shared/`
  - `cloudbaserc.json` functions 数组追加（含 timer 触发器）：
    ```json
    {
      "name": "autoConfirmArrivalAppointments",
      "type": "Event",
      "handler": "index.main",
      "timeout": 60,
      "runtime": "Nodejs18.15",
      "memorySize": 256,
      "installDependency": true,
      "triggers": [
        { "name": "autoConfirmTimer", "type": "timer", "config": "0 */30 * * * * *" }
      ]
    }
    ```
  **Acceptance**: `node --check cloudfunctions/autoConfirmArrivalAppointments/index.js` 通过；cloudbaserc.json JSON 合法
  **Commit**: `feat(appointment): 新增超时10分钟自动确认到店定时任务（每30分钟扫描）` | Files: [cloudfunctions/autoConfirmArrivalAppointments/, cloudbaserc.json]

- [ ] 4. 部署与全量验证
  - `tcb fn deploy adminGetAppointmentList --env-id cloud1-1g7yz5w766dd366f --force`（exit 0）
  - `tcb fn deploy autoConfirmArrivalAppointments --env-id cloud1-1g7yz5w766dd366f --force`（exit 0，触发器随之创建）
  - `pnpm run test` 全量通过
  - `pnpm run build` + `tcb hosting deploy dist ./cy-admin -e cloud1-1g7yz5w766dd366f`（exit 0）

## Success Criteria
1. 预约列表清空日期范围后展示全部数据；不传参仍默认今天
2. 定时任务每 30 分钟将超时 10 分钟的 pending 预约自动置为 in_service（含 arrivedAt）
3. 全量测试 / tsc / lint 通过，两个云函数与前端均部署成功
