# 设计：三层架构重构

## 上下文

现状：`appointments.serviceId` 引用 `services` 集合的服务项（name/category/price/duration）；收入录入（`adminCreateIncomeRecord`，手工填分类+名称+费用）与预约完成（`adminCompleteService`，只填 actualAmount）两条链路分别写入 `consumption_records`；统计全部基于 `consumption_records.amount`。本设计将其拆为预约层、模板层、结算层。

## 目标 / 非目标

**目标**
- 预约只承担排班职责，与服务明细解耦。
- 服务模板成为唯一的结算规则中心（项目、价格、时长、折扣/提成标志）。
- 结算成为收入确认的唯一入口，输出统一明细供统计。
- 统计口径统一切换到最终结算明细。

**非目标**
- 不迁移历史 `appointments` / `consumption_records` 数据。
- 不引入多人分单（一次结算仍归属单一技师）。
- 不改动会员、会员卡、折扣等级（`discount_levels`）自身的数据结构。
- 不涉及小程序端（C 端）改造；本次仅管理端，若 C 端读取 `services` 需另行评估（见风险）。

## 关键决策

### 决策 1：服务模板替代 services 集合

新增 `service_templates` 集合，每个服务大类一条模板文档：

```
service_templates {
  _id, categoryId,           // 关联 service_categories
  defaultDuration,           // 默认预约时长（分钟）
  baseItems: [TemplateItem], // 基础项目（二级款式）
  addonItems: [TemplateItem],// 附加项目
  active, sort, createdAt, updatedAt
}

TemplateItem {
  itemId, name,
  inputType: 'single_select' | 'multi_select' | 'number' | 'text',
  options?: string[],        // inputType 为 select 类时的候选项
  defaultPrice,              // 分
  defaultDuration,           // 分钟
  discountable, commissionable, enabled
}
```

- 基础项目为二级结构的第二级（大类 → 款式）；无子项大类（手护/脚护/修眉）在 `baseItems` 中放一条与大类同名的项目。
- **考虑过的替代方案**：新建模板集合并保留旧 `services` 双写过渡——被否决，双份数据易导致口径不一致；直接替代并用种子数据初始化更干净。
- 旧 `services` 集合停止写入，保留只读以便历史预约展示；`adminCreateService` / `adminUpdateService` / `adminToggleServiceStatus` 改造为操作 `service_templates`，`adminGetServiceList` 改为返回模板。

### 决策 2：预约只记大类 + 可编辑时长

`appointments` 新增 `categoryId`、`duration`（分钟）；`serviceId` 字段废弃（新预约不再写入，历史数据保留）。

- 创建预约时 `duration` 默认取模板 `defaultDuration`，管理员可手动修改；时段冲突校验按 `[appointmentTime, appointmentTime + duration)` 计算。
- 散客逻辑（guestName/guestPhone）保持不变。

### 决策 3：统一结算入口 adminCreateSettlement

新增云函数 `adminCreateSettlement`，为收入确认的唯一入口：

```
入参: {
  appointmentId?,        // 可选；存在则联动预约状态 → completed
  memberId? / guestName?,
  technicianId, serviceTime, categoryId,
  baseItemId, baseItemPrice,                       // 恰好 1 个基础项目（价格以提交时确认为准）
  addons: [{ itemId?, name, inputValue, price, discountable, commissionable }],
  customAddons: [{ name, price, reason }],         // 模板外兜底，默认不折扣不提成
  adjustAmount?, adjustReason?,                    // 改价：可正可负，非 0 时 reason 必填
  paymentDetails: [{ paymentType, amount }],       // 枚举新增 meituan
  note?
}
```

- 云函数端重新计算全部金额（不信任前端合计）：
  - 原价 = baseItemPrice + Σaddons.price + ΣcustomAddons.price
  - 折扣 = 会员卡折扣率 × Σ（discountable 项目金额）
  - 应收 = 原价 - 折扣；实收 = 应收 + adjustAmount
  - 校验：ΣpaymentDetails.amount === 实收；实收 ≥ 0
- 写入 `consumption_records`（扩展明细字段）、积分（按实收，`floor(实收/10)`）、`commission_records`（按 commissionable 项目金额 × 技师比例）、`operation_logs`（改价时记录前后金额）。
- `adminCompleteService` 保留状态流转语义，但金额相关逻辑委托结算入口（或标记废弃，由前端改为调 `adminCreateSettlement` 并传 `appointmentId`）。**最终方案**：`adminCompleteService` 改造为薄封装——接收同样结算入参并强制携带 `appointmentId`，内部调用共享结算模块；`adminCreateIncomeRecord` 废弃，前端收入录入页改调 `adminCreateSettlement`。
- **考虑过的替代方案**：保留两条链路各自扩展明细字段——被否决，双入口必然导致明细结构与统计口径漂移。

### 决策 4：统计口径与历史兜底

`adminGetFinanceSummary` / `adminGetRevenueTrend` / `adminGetServiceRevenue` / `adminGetTechnicianPerformance` / `adminGetCommissionReport` 改为：

- 新记录（含结算明细字段）：按明细归属统计（分类收入按 `categoryId`，提成按 commissionable 金额）。
- 历史记录（无明细字段）：按旧 `amount` / `serviceCategory` 兜底归入大类统计，保证报表连续。

### 决策 5：种子数据

新增一次性初始化能力（挂在 `initDatabaseIndexes` 或独立 `initServiceTemplates` 云函数），写入六大类模板：

- 美甲 / 美足：基础款式、简约款式、轻奢款式、高定款式
- 美睫：日式美睫编织款、仙女-妈生自然款、私人定制穿插空气感系列、国风-动物-动漫系列、下睫毛、其他
- 手护 / 脚护 / 修眉：自身即基础项目
- 附加项目（美甲/美足类初始值）：卸甲、前置处理、加固、加钻、跳色、手绘

幂等：已存在模板的分类跳过。

## 风险 / 权衡

- **C 端小程序可能读取 `services` 集合**：模板替代后若 C 端展示服务项，需要映射层或暂缓废弃 `adminGetServiceList` 旧行为。→ 缓解：旧集合只读保留，`adminGetServiceList` 保持可返回旧数据，前端管理页切到模板接口；C 端改造另立提案。
- **历史预约仍带 `serviceId`**：列表展示需兼容（优先显示大类，历史数据显示服务名快照）。→ 缓解：`adminGetAppointmentList` 联查时做字段兜底。
- **改价为负且绝对值大于应收**会导致实收为负：云函数端强制校验实收 ≥ 0。
- **模板被编辑后影响历史结算解读**：结算时把项目名称/价格快照写入 `consumption_records` 明细，不依赖模板回查。

## 迁移计划

1. 部署模板集合 + 种子数据 + 新结算云函数（旧链路仍可用）。
2. 前端切换：预约表单、模板管理页、结算录入页。
3. 统计云函数切换口径（新旧兜底逻辑同时上线）。
4. 验证无误后，`adminCreateIncomeRecord` 从 `cloudbaserc.json` 移除（或保留一个版本周期后移除）。
5. 无需数据迁移脚本；索引通过 `initDatabaseIndexes` 增补。
