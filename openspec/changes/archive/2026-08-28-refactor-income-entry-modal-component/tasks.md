# Tasks

## 1. 提案与规格

- [x] 1.1 创建 proposal.md / tasks.md / spec deltas 并通过 `openspec validate --strict`

## 2. 独立组件

- [x] 2.1 新建 `src/components/settlement/IncomeEntryModal.tsx`：迁移 FinancePage 内联弹窗全部功能（基础信息、基础项目、附加项、自定义附加项、价格明细、改价、组合支付、次卡核销）
- [x] 2.2 组件自包含数据加载：技师/会员/服务模板/折扣等级改用 React Query（`['settlementOptions', ...]`），带缓存
- [x] 2.3 prefill 按 `categoryId` 匹配服务模板；`IncomePrefillData` 类型移入组件文件

## 3. 页面接入

- [x] 3.1 FinancePage：删除内联弹窗、`fetchIncomeFormOptions`、prefill store 监听；「收入录入」按钮改用组件；`onSuccess` 刷新财务数据
- [x] 3.2 AppointmentListPage：「完成服务」改为当前页打开组件并传 prefill；`onSuccess` 刷新预约列表；移除跳转与 store 写入

## 4. 清理

- [x] 4.1 删除 `src/stores/incomePrefillStore.ts` 及全部引用

## 5. 测试与验证

- [x] 5.1 组件级单测：prefill 预填、提交参数组装（含次卡核销）
- [x] 5.2 `tsc --noEmit`、`eslint --max-warnings 0`、`vitest --run` 全部通过
- [x] 5.3 更新本 tasks.md 勾选状态
