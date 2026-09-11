# Tasks

## 1. 提案与规格

- [x] 1.1 创建 proposal.md / tasks.md / spec deltas 并通过 `openspec validate --strict`

## 2. 工具函数

- [x] 2.1 新建 `src/utils/schedule.ts`：`timeToMinutes`、看板时间范围推导（排班最早开始～最晚结束，兜底 10:00–22:00）、预约块定位（top/height）

## 3. 看板组件

- [x] 3.1 新建 `src/components/appointment/ScheduleBoard.tsx`：技师 × 30 分钟刻度时间轴网格、排班背景块、预约块绝对定位渲染
- [x] 3.2 数据接入：React Query 单日预约查询 + 技师列表（复用 `['settlementOptions', 'technicians']` 缓存）
- [x] 3.3 交互：点击预约块弹操作（确认到店 / 完成服务 / 取消预约），成功后刷新；上一天 / 今天 / 下一天切日；「显示已取消」开关

## 4. 页面接入

- [x] 4.1 AppointmentListPage 顶部加「列表视图 / 看板视图」Segmented 切换，共享技师筛选；看板视图下完成服务复用现有 `IncomeEntryModal` 链路

## 5. 测试与验证

- [x] 5.1 单元/属性测试：时间范围推导（含兜底）、定位计算（边界：跨刻度、不足 30 分钟）
- [x] 5.2 `tsc --noEmit`、`eslint --max-warnings 0`、`vitest --run` 全部通过
- [x] 5.3 更新本 tasks.md 勾选状态
