# 重构：收入录入弹窗组件化（预约完成免跳转）

## Why

当前预约列表点击「完成服务」需要先写 `incomePrefillStore`、再跳转 `/finance` 页，由财务页监听 store 自动打开内联的收入录入弹窗：

- 交互链路长，用户完成一次预约结算要经历一次页面跳转；
- 收入录入弹窗约 400 行内联在 `FinancePage.tsx` 中，其他页面无法复用；
- `incomePrefillStore` 跨页预填机制是跳转方案的产物，组件化后失去存在意义（全项目仅预约页与财务页两处使用）。

## What Changes

### 新增独立组件 `src/components/settlement/IncomeEntryModal.tsx`

- Props：`{ open: boolean; prefill?: IncomePrefillData; onClose: () => void; onSuccess?: () => void }`。
- 自包含数据加载：技师、会员、服务模板、折扣等级改用 React Query 加载（带缓存，多页面复用不重复请求），不再依赖宿主页面传参。
- 完整迁移现有弹窗功能：基础信息、基础项目、附加项目、自定义附加项、价格明细、改价、组合支付、次卡核销。
- prefill 匹配优化：预约记录带 `categoryId`，直接按 ID 匹配服务模板（现有按 `categoryName` 匹配在重名场景会错配）。

### FinancePage 改造

- 删除内联收入录入弹窗与 `fetchIncomeFormOptions`、prefill store 监听逻辑。
- 「收入录入」按钮改为打开 `IncomeEntryModal`（无 prefill 的手工录入）；`onSuccess` 刷新财务统计、消费记录、技师业绩与预收统计。

### AppointmentListPage 改造

- 「完成服务」不再跳转财务页，直接在当前页打开 `IncomeEntryModal` 并传入预约 prefill；`onSuccess` 刷新预约列表（预约状态由云函数在结算时置为 `completed`，前端无需额外调用）。

### 删除 `incomePrefillStore`

- `src/stores/incomePrefillStore.ts` 连同全部引用一并删除；`IncomePrefillData` 类型移入组件文件。

## Impact

- 受影响规格：`settlement`（结算录入入口形态组件化）、`appointment`（完成服务交互变更）
- 前端：新增 `src/components/settlement/IncomeEntryModal.tsx`；修改 `src/pages/finance/FinancePage.tsx`、`src/pages/appointment/AppointmentListPage.tsx`；删除 `src/stores/incomePrefillStore.ts`
- 云函数：零改动
- 数据：零改动
- 测试：现有结算工具函数与属性测试不变；补充组件级单测（打开弹窗按 prefill 预填、提交参数组装）
