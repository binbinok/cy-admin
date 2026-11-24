# 设计：纯数字编号规则

## 1. 计数器集合

新集合 `counters`，每键一文档：

```
{ _id: "appointment_20260914" | "member", seq: number, createdAt, updatedAt }
```

- 预约号键：`appointment_` + 北京时间当日日期（`YYYYMMDD`）→ 跨日自然切换新文档，实现"每日 00:00 重置"；旧日期文档留存（一年约 365 个，无需清理）
- 会员号键：`member`，全局唯一文档，不重置

## 2. 发号原子性

优先 `db.runTransaction`：事务内读计数器文档 → `seq + 1` → 写回 → 返回新值；并发发号不会取到相同序号。
事务不可用或文档不存在时回退 `_.inc(1)` + 读回，并依赖"先 `add` 占位（捕获重复 _id 错误）+ 重试"兜底；门店单店低并发场景下回退路径的竞态窗口可忽略，且会员侧另有 `members.memberId` 唯一索引兜底。

北京时间日期计算显式加 8 小时偏移：`new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)`，不使用服务器本地时间（云函数为 UTC，直接取年月日在北京时间 0-8 点会错一天，先例见 `adminGetAppointmentList` 的隐患与 `backfillCardLedgers` 的 `+08:00` 锚定写法）。

编号格式：`String(seq).padStart(3, '0')`；seq > 999 时自然进位为 4 位及以上。

## 3. 对既有链路的影响核查

- 预约编号仅用于展示与操作日志；取消/确认到店/结算接口实际以文档 `_id` 定位预约（`adminCancelAppointment`、`_shared/settlement.js` 均用 `.doc(_id)`），编号格式变更不影响业务链路
- `memberId` 是 9 个集合的冗余关联键 + 前端路由参数（`/members/:id`），全部为字符串等值/正则匹配，不依赖格式
- `consumption_records.appointmentId` 存的是预约文档 `_id`，与预约业务编号无关，不迁移

## 4. 存量迁移方案（tmpMigrateNumericIds）

### 4.1 会员重编号
1. 读取全部 `members`，按 `createdAt` 升序（并列按 `_id`）排序，生成映射 `old → String(10001 + i)`
2. `members` 集合逐会员 `where({ memberId: old }).update({ memberId: new })`
3. 以下集合逐旧编号批量改写（`where().update()` 循环至 updated=0，防批量上限）：
   `member_cards`、`member_session_cards`、`consumption_records`、`points_records`、`card_consumption_records`、`card_recharge_records`、`session_card_redemptions`、`commission_records`、`appointments`
4. `counters` 中 `member` 文档初始化为 `10000 + 迁移总数`，保证新会员编号延续
5. 映射表落盘（`import-data/parsed/`）供审计与回滚参考

### 4.2 预约按日重编号
1. 读取全部 `appointments`，按 `appointmentDate` 分组，组内按 `createdAt` 升序（并列按 `_id`）
2. 组内依次分配 `001、002…`（超 999 自然 4 位），逐文档更新 `appointmentId`
3. 当日（北京时间）计数器文档初始化为当日预约数（与既有值取 max），保证当日后续预约续号

### 4.3 安全守卫
- dry-run 默认：只输出映射统计与预览，不写库；`event.confirm === 'MIGRATE_NUMERIC_IDS'` 才执行写操作
- 执行前计数快照，执行后逐集合核对改写计数
- 执行窗口选择门店空闲时段（夜间），避免迁移期间新建会员/预约产生漏映射
- `members.memberId` 唯一索引保留，数字编号全局唯一天然满足

## 5. 索引调整

- `appointments.appointmentId_1` 唯一索引与"每日重置"语义冲突（跨日重复编号属预期），必须移除（改为普通索引或删除）；`initDatabaseIndexes` 中的索引提示同步更新
- 若该唯一索引实际存在于线上（`initDatabaseIndexes` 标记 manual_required，代码不建索引），迁移执行前必须先行移除，否则首个跨日重复编号写入即报错

## 6. 风险与回滚

- 迁移为单向改写；回滚依赖迁移前落盘的旧→新映射表逆向恢复（不预期使用）
- 迁移执行期间若有并发创建，新记录保留旧格式编号，可人工按映射表补迁（守卫：空闲窗口执行）
- 前端旧书签链接（`/members/:旧编号`）失效，属预期（编号仅店内使用）
