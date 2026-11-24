# update-numeric-id-rules

## Why

当前预约编号与会员编号均为 6 位随机大写字母数字（如 `KMX7F2`、`7DJCF7`，字符集去易混淆字符）。门店反馈此类编号不可读、难以口头传达与手工抄写，要求改为纯数字递增编号：预约编号每日从 001 起递增、北京时间 0 点重置；会员编号全局从 10001 起递增。同时工作台"今日待服务预约"列表存在服务项目/技师/备注三列字段映射错误（读 `serviceId`/`technicianId`/`remark`，实际字段为 `categoryName`/`technicianName`/`note`），一并修复。

## What Changes

- 新增 `counters` 计数器集合与原子发号模块 `_shared/counter.js`（北京时间日切键，事务优先、inc+get 回退）
- `adminCreateAppointment`：预约编号改为每日纯数字（001 起，每日 00:00 北京时间重置，超 999 自然进位 4 位），移除随机生成与全量查重逻辑
- `adminCreateMember`：会员编号改为全局纯数字（10001 起递增，不重置），移除随机生成与查重逻辑
- 存量数据迁移（一次性云函数 `tmpMigrateNumericIds`，dry-run 默认 + confirm 令牌 + 计数核对）：
  - 存量会员按创建时间升序重编号为 10001 起连续数字；同步改写 9 个关联集合的 `memberId` 冗余字段
  - 存量预约按预约日期分组、组内按创建时间顺序重编号为 001 起纯数字
- 索引调整：`appointments.appointmentId` 的唯一索引必须移除（每日重置语义下跨日编号重复属预期），`members.memberId` 唯一索引保留
- 前端：`DashboardPage.tsx` 三列字段修复（Bug 修复，恢复预期行为）；编号展示逻辑不变（编号仍为字符串）
- `operation_logs` 历史留痕不改写，保留旧编号供追溯

## Impact

- Affected specs：`appointment`（新增预约编号规则）、`admin-system`（新增会员编号规则）
- Affected code：
  - `cloudfunctions/_shared/counter.js`（新增，同步复制到引用函数目录）
  - `cloudfunctions/adminCreateAppointment/index.js`
  - `cloudfunctions/adminCreateMember/index.js`
  - `cloudfunctions/initDatabaseIndexes/index.js`（索引提示更新）
  - `src/pages/dashboard/DashboardPage.tsx`（Bug 修复）
- 数据迁移涉及集合：`members`、`appointments`、`member_cards`、`member_session_cards`、`consumption_records`、`points_records`、`card_consumption_records`、`card_recharge_records`、`session_card_redemptions`、`commission_records`
- 一次性函数用后即删三处（云端 + 本地目录 + `cloudbaserc.json` 注册项）
