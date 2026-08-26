# 重构：预约 / 服务模板 / 结算 三层架构

## Why

当前系统中，预约直接绑定具体服务项（`appointments.serviceId` → `services` 集合），收入录入（`adminCreateIncomeRecord`）与预约完成（`adminCompleteService`）是两条割裂的链路：

- 预约记录了具体服务项，但顾客到店后的实际服务内容经常与预约不一致，预约明细失去意义；
- 收入录入只填"服务分类 + 服务名称 + 费用"自由文本，无项目明细、无折扣/改价审计，统计口径粗糙；
- 完成服务直接按 `actualAmount` 生成消费/积分/提成，缺少项目级明细，提成无法区分"可提成项目"；
- 服务项（`services`）既是预约依据又是定价依据，一改价格就影响排班展示，职责混乱。

本次重构将系统拆为三层：**预约层只管排班，模板层是结算规则中心，结算层在收入录入时确认最终服务内容**，统一统计口径为"最终结算明细"。

## What Changes

### 预约层（简化）
- **BREAKING**：预约不再引用 `services` 服务项，改为只记录：顾客（会员/散客）、技师、服务大类、预约日期时间、备注。
- 新增 `duration`（占用时长，分钟）：默认取服务大类模板的"默认预约时长"，**允许手动编辑**；技师时段冲突校验按该时长计算。

### 模板层（新增，替代 services）
- **BREAKING**：`services` 集合的服务项体系由"服务模板"替代——每个服务大类维护一套模板，包含：默认预约时长、基础项目列表、附加项目列表，各项目含录入格式（`single_select` / `multi_select` / `number` / `text`）、默认价格、默认时长、是否参与折扣、是否参与提成、是否启用。
- 基础项目支持二级结构（服务大类 → 款式，如 美甲 → 基础/简约/轻奢/高定）；无子项的大类（手护/脚护/修眉）自身即基础项目。
- 模板为可配置数据，需求中给定的款式与附加项清单作为初始化种子数据。
- 原服务管理页改造为模板管理页；`adminCreateService` / `adminUpdateService` / `adminToggleServiceStatus` / `adminGetServiceList` 相应改造。

### 结算层（新增统一入口）
- 新增统一结算入口（新云函数 `adminCreateSettlement`），预约完成与手工录入共用同一结算逻辑；预约只作排班依据，不作最终服务内容依据。
- 收入录入页改造为 5 个区域：基础信息、基础项目（必选且仅选 1 个）、附加项目（模板项 + 自定义附加项）、价格明细（原价/折扣/应收/实收/改价）、支付信息。
- 价格规则：原价 = 基础项目金额 + 附加项目金额；折扣只作用于允许折扣的项目；应收 = 原价 - 折扣；实收 = 应收 + 人工改价调整；支付合计必须等于实收。
- 改价必须填写原因，记录操作人、时间及改价前后金额并写入操作日志；自定义附加项必须填写名称、金额、原因，默认不参与折扣与提成。
- 支付方式枚举新增"美团"。
- 结算完成后统一生成：消费记录（含完整结算明细）、积分（按实收）、提成（按可提成项目金额汇总 × 技师比例）、操作日志。

### 统计口径（切换）
- 财务总收入、服务分类收入、技师业绩、提成、积分全部按"最终结算明细"统计；历史消费记录（无结算明细字段）按旧字段兜底归入服务大类。

### 历史数据（不迁移）
- 不迁移历史 `appointments` / `consumption_records`；新增字段可空，旧数据保持可读可统计。

## Impact

- **受影响 specs**：`admin-system`（MODIFIED：服务项目管理、预约后台创建、预约订单管理、散客预约、收入录入、财务统计、提成核算）；新增 `appointment`、`service-template`、`settlement` 三个 capability。
- **受影响代码**：
  - 云函数：新增 `adminCreateSettlement`、`adminGetServiceTemplate`（模板 CRUD 系列）、模板种子初始化；改造 `adminCreateAppointment`、`adminCompleteService`、`adminCreateIncomeRecord`（废弃或委托结算入口）、`adminGetFinanceSummary`、`adminGetServiceRevenue`、`adminGetTechnicianPerformance`、`adminGetCommissionReport`、`adminGetConsumptionList`。
  - 前端：`src/pages/appointment/*`（预约表单简化）、`src/pages/service/*`（改模板管理）、`src/pages/finance/FinancePage.tsx`（收入录入页重构为结算录入）、`src/types/{appointment,service,finance}.ts`、`src/services/{appointment,service,finance}.ts`、`src/constants/api.ts`。
  - 数据库：`appointments` 新增 `categoryId` / `duration`（`serviceId` 废弃）；新增 `service_templates` 集合；`consumption_records` 扩展结算明细字段；`initDatabaseIndexes` 补充索引。
- **不迁移历史数据**，新旧数据并行可读。
- **测试**：提成/积分/价格规则需补充属性测试（fast-check），状态流转与统计口径需更新单元测试。
